"""Auth router – register, login, /users/me."""

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from core.config import settings
from core.security import hash_password, verify_password, create_access_token
from database.mongo import get_db
from models.schemas import (
    BranchEnum,
    RoleEnum,
    StudentProfile,
    FacultyProfile,
    UserCreate,
    UserResponse,
    TokenResponse,
    YearEnum,
)
from api.dependencies import get_current_user

router = APIRouter()

# ── Helpers ─────────────────────────────────────────────────────────

_ROLE_PREFIX = {
    RoleEnum.student: "stu",
    RoleEnum.faculty: "fac",
    RoleEnum.admin: "adm",
}


def _build_user_id(role: RoleEnum) -> str:
    return f"{_ROLE_PREFIX[role]}_{uuid4().hex[:12]}"


# ── POST /api/auth/register ────────────────────────────────────────

@router.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Auth"],
)
async def register(payload: UserCreate):
    db = get_db()

    # 1. Duplicate email check
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    # 2. Admin secret verification
    if payload.role == RoleEnum.admin:
        if payload.admin_secret_key != settings.ADMIN_SECRET_KEY:
            raise HTTPException(status_code=403, detail="Invalid admin secret key")

    # 3. Validate & normalise profile per role
    profile: dict = {}
    if payload.role == RoleEnum.student:
        if not payload.profile:
            raise HTTPException(status_code=422, detail="Student profile required (roll_no, branch, year)")
        parsed = StudentProfile(**payload.profile)
        profile = parsed.model_dump()
        profile["can_upload"] = False  # default – admin grants later
    elif payload.role == RoleEnum.faculty:
        if not payload.profile:
            raise HTTPException(status_code=422, detail="Faculty profile required (department)")
        parsed_fac = FacultyProfile(**payload.profile)
        profile = parsed_fac.model_dump()
    # admin → profile stays {}

    # 4. Build user document
    user_id = _build_user_id(payload.role)
    user_doc = {
        "user_id": user_id,
        "email": payload.email,
        "name": payload.name,
        "password": hash_password(payload.password),
        "role": payload.role.value,
        "institute_id": "tcet",
        "profile": profile,
    }

    await db.users.insert_one(user_doc)

    return UserResponse(
        user_id=user_id,
        email=payload.email,
        name=payload.name,
        role=payload.role,
        institute_id="tcet",
        profile=profile,
    )


# ── POST /api/auth/login ───────────────────────────────────────────

@router.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(form: OAuth2PasswordRequestForm = Depends()):
    db = get_db()

    user = await db.users.find_one({"email": form.username})
    if not user or not verify_password(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Build JWT payload with all required claims
    profile = user.get("profile", {})
    token_data = {
        "user_id": user["user_id"],
        "role": user["role"],
        "institute_id": user.get("institute_id", "tcet"),
        "can_upload": profile.get("can_upload", False),
        "branch": profile.get("branch", None),
        "year": profile.get("year", None),
    }

    access_token = create_access_token(data=token_data)
    return TokenResponse(access_token=access_token)


# ── GET /api/users/me ──────────────────────────────────────────────

@router.get("/api/users/me", response_model=UserResponse, tags=["Users"])
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        institute_id=current_user.get("institute_id", "tcet"),
        profile=current_user.get("profile", {}),
    )
