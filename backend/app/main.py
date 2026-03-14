import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db
from app.routers import auth, predict, history, health, report

limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.MODEL_VERSION,
        description="ASD Detection via Facial Images — Local Web App",
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS — allow local frontend only
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve stored files (uploads + gradcam + models)
    storage_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")
    os.makedirs(storage_path, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=storage_path), name="storage")

    # Routes with /api/v1 prefix
    app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
    app.include_router(predict.router, prefix=settings.API_V1_PREFIX)
    app.include_router(history.router, prefix=settings.API_V1_PREFIX)
    app.include_router(health.router, prefix=settings.API_V1_PREFIX)
    app.include_router(report.router, prefix=settings.API_V1_PREFIX)

    @app.on_event("startup")
    def startup():
        init_db()
        from app.services.ml_engine import MLEngine
        MLEngine(settings)

    return app


app = create_app()
