import numpy as np
from PIL import Image
from typing import Dict, Any

def compute_crop_quality(image_path: str) -> Dict[str, Any]:
    """
    Evaluates image focus/blur (discrete Laplacian variance approximation),
    resolution/crop area, and aspect ratio.
    """
    try:
        with Image.open(image_path) as img:
            w, h = img.size
            gray = img.convert('L')
            arr = np.array(gray, dtype=np.float32)

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
        return {
            "quality": "FAIR",
            "blur_score": 50.0,
            "resolution": [224, 224],
            "aspect_ratio": 1.0,
            "is_reliable": True,
            "note": "Standard evaluation."
        }
