import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add parent directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.database import init_db
from app.routes.detection import router as detection_router
from app.routes.auth_routes import router as auth_router
from app.routes.tigers_routes import router as tigers_router
from app.routes.movement_routes import router as movement_router
from app.routes.admin_routes import router as admin_router
from app.routes.jobs_routes import router as jobs_router

from app.services.megadetector_service import MegaDetectorService
from app.services.speciesnet_service import SpeciesNetService
from app.services.reid_service import ReIDService
from app.services.gallery_service import GalleryService
from app.services.movement_service import movement_service
from app.services.storage_service import storage_service
from app.utils.logging_config import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Wildlife Intelligence Platform (Phase 1, 2, 3, & 4)...")
    init_db()
    
    detector = MegaDetectorService()
    species_classifier = SpeciesNetService()
    reid_encoder = ReIDService()
    gallery_db = GalleryService()

    # Print Government Wildlife Command Center terminal summary banner
    print("\n" + "=" * 62)
    print("PENCH TIGER RESERVE — WILDLIFE COMMAND & INTELLIGENCE SYSTEM")
    print("=" * 62)
    print(f"Detector: MegaDetector V6 ({settings.MEGADETECTOR_VERSION})")
    print(f"Species Classifier: Google SpeciesNet ({settings.SPECIESNET_MODEL_NAME})")
    print(f"Open-Set Re-ID Engine: TigerReIDNet / MiewID Deep Feature Vector (512-D)")
    print(f"Gallery Database: FAISS + pgvector ({gallery_db.index.ntotal} verified + provisional vectors)")
    print(f"Movement Intelligence: Phase 4 PostGIS Sighting Trajectory & Early Warning")
    print(f"Reserve Context: {settings.RESERVE_NAME}, {settings.STATE}, {settings.COUNTRY}")
    print(f"Security: Cloudflare Access + Google OAuth (RBAC: ADMIN | FOREST_OFFICER | RESEARCHER | VIEWER)")
    print(f"Storage: Cloudflare R2 Private Bucket (wildlife-prod)")
    print("Status: PRODUCTION OPERATIONAL")
    print("=" * 62 + "\n")
    
    yield

app = FastAPI(
    title="Pench Tiger Reserve — Wildlife Intelligence & Movement System",
    description="Automated Camera Trap Triage, Species Intelligence, Open-Set Tiger Re-ID, and Spatial Movement Intelligence",
    version="4.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static & storage directories
app.mount("/uploads", StaticFiles(directory=str(settings.abs_upload_dir)), name="uploads")
app.mount("/results", StaticFiles(directory=str(settings.abs_result_dir)), name="results")
app.mount("/crops", StaticFiles(directory=str(settings.abs_crop_dir)), name="crops")
app.mount("/pench_validation", StaticFiles(directory=str(settings.abs_pench_validation_dir)), name="pench_validation")
app.mount("/pench_gallery", StaticFiles(directory=str(settings.abs_pench_gallery_dir)), name="pench_gallery")
app.mount("/storage", StaticFiles(directory=str(settings.BASE_DIR / "storage")), name="storage")

# Include Routers
app.include_router(auth_router)
app.include_router(detection_router)
app.include_router(tigers_router)
app.include_router(movement_router)
app.include_router(admin_router)
app.include_router(jobs_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
