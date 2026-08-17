import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile, Form
from pydantic import BaseModel

from app.auth import get_current_user, require_roles
from app.db.database import get_db_connection
from app.services.gallery_service import GalleryService
from app.services.reid_service import ReIDService
from app.services.movement_service import movement_service
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service
from app.config import settings

router = APIRouter(prefix="/api/tigers", tags=["Tigers & Gallery"])

class ReviewCorrectionRequest(BaseModel):
    observation_id: str
    original_prediction: str
    corrected_identity: str
    reason: str

@router.get("")
def list_tigers():
    """
    Returns list of all verified & provisional tiger identities in Pench Tiger Reserve.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM tiger_identities ORDER BY identity_id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.get("/{identity_id}")
def get_tiger_profile(identity_id: str):
    """
    Returns individual tiger profile metadata and verified gallery references.
    """
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM tiger_identities WHERE identity_id = ?", (identity_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail=f"Tiger identity '{identity_id}' not found.")
    return dict(row)

@router.get("/{identity_id}/trajectory")
def get_tiger_trajectory_endpoint(identity_id: str):
    """
    Returns chronologically sorted camera-to-camera observations and a GeoJSON LineString trajectory.
    """
    return movement_service.get_tiger_trajectory(identity_id)

@router.get("/{identity_id}/observations")
def get_tiger_observations(identity_id: str):
    """
    Returns spatial and temporal camera trap sighting events for an individual tiger.
    """
    conn = get_db_connection()
    obs_rows = conn.execute("""
    SELECT * FROM observations 
    WHERE reid_identity_id = ? 
    ORDER BY created_at DESC
    """, (identity_id,)).fetchall()
    conn.close()
    return [dict(r) for r in obs_rows]

@router.post("/gallery")
async def add_gallery_reference(
    identity_id: str = Form(...),
    source_organization: str = Form(...),
    source_url: Optional[str] = Form(""),
    source_title: Optional[str] = Form("Field Verification Photo"),
    usage_note: Optional[str] = Form("Authorized for Pench Re-ID Research"),
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_roles(["ADMIN", "RESEARCHER"]))
):
    """
    Adds a verified tiger reference photo to the Pench Gallery with authoritative provenance.
    """
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid image file format.")

    dest_dir = settings.abs_pench_gallery_dir / identity_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    ref_filename = f"ref_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = dest_dir / ref_filename

    with open(dest_path, "wb") as buf:
        content = await file.read()
        buf.write(content)

    # Extract embedding and index into FAISS & DB
    reid = ReIDService()
    emb = reid.extract_embedding(str(dest_path))

    # Rebuild / update gallery index
    from scripts.build_gallery import build_gallery
    build_gallery()

    # Reinitialize Gallery service
    gallery_service = GalleryService()
    gallery_service._load_gallery()

    audit_service.log_event(
        action="gallery_addition",
        entity_type="tiger_gallery",
        entity_id=identity_id,
        user_id=user["user_id"],
        details={
            "source_organization": source_organization,
            "source_url": source_url,
            "source_title": source_title,
            "file": ref_filename
        }
    )

    return {
        "status": "success",
        "identity_id": identity_id,
        "reference_image": f"/pench_gallery/{identity_id}/{ref_filename}",
        "message": f"Verified reference added to {identity_id} with full provenance."
    }

@router.post("/reviews")
def submit_identity_review(
    req: ReviewCorrectionRequest,
    user: Dict[str, Any] = Depends(require_roles(["ADMIN", "RESEARCHER"]))
):
    review_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat()

    conn = get_db_connection()
    conn.execute("""
    INSERT INTO reviews (review_id, observation_id, original_prediction, corrected_identity, reviewer, reason, review_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (review_id, req.observation_id, req.original_prediction, req.corrected_identity, user.get("display_name", user["email"]), req.reason, now_str))

    conn.execute("""
    UPDATE observations 
    SET reid_identity_id = ?, reid_status = 'verified_human_correction', human_review_required = 0
    WHERE observation_id = ?
    """, (req.corrected_identity, req.observation_id))

    conn.commit()
    conn.close()

    audit_service.log_event(
        action="identity_correction",
        entity_type="observation",
        entity_id=req.observation_id,
        user_id=user["user_id"],
        details={
            "original_prediction": req.original_prediction,
            "corrected_identity": req.corrected_identity,
            "reason": req.reason
        }
    )

    return {
        "status": "success",
        "review_id": review_id,
        "message": f"Correction recorded. Observation updated to {req.corrected_identity}."
    }
