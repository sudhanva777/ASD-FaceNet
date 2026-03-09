# ASD-FaceNet

**Deep Learning Based ASD Detection Using Facial Images**

> Final Year B.E. Project — AIEMS, Dept. of ISE, 2024-25

---

## Overview

ASD-FaceNet is a web application that classifies facial images as **ASD (Autism Spectrum Disorder)** or **TD (Typically Developing)** using a fine-tuned **EfficientNet-B0** model with **Grad-CAM explainability**. The system runs entirely on a local machine — no Docker, no cloud, no external services.

> ⚠️ **Research Prototype Only.** ASD-FaceNet is NOT a medical device. Results must be interpreted by qualified professionals with ADOS-2/ADI-R protocols.

---

## Features

- 🧠 **EfficientNet-B0 Classifier** — Custom 2-layer head (1280→256→2), stochastic depth (drop_path_rate=0.2), two-phase fine-tuning (linear probe → full) with 5-fold stratified CV, differential learning rates, warmup+cosine LR schedule, gradient clipping, weighted random sampling, and mixup augmentation
- 🔥 **Grad-CAM Explainability** — Visual heatmap overlays showing which facial regions influenced the prediction
- 🔍 **MTCNN Face Detection** — Automatic face alignment and cropping from input images
- ⚡ **ONNX Runtime Inference** — Fast CPU-only inference for production
- 🔐 **JWT Authentication** — Secure user registration/login with bcrypt password hashing
- 📊 **Prediction History** — Paginated, filterable history with aggregate statistics
- 🌐 **Modern React Frontend** — Dark bioluminescent neural theme with glass morphism UI
- 💾 **100% Local** — SQLite database, local file storage, no external dependencies at runtime

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand, Axios |
| **Backend** | FastAPI, SQLAlchemy, Pydantic v2, slowapi |
| **ML Training** | PyTorch, timm, Albumentations (13 transforms), scikit-learn; mixup, label smoothing 0.1, weight decay 0.05 |
| **ML Inference** | ONNX Runtime (CPU), facenet-pytorch (MTCNN) |
| **Explainability** | Grad-CAM via PyTorch hooks |
| **Database** | SQLite (auto-created) |
| **Auth** | JWT (HS256), passlib + bcrypt |

---

## Quick Start

### Windows (One-Click)

Double-click **`run_local.bat`** — creates the Python venv, installs dependencies, starts both servers, and opens the browser automatically.

To stop everything: double-click **`stop_local.bat`**.

### Manual

```bash
# Backend (Windows)
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open **<http://localhost:5173>** in your browser.

> **Model weights required.** Place `efficientnet_b0_asd.onnx` and `efficientnet_b0_asd.pth` in `backend/storage/models/` before starting. Without them the backend starts but returns 503 on `/predict`.

See [SETUP.md](SETUP.md) for full setup, training, and troubleshooting.

---

## Project Structure

```
ASD-FaceNet/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory
│   │   ├── config.py            # Settings
│   │   ├── database.py          # SQLite engine
│   │   ├── security.py          # JWT + bcrypt
│   │   ├── routers/             # API endpoints
│   │   ├── models/              # SQLAlchemy ORM
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # ML engine, Grad-CAM, prediction
│   ├── storage/                 # Uploads, heatmaps, model weights
│   ├── tests/                   # pytest test suite
│   ├── requirements.txt
│   └── run.py
├── training/
│   ├── train.py                 # 5-fold training with 2-phase fine-tuning
│   ├── evaluate.py              # Metrics + ROC curves
│   ├── export_onnx.py           # PyTorch → ONNX
│   ├── gradcam_viz.py           # Grad-CAM sample generation
│   ├── data/                    # Download, preprocess, dataset, splits
│   ├── models/                  # EfficientNet, ResNet, ViT wrappers
│   └── config/                  # Training hyperparameters
├── frontend/
│   └── src/                     # React + Vite app
├── docs/                        # Architecture, SRS, LLD, API, Data Models
├── run_local.bat                # One-click start (Windows)
├── run_local.sh                 # One-click start (Linux/Mac)
├── SETUP.md                     # Setup guide
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | — | Create account |
| POST | `/api/v1/auth/login` | — | Sign in |
| POST | `/api/v1/auth/refresh` | — | Refresh JWT |
| POST | `/api/v1/predict` | ✓ | Upload image → prediction |
| GET | `/api/v1/predict/{id}` | ✓ | Get prediction by ID |
| GET | `/api/v1/history` | ✓ | Paginated prediction history |
| GET | `/api/v1/history/stats` | ✓ | Aggregate statistics |
| GET | `/api/v1/health` | — | System health check |

Full API docs: **<http://localhost:8000/docs>** (Swagger UI)

---

## Team

| Name | Role |
|------|------|
| Sudhanva | Lead Developer |

*AIEMS, Department of Information Science & Engineering*
*Final Year B.E. Project, 2024-25*

---

## License

This project is developed for academic purposes as part of the B.E. Final Year Project at AIEMS, Dept. of ISE.

---

## Training v2 (Anti-Overfitting)

Key improvements over v1:

- **Custom classifier head** — 1280→256→2 with dropout 0.4, replacing the default single linear layer
- **Stochastic depth** — `drop_path_rate=0.2` applied across all EfficientNet blocks
- **Aggressive augmentation** — 13-transform Albumentations pipeline (flips, rotations, color jitter, blur, elastic distortion, coarse dropout, and more)
- **Mixup augmentation** — `alpha=0.4`, applied per batch during training
- **Label smoothing** — `ε=0.1` in cross-entropy loss
- **Weight decay** — `0.05` via AdamW optimizer
- **Differential learning rates** — backbone LR 10× lower than head LR
- **Warmup + cosine LR schedule** — 5-epoch linear warmup followed by cosine annealing
- **Gradient clipping** — `max_norm=1.0` to stabilize training
- **Weighted random sampling** — class-balanced batches to handle dataset imbalance
