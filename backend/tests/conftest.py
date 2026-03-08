"""
Test fixtures for ASD-FaceNet backend tests.
Uses in-memory SQLite + TestClient + mocked ML engine.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch
import numpy as np
from PIL import Image
import io

from app.main import create_app
from app.database import Base, get_db
from app.security import hash_password, create_access_token

# ── In-memory test database ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Mock ML engine ────────────────────────────────────────────────────────────
def make_mock_ml_engine():
    engine = MagicMock()
    engine.model_loaded = True
    engine._initialized = True
    engine.settings = MagicMock()
    engine.settings.MODEL_VERSION = "v1.0.0"

    # detect_face returns a 224x224 PIL image
    face_img = Image.fromarray(np.zeros((224, 224, 3), dtype=np.uint8))
    engine.detect_face.return_value = face_img

    # preprocess returns float32 array
    engine.preprocess.return_value = np.zeros((1, 3, 224, 224), dtype=np.float32)

    # predict returns classification result
    engine.predict.return_value = {
        "label": "TD",
        "asd_probability": 0.15,
        "confidence": 0.85,
    }

    # generate_gradcam returns uint8 array
    engine.generate_gradcam.return_value = np.zeros((224, 224, 3), dtype=np.uint8)

    return engine


@pytest.fixture(scope="session", autouse=True)
def setup_tables():
    """Create all tables in in-memory DB once per session."""
    from app.models import user, prediction, audit_log  # noqa: F401
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db_session():
    """Yields a clean DB session, rolls back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def mock_engine():
    return make_mock_ml_engine()


@pytest.fixture()
def client(mock_engine):
    """TestClient with overridden DB and mocked ML engine."""
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    # Patch MLEngine singleton
    with patch("app.services.ml_engine.MLEngine._instance", mock_engine):
        with patch("app.routers.predict.MLEngine._instance", mock_engine):
            with TestClient(app) as c:
                yield c


@pytest.fixture()
def registered_user(client):
    """Register a test user and return (user_data, access_token)."""
    payload = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "TestPass1",
        "confirm_password": "TestPass1",
        "role": "demo_user",
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    return data["user"], data["access_token"]


@pytest.fixture()
def auth_headers(registered_user):
    """Authorization header dict for an authenticated request."""
    _, token = registered_user
    return {"Authorization": f"Bearer {token}"}


def make_image_bytes(width: int = 224, height: int = 224) -> bytes:
    """Create a minimal JPEG image as bytes for upload tests."""
    img = Image.fromarray(
        np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    )
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()
