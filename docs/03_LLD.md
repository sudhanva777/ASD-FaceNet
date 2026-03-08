# ASD-FaceNet: Low-Level Design (LLD)

**Version:** 1.0 | Local-Only | SQLite | No Docker

---

## 1. Module Decomposition

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # App factory + startup
│   ├── config.py                    # All settings
│   ├── database.py                  # SQLite engine + sessions
│   ├── security.py                  # JWT + bcrypt
│   ├── routers/
│   │   ├── auth.py                  # /api/v1/auth/*
│   │   ├── predict.py               # /api/v1/predict/*
│   │   ├── history.py               # /api/v1/history/*
│   │   └── health.py                # /api/v1/health
│   ├── models/
│   │   ├── user.py                  # SQLAlchemy User
│   │   ├── prediction.py            # SQLAlchemy Prediction
│   │   └── audit_log.py             # SQLAlchemy AuditLog
│   ├── schemas/
│   │   ├── auth.py                  # Pydantic auth schemas
│   │   ├── predict.py               # Pydantic prediction schemas
│   │   └── common.py                # Shared schemas
│   └── services/
│       ├── ml_engine.py             # MTCNN + ONNX + Grad-CAM
│       ├── image_processor.py       # Validate, resize, save
│       ├── gradcam.py               # Grad-CAM generator
│       └── prediction_service.py    # Full prediction orchestrator
├── storage/
│   ├── uploads/
│   ├── gradcam/
│   └── models/
├── asdfacenet.db                    # SQLite (auto-created)
├── requirements.txt
└── run.py
```

---

## 2. Class-Level Designs

### 2.1 Config

```python
# app/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings:
    APP_NAME = "ASD-FaceNet"
    DEBUG = True
    API_V1_PREFIX = "/api/v1"

    # SQLite — zero config, auto-created
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'asdfacenet.db'}"

    # JWT
    JWT_SECRET_KEY = "asd-facenet-local-secret-change-in-prod"
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 7

    # ML Models
    ONNX_MODEL_PATH = str(BASE_DIR / "storage" / "models" / "efficientnet_b0_asd.onnx")
    PYTORCH_MODEL_PATH = str(BASE_DIR / "storage" / "models" / "efficientnet_b0_asd.pth")
    MODEL_VERSION = "v1.0.0"
    USE_GPU = False   # CPU only for inference

    # File Storage (local folders)
    UPLOAD_DIR = str(BASE_DIR / "storage" / "uploads")
    GRADCAM_DIR = str(BASE_DIR / "storage" / "gradcam")
    MAX_FILE_SIZE_MB = 10

    # Rate Limiting
    PREDICT_RATE_LIMIT = "10/minute"
    LOGIN_RATE_LIMIT = "3/minute"

settings = Settings()
```

### 2.2 Database — SQLite

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# SQLite: check_same_thread=False required for FastAPI
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables if they don't exist. Called at startup."""
    Base.metadata.create_all(bind=engine)
```

### 2.3 FastAPI Main

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db
from app.routers import auth, predict, history, health
from app.services.ml_engine import MLEngine

def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, version=settings.MODEL_VERSION)

    # CORS — allow local frontend only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve stored files (uploads + gradcam)
    app.mount("/storage", StaticFiles(directory="storage"), name="storage")

    # Routes
    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    app.include_router(predict.router, prefix=settings.API_V1_PREFIX)
    app.include_router(history.router, prefix=settings.API_V1_PREFIX)
    app.include_router(health.router, prefix=settings.API_V1_PREFIX)

    @app.on_event("startup")
    def startup():
        init_db()                  # Create SQLite tables
        MLEngine(settings)         # Load ML model singleton

    return app

app = create_app()
```

### 2.4 Security — JWT + bcrypt

```python
# app/security.py
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY,
                      algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY,
                      algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY,
                      algorithms=[settings.JWT_ALGORITHM])
