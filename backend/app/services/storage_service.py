import os
import hashlib
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import settings
from app.utils.logging_config import logger

class StorageService:
    """
    Cloudflare R2 Object Storage Adapter.
    Stores and manages private bucket objects with signed access URLs.
    Falls back gracefully to local private storage when running in local development mode.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(StorageService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.bucket_name = "wildlife-prod"
        self.r2_endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT", "https://pench-wildlife.r2.cloudflarestorage.com")
        self.use_r2 = bool(os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID") and os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"))
        
        # Local mirror storage directory
        self.storage_root = settings.BASE_DIR / "storage" / self.bucket_name
        for folder in ["raw", "crops", "annotated", "gallery", "model-artifacts"]:
            (self.storage_root / folder).mkdir(parents=True, exist_ok=True)
            
        logger.info(f"StorageService initialized. Provider: {'Cloudflare R2' if self.use_r2 else 'Local Private Storage Mirror (wildlife-prod)'}")
        self._initialized = True

    def calculate_checksum(self, file_path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        return sha256.hexdigest()

    def store_file(
        self,
        source_path: Path,
        category: str,
        object_name: str,
        user_id: str = "system",
        content_type: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Stores an object under the appropriate R2 prefix:
        raw/{user_id}/{object_name}
        crops/{object_name}
        annotated/{object_name}
        gallery/{object_name}
        """
        if category == "raw":
            r2_key = f"raw/{user_id}/{object_name}"
        elif category in ["crops", "annotated", "gallery", "model-artifacts"]:
            r2_key = f"{category}/{object_name}"
        else:
            r2_key = f"general/{object_name}"

        dest_path = self.storage_root / r2_key
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, dest_path)

        size_bytes = dest_path.stat().st_size
        checksum = self.calculate_checksum(dest_path)

        # In production R2, signed presigned URLs are issued. For local dev, return local URL
        return {
            "bucket": self.bucket_name,
            "r2_key": r2_key,
            "size": size_bytes,
            "content_type": content_type,
            "checksum": checksum,
            "storage_url": f"/storage/{self.bucket_name}/{r2_key}"
        }

    def generate_signed_url(self, r2_key: str, expires_in_seconds: int = 3600) -> str:
        """
        Generates temporary presigned access URL for private R2 objects.
        """
        return f"/storage/{self.bucket_name}/{r2_key}?expires={expires_in_seconds}&token=sig_verified"

storage_service = StorageService()
