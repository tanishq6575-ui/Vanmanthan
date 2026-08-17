import sys
import json
import argparse
from pathlib import Path
import numpy as np
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.services.reid_service import ReIDService
from app.services.gallery_service import GalleryService

def main():
    parser = argparse.ArgumentParser(description="Wildlife AI - Tiger Re-Identification CLI")
    parser.add_argument("image_path", help="Path to tiger crop image")
    parser.add_argument("--threshold", type=float, default=0.70, help="Re-ID match threshold (default 0.70)")
    args = parser.parse_args()

    crop_path = Path(args.image_path)
    if not crop_path.exists():
        print(f"Error: File not found: {crop_path}")
        sys.exit(1)

    print("==========================================")
    print("WILDLIFE AI - TIGER RE-ID INFERENCE")
    print("==========================================")
    print(f"Target Crop: {crop_path}")

    reid_service = ReIDService()
    gallery_service = GalleryService()

    embedding = reid_service.extract_embedding(str(crop_path))
    result = gallery_service.search(embedding, threshold=args.threshold)

    print("\n--- Identification Result ---")
    print(f"Status: {result['status'].upper()}")
    print(f"Identity ID: {result.get('identity_id', 'UNKNOWN')}")
    print(f"Similarity Score: {result.get('similarity_score', 0.0):.4f}")
    if result.get("tiger_profile"):
        p = result["tiger_profile"]
        print(f"Name: {p.get('name')}")
        print(f"Sex: {p.get('sex')}")
        print(f"Territory: {p.get('territory')}")
        print(f"Total Detections: {p.get('total_detections')}")

    print("\nTop Candidates:")
    for c in result.get("top_candidates", []):
        print(f"  - {c['identity_id']}: {c['similarity_score'] * 100:.1f}%")

if __name__ == "__main__":
    main()
