import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base project directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    MEGADETECTOR_VERSION: str = "MDV6-yolov10-e"
    MEGADETECTOR_THRESHOLD: float = 0.20
    
    # Phase 2 SpeciesNet Config
    SPECIESNET_ENABLED: bool = True
    SPECIESNET_THRESHOLD: float = 0.50
    SPECIESNET_MODEL_NAME: str = "kaggle:google/speciesnet/pyTorch/v4.0.3a/1"
    
    # Phase 3 Re-ID Config
    REID_ENABLED: bool = True
    REID_MATCH_THRESHOLD: float = 0.70
    REID_AMBIGUITY_DELTA: float = 0.03
    REID_EMBEDDING_DIM: int = 512
    
    # Pench Reserve Metadata
    RESERVE_NAME: str = "Pench Tiger Reserve"
    STATE: str = "Maharashtra"
    COUNTRY: str = "India"
    COUNTRY_CODE: str = "IND"
    
    DEVICE: str = "auto"
    
    UPLOAD_DIR: str = "backend/uploads"
    RESULT_DIR: str = "backend/results"
    CROP_DIR: str = "backend/crops"
    PENCH_VALIDATION_DIR: str = "data/pench_validation"
    PENCH_GALLERY_DIR: str = "data/pench_gallery"
    REID_MODEL_DIR: str = "models/reid"

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def abs_upload_dir(self) -> Path:
        p = BASE_DIR / self.UPLOAD_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def abs_result_dir(self) -> Path:
        p = BASE_DIR / self.RESULT_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def abs_crop_dir(self) -> Path:
        p = BASE_DIR / self.CROP_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def abs_pench_validation_dir(self) -> Path:
        p = BASE_DIR / self.PENCH_VALIDATION_DIR
        p.mkdir(parents=True, exist_ok=True)
        for category in ["tiger", "leopard", "deer", "gaur", "wild_boar", "other"]:
            (p / category).mkdir(parents=True, exist_ok=True)
        return p

    @property
    def abs_pench_gallery_dir(self) -> Path:
        p = BASE_DIR / self.PENCH_GALLERY_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def abs_reid_model_dir(self) -> Path:
        p = BASE_DIR / self.REID_MODEL_DIR
        p.mkdir(parents=True, exist_ok=True)
        return p

settings = Settings()
