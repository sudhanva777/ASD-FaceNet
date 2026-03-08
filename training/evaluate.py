"""
ASD-FaceNet Evaluation Script
Computes per-fold and overall metrics: Accuracy, AUC-ROC, Sensitivity,
Specificity, Precision, F1, Brier Score. Generates ROC curves and
confusion matrices as PNG files.

Usage:
    python evaluate.py --config config/train_config.yaml
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score, roc_auc_score, confusion_matrix,
    precision_score, f1_score, brier_score_loss,
    RocCurveDisplay,
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from data.dataset import ASDFaceDataset
from models.efficientnet import EfficientNetB0ASD


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def get_device(config_device: str) -> torch.device:
    if config_device == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(config_device)


@torch.no_grad()
def run_inference(model, loader, device):
    model.eval()
    all_probs, all_labels = [], []
    for imgs, labels in loader:
        imgs = imgs.to(device)
        logits = model(imgs)
        probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
        all_probs.extend(probs)
        all_labels.extend(labels.numpy())
    return np.array(all_labels), np.array(all_probs)


def compute_metrics(labels, probs, threshold: float = 0.5) -> dict:
    preds = (probs >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(labels, preds, labels=[0, 1]).ravel()
    sensitivity = tp / (tp + fn + 1e-8)
    specificity = tn / (tn + fp + 1e-8)
    return {
        "accuracy":    accuracy_score(labels, preds),
        "auc_roc":     roc_auc_score(labels, probs),
        "sensitivity": sensitivity,
        "specificity": specificity,
        "precision":   precision_score(labels, preds, zero_division=0),
        "f1":          f1_score(labels, preds, zero_division=0),
        "brier_score": brier_score_loss(labels, probs),
        "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn),
    }


def plot_confusion_matrix(labels, probs, fold: int, output_dir: Path):
    preds = (probs >= 0.5).astype(int)
    cm = confusion_matrix(labels, preds, labels=[0, 1])
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=["TD", "ASD"], yticklabels=["TD", "ASD"], ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix — Fold {fold + 1}")
    path = output_dir / f"confusion_matrix_fold{fold}.png"
    fig.savefig(path, bbox_inches="tight", dpi=150)
    plt.close(fig)
    return path


def plot_roc_all_folds(fold_results: list, output_dir: Path):
    fig, ax = plt.subplots(figsize=(7, 6))
    for r in fold_results:
        RocCurveDisplay.from_predictions(
            r["labels"], r["probs"],
            name=f"Fold {r['fold']+1} (AUC={r['metrics']['auc_roc']:.3f})",
            ax=ax,
        )
    ax.plot([0, 1], [0, 1], "k--", label="Chance")
    ax.set_title("ROC Curves — All Folds")
    ax.legend(loc="lower right", fontsize=8)
    path = output_dir / "roc_all_folds.png"
    fig.savefig(path, bbox_inches="tight", dpi=150)
    plt.close(fig)
    return path


def main():
    parser = argparse.ArgumentParser(description="Evaluate ASD-FaceNet checkpoints")
    parser.add_argument("--config", default="config/train_config.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    device = get_device(cfg["training"]["device"])
    print(f"[Eval] Device: {device}")

    manifest_path = Path(cfg["data"]["manifest_path"])
    if not manifest_path.exists():
        print(f"[ERROR] Manifest not found at {manifest_path}")
        sys.exit(1)

    df = pd.read_csv(manifest_path)
    ckpt_dir   = Path(cfg["output"]["checkpoint_dir"])
    output_dir = Path("outputs/eval")
    output_dir.mkdir(parents=True, exist_ok=True)

    fold_results = []
    all_metrics  = []

    for fold in range(cfg["data"]["num_folds"]):
        ckpt_path = ckpt_dir / f"best_fold{fold}.pth"
        if not ckpt_path.exists():
            print(f"[WARN] Checkpoint not found: {ckpt_path} — skipping fold {fold}")
            continue

        val_df = df[df["fold"] == fold]
        val_ds = ASDFaceDataset(
            val_df["image_path"].tolist(),
            val_df["label"].tolist(),
            is_training=False,
        )
        val_loader = DataLoader(
            val_ds, batch_size=cfg["data"]["batch_size"], shuffle=False
        )

        model = EfficientNetB0ASD(
            pretrained=False,
            num_classes=cfg["model"]["num_classes"],
            drop_rate=cfg["model"]["drop_rate"],
            drop_path_rate=cfg["model"].get("drop_path_rate", 0.2),
        ).to(device)
        model.load_state_dict(
            torch.load(ckpt_path, map_location=device, weights_only=True)
        )
        print(f"\n[Eval] Fold {fold+1} — {len(val_df)} samples")

        labels, probs = run_inference(model, val_loader, device)
        metrics = compute_metrics(labels, probs)
        all_metrics.append(metrics)

        print(f"  Accuracy   : {metrics['accuracy']:.4f}")
        print(f"  AUC-ROC    : {metrics['auc_roc']:.4f}")
        print(f"  Sensitivity: {metrics['sensitivity']:.4f}")
        print(f"  Specificity: {metrics['specificity']:.4f}")
        print(f"  Precision  : {metrics['precision']:.4f}")
        print(f"  F1         : {metrics['f1']:.4f}")
        print(f"  Brier Score: {metrics['brier_score']:.4f}")

        cm_path = plot_confusion_matrix(labels, probs, fold, output_dir)
        print(f"  Confusion matrix saved: {cm_path}")

        fold_results.append(
            {"fold": fold, "labels": labels, "probs": probs, "metrics": metrics}
        )

    if not all_metrics:
        print("[ERROR] No folds evaluated.")
        sys.exit(1)

    # ── Overall summary ────────────────────────────────────────────────────────
    metric_keys = [
        "accuracy", "auc_roc", "sensitivity", "specificity",
        "precision", "f1", "brier_score",
    ]
    print(f"\n{'='*65}")
    print("  OVERALL RESULTS (mean ± std across folds)")
    print(f"{'='*65}")
    for key in metric_keys:
        vals = np.array([m[key] for m in all_metrics])
        print(f"  {key:<18}: {vals.mean():.4f} ± {vals.std():.4f}")

    roc_path = plot_roc_all_folds(fold_results, output_dir)
    print(f"\n  ROC curves saved: {roc_path}")
    print(f"  All evaluation outputs in: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
