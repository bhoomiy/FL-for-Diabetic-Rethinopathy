import base64
from io import BytesIO

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer

        self.activations = None
        self.gradients = None

        # Capture activations during forward pass
        self.forward_handle = target_layer.register_forward_hook(
            self._save_activation
        )

    def _save_activation(self, module, inputs, output):
        self.activations = output

        # Directly retain the gradient of this output
        if output.requires_grad:
            output.register_hook(self._save_gradient)

    def _save_gradient(self, gradient):
        self.gradients = gradient

    def generate(self, input_tensor, target_class):

        self.activations = None
        self.gradients = None

        self.model.zero_grad(set_to_none=True)

        with torch.enable_grad():

            output = self.model(input_tensor)

            target_score = output[:, target_class].sum()

            target_score.backward()

        if self.activations is None:
            raise RuntimeError(
                "Grad-CAM could not capture activations."
            )

        if self.gradients is None:
            raise RuntimeError(
                "Grad-CAM could not capture gradients."
            )

        activations = self.activations
        gradients = self.gradients

        # Global average pooling of gradients
        weights = gradients.mean(
            dim=(2, 3),
            keepdim=True
        )

        # Weighted combination of feature maps
        cam = (weights * activations).sum(dim=1)

        cam = F.relu(cam)

        # Resize CAM to input image size
        cam = F.interpolate(
            cam.unsqueeze(1),
            size=input_tensor.shape[2:],
            mode="bilinear",
            align_corners=False
        ).squeeze(1)

        cam = cam[0].detach().cpu().numpy()

        # Normalize between 0 and 1
        cam_min = cam.min()
        cam_max = cam.max()

        if cam_max - cam_min > 1e-8:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = np.zeros_like(cam)

        return cam

    def close(self):
        self.forward_handle.remove()


def create_gradcam_overlay(original_image, cam):

    original_image = original_image.convert("RGB")

    width, height = original_image.size

    cam_uint8 = np.uint8(cam * 255)

    cam_image = Image.fromarray(
        cam_uint8,
        mode="L"
    )

    cam_image = cam_image.resize(
        (width, height),
        Image.Resampling.BILINEAR
    )

    cam_array = np.asarray(
        cam_image,
        dtype=np.float32
    ) / 255.0

    heatmap = np.zeros(
        (height, width, 3),
        dtype=np.uint8
    )

    heatmap[:, :, 0] = np.uint8(
        np.clip(cam_array * 255, 0, 255)
    )

    heatmap[:, :, 1] = np.uint8(
        np.clip(
            (1.0 - np.abs(cam_array - 0.5) * 2) * 255,
            0,
            255
        )
    )

    heatmap[:, :, 2] = np.uint8(
        np.clip((1.0 - cam_array) * 255, 0, 255)
    )

    heatmap_image = Image.fromarray(
        heatmap,
        mode="RGB"
    )

    overlay = Image.blend(
        original_image,
        heatmap_image,
        alpha=0.45
    )

    return overlay


def image_to_base64(image):

    buffer = BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=90
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return f"data:image/jpeg;base64,{encoded}"