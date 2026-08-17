import torch
import numpy as np
from PIL import Image
from torchvision import transforms

transform_pipeline = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def extract_image_embedding(model: torch.nn.Module, image_path: str, device: str = "cpu") -> np.ndarray:
    """
    Extracts a 512-dimensional L2-normalized feature representation from a tiger image crop.
    """
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
        tensor = transform_pipeline(img_rgb).unsqueeze(0).to(device)
        with torch.no_grad():
            emb = model(tensor)
            emb_np = emb.cpu().numpy()[0]
            norm = np.linalg.norm(emb_np)
            if norm > 0:
                emb_np = emb_np / norm
            return emb_np.astype(np.float32)
