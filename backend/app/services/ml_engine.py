import logging
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406])
IMAGENET_STD = np.array([0.229, 0.224, 0.225])


class MLEngine:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, settings=None):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True
        self.settings = settings
        self.model_loaded = False
        self.mtcnn = None
        self.ort_session = None
        self.input_name = None
        self.gradcam = None

        if settings is None:
            return

        self._load_mtcnn()
        self._load_onnx(settings.ONNX_MODEL_PATH)
        self._load_gradcam(settings.PYTORCH_MODEL_PATH)

        if self.ort_session is not None:
            self.model_loaded = True
            logger.info(f"[ML] Model loaded: {settings.MODEL_VERSION}")
        else:
            logger.warning("[ML] ONNX model not found. POST /predict will return 503.")

    def _load_mtcnn(self):
        try:
            from facenet_pytorch import MTCNN
            self.mtcnn = MTCNN(
                image_size=224,
                margin=20,
                min_face_size=40,
                thresholds=[0.5, 0.6, 0.6],
                post_process=False,
                device="cpu",
            )
            logger.info("[ML] MTCNN loaded.")
        except Exception as exc:
            logger.warning(f"[ML] MTCNN load failed: {exc}")

    def _load_onnx(self, path: str):
        if not Path(path).exists():
            logger.warning(f"[ML] ONNX model not found at {path}. Skipping.")
            return
        try:
            import onnxruntime as ort
            self.ort_session = ort.InferenceSession(
                path, providers=["CPUExecutionProvider"]
            )
            self.input_name = self.ort_session.get_inputs()[0].name
            logger.info(f"[ML] ONNX model loaded from {path}.")
        except Exception as exc:
            logger.warning(f"[ML] ONNX load failed: {exc}")

    def _load_gradcam(self, path: str):
        if not Path(path).exists():
            logger.warning(f"[ML] PyTorch model not found at {path}. Grad-CAM disabled.")
            return
        try:
            from app.services.gradcam import GradCAMGenerator
            self.gradcam = GradCAMGenerator(path, use_gpu=False)
            logger.info(f"[ML] Grad-CAM loaded from {path}.")
        except Exception as exc:
            logger.warning(f"[ML] Grad-CAM load failed: {exc}")

    def detect_face(self, pil_image: Image.Image):
        if self.mtcnn is None:
            raise RuntimeError("MTCNN not loaded")
        face = self.mtcnn(pil_image)
        if face is None:
            return None
        # facenet_pytorch with post_process=False returns tensor in 0-255 range
        face_np = face.permute(1, 2, 0).numpy().clip(0, 255).astype(np.uint8)
        return Image.fromarray(face_np)

    def preprocess(self, face: Image.Image) -> np.ndarray:
        img = np.array(face).astype(np.float32) / 255.0
        img = (img - IMAGENET_MEAN) / IMAGENET_STD
        img = np.transpose(img, (2, 0, 1))
        return np.expand_dims(img, axis=0).astype(np.float32)

    def predict(self, preprocessed: np.ndarray) -> dict:
        if self.ort_session is None:
            raise RuntimeError("ONNX session not loaded")
        outputs = self.ort_session.run(None, {self.input_name: preprocessed})
        logits = outputs[0][0]
        probs = self._softmax(logits)
        asd_prob = float(probs[1])
        return {
            "label": "ASD" if asd_prob >= 0.5 else "TD",
            "asd_probability": round(asd_prob, 4),
            "confidence": round(float(max(probs)), 4),
        }

    def generate_gradcam(self, pil_image: Image.Image) -> np.ndarray:
        if self.gradcam is None:
            # Fallback: return a blank heatmap overlay
            img = np.array(pil_image.resize((224, 224)))
            return img.astype(np.uint8)
        return self.gradcam.generate(pil_image)

    @staticmethod
    def _softmax(x):
        e = np.exp(x - np.max(x))
        return e / e.sum()
