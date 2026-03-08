"""
Download ASD face datasets.

Datasets:
  1. Kaggle Piosenka dataset  (autism-image-data)
  2. FADC dataset             (GitHub: faces of autism)

Usage:
  python data/download.py --dest data/raw
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path


def download_kaggle(dest: Path):
    """Download via kaggle CLI. Requires ~/.kaggle/kaggle.json."""
    try:
        result = subprocess.run(
            ["kaggle", "datasets", "download", "-d",
             "gpiosenka/autism-image-data",
             "--unzip", "-p", str(dest / "kaggle_piosenka")],
            check=True, capture_output=True, text=True,
        )
        print(result.stdout)
        print("[OK] Kaggle Piosenka dataset downloaded.")
    except FileNotFoundError:
        print("[ERROR] kaggle CLI not found. Install with: pip install kaggle")
        print("Then place your API token at ~/.kaggle/kaggle.json")
        print("Download manually from: https://www.kaggle.com/datasets/gpiosenka/autism-image-data")
        sys.exit(1)
    except subprocess.CalledProcessError as exc:
        print(f"[ERROR] kaggle download failed: {exc.stderr}")
        print("Ensure your Kaggle API key is configured and you have accepted the dataset terms.")
        sys.exit(1)


def download_fadc(dest: Path):
    """Download FADC dataset from GitHub."""
    import urllib.request
    import zipfile

    url = "https://github.com/asd-face-datasets/FADC/archive/refs/heads/main.zip"
    zip_path = dest / "fadc.zip"
    fadc_dir = dest / "fadc"
    fadc_dir.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] Downloading FADC dataset from {url} ...")
    try:
        urllib.request.urlretrieve(url, zip_path)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(fadc_dir)
        zip_path.unlink()
        print("[OK] FADC dataset downloaded.")
    except Exception as exc:
        print(f"[WARN] FADC auto-download failed: {exc}")
        print("Download manually and place images in data/raw/fadc/")


def main():
    parser = argparse.ArgumentParser(description="Download ASD face datasets")
    parser.add_argument("--dest", default="data/raw", help="Destination directory")
    parser.add_argument("--kaggle-only", action="store_true")
    parser.add_argument("--fadc-only", action="store_true")
    args = parser.parse_args()

    dest = Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)

    if not args.fadc_only:
        download_kaggle(dest)
    if not args.kaggle_only:
        download_fadc(dest)

    print(f"\n[DONE] Datasets saved to {dest.resolve()}")
    print("Next step: python data/preprocess.py")


if __name__ == "__main__":
    main()
