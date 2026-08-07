import torch
import torch.nn as nn
from torchvision.models import mobilenet_v2, MobileNet_V2_Weights


class DRMobileNetV2(nn.Module):

    def __init__(self, num_classes=5, freeze_features=True):
        super().__init__()

        # Load pretrained MobileNetV2
        weights = MobileNet_V2_Weights.DEFAULT
        self.model = mobilenet_v2(weights=weights)

        # Freeze feature extractor (optional)
        if freeze_features:
            for param in self.model.features.parameters():
                param.requires_grad = False

        # Replace classifier
        in_features = self.model.classifier[1].in_features

        self.model.classifier[1] = nn.Linear(
            in_features,
            num_classes
        )

    def forward(self, x):
        return self.model(x)


if __name__ == "__main__":

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    model = DRMobileNetV2().to(device)

    print(model)

    dummy = torch.randn(4, 3, 224, 224).to(device)

    output = model(dummy)

    print("Output Shape :", output.shape)