import torch
import torch.nn as nn
import timm


class EfficientNetB0ASD(nn.Module):
    def __init__(
        self,
        pretrained: bool = True,
        num_classes: int = 2,
        drop_rate: float = 0.4,
        drop_path_rate: float = 0.2,
    ):
        super().__init__()
        # num_classes=0 removes the default classifier; backbone outputs raw features
        self.model = timm.create_model(
            "efficientnet_b0",
            pretrained=pretrained,
            num_classes=0,
            drop_rate=drop_rate,
            drop_path_rate=drop_path_rate,
        )
        num_features = self.model.num_features  # 1280 for efficientnet_b0
        self.classifier = nn.Sequential(
            nn.Dropout(drop_rate),
            nn.Linear(num_features, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(drop_rate * 0.5),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.model(x)          # [B, 1280]
        return self.classifier(features)  # [B, num_classes]

    def freeze_backbone(self):
        """Freeze backbone; keep custom classifier trainable."""
        for param in self.model.parameters():
            param.requires_grad = False
        for param in self.classifier.parameters():
            param.requires_grad = True

    def unfreeze_all(self):
        """Unfreeze all parameters for full fine-tuning."""
        for param in self.model.parameters():
            param.requires_grad = True
        for param in self.classifier.parameters():
            param.requires_grad = True

    def get_backbone_params(self):
        return list(self.model.parameters())

    def get_classifier_params(self):
        return list(self.classifier.parameters())

    def get_all_params(self):
        return self.get_backbone_params() + self.get_classifier_params()
