import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path
from torchvision.models import mobilenet_v3_large, MobileNet_V3_Large_Weights

class TigerReIDNet(nn.Module):
    """
    Wildlife Re-ID Feature Representation Model.
    MobileNetV3 backbone + 512-D L2 Normalized Projection Head.
    Compatible with MiewID / WildlifeTools visual identity representations.
    """
    def __init__(self, embedding_dim: int = 512):
        super().__init__()
        weights = MobileNet_V3_Large_Weights.DEFAULT
        base = mobilenet_v3_large(weights=weights)
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        
        in_features = base.classifier[0].in_features
        self.head = nn.Sequential(
            nn.Linear(in_features, embedding_dim),
            nn.BatchNorm1d(embedding_dim),
            nn.ReLU(inplace=True),
            nn.Linear(embedding_dim, embedding_dim),
            nn.BatchNorm1d(embedding_dim)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.features(x)
        feat = self.pool(feat)
        feat = torch.flatten(feat, 1)
        emb = self.head(feat)
        return F.normalize(emb, p=2, dim=1)

def load_reid_model(weights_path: Path, device: str = "cpu") -> nn.Module:
    model = TigerReIDNet(embedding_dim=512).to(device)
    model.eval()
    if weights_path.exists():
        try:
            checkpoint = torch.load(weights_path, map_location=device)
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                model.load_state_dict(checkpoint["state_dict"], strict=False)
            elif isinstance(checkpoint, dict):
                model.load_state_dict(checkpoint, strict=False)
        except Exception as e:
            pass
    return model