```

### 2.5 ML Engine — Singleton

```python
# app/services/ml_engine.py
import numpy as np
import onnxruntime as ort
from facenet_pytorch import MTCNN
from PIL import Image
from app.services.gradcam import GradCAMGenerator

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406])
IMAGENET_STD  = np.array([0.229, 0.224, 0.225])

class MLEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, settings):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.settings = settings

        # MTCNN — face detection + alignment
        self.mtcnn = MTCNN(
            image_size=224, margin=20, min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            post_process=False, device='cpu'
        )

        # ONNX Runtime — fast CPU inference
        self.ort_session = ort.InferenceSession(
            settings.ONNX_MODEL_PATH,
            providers=['CPUExecutionProvider']
        )
        self.input_name = self.ort_session.get_inputs()[0].name

        # Grad-CAM — needs PyTorch model
        self.gradcam = GradCAMGenerator(
            settings.PYTORCH_MODEL_PATH, use_gpu=False
        )
        print(f"[ML] Model loaded: {settings.MODEL_VERSION}")

    def detect_face(self, pil_image: Image.Image):
        face = self.mtcnn(pil_image)
        if face is None:
            return None
        face_np = face.permute(1, 2, 0).numpy().astype(np.uint8)
        return Image.fromarray(face_np)

    def preprocess(self, face: Image.Image) -> np.ndarray:
        img = np.array(face).astype(np.float32) / 255.0
        img = (img - IMAGENET_MEAN) / IMAGENET_STD
        img = np.transpose(img, (2, 0, 1))
        return np.expand_dims(img, axis=0).astype(np.float32)

    def predict(self, preprocessed: np.ndarray) -> dict:
        outputs = self.ort_session.run(None, {self.input_name: preprocessed})
        logits = outputs[0][0]
        probs = self._softmax(logits)
        asd_prob = float(probs[1])
        return {
            "label": "ASD" if asd_prob >= 0.5 else "TD",
            "asd_probability": round(asd_prob, 4),
            "confidence": round(max(probs), 4),
        }

    def generate_gradcam(self, pil_image: Image.Image) -> np.ndarray:
        return self.gradcam.generate(pil_image)

    @staticmethod
    def _softmax(x):
        e = np.exp(x - np.max(x))
        return e / e.sum()
```

### 2.6 Grad-CAM Generator

```python
# app/services/gradcam.py
import torch
import torch.nn.functional as F
import numpy as np
import cv2
from PIL import Image
import timm

class GradCAMGenerator:
    def __init__(self, model_path: str, use_gpu: bool = False):
        self.device = torch.device('cuda' if use_gpu else 'cpu')
        self.model = timm.create_model('efficientnet_b0', pretrained=False,
                                        num_classes=2)
        self.model.load_state_dict(
            torch.load(model_path, map_location=self.device))
        self.model.eval().to(self.device)

        # Hook into last conv layer
        self.gradients = None
        self.activations = None
        target_layer = self.model.conv_head

        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, face_pil: Image.Image, target_class: int = 1):
        img_tensor = self._preprocess(face_pil).to(self.device)
        img_tensor.requires_grad_(True)

        output = self.model(img_tensor)
        self.model.zero_grad()
        output[0, target_class].backward()

        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=(224, 224), mode='bilinear',
                            align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        original = np.array(face_pil.resize((224, 224)))
        return cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)

    @staticmethod
    def _preprocess(pil_image):
        img = np.array(pil_image.resize((224, 224))).astype(np.float32) / 255.0
        img = (img - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        img = np.transpose(img, (2, 0, 1))
        return torch.tensor(img, dtype=torch.float32).unsqueeze(0)
```

### 2.7 Image Processor

```python
# app/services/image_processor.py
import io, uuid
from pathlib import Path
from PIL import Image

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}

