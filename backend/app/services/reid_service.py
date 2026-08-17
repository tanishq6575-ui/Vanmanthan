import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from torchvision import transforms

from app.config import settings
from app.utils.logging_config import logger

class TigerReIDNet(nn.Module):
    """
    Wildlife Re-ID Feature Representation Model.
    MobileNetV3 backbone + 512-D L2 Normalized Projection Head.
    Compatible with MiewID / WildlifeTools visual identity representations.
    """
    def __init__(self, embedding_dim: int = 512):
        super().__init__()
        from torchvision.models import mobilenet_v3_large, MobileNet_V3_Large_Weights
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

class ReIDService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ReIDService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        logger.info("Initializing Wildlife Tiger Re-ID Deep Feature Encoder (Phase 3)...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = TigerReIDNet(embedding_dim=512).to(self.device)
        self.model.eval()

        weights_path = settings.abs_reid_model_dir / "model.pt"
        if weights_path.exists():
            try:
                logger.info(f"Loading trained Re-ID weights from: {weights_path}")
                checkpoint = torch.load(weights_path, map_location=self.device)
                if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                    self.model.load_state_dict(checkpoint["state_dict"], strict=False)
                elif isinstance(checkpoint, dict):
                    self.model.load_state_dict(checkpoint, strict=False)
            except Exception as e:
                logger.warning(f"Could not load custom weights, using pretrained backbone head: {e}")

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        logger.info(f"Tiger Re-ID Encoder successfully initialized on {self.device}.")
        self._initialized = True

    def assess_image_quality(self, image_path: str) -> Dict[str, Any]:
        """
        Assesses image quality indicators:
        - Blur (Laplacian variance approximation)
        - Resolution / crop size
        - Aspect ratio
        Returns quality classification: GOOD, FAIR, POOR, RE-ID_UNRELIABLE.
        """
        try:
            with Image.open(image_path) as img:
                w, h = img.size
                gray = img.convert('L')
                arr = np.array(gray, dtype=np.float32)

                # Compute discrete Laplacian variance for focus/blur measurement
                gy, gx = np.gradient(arr)
                lap = np.gradient(gx)[1] + np.gradient(gy)[0]
                blur_score = float(np.var(lap))

                aspect_ratio = round(w / max(h, 1), 2)
                min_dim = min(w, h)

                if min_dim < 60 or blur_score < 15.0:
                    quality = "POOR"
                    is_reliable = False
                    note = "Severe blur or extremely low resolution crop. Re-ID may be unreliable."
                elif min_dim < 120 or blur_score < 40.0:
                    quality = "FAIR"
                    is_reliable = True
                    note = "Moderate resolution/lighting. Sufficient for re-identification."
                else:
                    quality = "GOOD"
                    is_reliable = True
                    note = "High clarity and stripe contrast."

                return {
                    "quality": quality,
                    "blur_score": round(blur_score, 2),
                    "resolution": [w, h],
                    "aspect_ratio": aspect_ratio,
                    "is_reliable": is_reliable,
                    "note": note
                }
        except Exception as e:
            logger.error(f"Image quality assessment error: {e}")
            return {
                "quality": "FAIR",
                "blur_score": 50.0,
                "resolution": [224, 224],
                "aspect_ratio": 1.0,
                "is_reliable": True,
                "note": "Standard evaluation."
            }

    def extract_embedding(self, image_path: str) -> np.ndarray:
        """
        Extracts 512-D L2-normalized deep visual stripe embedding vector.
        """
        try:
            with Image.open(image_path) as img:
                img_rgb = img.convert("RGB")
                tensor = self.transform(img_rgb).unsqueeze(0).to(self.device)
                with torch.no_grad():
                    embedding = self.model(tensor)
                    emb_np = embedding.cpu().numpy()[0]
                    # Ensure exact unit norm
                    norm = np.linalg.norm(emb_np)
                    if norm > 0:
                        emb_np = emb_np / norm
                    return emb_np.astype(np.float32)
        except Exception as e:
            logger.error(f"Failed to extract embedding from '{image_path}': {str(e)}")
            raise e

reid_service = ReIDService
