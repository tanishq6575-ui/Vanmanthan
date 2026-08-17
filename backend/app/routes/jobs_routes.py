from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional

from app.auth import get_current_user
from app.services.job_service import job_service

router = APIRouter(prefix="/api/jobs", tags=["Async Job Queue"])

@router.get("/{job_id}")
def get_job_status(job_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    job = job_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job

@router.get("")
def list_jobs(user: Dict[str, Any] = Depends(get_current_user)):
    return job_service.list_jobs(user.get("user_id"))
