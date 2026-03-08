"""
ASD-FaceNet Grad-CAM Visualization Script

Generate Grad-CAM heatmaps on random test images. Saves side-by-side
original + heatmap images to training/outputs/gradcam_samples/.

Usage:
    python gradcam_viz.py --config config/train_config.yaml --num-images 20
"""
import argparse
import random
import sys
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn.functional as F
import yaml
from PIL import Image

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Add training/ root so local imports resolve
sys.path.insert(0, str(Path(__file__).parent))
from models.efficientnet import EfficientNetB0ASD


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


class GradCAMVisualizer:
    def __init__(self, model_path: str, device: torch.device, cfg: dict = None):
        self.device = device

        if cfg is not None:
            drop_rate      = cfg["model"].get("drop_rate", 0.4)
            drop_path_rate = cfg["model"].get("drop_path_rate", 0.2)
            num_classes    = cfg["model"].get("num_classes", 2)
        else:
            drop_rate      = 0.4
            drop_path_rate = 0.2
            num_classes    = 2

        self.model = EfficientNetB0ASD(
            pretrained=False,
            num_classes=num_classes,
            drop_rate=drop_rate,
            drop_path_rate=drop_path_rate,
        )
        state_dict = torch.load(model_path, map_location=device, weights_only=True)
        self.model.load_state_dict(state_dict)
        self.model.eval().to(device)

        self.gradients  = None
        self.activations = None
        # Hook on backbone's conv_head — accessed via the wrapper's .model attribute
        target_layer = self.model.model.conv_head
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, image_path: str, target_class: int = None):
        """Return (original, heatmap_overlay, predicted_class, confidence)."""
        pil_image = Image.open(image_path).convert("RGB").resize((224, 224))
        original  = np.array(pil_image)

        img = original.astype(np.float32) / 255.0
        img = (img - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        img = np.transpose(img, (2, 0, 1))
        tensor = torch.tensor(img, dtype=torch.float32).unsqueeze(0).to(self.device)
        tensor.requires_grad_(True)

        output     = self.model(tensor)
        probs      = torch.softmax(output, dim=1)
        pred_class = output.argmax(dim=1).item()
        confidence = probs[0, pred_class].item()

        if target_class is None:
            target_class = pred_class

        self.model.zero_grad()
        output[0, target_class].backward()

        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=(224, 224), mode="bilinear", align_corners=False)
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)

        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)

        return original, overlay, pred_class, confidence


def create_side_by_side(original, overlay, label_true, label_pred, confidence, output_path):
    """Create a side-by-side image with original + Grad-CAM overlay."""
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))

    axes[0].imshow(original)
    axes[0].set_title("Original", fontsize=12, fontweight="bold")
    axes[0].axis("off")

    axes[1].imshow(overlay)
    pred_label = "ASD" if label_pred == 1 else "TD"
    true_label = "ASD" if label_true == 1 else "TD"
    color = "#ff6600" if pred_label == "ASD" else "#00cc66"
    axes[1].set_title(
        f"Grad-CAM — Pred: {pred_label} ({confidence:.1%})\nTrue: {true_label}",
        fontsize=11, fontweight="bold", color=color,
    )
    axes[1].axis("off")

    plt.tight_layout(pad=1.5)
    fig.savefig(output_path, bbox_inches="tight", dpi=150, facecolor="white")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="Generate Grad-CAM visualizations")
    parser.add_argument("--config",      default="config/train_config.yaml")
    parser.add_argument("--checkpoint",  default=None, help="Override checkpoint path")
    parser.add_argument("--num-images",  type=int, default=20)
    parser.add_argument("--seed",        type=int, default=42)
    parser.add_argument("--output-dir",  default="outputs/gradcam_samples")
    args = parser.parse_args()

    cfg = load_config(args.config)
    random.seed(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[GradCAM] Device: {device}")

    # Find checkpoint
    if args.checkpoint:
        ckpt_path = args.checkpoint
    else:
        ckpt_dir  = Path(cfg["output"]["checkpoint_dir"])
        best_name = cfg["output"].get("best_model_name", "efficientnet_b0_asd")
        ckpt_path = str(ckpt_dir / f"{best_name}.pth")
        if not Path(ckpt_path).exists():
            ckpt_path = str(ckpt_dir / "best_fold0.pth")

    if not Path(ckpt_path).exists():
        print(f"[ERROR] Checkpoint not found: {ckpt_path}")
        print("Train the model first: python train.py --config config/train_config.yaml")
        sys.exit(1)

    import pandas as pd
    manifest_path = Path(cfg["data"]["manifest_path"])
    if not manifest_path.exists():
        print(f"[ERROR] Manifest not found: {manifest_path}")
        sys.exit(1)

    df = pd.read_csv(manifest_path)
    print(f"[GradCAM] Loaded {len(df)} samples from manifest.")

    n = min(args.num_images, len(df))
    sample_df = df.sample(n=n, random_state=args.seed)
    print(f"[GradCAM] Generating visualizations for {n} images...")

    viz = GradCAMVisualizer(ckpt_path, device, cfg)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for idx, (_, row) in enumerate(sample_df.iterrows()):
        img_path   = row["image_path"]
        true_label = int(row["label"])

        if not Path(img_path).exists():
            print(f"  [{idx+1}/{n}] SKIP — file not found: {img_path}")
            continue

        try:
            original, overlay, pred_class, confidence = viz.generate(img_path)
            out_path = output_dir / f"gradcam_{idx:03d}.png"
            create_side_by_side(
                original, overlay, true_label, pred_class, confidence, out_path
            )
            pred_str = "ASD" if pred_class == 1 else "TD"
            true_str = "ASD" if true_label == 1 else "TD"
            status   = "✓" if pred_class == true_label else "✗"
            print(
                f"  [{idx+1}/{n}] {status} True={true_str} Pred={pred_str} "
                f"Conf={confidence:.2%} → {out_path.name}"
            )
        except Exception as exc:
            print(f"  [{idx+1}/{n}] ERROR: {exc}")

    print(f"\n[DONE] Grad-CAM samples saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
