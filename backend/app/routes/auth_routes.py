from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

from app.auth import create_jwt_token, get_current_user
from app.db.database import get_db_connection
from app.services.audit_service import audit_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    role: Optional[str] = "RESEARCHER"
    display_name: Optional[str] = None
    google_token: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    role: str
    token: Optional[str] = None

@router.post("/login", response_model=UserResponse)
def login_or_authenticate(req: LoginRequest):
    """
    Handles Google OAuth verification and creates authenticated user session.
    """
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    now_str = datetime.utcnow().isoformat()

    if user_row:
        user_dict = dict(user_row)
        conn.execute("UPDATE users SET last_login = ? WHERE email = ?", (now_str, req.email))
        conn.commit()
    else:
        user_id = f"usr-{int(datetime.utcnow().timestamp())}"
        disp_name = req.display_name or req.email.split("@")[0].capitalize()
        assigned_role = (req.role or "RESEARCHER").upper()
        conn.execute("""
        INSERT INTO users (user_id, google_subject_id, email, display_name, role, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, f"google-{user_id}", req.email, disp_name, assigned_role, now_str, now_str))
        conn.commit()
        user_dict = {
            "user_id": user_id,
            "email": req.email,
            "display_name": disp_name,
            "role": assigned_role
        }

    conn.close()

    token = create_jwt_token({
        "user_id": user_dict["user_id"],
        "email": user_dict["email"],
        "role": user_dict["role"]
    })

    audit_service.log_event(
        action="user_login",
        entity_type="user",
        entity_id=user_dict["user_id"],
        user_id=user_dict["user_id"],
        details={"email": user_dict["email"], "role": user_dict["role"]}
    )

    return UserResponse(
        user_id=user_dict["user_id"],
        email=user_dict["email"],
        display_name=user_dict["display_name"],
        role=user_dict["role"],
        token=token
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        display_name=user["display_name"],
        role=user["role"]
    )
