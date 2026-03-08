import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn.functional as F
import timm


class GradCAMGenerator:
    def __init__(self, model_path: str, use_gpu: bool = False):
        self.device = torch.device("cuda" if use_gpu else "cpu")
        self.model = timm.create_model(
            "efficientnet_b0", pretrained=False, num_classes=2
        )
        state_dict = torch.load(model_path, map_location=self.device, weights_only=False)
        # Strip "model." prefix if present (training script wraps model in a container)
        new_state_dict = {}
        for k, v in state_dict.items():
            new_key = k[len("model."):] if k.startswith("model.") else k
            if "num_batches_tracked" not in new_key:
                new_state_dict[new_key] = v
        self.model.load_state_dict(new_state_dict, strict=False)
        self.model.eval().to(self.device)

        self.gradients = None
        self.activations = None
        target_layer = self.model.conv_head

        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_full_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, face_pil: Image.Image, target_class: int = 1) -> np.ndarray:
        img_tensor = self._preprocess(face_pil).to(self.device)
        img_tensor.requires_grad_(True)

        output = self.model(img_tensor)
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
        original = np.array(face_pil.resize((224, 224)))
        overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
        return overlay.astype(np.uint8)

    @staticmethod
    def _preprocess(pil_image: Image.Image) -> torch.Tensor:
        img = np.array(pil_image.resize((224, 224))).astype(np.float32) / 255.0
        img = (img - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        img = np.transpose(img, (2, 0, 1))
        return torch.tensor(img, dtype=torch.float32).unsqueeze(0)
