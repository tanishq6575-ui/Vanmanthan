import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional
from app.db.database import get_db_connection
from app.utils.logging_config import logger

class AuditService:
    @staticmethod
    def log_event(
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ):
        try:
            log_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().isoformat()
            details_str = json.dumps(details) if details else None

            conn = get_db_connection()
            conn.execute("""
            INSERT INTO audit_logs (log_id, user_id, action, entity_type, entity_id, details_json, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (log_id, user_id or "system", action, entity_type, entity_id, details_str, ip_address, timestamp))
            conn.commit()
            conn.close()

            logger.info(f"[AUDIT] {action.upper()} | Entity: {entity_type}/{entity_id} | User: {user_id or 'system'}")
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")

audit_service = AuditService()
