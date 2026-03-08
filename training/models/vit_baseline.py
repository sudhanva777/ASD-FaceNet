import torch
import torch.nn as nn
import timm


class ViTSmallASD(nn.Module):
    def __init__(self, pretrained: bool = True, num_classes: int = 2):
        super().__init__()
        self.model = timm.create_model(
            "vit_small_patch16_224",
            pretrained=pretrained,
            num_classes=num_classes,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def freeze_backbone(self):
        for name, param in self.model.named_parameters():
            if "head" not in name:
                param.requires_grad = False

    def unfreeze_all(self):
        for param in self.model.parameters():
            param.requires_grad = True

    def get_classifier_params(self):
        return [p for n, p in self.model.named_parameters() if "head" in n]
