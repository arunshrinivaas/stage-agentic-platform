import secrets
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import Header, HTTPException
from app.database import get_db
from app.config import settings

ADMIN_DEV_SECRET = "stage_admin_key_2026"

def hash_password(password: str) -> str:
    """Generate bcrypt password hash with per-user salt and work factor 12."""
    if not password:
        raise ValueError("Password cannot be empty.")
    # bcrypt automatically generates a 128-bit cryptographically secure per-user salt
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password with constant-time comparison. Fail closed on empty/invalid hashes."""
    if not plain_password or not hashed_password:
        return False
    try:
        # Check if bcrypt hash ($2a$, $2b$, or $2y$)
        if hashed_password.startswith(("$2a$", "$2b$", "$2y$")):
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

        # Legacy SHA-256 fallback with constant-time comparison
        salt = "stage_live_platform_salt_2026"
        legacy_computed = hashlib.sha256(f"{salt}_{plain_password}".encode("utf-8")).hexdigest()
        return secrets.compare_digest(legacy_computed, hashed_password)
    except Exception:
        # Fail closed on any comparison error
        return False

def create_user_session(
    user_id: str,
    role: str,
    expires_in_days: int = 14,
    conn=None,
) -> str:
    token = f"stg_tok_{secrets.token_urlsafe(32)}"
    expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).strftime("%Y-%m-%d %H:%M:%S")
    
    if conn is not None:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO user_sessions (token, user_id, role, expires_at)
        VALUES (?, ?, ?, ?);
        """, (token, user_id, role, expires_at))
        return token

    with get_db() as db_conn:
        cursor = db_conn.cursor()
        cursor.execute("""
        INSERT INTO user_sessions (token, user_id, role, expires_at)
        VALUES (?, ?, ?, ?);
        """, (token, user_id, role, expires_at))
        return token

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.token, s.user_id, s.role as session_role, s.expires_at,
               u.id, u.name, u.email, u.role, u.avatar_url, u.bio, u.created_at
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP;
        """, (token,))
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "avatarUrl": row["avatar_url"],
            "bio": row["bio"],
            "createdAt": str(row["created_at"]),
        }

def delete_user_session(token: str) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE token = ?;", (token,))
        return cursor.rowcount > 0

def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_stage_role: Optional[str] = Header(None, alias="X-STAGE-Role"),
) -> Optional[Dict[str, Any]]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        user = get_user_by_token(token)
        if user:
            return user
    if x_stage_role:
        return {
            "id": f"dev-{x_stage_role}",
            "name": f"Dev {x_stage_role.title()}",
            "email": f"{x_stage_role}@stage.live",
            "role": x_stage_role,
        }
    return None

def require_role(allowed_roles: List[str]):
    def _role_checker(
        authorization: Optional[str] = Header(None),
        x_stage_role: Optional[str] = Header(None, alias="X-STAGE-Role"),
        x_stage_admin_secret: Optional[str] = Header(None, alias="X-STAGE-Admin-Secret"),
    ) -> Dict[str, Any]:
        # 1. Bearer Token Authentication
        if authorization:
            if not authorization.startswith("Bearer "):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authorization header format. Expected 'Bearer <token>'",
                )
            token = authorization[7:].strip()
            user = get_user_by_token(token)
            if not user:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired session token. Please re-authenticate.",
                )
            user_role = user.get("role")
            if user_role not in allowed_roles and user_role != "admin":
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Role '{user_role}' cannot perform this action. Required: {', '.join(allowed_roles)}",
                )
            return user

        # 2. Explicit Role Header (Development / Testing)
        if x_stage_role:
            if x_stage_role == "admin":
                if not x_stage_admin_secret or not secrets.compare_digest(x_stage_admin_secret, ADMIN_DEV_SECRET):
                    raise HTTPException(
                        status_code=403,
                        detail="Forbidden: Admin access via header requires valid X-STAGE-Admin-Secret.",
                    )
            elif x_stage_role not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: Role '{x_stage_role}' cannot perform this action. Required: {', '.join(allowed_roles)}",
                )
            return {
                "id": f"dev-{x_stage_role}",
                "name": f"Dev {x_stage_role.title()}",
                "email": f"{x_stage_role}@stage.live",
                "role": x_stage_role,
            }

        # 3. Missing credentials -> STRICT HTTP 401 Unauthorized (Fail closed)
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    return _role_checker
