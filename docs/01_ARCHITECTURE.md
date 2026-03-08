# ASD-FaceNet: System Architecture Plan

**Project Type:** Final Year B.E. Project — AIEMS, Dept. of ISE
**Deployment:** 100% Local Machine (No Docker, No Cloud, No External Services)

---

## 1. Architecture Overview

ASD-FaceNet runs entirely on a single local machine. No internet connection is needed after initial setup. No Docker, no cloud, no PostgreSQL, no Redis — just Python, Node.js, and SQLite.

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  React 18 + Vite Dev Server (localhost:5173)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐        │
│  │  Login   │ │ Upload & │ │ History  │ │  Grad-CAM  │        │
│  │  Page    │ │ Predict  │ │ Dashboard│ │  Viewer    │        │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘        │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP REST (localhost)
┌────────────────────────▼────────────────────────────────────────┐
│                    API LAYER (FastAPI on localhost:8000)         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐  │
│  │ Auth      │ │ Predict   │ │ History   │ │ Health        │  │
│  │ Router    │ │ Router    │ │ Router    │ │ Router        │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Middleware: CORS · JWT Auth · Rate Limiter · Logger       │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  ML ENGINE   │  │  DATA LAYER  │  │  FILE STORAGE    │
│  (In-Process)│  │  (Local)     │  │  (Local Disk)    │
│              │  │              │  │                  │
│ MTCNN Face   │  │ SQLite DB    │  │ storage/         │
│ Detector     │  │ (asdfacenet  │  │  ├─ uploads/     │
│              │  │  .db)        │  │  ├─ gradcam/     │
│ EfficientNet │  │              │  │  └─ models/      │
│ B0 (ONNX)    │  │ Tables:      │  │                  │
│              │  │  - users     │  │                  │
│ Grad-CAM     │  │  - preds     │  │                  │
│ Generator    │  │  - audit_log │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
```

## 2. Component Breakdown

### 2.1 Frontend — React SPA

| Component | Responsibility |
|-----------|---------------|
| `LoginPage` | Email/password auth, JWT stored in memory |
| `RegisterPage` | New user signup with role selection |
| `Dashboard` | Quick stats, weekly chart, recent predictions |
| `PredictPage` | Drag-and-drop upload → prediction → Grad-CAM result |
| `HistoryPage` | Paginated table of past predictions |
| `GradCAMViewer` | Side-by-side original + heatmap with opacity slider |

**Tech:** React 18 + Vite, TailwindCSS, Axios, React Router v6, Zustand, CSS animations.

**Run:**
```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

### 2.2 Backend — FastAPI

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, startup event
│   ├── config.py                # Settings (paths, secrets, etc.)
│   ├── database.py              # SQLite engine + session maker
│   ├── security.py              # JWT + bcrypt
│   ├── routers/
│   │   ├── auth.py              # /register, /login, /refresh
│   │   ├── predict.py           # /predict, /predict/{id}
│   │   ├── history.py           # /history, /history/stats
│   │   └── health.py            # /health
│   ├── models/                  # SQLAlchemy ORM models
│   ├── schemas/                 # Pydantic schemas
│   └── services/
│       ├── ml_engine.py         # MTCNN + ONNX + Grad-CAM
│       ├── image_processor.py   # Resize, validate, save
│       └── prediction_service.py
├── storage/                     # All files stored locally
│   ├── uploads/
│   ├── gradcam/
│   └── models/
├── asdfacenet.db                # SQLite (auto-created on first run)
├── requirements.txt
└── run.py                       # uvicorn launcher
```

**Run:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
python run.py                    # → http://localhost:8000
```

### 2.3 ML Engine — In-Process Singleton

```
MLEngine (loaded once at FastAPI startup)
│
├── MTCNNDetector
│   └── facenet_pytorch.MTCNN(device='cpu')
│       detect → align → crop 224×224
│
├── ASDClassifier
│   ├── Primary:  ONNX Runtime (CPU) — fast inference
│   └── Fallback: PyTorch model (if ONNX missing)
│
└── GradCAMGenerator
    ├── PyTorch EfficientNet-B0 with forward/backward hooks
    └── generate() → heatmap overlay image
```

No separate ML server. Everything runs in the same Python process as FastAPI.

### 2.4 Data — SQLite (Zero Setup)

Single file: `backend/asdfacenet.db`. Auto-created on first run. No database server needed.

### 2.5 Files — Local Folders

```
storage/
├── uploads/        # User uploaded images
├── gradcam/        # Generated heatmap overlays
└── models/
    ├── efficientnet_b0_asd.onnx
    └── efficientnet_b0_asd.pth
```

---

## 3. Training Pipeline (Run Separately)

```
training/
├── config/train_config.yaml
├── data/
│   ├── raw/                    # Original datasets
│   ├── processed/              # MTCNN-cropped faces
│   ├── download.py             # Kaggle dataset download
│   ├── preprocess.py           # Batch MTCNN processing
│   ├── dataset.py              # PyTorch Dataset + Albumentations
│   └── splits.py               # 5-Fold StratifiedKFold
├── models/
│   ├── efficientnet.py         # timm EfficientNet-B0
│   ├── resnet_baseline.py      # ResNet-50 comparison
│   └── vit_baseline.py         # ViT-Small (optional)
├── train.py                    # 2-phase fine-tuning loop
├── evaluate.py                 # Metrics + confusion matrices
├── gradcam_viz.py              # Grad-CAM on test images
├── export_onnx.py              # PyTorch → ONNX
└── logs/                       # TensorBoard logs
```

---

## 4. Local Startup

### Windows (`run_local.bat`)
```batch
@echo off
echo === Starting ASD-FaceNet ===
start "Backend" cmd /k "cd backend && venv\Scripts\activate && python run.py"
timeout /t 3 >nul
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 >nul
start http://localhost:5173
```

### Linux/Mac (`run_local.sh`)
```bash
#!/bin/bash
cd backend && source venv/bin/activate && python run.py &
sleep 3 && cd ../frontend && npm run dev &
sleep 3 && xdg-open http://localhost:5173
```

---

## 5. Security (Local Scope)

| Concern | Solution |
|---------|----------|
| Auth | JWT (HS256) — 15 min access, 7 day refresh |
| Passwords | bcrypt 12 rounds via passlib |
| Rate limiting | slowapi — 10 predictions/min |
| File uploads | Max 10MB, MIME whitelist |
| CORS | localhost:5173 only |
| SQL safety | SQLAlchemy ORM (parameterized) |

No HTTPS — localhost only. No external network calls during inference.

---

## 6. Complete Project Structure

```
ASD-FaceNet/
├── backend/
│   ├── app/
│   ├── storage/
│   ├── asdfacenet.db
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── training/
│   ├── data/
│   ├── models/
│   ├── train.py
│   ├── evaluate.py
│   └── export_onnx.py
├── docs/
│   ├── 01_ARCHITECTURE.md
│   ├── 02_SRS.md
│   ├── 03_LLD.md
│   ├── 04_API_CONTRACT.md
│   └── 05_DATA_MODELS.md
├── run_local.bat
├── run_local.sh
├── SETUP.md
└── README.md
```