class ImageProcessor:
    def __init__(self, upload_dir: str, gradcam_dir: str):
        self.upload_dir = Path(upload_dir)
        self.gradcam_dir = Path(gradcam_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.gradcam_dir.mkdir(parents=True, exist_ok=True)

    def validate_and_save(self, file_bytes: bytes, content_type: str):
        if content_type not in ALLOWED_MIME:
            raise ValueError(f"Unsupported: {content_type}")
        pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        if max(pil.size) > 4096:
            pil.thumbnail((4096, 4096))
        filename = f"{uuid.uuid4().hex}.jpg"
        pil.save(self.upload_dir / filename, "JPEG", quality=95)
        return filename, pil

    def save_gradcam(self, heatmap_array, pred_id: str):
        filename = f"gradcam_{pred_id}.jpg"
        Image.fromarray(heatmap_array).save(
            self.gradcam_dir / filename, "JPEG", quality=95)
        return filename
```

### 2.8 Prediction Service (Orchestrator)

```python
# app/services/prediction_service.py
import time
from sqlalchemy.orm import Session
from app.services.ml_engine import MLEngine
from app.services.image_processor import ImageProcessor
from app.models.prediction import Prediction

class PredictionService:
    def __init__(self, ml_engine: MLEngine, img_proc: ImageProcessor):
        self.ml = ml_engine
        self.img = img_proc

    def run(self, file_bytes, content_type, user_id, db: Session):
        start = time.perf_counter()

        filename, pil = self.img.validate_and_save(file_bytes, content_type)

        face = self.ml.detect_face(pil)
        if face is None:
            raise ValueError("No face detected. Upload a clear frontal photo.")

        preprocessed = self.ml.preprocess(face)
        result = self.ml.predict(preprocessed)

        heatmap = self.ml.generate_gradcam(face)
        pred_id = Prediction.generate_id()
        gradcam_file = self.img.save_gradcam(heatmap, pred_id)

        pred = Prediction(
            id=pred_id, user_id=user_id,
            original_image=filename, gradcam_image=gradcam_file,
            label=result["label"],
            asd_probability=result["asd_probability"],
            confidence=result["confidence"],
            model_version=self.ml.settings.MODEL_VERSION,
            processing_time_ms=int((time.perf_counter() - start) * 1000),
        )
        db.add(pred)
        db.commit()

        return {
            "prediction_id": pred_id,
            **result,
            "gradcam_url": f"/storage/gradcam/{gradcam_file}",
            "original_url": f"/storage/uploads/{filename}",
            "processing_time_ms": pred.processing_time_ms,
            "model_version": pred.model_version,
            "disclaimer": "Research prototype only. Not for clinical diagnosis.",
        }
```

### 2.9 Auth Router

```python
# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        name=body.name, email=body.email,
        password_hash=hash_password(body.password),
        role=body.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id, user.role),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name,
                 "email": user.email, "role": user.role}
    }

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    return {
        "access_token": create_access_token(user.id, user.role),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name,
                 "email": user.email, "role": user.role}
    }
```

---

## 3. Sequence Diagrams

### 3.1 Prediction Flow

```
User → Frontend → POST /predict → FastAPI
                                     ├→ ImageProcessor.validate_and_save()
                                     ├→ MLEngine.detect_face()
                                     ├→ MLEngine.preprocess()
                                     ├→ MLEngine.predict()  [ONNX Runtime]
                                     ├→ MLEngine.generate_gradcam()  [PyTorch]
                                     ├→ ImageProcessor.save_gradcam()
                                     ├→ SQLite INSERT prediction
                                     └→ 200 JSON response
                  ← render result ←
```

### 3.2 Auth Flow

```
User → Frontend → POST /login → FastAPI
                                   ├→ SQLite SELECT user by email
                                   ├→ bcrypt verify password
                                   ├→ create JWT tokens
                                   └→ 200 { access_token, refresh_token }
                  ← store in state ←
```

---

## 4. Training Pipeline Design

### 4.1 Dataset Class

```python
# training/data/dataset.py
from torch.utils.data import Dataset
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import numpy as np

