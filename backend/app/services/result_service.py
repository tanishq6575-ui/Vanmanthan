import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from app.config import settings
from app.utils.logging_config import logger

class ResultService:
    @staticmethod
    def classify_image(detections: List[Dict[str, Any]]) -> str:
        """
        Classifies an image based on MegaDetector detections above confidence threshold:
        - blank
        - animal_detected
        - person_detected
        - vehicle_detected
        - mixed
        """
        if not detections:
            return "blank"
        
        categories = set(d.get("category", "animal").lower() for d in detections)
        
        if len(categories) == 1:
            cat = list(categories)[0]
            if cat == "animal":
                return "animal_detected"
            elif cat == "person":
                return "person_detected"
            elif cat == "vehicle":
                return "vehicle_detected"
            else:
                return f"{cat}_detected"
        else:
            return "mixed"

    @classmethod
    def save_result_json(
        cls,
        image_id: str,
        original_filename: str,
        detections: List[Dict[str, Any]],
        annotated_image: str = None,
        annotated_image_url: str = None
    ) -> Dict[str, Any]:
        """
        Constructs and persists the standard detection result JSON to disk.
        """
        img_url = annotated_image or annotated_image_url or ""
        classification = cls.classify_image(detections)
        timestamp_iso = datetime.now(timezone.utc).isoformat()

        result_data = {
            "image_id": image_id,
            "original_filename": original_filename,
            "original_image": f"/uploads/{image_id}{Path(original_filename).suffix.lower()}",
            "timestamp": timestamp_iso,
            "model": "MegaDetectorV6",
            "model_version": settings.MEGADETECTOR_VERSION,
            "threshold": settings.MEGADETECTOR_THRESHOLD,
            "status": "processed",
            "classification": classification,
            "detections": detections,
            "annotated_image": img_url
        }

        # Save JSON file in results directory
        json_filename = f"{image_id}.json"
        abs_json_path = settings.abs_result_dir / json_filename

        with open(abs_json_path, "w", encoding="utf-8") as f:
            json.dump(result_data, f, indent=2)

        logger.info(f"Saved result JSON: {abs_json_path}")
        return result_data
