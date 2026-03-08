# ASD-FaceNet: Data Models

**Database:** SQLite (single file: `backend/asdfacenet.db`)
**ORM:** SQLAlchemy 2.0
**Validation:** Pydantic v2

---

## 1. Entity Relationship Diagram

```
┌─────────────────────────────┐
│           users              │
├─────────────────────────────┤
│ id          INTEGER PK AI    │
│ name        TEXT NOT NULL     │
│ email       TEXT UNIQUE       │
│ password_hash TEXT NOT NULL   │
│ role        TEXT DEFAULT      │
│             'demo_user'      │
│ is_active   BOOLEAN          │
│ created_at  TIMESTAMP        │
│ updated_at  TIMESTAMP        │
└──────────┬──────────────────┘
           │ 1
           │
           │ *
┌──────────▼──────────────────┐
│        predictions           │
├─────────────────────────────┤
│ id           TEXT PK (hex)   │
│ user_id      INTEGER FK      │
│ original_image TEXT          │
│ gradcam_image  TEXT          │
│ label        TEXT ('ASD'|    │
│              'TD')           │
│ asd_probability REAL         │
│ confidence   REAL            │
│ model_version TEXT           │
│ processing_time_ms INTEGER   │
│ created_at   TIMESTAMP       │
└──────────┬──────────────────┘
           │ 1
           │
           │ *
┌──────────▼──────────────────┐
│        audit_logs            │
├─────────────────────────────┤
│ id          INTEGER PK AI    │
│ user_id     INTEGER FK       │
│ prediction_id TEXT FK        │
│ action      TEXT             │
│ ip_address  TEXT             │
│ metadata    TEXT (JSON)      │
│ created_at  TIMESTAMP        │
└─────────────────────────────┘
```

---

## 2. SQLAlchemy ORM Models

### 2.1 User

```python
# app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="demo_user", nullable=False)
    # Roles: "demo_user", "clinician", "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(),
                        onupdate=func.now(), nullable=False)
```

### 2.2 Prediction

```python
# app/models/prediction.py
import uuid
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from app.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String(24), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Image filenames (stored in storage/ folders)
    original_image = Column(String(255), nullable=False)
    gradcam_image = Column(String(255), nullable=True)

    # Prediction result
    label = Column(String(3), nullable=False)        # "ASD" or "TD"
    asd_probability = Column(Float, nullable=False)   # 0.0 – 1.0
    confidence = Column(Float, nullable=False)         # max(p, 1-p)

    # Metadata
    model_version = Column(String(20), nullable=False)
    processing_time_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    @staticmethod
    def generate_id() -> str:
        return uuid.uuid4().hex[:24]
```

### 2.3 Audit Log

```python
# app/models/audit_log.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prediction_id = Column(String(24), ForeignKey("predictions.id"),
                           nullable=True)
    action = Column(String(50), nullable=False, index=True)
    # Actions: "register", "login", "predict", "view_history", "export"
    ip_address = Column(String(45), nullable=True)
    metadata = Column(Text, nullable=True)   # JSON string
    created_at = Column(DateTime, server_default=func.now(),
                        nullable=False, index=True)
```

---

## 3. SQLite Schema (Auto-Generated)

The `init_db()` function in `database.py` creates these tables automatically on first run:

```sql
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'demo_user',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS predictions (
    id              TEXT    PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    original_image  TEXT    NOT NULL,
    gradcam_image   TEXT,
    label           TEXT    NOT NULL,
    asd_probability REAL    NOT NULL,
    confidence      REAL    NOT NULL,
    model_version   TEXT    NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_pred_user ON predictions(user_id);
CREATE INDEX ix_pred_date ON predictions(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER REFERENCES users(id),
    prediction_id TEXT    REFERENCES predictions(id),
    action        TEXT    NOT NULL,
    ip_address    TEXT,
    metadata      TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_audit_action ON audit_logs(action);
```

---

## 4. Pydantic Schemas

### 4.1 Auth

```python
# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, field_validator

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: str = "demo_user"

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 8:
            raise ValueError("Min 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Need 1 uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Need 1 digit")
        return v

    @field_validator("confirm_password")
    @classmethod
    def match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords don't match")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
```

### 4.2 Prediction

```python
# app/schemas/predict.py
from pydantic import BaseModel
from datetime import datetime

class PredictionResponse(BaseModel):
    prediction_id: str
    label: str
    asd_probability: float
    confidence: float
    gradcam_url: str
    original_url: str
    processing_time_ms: int
    model_version: str
    disclaimer: str
    created_at: datetime | None = None

class PredictionSummary(BaseModel):
    prediction_id: str
    label: str
    asd_probability: float
    confidence: float
    model_version: str
    processing_time_ms: int
    created_at: datetime | None = None
```

### 4.3 History

```python
# app/schemas/history.py
from pydantic import BaseModel

class PaginatedHistory(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    total_pages: int

class HistoryStats(BaseModel):
    total_predictions: int
    asd_count: int
    td_count: int
    avg_confidence: float
    avg_processing_time_ms: float
    predictions_today: int
```

---

## 5. File Storage Layout

```
backend/
├── asdfacenet.db                     # SQLite database file
└── storage/
    ├── uploads/                      # User uploaded images
    │   ├── a3f2b1c4d5e6.jpg
    │   └── ...
    ├── gradcam/                      # Grad-CAM heatmaps
    │   ├── gradcam_a1b2c3d4e5f6.jpg
    │   └── ...
    └── models/                       # Trained weights
        ├── efficientnet_b0_asd.onnx  # ONNX for inference
        └── efficientnet_b0_asd.pth   # PyTorch for Grad-CAM
```

No S3, no cloud bucket. Files served via FastAPI `StaticFiles` mount at `/storage/`.

---

## 6. Training Data Schema

### Preprocessed Manifest (CSV)

```csv
image_path,label,source,fold
data/processed/asd_0001.jpg,1,kaggle_piosenka,0
data/processed/td_0001.jpg,0,fadc,2
```

| Column | Type | Values |
|--------|------|--------|
| `image_path` | string | Path to 224×224 cropped face |
| `label` | int | 1 = ASD, 0 = TD |
| `source` | string | `kaggle_piosenka`, `fadc`, `ytuia_2d` |
| `fold` | int | 0–4 (StratifiedKFold) |

### Training Config (YAML)

```yaml
experiment_name: "efficientnet_b0_5fold_v1"
seed: 42

data:
  image_size: 224
  num_folds: 5
  batch_size: 32
  num_workers: 4

model:
  architecture: "efficientnet_b0"
  pretrained: true
  num_classes: 2
  drop_rate: 0.3

training:
  linear_probe_epochs: 8
  linear_probe_lr: 1.0e-3
  finetune_epochs: 40
  finetune_lr: 1.0e-4
  weight_decay: 0.01
  label_smoothing: 0.1
  early_stop_patience: 8
  mixed_precision: true

augmentation:
  horizontal_flip: 0.5
  rotation_limit: 15
  brightness_limit: 0.2
  contrast_limit: 0.2
  gauss_noise_var: [10, 50]
  clahe_clip_limit: 2.0
  coarse_dropout_holes: 8
```
