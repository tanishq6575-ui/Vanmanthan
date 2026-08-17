from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.auth import get_current_user, require_roles
from app.db.database import get_db_connection
from app.config import settings
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/admin", tags=["Admin & System"])

class SystemConfigUpdate(BaseModel):
    megadetector_threshold: Optional[float] = None
    species_threshold: Optional[float] = None
    reid_match_threshold: Optional[float] = None
    reid_ambiguity_delta: Optional[float] = None

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, user: Dict[str, Any] = Depends(require_roles(["ADMIN", "RESEARCHER"]))):
    """
    Returns scientific provenance audit logs.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/cameras")
def get_cameras():
    """
    Returns Pench camera trap spatial sensor locations.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM cameras ORDER BY camera_id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/config")
def get_system_config(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "megadetector_threshold": settings.MEGADETECTOR_THRESHOLD,
        "species_threshold": settings.SPECIES_CONFIDENCE_THRESHOLD,
        "reid_match_threshold": settings.REID_MATCH_THRESHOLD,
        "reid_ambiguity_delta": settings.REID_AMBIGUITY_DELTA,
        "max_upload_mb": settings.MAX_UPLOAD_MB,
        "max_batch_size": settings.MAX_BATCH_SIZE,
        "reserve_name": settings.RESERVE_NAME,
        "state": settings.STATE,
        "country": settings.COUNTRY
    }

@router.post("/config")
def update_system_config(
    update: SystemConfigUpdate,
    user: Dict[str, Any] = Depends(require_roles(["ADMIN"]))
):
    if update.megadetector_threshold is not None:
        settings.MEGADETECTOR_THRESHOLD = update.megadetector_threshold
    if update.species_threshold is not None:
        settings.SPECIES_CONFIDENCE_THRESHOLD = update.species_threshold
    if update.reid_match_threshold is not None:
        settings.REID_MATCH_THRESHOLD = update.reid_match_threshold
    if update.reid_ambiguity_delta is not None:
        settings.REID_AMBIGUITY_DELTA = update.reid_ambiguity_delta

    audit_service.log_event(
        action="system_config_update",
        entity_type="system",
        entity_id="runtime_config",
        user_id=user["user_id"],
        details=update.model_dump()
    )

    return {
        "status": "success",
        "message": "System threshold configuration updated.",
        "config": get_system_config(user)
    }
