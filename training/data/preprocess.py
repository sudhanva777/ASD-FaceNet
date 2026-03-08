"""
Batch MTCNN preprocessing.

Walks through data/raw/, detects face, crops to 224x224, saves to data/processed/.
Generates manifest.csv with columns: image_path, label, source.

Usage:
  python data/preprocess.py --raw data/raw --out data/processed
"""
import argparse
import csv
import logging
from pathlib import Path

import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Map folder names to (label_int, source_str)
LABEL_MAP = {
    "autistic": (1, "kaggle_piosenka"),
    "non_autistic": (0, "kaggle_piosenka"),
    "asd": (1, "fadc"),
    "td": (0, "fadc"),
    "typical": (0, "fadc"),
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def get_label_source(path: Path):
    """Infer label and source from parent directory names."""
    parts = [p.lower() for p in path.parts]
    for part in reversed(parts[:-1]):
        if part in LABEL_MAP:
            return LABEL_MAP[part]
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default="data/raw")
    parser.add_argument("--out", default="data/processed")
    parser.add_argument("--manifest", default="data/manifest.csv")
    args = parser.parse_args()

    raw_dir = Path(args.raw)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    mtcnn = MTCNN(image_size=224, margin=20, min_face_size=40,
                  thresholds=[0.6, 0.7, 0.7],
                  post_process=False, device="cpu")

    all_images = [p for p in raw_dir.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
    logger.info(f"Found {len(all_images)} images in {raw_dir}")

    rows = []
    no_face_count = 0
    saved_count = 0

    for img_path in all_images:
        result = get_label_source(img_path)
        if result is None:
            logger.warning(f"Cannot determine label for {img_path}, skipping.")
            continue
        label_int, source = result

        try:
            pil = Image.open(img_path).convert("RGB")
        except Exception as exc:
            logger.warning(f"Cannot open {img_path}: {exc}")
            continue

        face_tensor = mtcnn(pil)
        if face_tensor is None:
            no_face_count += 1
            logger.debug(f"No face: {img_path}")
            continue

        face_np = face_tensor.permute(1, 2, 0).numpy().clip(0, 255).astype(np.uint8)
        face_pil = Image.fromarray(face_np)

        label_name = "asd" if label_int == 1 else "td"
        out_filename = f"{label_name}_{saved_count:06d}.jpg"
        out_path = out_dir / out_filename
        face_pil.save(out_path, "JPEG", quality=95)

        rows.append({
            "image_path": str(out_path),
            "label": label_int,
            "source": source,
        })
        saved_count += 1

        if saved_count % 100 == 0:
            logger.info(f"Processed {saved_count} faces so far ...")

    # Write manifest
    manifest_path = Path(args.manifest)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["image_path", "label", "source"])
        writer.writeheader()
        writer.writerows(rows)

    logger.info(f"\n{'='*50}")
    logger.info(f"Total images scanned : {len(all_images)}")
    logger.info(f"Faces saved          : {saved_count}")
    logger.info(f"No face (discarded)  : {no_face_count}")
    logger.info(f"Manifest saved to    : {manifest_path}")
    logger.info(f"Next step: python data/splits.py")


if __name__ == "__main__":
    main()
