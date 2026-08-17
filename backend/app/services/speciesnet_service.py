import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
from app.config import settings
from app.utils.logging_config import logger

try:
    import speciesnet
    SPECIESNET_AVAILABLE = True
except ImportError:
    SPECIESNET_AVAILABLE = False
    logger.error("speciesnet library is not installed in the Python environment.")

PENCH_DISPLAY_GROUPS = {
    "tiger": "Tiger",
    "panthera tigris": "Tiger",
    "leopard": "Leopard",
    "panthera pardus": "Leopard",
    "elephant": "Elephant",
    "elephas maximus": "Elephant",
    "gaur": "Gaur",
    "bos gaurus": "Gaur",
    "wild boar": "Wild Boar",
    "sus scrofa": "Wild Boar",
    "deer": "Deer",
    "cervidae": "Deer",
    "chital": "Deer",
    "sambar": "Deer",
    "axis axis": "Deer",
    "rusa unicolor": "Deer",
    "muntjac": "Deer",
    "monkey": "Monkey",
    "primate": "Monkey",
    "langur": "Monkey",
    "macaca": "Monkey",
    "semnopithecus": "Monkey",
    "bird": "Bird",
    "aves": "Bird",
    "human": "Human",
    "vehicle": "Vehicle"
}

class SpeciesNetService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SpeciesNetService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.model_name = settings.SPECIESNET_MODEL_NAME
        self.threshold = settings.SPECIESNET_THRESHOLD
        self.model = None
        self.device = settings.DEVICE
        self._load_model()
        self._initialized = True

    def _load_model(self):
        if not SPECIESNET_AVAILABLE:
            raise RuntimeError("SpeciesNet library is required but not installed.")
        try:
            logger.info("Initializing Google SpeciesNet classifier...")
            logger.info(f"Model Name: {self.model_name}")
            logger.info(f"Reserve Context: {settings.RESERVE_NAME}, {settings.STATE}, {settings.COUNTRY}")
            
            # Instantiate SpeciesNet (auto-downloads model weights if needed)
            self.model = speciesnet.SpeciesNet(model_name=self.model_name)
            logger.info("SpeciesNet classifier successfully initialized.")
        except Exception as e:
            logger.error(f"Failed to load SpeciesNet model: {str(e)}")
            raise e

    @staticmethod
    def _parse_species_class(class_str: str) -> Tuple[str, str]:
        """
        Parses a SpeciesNet class string (e.g. 'uuid;mammalia;carnivora;felidae;panthera;tigris;tiger')
        Returns:
            raw_label: Scientific or common name (e.g. 'Panthera tigris' or 'tiger')
            display_label: Mapped Pench display group ('Tiger', 'Leopard', 'Deer', etc.)
        """
        if not class_str:
            return "unknown", "SPECIES_NOT_CONFIRMED"

        parts = class_str.split(";")
        common_name = parts[-1].strip() if len(parts) > 0 else "unknown"
        
        # Check if taxonomic level is vague/higher family only (e.g. felidae, bovidae, blank)
        if common_name.lower() in ["blank", "", "unknown"] or len(parts) <= 3:
            return common_name.capitalize(), "SPECIES_NOT_CONFIRMED"

        genus = parts[-3].strip() if len(parts) >= 3 else ""
        species = parts[-2].strip() if len(parts) >= 2 else ""
        
        if genus and species and genus.lower() not in ["", "null"] and species.lower() not in ["", "null"]:
            raw_label = f"{genus.capitalize()} {species.lower()}"
        else:
            raw_label = common_name.capitalize()

        # Map to Pench display group
        search_key = common_name.lower()
        raw_key = raw_label.lower()

        display_label = PENCH_DISPLAY_GROUPS.get(search_key, PENCH_DISPLAY_GROUPS.get(raw_key, None))
        
        if not display_label:
            # Fuzzy match keywords in parts
            for p in parts:
                p_clean = p.lower()
                if p_clean in PENCH_DISPLAY_GROUPS:
                    display_label = PENCH_DISPLAY_GROUPS[p_clean]
                    break
                    
        if not display_label:
            if common_name.lower() in ["felidae", "bovidae", "canidae", "mammalia"]:
                display_label = "SPECIES_NOT_CONFIRMED"
            else:
                display_label = common_name.replace("-", " ").replace("_", " ").title()

        return raw_label, display_label

    def predict_crop(self, crop_path: str) -> Dict[str, Any]:
        """
        Runs SpeciesNet inference on a single animal crop file path.
        """
        if self.model is None:
            raise RuntimeError("SpeciesNet model is not initialized.")

        logger.info(f"Processing animal crop with SpeciesNet: {crop_path}")
        start_time = time.time()

        try:
            res = self.model.predict(
                filepaths=[crop_path],
                country=settings.COUNTRY_CODE,
                admin1_region=settings.STATE
            )
            
            predictions = res.get("predictions", []) if isinstance(res, dict) else []
            if not predictions:
                raise ValueError("No prediction returned from SpeciesNet.")

            pred_item = predictions[0]
            raw_prediction_str = pred_item.get("prediction", "")
            confidence = float(pred_item.get("prediction_score", 0.0))

            raw_label, display_label = self._parse_species_class(raw_prediction_str)

            # Top predictions extraction
            classifications = pred_item.get("classifications", {})
            classes = classifications.get("classes", [])
            scores = classifications.get("scores", [])
            
            top_predictions = []
            for c_str, s_val in zip(classes[:5], scores[:5]):
                r_lbl, d_lbl = self._parse_species_class(c_str)
                top_predictions.append({
                    "raw_label": r_lbl,
                    "display_label": d_lbl,
                    "confidence": round(float(s_val), 4)
                })

            # Confidence status & human review logic
            if confidence >= 0.80:
                conf_status = "HIGH_CONFIDENCE"
                human_review = False
            elif confidence >= 0.50:
                conf_status = "MEDIUM_CONFIDENCE"
                human_review = False
            else:
                conf_status = "LOW_CONFIDENCE"
                human_review = True

            if display_label == "SPECIES_NOT_CONFIRMED":
                human_review = True
                conf_status = "HUMAN_REVIEW_REQUIRED"

            inference_time = round(time.time() - start_time, 4)

            logger.info(f"SpeciesNet Prediction: {display_label} ({raw_label}) | Confidence: {confidence:.4f} | Status: {conf_status}")
            if human_review:
                logger.warning(f"Ambiguous species prediction ({display_label}). Human review required.")

            return {
                "raw_label": raw_label,
                "display_label": display_label,
                "confidence": round(confidence, 4),
                "status": conf_status,
                "human_review_required": human_review,
                "model": "SpeciesNet",
                "inference_time": inference_time,
                "top_predictions": top_predictions
            }

        except Exception as e:
            logger.error(f"SpeciesNet inference error on '{crop_path}': {str(e)}")
            raise e

speciesnet_service = SpeciesNetService
