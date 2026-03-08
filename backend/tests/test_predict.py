"""Tests for /api/v1/predict endpoints with mocked ML engine."""
import io
import pytest
import numpy as np
from PIL import Image
from unittest.mock import MagicMock, patch


PREDICT_URL = "/api/v1/predict"


def make_jpeg_bytes(width: int = 224, height: int = 224) -> bytes:
    img = Image.fromarray(np.random.randint(0, 255, (height, width, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


def make_png_bytes() -> bytes:
    img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.read()


# ── Auth required ─────────────────────────────────────────────────────────────

def test_predict_requires_auth(client):
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    resp = client.post(PREDICT_URL, files=files)
    assert resp.status_code == 403


# ── Successful prediction ─────────────────────────────────────────────────────

def test_predict_success_jpeg(client, auth_headers):
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "prediction_id" in data
    assert data["label"] in ("ASD", "TD")
    assert 0.0 <= data["asd_probability"] <= 1.0
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["gradcam_url"].startswith("/storage/gradcam/")
    assert data["original_url"].startswith("/storage/uploads/")
    assert "disclaimer" in data
    assert "Research prototype" in data["disclaimer"]


def test_predict_success_png(client, auth_headers):
    files = {"image": ("test.png", make_png_bytes(), "image/png")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 200


# ── File type validation ──────────────────────────────────────────────────────

def test_predict_unsupported_file_type(client, auth_headers):
    files = {"image": ("test.gif", b"GIF89a\x01\x00\x01\x00\x00\xff\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x00;", "image/gif")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 415


def test_predict_pdf_rejected(client, auth_headers):
    files = {"image": ("test.pdf", b"%PDF-1.4", "application/pdf")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 415


# ── No face detected ─────────────────────────────────────────────────────────

def test_predict_no_face_detected(client, auth_headers, mock_engine):
    mock_engine.detect_face.return_value = None
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 400
    assert "face" in resp.json()["detail"].lower()


# ── Model not loaded ──────────────────────────────────────────────────────────

def test_predict_model_not_loaded(client, auth_headers, mock_engine):
    mock_engine.model_loaded = False
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert resp.status_code == 503


# ── Get prediction by ID ──────────────────────────────────────────────────────

def test_get_prediction_success(client, auth_headers):
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    post_resp = client.post(PREDICT_URL, files=files, headers=auth_headers)
    assert post_resp.status_code == 200
    pred_id = post_resp.json()["prediction_id"]

    get_resp = client.get(f"{PREDICT_URL}/{pred_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["prediction_id"] == pred_id


def test_get_prediction_not_found(client, auth_headers):
    resp = client.get(f"{PREDICT_URL}/nonexistentid000000000", headers=auth_headers)
    assert resp.status_code == 404


def test_get_prediction_wrong_user(client, mock_engine):
    # Register two users
    user1_reg = client.post("/api/v1/auth/register", json={
        "name": "User1", "email": "u1@example.com",
        "password": "TestPass1", "confirm_password": "TestPass1", "role": "demo_user"
    })
    user2_reg = client.post("/api/v1/auth/register", json={
        "name": "User2", "email": "u2@example.com",
        "password": "TestPass1", "confirm_password": "TestPass1", "role": "demo_user"
    })
    token1 = user1_reg.json()["access_token"]
    token2 = user2_reg.json()["access_token"]

    # User1 makes a prediction
    files = {"image": ("test.jpg", make_jpeg_bytes(), "image/jpeg")}
    post_resp = client.post(
        PREDICT_URL, files=files,
        headers={"Authorization": f"Bearer {token1}"}
    )
    assert post_resp.status_code == 200
    pred_id = post_resp.json()["prediction_id"]

    # User2 tries to access it
    resp = client.get(
        f"{PREDICT_URL}/{pred_id}",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert resp.status_code == 403
