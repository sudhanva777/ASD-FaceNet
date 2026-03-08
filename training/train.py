"""
ASD-FaceNet Training Script
5-Fold Stratified Cross-Validation with 2-Phase Fine-Tuning.

Usage:
    python train.py --config config/train_config.yaml
    python train.py --config config/train_config.yaml --folds 1   # quick test
"""
import argparse
import math
import os
import random
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler
from sklearn.metrics import roc_auc_score

# Try TensorBoard (optional)
try:
    from torch.utils.tensorboard import SummaryWriter
    HAS_TB = True
except ImportError:
    HAS_TB = False

import yaml

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))
from data.dataset import ASDFaceDataset
from models.efficientnet import EfficientNetB0ASD


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def get_device(config_device: str) -> torch.device:
    if config_device == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(config_device)


# ── Anti-overfitting helpers ──────────────────────────────────────────────────

def mixup_data(x, y, alpha=0.2):
    """Returns mixed inputs, pairs of targets, and mixing coefficient."""
    lam = np.random.beta(alpha, alpha)
    batch_size = x.size(0)
    index = torch.randperm(batch_size, device=x.device)
    mixed_x = lam * x + (1 - lam) * x[index]
    y_a, y_b = y, y[index]
    return mixed_x, y_a, y_b, lam


def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)


def compute_class_weights(labels):
    """Inverse-frequency class weights as FloatTensor, ordered by class index."""
    labels_arr = np.array(labels)
    classes = sorted(np.unique(labels_arr).tolist())
    n_total = len(labels_arr)
    weights = []
    for c in classes:
        count = int(np.sum(labels_arr == c))
        weights.append(n_total / (len(classes) * count))
    return torch.FloatTensor(weights)


def make_weighted_sampler(labels):
    """WeightedRandomSampler with inverse-frequency per-sample weights."""
    labels_arr = np.array(labels)
    class_counts = np.bincount(labels_arr)
    class_weights = 1.0 / class_counts.astype(float)
    sample_weights = class_weights[labels_arr]
    return WeightedRandomSampler(
        weights=torch.FloatTensor(sample_weights),
        num_samples=len(labels_arr),
        replacement=True,
    )


def get_warmup_cosine_scheduler(optimizer, warmup_epochs, total_epochs):
    """Linear warmup then cosine decay LambdaLR scheduler."""
    def lr_lambda(epoch):
        if epoch < warmup_epochs:
            return float(epoch + 1) / float(max(1, warmup_epochs))
        progress = float(epoch - warmup_epochs) / float(
            max(1, total_epochs - warmup_epochs)
        )
        return 0.5 * (1.0 + math.cos(math.pi * progress))
    return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)


# ── Core training / evaluation ────────────────────────────────────────────────

