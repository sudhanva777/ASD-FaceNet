# ASD-FaceNet: Software Requirements Specification (SRS)

**Version:** 1.0
**Project:** ASD-FaceNet — Deep Learning Based ASD Detection Using Facial Images
**Team:** Sudhanva + 3 Team Members | AIEMS, Dept. of ISE | 2024-25
**Deployment:** Local machine only (SQLite, no Docker, no cloud)

---

## 1. Introduction

### 1.1 Purpose

This SRS defines all functional and non-functional requirements for ASD-FaceNet. It serves as the contract between the development team, project guide, and evaluation panel.

### 1.2 Scope

ASD-FaceNet delivers four things: (a) a trained EfficientNet-B0 classifier evaluated via 5-fold stratified cross-validation, (b) a FastAPI REST backend serving predictions via ONNX Runtime, (c) a React web frontend for image upload, result display, and Grad-CAM visualization, and (d) local run scripts for one-command startup on Windows.

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| ASD | Autism Spectrum Disorder |
| TD | Typically Developing (control class) |
| MTCNN | Multi-task Cascaded Convolutional Network (face detection) |
| Grad-CAM | Gradient-weighted Class Activation Mapping |
| ONNX | Open Neural Network Exchange format |
| JWT | JSON Web Token |

### 1.4 References

- Project Synopsis: ASD-FaceNet (AIEMS, 2024-25)
- Tan & Le, 2019 (EfficientNet); Zhang et al., 2016 (MTCNN); Selvaraju et al., 2017 (Grad-CAM)

---

## 2. Overall Description

### 2.1 Product Perspective

ASD-FaceNet is a standalone local web application. It is NOT a medical device. It carries a mandatory disclaimer on every prediction screen. Designed for research and educational demonstration only.

### 2.2 User Classes

| User Class | Description | Access Level |
|------------|-------------|--------------|
| Demo User | Self-registered account | Upload images, view predictions (rate-limited) |
| Clinician | Approved account | Unlimited predictions, full history, export |
| Admin | System operator | User management, system health |

### 2.3 Operating Environment

- **Machine:** Windows 10/11 or Ubuntu 22.04, 8GB+ RAM, Python 3.11, Node.js 18+
- **GPU:** Optional — NVIDIA GPU for training only; inference runs on CPU via ONNX
- **Database:** SQLite (auto-created, zero config)
- **Browser:** Chrome 90+, Firefox 88+, Edge 90+
- **Network:** Not required after initial `pip install` and `npm install`

### 2.4 Constraints

- PyTorch is the DL framework for training and Grad-CAM
- ONNX Runtime is used for production inference (CPU only)
- SQLite for all data storage (single file, no database server)
- All images processed locally — never sent to any external service
- No Docker, no cloud services, no external APIs during runtime

### 2.5 Assumptions

- Users upload clear frontal face photographs
- Kaggle Piosenka and FADC datasets are downloaded during setup
- Training is done offline before the web app is started

---

## 3. Functional Requirements

### FR-01: User Registration

| Field | Detail |
|-------|--------|
| ID | FR-01 |
| Priority | High |
| Description | Guest creates account with name, email, password, role |
| Input | `{ name, email, password, confirm_password, role }` |
| Validation | Email format, password ≥ 8 chars with 1 upper + 1 digit |
| Output | JWT tokens + user info |
| Errors | 409 email exists, 422 validation fail |

### FR-02: User Login

| Field | Detail |
|-------|--------|
| ID | FR-02 |
| Priority | High |
| Description | User authenticates with email and password |
| Output | `{ access_token, refresh_token, user }` |
| Errors | 401 invalid credentials, 429 rate limited |

### FR-03: Token Refresh

| Field | Detail |
|-------|--------|
| ID | FR-03 |
| Priority | High |
| Description | Client exchanges refresh token for new access token |

### FR-04: Image Upload & Prediction

| Field | Detail |
|-------|--------|
| ID | FR-04 |
| Priority | Critical |
| Description | User uploads facial image → MTCNN face detection → ONNX inference → Grad-CAM → returns prediction |
| Input | Multipart image (JPEG/PNG, max 10MB) |
| Output | `{ label, asd_probability, confidence, gradcam_url, processing_time_ms, disclaimer }` |
| Errors | 400 no face, 413 too large, 415 bad format, 429 rate limit |

