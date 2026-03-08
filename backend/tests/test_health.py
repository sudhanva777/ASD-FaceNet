"""Tests for /api/v1/health endpoint."""


HEALTH_URL = "/api/v1/health"


def test_health_no_auth_required(client):
    resp = client.get(HEALTH_URL)
    assert resp.status_code == 200


def test_health_response_shape(client):
    resp = client.get(HEALTH_URL)
    data = resp.json()
    assert "status" in data
    assert "db_connected" in data
    assert "model_loaded" in data
    assert "model_version" in data
    assert "inference_device" in data
    assert "uptime_seconds" in data


def test_health_db_connected(client):
    resp = client.get(HEALTH_URL)
    assert resp.json()["db_connected"] is True


def test_health_model_loaded(client):
    resp = client.get(HEALTH_URL)
    assert resp.json()["model_loaded"] is True


def test_health_status_healthy(client):
    resp = client.get(HEALTH_URL)
    assert resp.json()["status"] == "healthy"


def test_health_inference_device(client):
    resp = client.get(HEALTH_URL)
    assert resp.json()["inference_device"] == "cpu"


def test_health_uptime_non_negative(client):
    resp = client.get(HEALTH_URL)
    assert resp.json()["uptime_seconds"] >= 0


def test_health_model_version_format(client):
    resp = client.get(HEALTH_URL)
    version = resp.json()["model_version"]
    assert isinstance(version, str)
    assert len(version) > 0
