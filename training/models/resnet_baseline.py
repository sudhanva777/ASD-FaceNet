import torch
import torch.nn as nn
import timm


class ResNet50ASD(nn.Module):
    def __init__(self, pretrained: bool = True, num_classes: int = 2, drop_rate: float = 0.3):
        super().__init__()
        self.model = timm.create_model(
            "resnet50",
            pretrained=pretrained,
            num_classes=num_classes,
            drop_rate=drop_rate,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def freeze_backbone(self):
        for name, param in self.model.named_parameters():
            if "fc" not in name:
                param.requires_grad = False

    def unfreeze_all(self):
        for param in self.model.parameters():
            param.requires_grad = True

    def get_classifier_params(self):
        return [p for n, p in self.model.named_parameters() if "fc" in n]