### FR-05: View Single Prediction

| Field | Detail |
|-------|--------|
| ID | FR-05 |
| Priority | Medium |
| Description | Retrieve past prediction by ID |
| Errors | 404 not found, 403 wrong user |

### FR-06: Prediction History

| Field | Detail |
|-------|--------|
| ID | FR-06 |
| Priority | Medium |
| Description | Paginated list with optional label/date filters |

### FR-07: History Statistics

| Field | Detail |
|-------|--------|
| ID | FR-07 |
| Priority | Medium |
| Description | Aggregated stats: total, ASD count, TD count, avg confidence |

### FR-08: Grad-CAM Overlay Viewer

| Field | Detail |
|-------|--------|
| ID | FR-08 |
| Priority | High |
| Description | Side-by-side original + heatmap with opacity slider |

### FR-09: Health Check

| Field | Detail |
|-------|--------|
| ID | FR-09 |
| Priority | Low |
| Description | Returns API status, DB connection, model loaded status |

### FR-10: Mandatory Disclaimer

| Field | Detail |
|-------|--------|
| ID | FR-10 |
| Priority | Critical |
| Description | Non-dismissible warning on every prediction screen — "research prototype, not clinical diagnosis" |

---

## 4. Non-Functional Requirements

### NFR-01: Performance

| Metric | Target |
|--------|--------|
| Prediction latency (CPU, end-to-end) | < 3 seconds |
| App startup (backend + model load) | < 15 seconds |
| Frontend initial load | < 2 seconds |

### NFR-02: ML Accuracy

| Metric | Target (mean ± std across 5 folds) |
|--------|-------------------------------------|
| Accuracy | ≥ 90% |
| AUC-ROC | ≥ 0.93 |
| Sensitivity | ≥ 88% |
| Specificity | ≥ 85% |
| F1-Score | ≥ 0.89 |

### NFR-03: Security

- Passwords: bcrypt 12 rounds
- JWT: HS256, 15 min access / 7 day refresh
- File uploads: MIME whitelist, 10MB max
- SQL injection: prevented via SQLAlchemy ORM
- CORS: localhost only

### NFR-04: Reliability

- If ONNX model missing → fallback to PyTorch
- If no face detected → clear error message
- SQLite auto-creates on first run

### NFR-05: Usability

- Responsive design (mobile-friendly)
- Drag-and-drop image upload with preview
- Color-coded results: amber for ASD, green for TD
- Loading animations during processing
- Mandatory medical disclaimer

### NFR-06: Portability

- Runs on Windows 10/11 and Ubuntu 22.04
- No Docker required, no cloud dependencies
- One-command startup via `run_local.bat` (Windows) or `run_local.sh` (Linux)

---

## 5. Interface Requirements

### 5.1 Screens

| Screen | Description |
|--------|-------------|
| Login / Register | Auth forms with validation and animated transitions |
| Dashboard | Stats cards, weekly prediction chart, recent predictions |
| Predict | Upload zone, processing animation, result card with Grad-CAM |
| History | Filterable sortable table with pagination |

### 5.2 Hardware

- CPU: Intel Core i5+ or AMD Ryzen 5+ (inference)
- GPU: NVIDIA GTX 1660 Ti+ (training only — not needed for demo)
- RAM: 8GB minimum
- Storage: 20GB (datasets + models + venv)

### 5.3 Software Interfaces

| Interface | Details |
|-----------|---------|
| SQLite | File-based DB, auto-created at `backend/asdfacenet.db` |
| ONNX Runtime | CPU inference, loaded in-process |
| Filesystem | Local `storage/` directory for images and models |

---

## 6. Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-01 | Model achieves ≥ 90% mean accuracy across 5 folds |
| AC-02 | Web app runs on Chrome, Firefox, and Edge |
| AC-03 | Prediction completes in < 3 seconds on CPU |
| AC-04 | Grad-CAM highlights facial regions (not random noise) |
| AC-05 | `run_local.bat` starts everything with one double-click |
| AC-06 | Disclaimer visible on every prediction result |
| AC-07 | SQLite DB auto-creates without manual intervention |
| AC-08 | App works fully offline after initial setup |
