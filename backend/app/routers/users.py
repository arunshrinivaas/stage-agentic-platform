from fastapi import APIRouter, HTTPException
from typing import List
from app.database import get_db
from app.schemas.user import UserResponse

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def get_users():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, avatar_url, bio, created_at FROM users ORDER BY created_at ASC;")
        rows = cursor.fetchall()
        return [
            UserResponse(
                id=r["id"],
                name=r["name"],
                email=r["email"],
                role=r["role"],
                avatarUrl=r["avatar_url"],
                bio=r["bio"],
                createdAt=str(r["created_at"]),
            )
            for r in rows
        ]

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role, avatar_url, bio, created_at FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            role=row["role"],
            avatarUrl=row["avatar_url"],
            bio=row["bio"],
            createdAt=str(row["created_at"]),
        )

