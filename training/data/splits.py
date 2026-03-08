"""
Generate 5-fold stratified splits from manifest.csv.

Adds a 'fold' column (0-4) to manifest.csv using StratifiedKFold.

Usage:
  python data/splits.py --manifest data/manifest.csv
"""
import argparse

import pandas as pd
from sklearn.model_selection import StratifiedKFold


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="data/manifest.csv")
    parser.add_argument("--n-folds", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = pd.read_csv(args.manifest)
    print(f"Loaded {len(df)} samples. Label distribution:\n{df['label'].value_counts()}")

    skf = StratifiedKFold(n_splits=args.n_folds, shuffle=True, random_state=args.seed)
    df["fold"] = -1

    for fold_idx, (_, val_idx) in enumerate(skf.split(df["image_path"], df["label"])):
        df.loc[val_idx, "fold"] = fold_idx

    df.to_csv(args.manifest, index=False)
    print(f"\nSaved manifest with fold column to {args.manifest}")
    print(df["fold"].value_counts().sort_index())


if __name__ == "__main__":
    main()
