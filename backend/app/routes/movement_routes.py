from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.auth import get_current_user, require_roles
from app.services.movement_service import movement_service
from app.schemas import ProvisionalConversionRequest, AlertSchema, CameraTelemetrySchema

router = APIRouter(prefix="/api/movement", tags=["Phase 4 Movement Intelligence"])

@router.get("/cameras")
def get_cameras(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns Pench camera trap network with spatial coordinates and health status.
    Coordinates are masked for public viewers.
    """
    return movement_service.get_cameras_telemetry(user_role=user.get("role", "VIEWER"))

@router.get("/alerts")
def get_alerts(limit: int = 50, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns real-time anomaly early warning alerts (new provisional individuals, village proximity, new stations).
    """
    return movement_service.get_active_alerts(limit=limit)

@router.get("/trajectories/{identity_id}")
def get_tiger_trajectory(identity_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns chronological spatial sightings trajectory for a specific tiger.
    """
    return movement_service.get_tiger_trajectory(identity_id)

@router.post("/convert")
def convert_provisional_identity(
    req: ProvisionalConversionRequest,
    user: Dict[str, Any] = Depends(require_roles(["ADMIN", "FOREST_OFFICER", "RESEARCHER"]))
):
    """
    Promotes a provisional tiger (e.g. PENCH-UNVERIFIED-001) to a verified Pench identity (e.g. PENCH-T-023).
    """
    try:
        res = movement_service.convert_provisional_to_verified(
            provisional_id=req.provisional_id,
            verified_id=req.verified_id,
            assigned_name=req.assigned_name,
            sex=req.sex,
            territory=req.territory,
            reviewer_name=user.get("display_name", user["email"]),
            reason=req.reason
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion error: {e}")
