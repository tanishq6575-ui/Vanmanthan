import os
from pathlib import Path
from typing import List, Dict, Any, Tuple
from PIL import Image, ImageDraw, ImageFont
from app.config import settings
from app.utils.logging_config import logger

class ImageService:
    @staticmethod
    def _parse_bbox_coords(bbox: List[float], img_width: int, img_height: int) -> Tuple[int, int, int, int]:
        """
        Converts bbox coordinates (whether normalized [0..1] or pixel coordinates,
        and whether [x1, y1, x2, y2] or [x1, y1, width, height]) into absolute pixel (x1, y1, x2, y2).
        """
        b0, b1, b2, b3 = bbox
        
        # Check if coordinates are normalized [0..1]
        is_normalized = max(b0, b1, b2, b3) <= 1.05

        if is_normalized:
            # Normalized coordinates
            x1 = b0 * img_width
            y1 = b1 * img_height
            
            # Check if b2/b3 are width/height or x2/y2
            if b2 < b0 or b3 < b1:
                # [x1, y1, width, height]
                x2 = (b0 + b2) * img_width
                y2 = (b1 + b3) * img_height
            else:
                # [x1, y1, x2, y2]
                x2 = b2 * img_width
                y2 = b3 * img_height
        else:
            # Absolute pixel coordinates
            x1, y1 = b0, b1
            if b2 < b0 or b3 < b1:
                # [x1, y1, width, height]
                x2 = b0 + b2
                y2 = b1 + b3
            else:
                # [x1, y1, x2, y2]
                x2, y2 = b2, b3

        # Clamp to image boundaries
        x1_clamp = max(0, min(int(round(x1)), img_width - 1))
        y1_clamp = max(0, min(int(round(y1)), img_height - 1))
        x2_clamp = max(x1_clamp + 1, min(int(round(x2)), img_width))
        y2_clamp = max(y1_clamp + 1, min(int(round(y2)), img_height))

        return x1_clamp, y1_clamp, x2_clamp, y2_clamp

    @classmethod
    def process_image_visuals(
        cls,
        image_path: Path,
        image_id: str,
        detections: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Draws bounding box annotations and creates crops for animal detections.
        Returns:
            annotated_image_url: Relative URL path for the annotated image.
            updated_detections: Detection list with added `crop_path` fields for animal crops.
        """
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img_w, img_h = img.size
            
            # Prepare image draw object
            annotated_img = img.copy()
            draw = ImageDraw.Draw(annotated_img)
            
            # Font setup
            try:
                font = ImageFont.truetype("arial.ttf", size=max(14, int(img_h * 0.02)))
            except IOError:
                font = ImageFont.load_default()

            category_colors = {
                "animal": "#10B981",   # Green
                "person": "#3B82F6",   # Blue
                "vehicle": "#F59E0B"   # Amber
            }

            updated_detections = []

            for idx, det in enumerate(detections):
                cat = det.get("category", "animal").lower()
                conf = det.get("confidence", 0.0)
                bbox = det.get("bbox", [0, 0, 0, 0])
                
                x1, y1, x2, y2 = cls._parse_bbox_coords(bbox, img_w, img_h)
                color = category_colors.get(cat, "#EF4444")
                
                # Draw bounding box rectangle
                line_width = max(3, int(min(img_w, img_h) * 0.004))
                draw.rectangle([x1, y1, x2, y2], outline=color, width=line_width)
                
                # Draw label banner
                label = f"{cat.capitalize()} — {conf * 100:.1f}%"
                
                # Get text bounding box for label background
                bbox_text = draw.textbbox((x1, y1), label, font=font)
                text_width = bbox_text[2] - bbox_text[0]
                text_height = bbox_text[3] - bbox_text[1]
                
                label_y1 = max(0, y1 - text_height - 6)
                draw.rectangle([x1, label_y1, x1 + text_width + 10, label_y1 + text_height + 6], fill=color)
                draw.text((x1 + 5, label_y1 + 3), label, fill="#FFFFFF", font=font)
                
                crop_path_url = None
                
                # Crop detected animals for Phase 2 readiness
                if cat == "animal":
                    crop_filename = f"{image_id}_det_{idx}.jpg"
                    abs_crop_file = settings.abs_crop_dir / crop_filename
                    
                    cropped_region = img.crop((x1, y1, x2, y2))
                    cropped_region.save(abs_crop_file, quality=95)
                    crop_path_url = f"/crops/{crop_filename}"
                    logger.info(f"Saved animal crop: {abs_crop_file}")

                det_copy = dict(det)
                det_copy["crop_path"] = crop_path_url
                updated_detections.append(det_copy)

            # Save annotated image
            annotated_filename = f"{image_id}_annotated.jpg"
            abs_annotated_file = settings.abs_result_dir / annotated_filename
            annotated_img.save(abs_annotated_file, quality=95)
            logger.info(f"Saved annotated image: {abs_annotated_file}")

            annotated_image_url = f"/results/{annotated_filename}"

            return annotated_image_url, updated_detections
