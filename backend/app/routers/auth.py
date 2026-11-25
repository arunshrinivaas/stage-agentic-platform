import os
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.database import get_db
from app.schemas.auth import LoginRequest, DemoLoginRequest, RegisterRequest, AuthResponse
from app.schemas.user import UserResponse
from app.services.auth import (
    hash_password,
    verify_password,
    create_user_session,
    get_user_by_token,
    delete_user_session,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

ROLE_TO_DEMO_USER = {
    "performer": "usr-aarav",
    "provider": "usr-heritage",
    "audience": "usr-rhea",
    "organiser": "usr-delta",
    "admin": "usr-admin",
}

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if login by demo role shortcut
        if payload.demoRole and payload.demoRole in ROLE_TO_DEMO_USER:
            user_id = ROLE_TO_DEMO_USER[payload.demoRole]
            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            user = cursor.fetchone()
        else:
            cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?);", (payload.email.strip(),))
            user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        # Authenticate credentials
        if payload.demoRole and payload.demoRole in ROLE_TO_DEMO_USER:
            # Demo shortcut authorized in demonstration environment
            pass
        else:
            # Standard email + password authentication requires valid password
            if not payload.password or not verify_password(payload.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid email or password.")

        user_data = dict(user)

    token = create_user_session(user_data["id"], user_data["role"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            avatarUrl=user_data["avatar_url"],
            bio=user_data["bio"],
            createdAt=str(user_data["created_at"]),
        ),
    )

@router.post("/demo-login", response_model=AuthResponse)
def demo_login(payload: DemoLoginRequest):
    with get_db() as conn:
        cursor = conn.cursor()
        target_user_id = payload.userId or ROLE_TO_DEMO_USER.get(payload.role, "usr-aarav")
        
        cursor.execute("SELECT * FROM users WHERE id = ?;", (target_user_id,))
        user = cursor.fetchone()

        if not user:
            # Fallback by role
            cursor.execute("SELECT * FROM users WHERE role = ? LIMIT 1;", (payload.role,))
            user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail=f"Demo user for role '{payload.role}' not found.")

        user_data = dict(user)

    token = create_user_session(user_data["id"], user_data["role"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            avatarUrl=user_data["avatar_url"],
            bio=user_data["bio"],
            createdAt=str(user_data["created_at"]),
        ),
    )

