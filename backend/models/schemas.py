"""Pydantic v2 schemas and Enums for CampusMind."""

from __future__ import annotations

from enum import Enum, IntEnum
from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Enums (Swagger will render these as fixed dropdowns) ─────────────

class RoleEnum(str, Enum):
    admin = "admin"
    faculty = "faculty"
    student = "student"


class BranchEnum(str, Enum):
    AI_DS = "AI&DS"
    COMP = "COMP"
    IT = "IT"
    EXTC = "EXTC"
    MECH = "MECH"
    CIVIL = "CIVIL"


class YearEnum(IntEnum):
    """IntEnum so it stores/serialises as an integer."""
    FIRST = 1
    SECOND = 2
    THIRD = 3
    FOURTH = 4


# ── Profile sub-models ──────────────────────────────────────────────

class StudentProfile(BaseModel):
    roll_no: str
    branch: BranchEnum
    year: YearEnum


class FacultyProfile(BaseModel):
    department: BranchEnum


class AdminProfile(BaseModel):
    pass  # may be empty


# ── Request schemas ─────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: RoleEnum
    profile: Optional[Dict[str, Any]] = None
    admin_secret_key: Optional[str] = None

    model_config = {"json_schema_extra": {
        "examples": [
            {
                "email": "stu@tcet.com",
                "name": "John Doe",
                "password": "secret123",
                "role": "student",
                "profile": {
                    "roll_no": "221001",
                    "branch": "COMP",
                    "year": 3,
                },
            }
        ]
    }}


# ── Response schemas ────────────────────────────────────────────────

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: RoleEnum
    institute_id: str
    profile: Dict[str, Any] = {}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
