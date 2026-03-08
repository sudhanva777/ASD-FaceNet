"""Tests for /api/v1/auth/* endpoints."""
import pytest


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"

VALID_PAYLOAD = {
    "name": "Alice",
    "email": "alice@example.com",
    "password": "SecureP@ss1",
    "confirm_password": "SecureP@ss1",
    "role": "demo_user",
}


# ── Register ──────────────────────────────────────────────────────────────────

def test_register_success(client):
    resp = client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == VALID_PAYLOAD["email"]
    assert data["user"]["role"] == "demo_user"


def test_register_duplicate_email(client):
    client.post(REGISTER_URL, json=VALID_PAYLOAD)
    resp = client.post(REGISTER_URL, json=VALID_PAYLOAD)
    assert resp.status_code == 409
    assert "already registered" in resp.json()["detail"].lower()


def test_register_weak_password(client):
    payload = {**VALID_PAYLOAD, "email": "bob@example.com", "password": "short", "confirm_password": "short"}
    resp = client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


def test_register_missing_uppercase(client):
    payload = {**VALID_PAYLOAD, "email": "bob2@example.com", "password": "lowercase1", "confirm_password": "lowercase1"}
    resp = client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


def test_register_password_mismatch(client):
    payload = {**VALID_PAYLOAD, "email": "bob3@example.com", "confirm_password": "DifferentPass1"}
    resp = client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


def test_register_invalid_email(client):
    payload = {**VALID_PAYLOAD, "email": "not-an-email"}
    resp = client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


def test_register_invalid_role(client):
    payload = {**VALID_PAYLOAD, "email": "bob4@example.com", "role": "admin"}
    resp = client.post(REGISTER_URL, json=payload)
    assert resp.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_success(client):
    client.post(REGISTER_URL, json=VALID_PAYLOAD)
    resp = client.post(LOGIN_URL, json={
        "email": VALID_PAYLOAD["email"],
        "password": VALID_PAYLOAD["password"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == VALID_PAYLOAD["email"]


def test_login_wrong_password(client):
    client.post(REGISTER_URL, json=VALID_PAYLOAD)
    resp = client.post(LOGIN_URL, json={
        "email": VALID_PAYLOAD["email"],
        "password": "WrongPass1",
    })
    assert resp.status_code == 401


def test_login_nonexistent_email(client):
    resp = client.post(LOGIN_URL, json={
        "email": "nobody@example.com",
        "password": "SomePass1",
    })
    assert resp.status_code == 401


# ── Refresh ───────────────────────────────────────────────────────────────────

def test_refresh_success(client):
    reg = client.post(REGISTER_URL, json=VALID_PAYLOAD)
    refresh_token = reg.json()["refresh_token"]
    resp = client.post(REFRESH_URL, json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_refresh_invalid_token(client):
    resp = client.post(REFRESH_URL, json={"refresh_token": "bad.token.here"})
    assert resp.status_code == 401


def test_refresh_with_access_token_rejected(client):
    reg = client.post(REGISTER_URL, json=VALID_PAYLOAD)
    access_token = reg.json()["access_token"]
    # Passing access token instead of refresh token should fail
    resp = client.post(REFRESH_URL, json={"refresh_token": access_token})
    assert resp.status_code == 401