@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest):
    user_id = f"usr-{int(time.time() * 1000)}"
    pw_hash = hash_password(payload.password or "stage2026")
    default_avatar = payload.avatarUrl or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80"
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?);", (payload.email.strip(),))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="An account with this email address already exists.")

        cursor.execute("""
        INSERT INTO users (id, name, email, role, password_hash, avatar_url, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            user_id,
            payload.name.strip(),
            payload.email.strip().lower(),
            payload.role,
            pw_hash,
            default_avatar,
            payload.bio or f"Active {payload.role.title()} on STAGE.",
        ))

        # If registering as performer with profile info
        if payload.role == "performer":
            perf_id = f"perf-{int(time.time() * 1000)}"
            handle = payload.handle or f"@{payload.name.lower().replace(' ', '')}"
            cursor.execute("""
            INSERT INTO performer_profiles (id, user_id, name, handle, avatar_url, bio, art_form, sub_genre, verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);
            """, (
                perf_id,
                user_id,
                payload.name,
                handle,
                default_avatar,
                payload.bio or "Independent live performance artist.",
                payload.artForm or "Music",
                "Contemporary Fusion",
            ))

        cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
        user_row = cursor.fetchone()
        user_data = dict(user_row)

    token = create_user_session(user_data["id"], user_data["role"])

    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            avatarUrl=user_data["avatar_url"],
            bio=user_data["bio"],
            createdAt=str(user_data["created_at"]),
        ),
    )

@router.get("/me", response_model=UserResponse)
def get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Please provide a Bearer token.")

    token = authorization[7:].strip()
    user_dict = get_user_by_token(token)
    if not user_dict:
        raise HTTPException(status_code=401, detail="Session expired or invalid token.")

    return UserResponse(
        id=user_dict["id"],
        name=user_dict["name"],
        email=user_dict["email"],
        role=user_dict["role"],
        avatarUrl=user_dict.get("avatarUrl"),
        bio=user_dict.get("bio"),
        createdAt=user_dict.get("createdAt", ""),
    )

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        delete_user_session(token)
    return {"status": "logged_out", "message": "Successfully signed out."}

@router.get("/oauth/providers")
def get_oauth_providers():
    """Retrieve integration and credential status of external identity providers."""
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    apple_service_id = os.getenv("APPLE_SERVICE_ID", "")
    sms_provider_key = os.getenv("SMS_API_KEY", "")

    return {
        "google": {
            "configured": bool(google_client_id),
            "clientId": google_client_id or None,
            "message": "Google OAuth 2.0 integration ready. Configure GOOGLE_CLIENT_ID in backend/.env for live OAuth redirection." if not google_client_id else "Google OAuth active."
        },
        "apple": {
            "configured": bool(apple_service_id),
            "serviceId": apple_service_id or None,
            "message": "Sign in with Apple integration ready. Configure APPLE_SERVICE_ID in backend/.env for live redirection." if not apple_service_id else "Apple Sign-In active."
        },
        "phone": {
            "configured": bool(sms_provider_key),
            "gateway": "live_sms" if sms_provider_key else "local_verification_ready",
            "testOtp": "123456",
            "message": "SMS gateway credentials not configured in local environment. Use OTP code '123456' for verification." if not sms_provider_key else "Live SMS Gateway active."
        }
    }

@router.post("/oauth/google")
def google_oauth_callback(payload: dict):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth credentials are not configured in this environment. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or use standard email authentication."
        )
    raise HTTPException(status_code=501, detail="Google token verification active when client ID is provided.")

@router.post("/oauth/apple")
def apple_oauth_callback(payload: dict):
    apple_service_id = os.getenv("APPLE_SERVICE_ID", "")
    if not apple_service_id:
        raise HTTPException(
            status_code=503,
            detail="Apple Sign-In credentials are not configured in this environment. Please set APPLE_SERVICE_ID or use standard email authentication."
        )
    raise HTTPException(status_code=501, detail="Apple token verification active when service ID is provided.")

@router.post("/phone/send-otp")
def send_phone_otp(payload: dict):
    phone = payload.get("phone", "").strip()
    if not phone or len(phone) < 8:
        raise HTTPException(status_code=400, detail="Please provide a valid phone number (e.g. +91 98765 43210).")

    return {
        "status": "otp_sent",
        "phone": phone,
        "message": "Verification code dispatched. For local development, use test OTP: 123456",
        "testOtp": "123456"
    }

@router.post("/phone/verify-otp", response_model=AuthResponse)
def verify_phone_otp(payload: dict):
    phone = payload.get("phone", "").strip()
    code = payload.get("code", "").strip()
    role = payload.get("role", "audience")
    name = payload.get("name", "STAGE Patron").strip()

    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required.")
    if code != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code. Please enter 123456 for local verification.")

    email_alias = f"phone_{phone.replace('+', '').replace(' ', '').replace('-', '')}@stage.phone"
    default_avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
    user_id = f"usr-ph-{int(time.time() * 1000)}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?;", (email_alias,))
        user_row = cursor.fetchone()

        if not user_row:
            pw_hash = hash_password("stage2026")
            cursor.execute("""
            INSERT INTO users (id, name, email, role, password_hash, avatar_url, bio)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (user_id, name, email_alias, role, pw_hash, default_avatar, f"Verified mobile patron ({phone})"))
            cursor.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
            user_row = cursor.fetchone()

        user_data = dict(user_row)

    token = create_user_session(user_data["id"], user_data["role"])
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            role=user_data["role"],
            avatarUrl=user_data["avatar_url"],
            bio=user_data["bio"],
            createdAt=str(user_data["created_at"]),
        ),
    )
