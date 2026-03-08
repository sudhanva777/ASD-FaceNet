import numpy as np
from PIL import Image
from torch.utils.data import Dataset

import albumentations as A
from albumentations.pytorch import ToTensorV2


class ASDFaceDataset(Dataset):
    def __init__(self, image_paths, labels, is_training: bool = True):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = self._build(is_training)

    def _build(self, train: bool) -> A.Compose:
        if train:
            return A.Compose([
                A.HorizontalFlip(p=0.5),
                A.RandomResizedCrop(
                    size=(224, 224), scale=(0.8, 1.0), ratio=(0.9, 1.1), p=0.5
                ),
                A.ShiftScaleRotate(
                    shift_limit=0.1, scale_limit=0.15, rotate_limit=20,
                    border_mode=0, p=0.5
                ),
                A.Affine(shear=(-10, 10), p=0.2),
                A.OneOf([
                    A.RandomBrightnessContrast(
                        brightness_limit=0.3, contrast_limit=0.3
                    ),
                    A.HueSaturationValue(
                        hue_shift_limit=15, sat_shift_limit=30, val_shift_limit=25
                    ),
                    A.ColorJitter(
                        brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1
                    ),
                ], p=0.7),
                A.OneOf([
                    A.CLAHE(clip_limit=3.0),
                    A.Equalize(),
                ], p=0.2),
                A.RandomGamma(gamma_limit=(80, 120), p=0.2),
                A.OneOf([
                    A.GaussianBlur(blur_limit=(3, 5)),
                    A.MotionBlur(blur_limit=(3, 5)),
                    A.MedianBlur(blur_limit=3),
                ], p=0.2),
                A.CoarseDropout(
                    num_holes_range=(1, 4),
                    hole_height_range=(16, 40),
                    hole_width_range=(16, 40),
                    fill="random",
                    p=0.3,
                ),
                A.ImageCompression(quality_lower=70, quality_upper=100, p=0.2),
                A.GridDistortion(num_steps=5, distort_limit=0.1, p=0.1),
                A.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
                ToTensorV2(),
            ])
        return A.Compose([
            A.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
            ToTensorV2(),
        ])

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img = np.array(Image.open(self.image_paths[idx]).convert("RGB"))
        aug = self.transform(image=img)
        return aug["image"], self.labels[idx]
