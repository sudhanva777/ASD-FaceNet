# ASD-FaceNet — Setup Guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Latest | `git --version` |
| NVIDIA GPU | Optional | Training only; inference runs on CPU |

> **Model weights are not in the repository.** After training (see below), place `efficientnet_b0_asd.onnx` and `efficientnet_b0_asd.pth` in `backend/storage/models/`.

---

## Quick Start (Windows)

Double-click `run_local.bat` — it creates the virtual environment, installs all dependencies, starts both servers, and opens the browser.

To stop all services: double-click `stop_local.bat`.

---

## Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ASD-FaceNet.git
cd ASD-FaceNet
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python run.py
```

The server starts at **<http://localhost:8000>**. SQLite database (`asdfacenet.db`) is auto-created on first run.

Verify: Open **<http://localhost:8000/docs>** for Swagger API docs.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend starts at **<http://localhost:5173>**.

### 4. Training Setup (Optional)

Training is only needed to create the ML model. Skip if you already have model weights.

```bash
cd training

# a) Download datasets
python data/download.py --dest data/raw

# b) Preprocess (MTCNN face detection + cropping)
python data/preprocess.py --raw data/raw --out data/processed

# c) Create 5-fold splits
python data/splits.py --manifest data/manifest.csv

# d) Train the model
python train.py --config config/train_config.yaml

# e) Evaluate
python evaluate.py --config config/train_config.yaml

# f) Generate Grad-CAM samples
python gradcam_viz.py --config config/train_config.yaml

# g) Export to ONNX and copy to backend
python export_onnx.py --checkpoint outputs/checkpoints/efficientnet_b0_asd.pth --copy-pth
```

After export, restart the backend — the model will load automatically.

---

## Running Tests

```bash
cd backend
venv\Scripts\activate
pytest tests/ -v
```

Tests use an in-memory SQLite database and a mocked ML engine — no model weights needed.

---

## Troubleshooting

### `bcrypt` / `passlib` errors

Ensure pinned versions: `bcrypt==3.2.2` and `passlib[bcrypt]==1.7.4`.

### SQLite `check_same_thread` error

Already handled in `database.py` via `connect_args={"check_same_thread": False}`.

### MTCNN `post_process` tensor range

MTCNN with `post_process=False` returns values in 0-255 range (not normalized). This is handled in `ml_engine.py`.

### CORS errors in browser

Ensure the backend is running on port 8000 and frontend on port 5173. The Vite proxy forwards `/api` and `/storage` requests.

### Model not loaded (503)

Place `efficientnet_b0_asd.onnx` and `efficientnet_b0_asd.pth` in `backend/storage/models/`, then restart the backend.

### `npm install` fails

Delete `node_modules/` and `package-lock.json`, then run `npm install` again.

### GPU not detected for training

Install PyTorch with CUDA: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121`
