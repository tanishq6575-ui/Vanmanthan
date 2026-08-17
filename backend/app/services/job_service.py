import uuid
import threading
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.utils.logging_config import logger

class JobService:
    """
    In-memory asynchronous background worker queue.
    Integrates with Redis in production clustering.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(JobService, cls).__new__(cls)
            cls._instance.jobs = {}
            cls._instance.lock = threading.Lock()
        return cls._instance

    def create_job(self, job_type: str, payload: Dict[str, Any], user_id: str) -> str:
        job_id = str(uuid.uuid4())
        with self.lock:
            self.jobs[job_id] = {
                "job_id": job_id,
                "job_type": job_type,
                "user_id": user_id,
                "status": "QUEUED",
                "progress": 0,
                "message": "Job queued for processing",
                "created_at": datetime.utcnow().isoformat(),
                "completed_at": None,
                "result": None,
                "error": None
            }
        logger.info(f"[JOB QUEUE] Job {job_id} ({job_type}) submitted.")
        return job_id

    def update_job(
        self,
        job_id: str,
        status: str,
        progress: int,
        message: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["status"] = status
                self.jobs[job_id]["progress"] = progress
                self.jobs[job_id]["message"] = message
                if result is not None:
                    self.jobs[job_id]["result"] = result
                if error is not None:
                    self.jobs[job_id]["error"] = error
                if status in ["COMPLETED", "FAILED"]:
                    self.jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.jobs.get(job_id)

    def list_jobs(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            if user_id:
                return [j for j in self.jobs.values() if j.get("user_id") == user_id]
            return list(self.jobs.values())

job_service = JobService()