class ASDFaceDataset(Dataset):
    def __init__(self, image_paths, labels, is_training=True):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = self._build(is_training)

    def _build(self, train):
        if train:
            return A.Compose([
                A.HorizontalFlip(p=0.5),
                A.Rotate(limit=15, p=0.3),
                A.RandomBrightnessContrast(0.2, 0.2, p=0.3),
                A.GaussNoise(var_limit=(10, 50), p=0.2),
                A.CLAHE(clip_limit=2.0, p=0.2),
                A.CoarseDropout(max_holes=8, max_height=16,
                                max_width=16, p=0.2),
                A.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
                ToTensorV2(),
            ])
        return A.Compose([
            A.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ToTensorV2(),
        ])

    def __len__(self): return len(self.image_paths)

    def __getitem__(self, idx):
        img = np.array(Image.open(self.image_paths[idx]).convert("RGB"))
        aug = self.transform(image=img)
        return aug["image"], self.labels[idx]
```

### 4.2 Two-Phase Training

```python
# training/train.py (simplified)
import timm, torch

def train_fold(fold, train_loader, val_loader, config):
    model = timm.create_model('efficientnet_b0', pretrained=True,
                               num_classes=2).to(config.device)
    criterion = torch.nn.CrossEntropyLoss(label_smoothing=0.1)

    # Phase A — Linear Probe (freeze backbone)
    for p in model.parameters(): p.requires_grad = False
    for p in model.classifier.parameters(): p.requires_grad = True
    opt = torch.optim.AdamW(model.classifier.parameters(), lr=1e-3)

    for epoch in range(config.probe_epochs):
        train_epoch(model, train_loader, opt, criterion)

    # Phase B — Full Fine-Tune (unfreeze all)
    for p in model.parameters(): p.requires_grad = True
    opt = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, config.ft_epochs)
    scaler = torch.cuda.amp.GradScaler()

    best_auc, patience = 0, 0
    for epoch in range(config.ft_epochs):
        train_epoch_amp(model, train_loader, opt, criterion, scaler)
        auc = validate(model, val_loader)
        sched.step()
        if auc > best_auc:
            best_auc, patience = auc, 0
            torch.save(model.state_dict(), f"best_fold{fold}.pth")
        else:
            patience += 1
            if patience >= 8: break

    return best_auc
```

### 4.3 ONNX Export

```python
# training/export_onnx.py
import torch, timm

def export(checkpoint, output):
    model = timm.create_model('efficientnet_b0', pretrained=False,
                               num_classes=2)
    model.load_state_dict(torch.load(checkpoint, map_location='cpu'))
    model.eval()
    torch.onnx.export(
        model, torch.randn(1, 3, 224, 224), output,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
```

---

## 5. Error Handling

| Error | HTTP | Message |
|-------|------|---------|
| No face detected | 400 | "No face detected. Upload a clear frontal photograph." |
| Bad file type | 415 | "Unsupported file type. Accepted: JPEG, PNG, WebP." |
| File too large | 413 | "File exceeds 10MB limit." |
| Rate limited | 429 | "Too many requests. Try again in 60 seconds." |
| Model not loaded | 503 | "ML model not loaded. Restart the backend." |
| Auth failed | 401 | "Invalid credentials." |
| Email exists | 409 | "Email already registered." |

---

## 6. requirements.txt

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.30
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==3.2.2
python-multipart==0.0.9
slowapi==0.1.9
pydantic==2.7.0
pydantic-settings==2.3.0

# ML
torch==2.5.1
torchvision==0.20.1
timm==1.0.12
facenet-pytorch==2.6.0
onnxruntime==1.19.0
albumentations==1.4.20
opencv-python-headless==4.10.0.84
scikit-learn==1.5.2
numpy==1.26.4
Pillow==10.4.0
matplotlib==3.9.0
seaborn==0.13.2
tensorboard==2.17.0
```
