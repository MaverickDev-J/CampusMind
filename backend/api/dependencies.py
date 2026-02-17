"""FastAPI dependency – extract & validate current user from JWT."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.security import decode_access_token
from database.mongo import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Decode the bearer token, fetch the full user document from MongoDB."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    db = get_db()
    user = await db.users.find_one({"user_id": user_id})
    if user is None:
        raise credentials_exception

    user["_id"] = str(user["_id"])  # make ObjectId JSON-safe
    return user