def train_one_epoch(
    model, loader, optimizer, criterion, device,
    scaler=None, use_mixup=False, mixup_alpha=0.2, grad_clip=1.0,
):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()

        apply_mixup = use_mixup and (np.random.random() > 0.5)

        if scaler is not None:
            with torch.cuda.amp.autocast():
                if apply_mixup:
                    mixed_x, y_a, y_b, lam = mixup_data(imgs, labels, mixup_alpha)
                    logits = model(mixed_x)
                    loss = mixup_criterion(criterion, logits, y_a, y_b, lam)
                else:
                    logits = model(imgs)
                    loss = criterion(logits, labels)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
            scaler.step(optimizer)
            scaler.update()
        else:
            if apply_mixup:
                mixed_x, y_a, y_b, lam = mixup_data(imgs, labels, mixup_alpha)
                logits = model(mixed_x)
                loss = mixup_criterion(criterion, logits, y_a, y_b, lam)
            else:
                logits = model(imgs)
                loss = criterion(logits, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
            optimizer.step()

        total_loss += loss.item() * imgs.size(0)
        preds = logits.detach().argmax(dim=1)
        ref_labels = y_a if apply_mixup else labels
        correct += (preds == ref_labels).sum().item()
        total += imgs.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(model, loader, device, criterion=None):
    model.eval()
    all_probs = []
    all_labels = []
    correct = 0
    total = 0
    total_loss = 0.0

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        logits = model(imgs)
        probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += imgs.size(0)
        all_probs.extend(probs)
        all_labels.extend(labels.cpu().numpy())
        if criterion is not None:
            total_loss += criterion(logits, labels).item() * imgs.size(0)

    acc = correct / total
    auc = roc_auc_score(all_labels, all_probs) if len(set(all_labels)) > 1 else 0.0
    val_loss = total_loss / total if criterion is not None else 0.0
    return acc, auc, val_loss


# ── Fold training ─────────────────────────────────────────────────────────────

def train_fold(
    fold, train_paths, train_labels, val_paths, val_labels,
    cfg, device, output_dir, num_folds=None,
):
    print(f"\n{'='*60}")
    _nf = num_folds if num_folds is not None else cfg["data"]["num_folds"]
    print(f"  FOLD {fold + 1}/{_nf}")
    print(f"{'='*60}")
    print(f"  Train: {len(train_paths)}  |  Val: {len(val_paths)}")

    train_ds = ASDFaceDataset(train_paths, train_labels, is_training=True)
    val_ds   = ASDFaceDataset(val_paths,   val_labels,   is_training=False)

    num_workers = 0  # Windows CPU: always 0
    sampler = make_weighted_sampler(train_labels)
    train_loader = DataLoader(
        train_ds,
        batch_size=cfg["data"]["batch_size"],
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=(device.type == "cuda"),
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=cfg["data"]["batch_size"],
        shuffle=False,
        num_workers=num_workers,
    )

    class_weights = compute_class_weights(train_labels).to(device)
    criterion = nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=cfg["training"]["label_smoothing"],
    )

    model = EfficientNetB0ASD(
        pretrained=cfg["model"]["pretrained"],
        num_classes=cfg["model"]["num_classes"],
        drop_rate=cfg["model"]["drop_rate"],
        drop_path_rate=cfg["model"].get("drop_path_rate", 0.2),
    ).to(device)

    use_amp = cfg["training"]["mixed_precision"] and device.type == "cuda"
    scaler  = torch.cuda.amp.GradScaler() if use_amp else None

    grad_clip   = cfg["training"].get("grad_clip", 1.0)
    use_mixup   = cfg["training"].get("use_mixup", True)
    mixup_alpha = cfg["training"].get("mixup_alpha", 0.2)

    # ── Phase A: Linear Probe ────────────────────────────────────────────────
    print("\n  [Phase A] Linear probe (frozen backbone)...")
    model.freeze_backbone()
    optimizer_a = torch.optim.AdamW(
        model.get_classifier_params(),
        lr=cfg["training"]["linear_probe_lr"],
    )

    for epoch in range(cfg["training"]["linear_probe_epochs"]):
        loss, acc = train_one_epoch(
            model, train_loader, optimizer_a, criterion, device,
            scaler=scaler, use_mixup=False, grad_clip=grad_clip,
        )
        val_acc, val_auc, _ = evaluate(model, val_loader, device, criterion)
        print(
            f"    Probe Ep {epoch+1:02d}/{cfg['training']['linear_probe_epochs']} "
            f"| loss={loss:.4f} acc={acc:.3f} "
            f"| val_acc={val_acc:.3f} val_auc={val_auc:.3f}"
        )

    # ── Phase B: Full Fine-Tune ───────────────────────────────────────────────
    print("\n  [Phase B] Full fine-tuning (differential LR)...")
    model.unfreeze_all()

    finetune_lr = cfg["training"]["finetune_lr"]
    optimizer_b = torch.optim.AdamW(
        [
            {"params": model.get_backbone_params(),    "lr": finetune_lr * 0.1},
            {"params": model.get_classifier_params(),  "lr": finetune_lr},
        ],
        weight_decay=cfg["training"]["weight_decay"],
    )
    scheduler = get_warmup_cosine_scheduler(
        optimizer_b,
        warmup_epochs=cfg["training"].get("warmup_epochs", 3),
        total_epochs=cfg["training"]["finetune_epochs"],
    )

    best_auc      = 0.0
    best_val_loss = float("inf")
    patience_counter = 0
    best_ckpt = output_dir / f"best_fold{fold}.pth"

    # TensorBoard writer
    writer = None
    if HAS_TB:
        log_dir = Path(cfg["output"]["log_dir"]) / f"fold{fold}"
        log_dir.mkdir(parents=True, exist_ok=True)
        writer = SummaryWriter(str(log_dir))

    for epoch in range(cfg["training"]["finetune_epochs"]):
        loss, acc = train_one_epoch(
            model, train_loader, optimizer_b, criterion, device,
            scaler=scaler,
            use_mixup=use_mixup,
            mixup_alpha=mixup_alpha,
            grad_clip=grad_clip,
        )
        val_acc, val_auc, val_loss = evaluate(model, val_loader, device, criterion)
        scheduler.step()

        lr = optimizer_b.param_groups[0]["lr"]
        overfit_gap = acc - val_acc
        gap_flag = "  ⚠ OVERFIT" if overfit_gap > 0.15 else ""

        print(
            f"    FT Ep {epoch+1:03d}/{cfg['training']['finetune_epochs']} "
            f"| loss={loss:.4f} acc={acc:.3f} "
            f"| val_acc={val_acc:.3f} val_auc={val_auc:.3f} val_loss={val_loss:.4f} "
            f"| gap={overfit_gap:+.3f}{gap_flag} | lr={lr:.2e}"
        )

        if writer:
            writer.add_scalar(f"fold{fold}/train_loss",   loss,        epoch)
            writer.add_scalar(f"fold{fold}/train_acc",    acc,         epoch)
            writer.add_scalar(f"fold{fold}/val_acc",      val_acc,     epoch)
            writer.add_scalar(f"fold{fold}/val_auc",      val_auc,     epoch)
            writer.add_scalar(f"fold{fold}/val_loss",     val_loss,    epoch)
            writer.add_scalar(f"fold{fold}/overfit_gap",  overfit_gap, epoch)
            writer.add_scalar(f"fold{fold}/lr",           lr,          epoch)

        improved = (val_auc > best_auc) or (val_loss < best_val_loss)
        if improved:
            if val_auc > best_auc:
                best_auc = val_auc
            if val_loss < best_val_loss:
                best_val_loss = val_loss
            patience_counter = 0
            torch.save(model.state_dict(), best_ckpt)
            print(
                f"    [*] Checkpoint saved — AUC={best_auc:.4f} "
                f"val_loss={best_val_loss:.4f} → {best_ckpt.name}"
            )
        else:
            patience_counter += 1
            if patience_counter >= cfg["training"]["early_stop_patience"]:
                print(f"    [Early stop] patience={patience_counter}")
                break

    if writer:
        writer.close()

    return best_auc, best_ckpt


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train ASD-FaceNet")
    parser.add_argument("--config", default="config/train_config.yaml")
    parser.add_argument(
        "--folds", type=int, default=None,
        help="Number of folds to train (default: all folds from config). "
             "Use --folds 1 to train only fold 0 for a quick test.",
    )
    args = parser.parse_args()

    cfg = load_config(args.config)
    set_seed(cfg["seed"])

    device = get_device(cfg["training"]["device"])
    print(f"[Train] Device: {device}")
    print(f"[Train] Experiment: {cfg['experiment_name']}")

    # Load manifest
    manifest_path = Path(cfg["data"]["manifest_path"])
    if not manifest_path.exists():
        print(f"[ERROR] Manifest not found at {manifest_path}")
        print("Run: python data/preprocess.py  then  python data/splits.py")
        sys.exit(1)

    df = pd.read_csv(manifest_path)
    if "fold" not in df.columns:
        print("[ERROR] Manifest missing 'fold' column. Run: python data/splits.py")
        sys.exit(1)

    # Dataset stats
    total     = len(df)
    asd_count = int((df["label"] == 1).sum())
    td_count  = int((df["label"] == 0).sum())
    ratio     = asd_count / max(td_count, 1)
    print(f"\n[Train] Dataset Stats:")
    print(f"  Total: {total} | ASD: {asd_count} | TD: {td_count} | ASD/TD ratio: {ratio:.3f}")

    output_dir = Path(cfg["output"]["checkpoint_dir"])
    output_dir.mkdir(parents=True, exist_ok=True)

    num_folds = cfg["data"]["num_folds"]
    if args.folds is not None:
        num_folds = min(args.folds, num_folds)
        print(f"[Train] Training {num_folds} fold(s) only (--folds {args.folds})")

    fold_aucs  = []
    fold_ckpts = []

    for fold in range(num_folds):
        train_df = df[df["fold"] != fold]
        val_df   = df[df["fold"] == fold]

        train_paths  = train_df["image_path"].tolist()
        train_labels = train_df["label"].tolist()
        val_paths    = val_df["image_path"].tolist()
        val_labels   = val_df["label"].tolist()

        best_auc, ckpt = train_fold(
            fold, train_paths, train_labels, val_paths, val_labels,
            cfg, device, output_dir, num_folds=num_folds,
        )
        fold_aucs.append(best_auc)
        fold_ckpts.append(ckpt)

    # ── Summary ───────────────────────────────────────────────────────────────
    aucs = np.array(fold_aucs)
    print(f"\n{'='*60}")
    print("  TRAINING COMPLETE")
    print(f"{'='*60}")
    for i, (auc, ckpt) in enumerate(zip(fold_aucs, fold_ckpts)):
        print(f"  Fold {i+1}: AUC={auc:.4f}  ckpt={ckpt.name}")
    print(f"\n  Mean AUC: {aucs.mean():.4f} ± {aucs.std():.4f}")

    # Copy best overall checkpoint
    best_fold_idx = int(np.argmax(fold_aucs))
    best_overall  = fold_ckpts[best_fold_idx]
    best_name     = cfg["output"]["best_model_name"]
    best_dest     = output_dir / f"{best_name}.pth"
    shutil.copy(best_overall, best_dest)
    print(f"\n  Best model (fold {best_fold_idx+1}) copied to: {best_dest}")
    print(f"\nNext step: python export_onnx.py --checkpoint {best_dest}")


if __name__ == "__main__":
    main()
