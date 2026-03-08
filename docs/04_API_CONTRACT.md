# ASD-FaceNet: API Contract

**Base URL:** `http://localhost:8000/api/v1`
**Auth:** Bearer JWT in `Authorization` header
**Content-Type:** `application/json` (file uploads: `multipart/form-data`)
**Database:** SQLite (local file)
**File Serving:** `http://localhost:8000/storage/{uploads|gradcam}/{filename}`

---

## Auth Endpoints

### POST `/auth/register`

**Request:**
```json
{
  "name": "Sudhanva",
  "email": "sudhanva@example.com",
  "password": "SecureP@ss1",
  "confirm_password": "SecureP@ss1",
  "role": "demo_user"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | yes | 2–100 chars |
| `email` | string | yes | Valid email |
| `password` | string | yes | ≥ 8 chars, 1 upper, 1 digit |
| `confirm_password` | string | yes | Must match password |
| `role` | enum | yes | `demo_user` or `clinician` |

**201 Created:**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "eyJhbG...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Sudhanva",
    "email": "sudhanva@example.com",
    "role": "demo_user"
  }
}
```

**Errors:** `409` email exists · `422` validation failed

---

### POST `/auth/login`

**Request:**
```json
{
  "email": "sudhanva@example.com",
  "password": "SecureP@ss1"
}
```

**200 OK:** Same as register response.

**Errors:** `401` wrong credentials · `429` rate limited (3/min)

---

### POST `/auth/refresh`

**Request:**
```json
{ "refresh_token": "eyJhbG..." }
```

**200 OK:**
```json
{ "access_token": "eyJhbG...", "token_type": "bearer" }
```

**Errors:** `401` expired/invalid

---

## Prediction Endpoints

### POST `/predict`

Upload facial image → get ASD/TD prediction + Grad-CAM.

**Auth:** Required
**Content-Type:** `multipart/form-data`

| Field | Type | Constraints |
|-------|------|------------|
| `image` | file | JPEG/PNG/WebP, max 10MB |

**200 OK:**
```json
{
  "prediction_id": "a1b2c3d4e5f6",
  "label": "ASD",
  "asd_probability": 0.8723,
  "confidence": 0.8723,
  "gradcam_url": "/storage/gradcam/gradcam_a1b2c3d4e5f6.jpg",
  "original_url": "/storage/uploads/abc123def456.jpg",
  "processing_time_ms": 1847,
  "model_version": "v1.0.0",
  "disclaimer": "Research prototype only. Not for clinical diagnosis.",
  "created_at": "2026-03-07T10:35:22Z"
}
```

**Errors:**
| Status | Detail |
|--------|--------|
| 400 | No face detected |
| 413 | File too large |
| 415 | Unsupported file type |
| 429 | Rate limit (10/min) |
| 503 | Model not loaded |

---

### GET `/predict/{prediction_id}`

Retrieve a past prediction. **Auth required.**

**200 OK:** Same shape as POST response.

**Errors:** `403` not your prediction · `404` not found

---

## History Endpoints

### GET `/history`

User's paginated prediction history.

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 20 | Items per page (max 100) |
| `label` | string | — | Filter: `ASD` or `TD` |
| `date_from` | date | — | ISO 8601 date |
| `date_to` | date | — | ISO 8601 date |
| `sort_by` | string | `created_at_desc` | Sort order |

**200 OK:**
```json
{
  "items": [
    {
      "prediction_id": "a1b2c3d4e5f6",
      "label": "ASD",
      "asd_probability": 0.8723,
      "confidence": 0.8723,
      "model_version": "v1.0.0",
      "processing_time_ms": 1847,
      "created_at": "2026-03-07T10:35:22Z"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "total_pages": 3
}
```

---

### GET `/history/stats`

Aggregate stats for current user.

**200 OK:**
```json
{
  "total_predictions": 42,
  "asd_count": 18,
  "td_count": 24,
  "avg_confidence": 0.8456,
  "avg_processing_time_ms": 1523,
  "predictions_today": 3
}
```

---

## File Serving

Files are served directly by FastAPI's `StaticFiles` mount:

| URL Pattern | Source |
|-------------|--------|
| `GET /storage/uploads/{filename}` | `backend/storage/uploads/` |
| `GET /storage/gradcam/{filename}` | `backend/storage/gradcam/` |

No CDN, no S3 — just local files served over localhost.

---

## Health Endpoint

### GET `/health`

No auth required.

**200 OK:**
```json
{
  "status": "healthy",
  "db_connected": true,
  "model_loaded": true,
  "model_version": "v1.0.0",
  "inference_device": "cpu",
  "uptime_seconds": 3421
}
```

---

## Rate Limits

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `POST /auth/login` | 3 | 1 minute | IP |
| `POST /auth/register` | 5 | 1 minute | IP |
| `POST /predict` | 10 | 1 minute | User ID |

Rate limiting is done in-memory via `slowapi` (no Redis needed).

---

## Error Response Format

All errors:
```json
{ "detail": "Human-readable message" }
```

Validation errors (422):
```json
{
  "detail": [
    { "loc": ["body", "email"], "msg": "invalid email", "type": "value_error" }
  ]
}
```
