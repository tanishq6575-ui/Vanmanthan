import time
import torch
from typing import Dict, Any, List
from app.config import settings
from app.utils.logging_config import logger

try:
    from PytorchWildlife.models import detection as pw_detection
    PYTORCH_WILDLIFE_AVAILABLE = True
except ImportError:
    PYTORCH_WILDLIFE_AVAILABLE = False
    logger.error("PytorchWildlife is not installed in the Python environment.")

class MegaDetectorService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MegaDetectorService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.version = settings.MEGADETECTOR_VERSION
        self.threshold = settings.MEGADETECTOR_THRESHOLD
        self.device = self._determine_device(settings.DEVICE)
        self.model = None
        self._load_model()
        self._initialized = True

    def _determine_device(self, requested_device: str) -> str:
        if requested_device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
            else:
                return "cpu"
        elif requested_device in ["cuda", "cpu", "mps"]:
            if requested_device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA requested but not available. Falling back to CPU.")
                return "cpu"
            if requested_device == "mps" and not (hasattr(torch.backends, "mps") and torch.backends.mps.is_available()):
                logger.warning("MPS requested but not available. Falling back to CPU.")
                return "cpu"
            return requested_device
        else:
            logger.warning(f"Unknown device specified '{requested_device}'. Falling back to CPU.")
            return "cpu"

    def _load_model(self):
        if not PYTORCH_WILDLIFE_AVAILABLE:
            raise RuntimeError("PytorchWildlife library is required but not installed.")
        try:
            logger.info("Initializing MegaDetector V6...")
            logger.info(f"Version: {self.version}")
            logger.info(f"Device: {self.device}")
            
            # Load MegaDetector V6 from official PytorchWildlife
            self.model = pw_detection.MegaDetectorV6(
                version=self.version,
                device=self.device
            )
            logger.info(f"MegaDetector V6 ({self.version}) successfully initialized on {self.device}.")
        except Exception as e:
            logger.error(f"Failed to load MegaDetector V6 model: {str(e)}")
            raise e

    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        Runs real MegaDetector V6 inference on an image file path.
        """
        if self.model is None:
            raise RuntimeError("MegaDetector model is not initialized.")
        
        logger.info(f"Processing {image_path}")
        start_time = time.time()
        
        # Run inference using official PytorchWildlife method
        try:
            results = self.model.single_image_detection(
                image_path,
                det_conf_thres=self.threshold
            )
        except TypeError:
            results = self.model.single_image_detection(
                image_path,
                confidence_threshold=self.threshold
            )
        
        inference_time = round(time.time() - start_time, 4)
        
        # Parse detections from PytorchWildlife results
        parsed_detections: List[Dict[str, Any]] = []
        
        cat_map = {
            0: "animal", "0": "animal", 1: "animal", "1": "animal", "animal": "animal",
            2: "person", "2": "person", "person": "person",
            3: "vehicle", "3": "vehicle", "vehicle": "vehicle"
        }

        det_obj = results.get("detections") if isinstance(results, dict) else results
        labels = results.get("labels", []) if isinstance(results, dict) else []

        if hasattr(det_obj, "xyxy") and hasattr(det_obj, "confidence"):
            # Supervision Detections object from PytorchWildlife
            boxes = det_obj.xyxy
            confs = det_obj.confidence
            class_ids = getattr(det_obj, "class_id", None)

            for i in range(len(boxes)):
                conf = float(confs[i])
                if conf >= self.threshold:
                    cid = int(class_ids[i]) if class_ids is not None and i < len(class_ids) else 0
                    label_str = labels[i] if i < len(labels) else "animal"
                    cat_name = label_str.split()[0].lower() if label_str else cat_map.get(cid, "animal")
                    
                    parsed_detections.append({
                        "category": cat_map.get(cat_name, cat_name),
                        "confidence": round(conf, 4),
                        "bbox": [round(float(c), 4) for c in boxes[i]]
                    })
        elif isinstance(det_obj, list):
            for det in det_obj:
                if isinstance(det, dict):
                    cat_raw = det.get("category", det.get("category_id", "animal"))
                    conf = float(det.get("confidence", det.get("score", 0.0)))
                    bbox = det.get("bbox", det.get("box", [0, 0, 0, 0]))
                else:
                    cat_raw = getattr(det, "category", getattr(det, "category_id", "animal"))
                    conf = float(getattr(det, "confidence", getattr(det, "score", 0.0)))
                    bbox = getattr(det, "bbox", getattr(det, "box", [0, 0, 0, 0]))

                category = cat_map.get(cat_raw, str(cat_raw).lower())
                if conf >= self.threshold:
                    parsed_detections.append({
                        "category": category,
                        "confidence": round(conf, 4),
                        "bbox": [round(float(coord), 4) for coord in bbox]
                    })

        logger.info(f"Detections: {len(parsed_detections)}")
        logger.info(f"Inference time: {inference_time} sec")

        return {
            "detections": parsed_detections,
            "inference_time": inference_time
        }

megadetector_service = MegaDetectorService
