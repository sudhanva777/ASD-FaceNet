"""
ASD-FaceNet ONNX Export Script

Load best PyTorch checkpoint, export to ONNX format, verify with ONNX Runtime,
and optionally copy to backend/storage/models/.

Usage:
    python export_onnx.py --checkpoint outputs/checkpoints/efficientnet_b0_asd.pth
    python export_onnx.py --checkpoint outputs/checkpoints/best_fold0.pth --output efficientnet_b0_asd.onnx
"""
import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
import torch

# Add training/ root so local imports resolve
sys.path.insert(0, str(Path(__file__).parent))
from models.efficientnet import EfficientNetB0ASD


def export_to_onnx(checkpoint: str, output: str, opset: int = 17) -> Path:
    """Load PyTorch model and export to ONNX."""
    print(f"[Export] Loading checkpoint: {checkpoint}")
    model = EfficientNetB0ASD(
        pretrained=False,
        num_classes=2,
        drop_rate=0.4,
        drop_path_rate=0.2,
    )
    state_dict = torch.load(checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    print("[Export] Model loaded successfully.")

    dummy_input = torch.randn(1, 3, 224, 224)
    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[Export] Exporting to ONNX (opset {opset})...")
    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=opset,
    )
    print(f"[Export] ONNX model saved to: {output_path}")
    return output_path


def verify_onnx(onnx_path: str):
    """Verify the exported ONNX model with ONNX Runtime."""
    import onnxruntime as ort

    print("[Verify] Loading ONNX model with ONNX Runtime...")
    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name

    dummy = np.random.randn(1, 3, 224, 224).astype(np.float32)
    outputs = session.run(None, {input_name: dummy})
    logits = outputs[0]

    print(f"[Verify] Input shape:  {dummy.shape}")
    print(f"[Verify] Output shape: {logits.shape}")
    print(f"[Verify] Output logits: {logits[0]}")

    # Verify dynamic batch
    batch_dummy = np.random.randn(4, 3, 224, 224).astype(np.float32)
    batch_out = session.run(None, {input_name: batch_dummy})
    assert batch_out[0].shape[0] == 4, "Dynamic batch axis failed"
    print("[Verify] Dynamic batch axis: OK")
    print("[Verify] ONNX model is valid!")


def copy_to_backend(onnx_path: Path, backend_dir: str = None):
    """Copy ONNX model to backend/storage/models/."""
    if backend_dir is None:
        backend_dir = str(
            Path(__file__).parent.parent / "backend" / "storage" / "models"
        )
    dest_dir = Path(backend_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / onnx_path.name
    shutil.copy2(onnx_path, dest)
    print(f"[Copy] ONNX model copied to: {dest}")
    return dest


def main():
    parser = argparse.ArgumentParser(description="Export ASD-FaceNet to ONNX")
    parser.add_argument(
        "--checkpoint",
        default="outputs/checkpoints/efficientnet_b0_asd.pth",
        help="Path to .pth checkpoint",
    )
    parser.add_argument(
        "--output",
        default="outputs/efficientnet_b0_asd.onnx",
        help="Output ONNX file path",
    )
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset version")
    parser.add_argument(
        "--no-copy",
        action="store_true",
        help="Skip copying to backend/storage/models/",
    )
    parser.add_argument(
        "--copy-pth",
        action="store_true",
        help="Also copy the .pth checkpoint to backend/storage/models/",
    )
    args = parser.parse_args()

    if not Path(args.checkpoint).exists():
        print(f"[ERROR] Checkpoint not found: {args.checkpoint}")
        print("Train the model first: python train.py --config config/train_config.yaml")
        sys.exit(1)

    onnx_path = export_to_onnx(args.checkpoint, args.output, args.opset)
    verify_onnx(str(onnx_path))

    if not args.no_copy:
        copy_to_backend(onnx_path)

        if args.copy_pth:
            pth_src = Path(args.checkpoint)
            backend_models = (
                Path(__file__).parent.parent / "backend" / "storage" / "models"
            )
            dest_pth = backend_models / "efficientnet_b0_asd.pth"
            shutil.copy2(pth_src, dest_pth)
            print(f"[Copy] PyTorch model copied to: {dest_pth}")

    print("\n[DONE] Export complete.")
    print("Start the backend: cd ../backend && python run.py")


if __name__ == "__main__":
    main()
