from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    APP_NAME = "ASD-FaceNet"
    DEBUG = True
    API_V1_PREFIX = "/api/v1"

    # SQLite — zero config, auto-created
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'asdfacenet.db'}"

    # JWT
    JWT_SECRET_KEY = "asd-facenet-local-secret-change-in-prod"
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 15
    REFRESH_TOKEN_EXPIRE_DAYS = 7

    # ML Models
    ONNX_MODEL_PATH = str(BASE_DIR / "storage" / "models" / "efficientnet_b0_asd.onnx")
    PYTORCH_MODEL_PATH = str(BASE_DIR / "storage" / "models" / "efficientnet_b0_asd.pth")
    MODEL_VERSION = "v1.0.0"
    USE_GPU = False  # CPU only for inference

    # File Storage (local folders)
    UPLOAD_DIR = str(BASE_DIR / "storage" / "uploads")
    GRADCAM_DIR = str(BASE_DIR / "storage" / "gradcam")
    MAX_FILE_SIZE_MB = 10

    # Rate Limiting
    PREDICT_RATE_LIMIT = "10/minute"
    LOGIN_RATE_LIMIT = "3/minute"


settings = Settings()
