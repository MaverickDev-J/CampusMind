"""Upload router – multi-modal file upload with streaming SHA-256 dedup."""

import hashlib
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from api.dependencies import get_current_user
from database.mongo import get_db

router = APIRouter(prefix="/api/upload", tags=["Upload"])
files_router = APIRouter(prefix="/api/files", tags=["Files"])
logger = logging.getLogger(__name__)

# ── Constants ───────────────────────────────────────────────────────

STORAGE_BASE = Path("storage")
TEMP_DIR = STORAGE_BASE / "temp"
UPLOAD_DIR = STORAGE_BASE / "uploads"

PDF_MIMES = ["application/pdf"]
IMAGE_MIMES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
VIDEO_MIMES = ["video/mp4", "video/webm"]

ALL_ALLOWED = PDF_MIMES + IMAGE_MIMES + VIDEO_MIMES
STUDENT_ALLOWED = PDF_MIMES + IMAGE_MIMES

CHUNK_SIZE = 8192

# Map file_type → static subfolder
_STATIC_DIRS = {"pdf": "pdfs", "image": "images", "video": "videos"}


def _mime_to_file_type(mime: str) -> str:
    """Map a MIME type to a storage category string."""
    if mime in PDF_MIMES:
        return "pdf"
    if mime in IMAGE_MIMES:
        return "image"
    if mime in VIDEO_MIMES:
        return "video"
    return "unknown"


def _build_playback_url(file_doc: dict) -> str:
    """Build a /static/... URL for a file document."""
    ft = file_doc.get("file_type", "pdf")
    folder = _STATIC_DIRS.get(ft, "pdfs")
    original = file_doc.get("original_name", "file.bin")
    ext = Path(original).suffix or ".bin"
    return f"/static/{folder}/{file_doc['file_id']}{ext}"


# ── POST /api/upload/file ───────────────────────────────────────────

@router.post("/file", status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    year: int = Form(...),
    branch: str = Form(...),
    subject: str = Form(...),
    unit: int = Form(None),
    doc_type: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role")
    profile = current_user.get("profile", {})
    can_upload = profile.get("can_upload", False)
    mime = file.content_type or ""

    # ① PERMISSION GATE
    if role == "student":
        if not can_upload:
            raise HTTPException(status_code=403, detail="Upload permission not granted")
        if mime not in STUDENT_ALLOWED:
            raise HTTPException(
                status_code=403,
                detail="Class Reps can only upload PDFs and images",
            )
    elif role in ("admin", "faculty"):
        if mime not in ALL_ALLOWED:
            raise HTTPException(status_code=415, detail="Unsupported file type")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    # ② DETERMINE FILE TYPE CATEGORY
    file_type = _mime_to_file_type(mime)
    ext = Path(file.filename or "file").suffix or ".bin"

    # ③ SHA-256 STREAMING HASH + SAVE TO TEMP
    temp_name = f"{uuid4().hex}{ext}"
    temp_path = TEMP_DIR / temp_name

    hasher = hashlib.sha256()
    file_size = 0

    async with aiofiles.open(temp_path, "wb") as tmp:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            hasher.update(chunk)
            await tmp.write(chunk)
            file_size += len(chunk)

    sha256_hash = hasher.hexdigest()

    # ④ DEDUP CHECK
    db = get_db()
    existing = await db.file_metadata.find_one({"sha256_hash": sha256_hash})
    if existing:
        os.remove(temp_path)
        return {
            "file_id": existing["file_id"],
            "message": "File already exists",
            "status": existing.get("processing", {}).get("status", "unknown"),
        }

    # ⑤ MOVE TO PERMANENT STORAGE
    file_id = f"file_{uuid4().hex}"
    permanent_dir = UPLOAD_DIR / f"{file_type}s"  # pdfs, images, videos
    permanent_path = permanent_dir / f"{file_id}{ext}"
    shutil.move(str(temp_path), str(permanent_path))

    # ⑥ SAVE METADATA TO MONGODB
    doc = {
        "file_id": file_id,
        "original_name": file.filename,
        "storage_path": str(permanent_path),
        "mime_type": mime,
        "file_type": file_type,
        "file_size_bytes": file_size,
        "sha256_hash": sha256_hash,
        "source": {
            "type": "upload",
            "youtube_video_id": None,
        },
        "academic": {
            "year": year,
            "branch": branch,
            "subject": subject,
            "unit": unit,
            "doc_type": doc_type,
        },
        "processing": {
            "status": "pending",
            "chunk_count": 0,
            "page_count": None,
            "error": None,
        },
        "visibility": "institute",
        "uploaded_by": current_user["user_id"],
        "uploaded_at": datetime.utcnow(),
    }
    await db.file_metadata.insert_one(doc)

    # ⑦ TRIGGER BACKGROUND INGESTION
    from api.services.ingestion import process_file_background
    background_tasks.add_task(process_file_background, file_id=file_id)

    # ⑧ RETURN RESPONSE
    return {
        "file_id": file_id,
        "original_name": file.filename,
        "file_type": file_type,
        "status": "pending",
        "message": "Uploaded. Processing in background.",
    }


# ── Background task stub (kept as fallback) ────────────────────────

async def ingest_file_stub(file_id: str, file_type: str):
    """No-op stub -- replaced by api.services.ingestion."""
    logger.info(f"Stub called for {file_id} ({file_type}) -- no-op")


# ── GET /api/files ─────────────────────────────────────────────────

@files_router.get("", status_code=status.HTTP_200_OK)
async def list_files(
    year: int | None = Query(None, description="Filter by academic year (1-4)"),
    branch: str | None = Query(None, description="Filter by branch (e.g. COMP, AI&DS)"),
    subject: str | None = Query(None, description="Filter by subject name"),
    doc_type: str | None = Query(None, description="Filter by doc type (lecture|notes|pyq|lab|reference)"),
    file_type: str | None = Query(None, description="Filter by file type (pdf|image|video)"),
    current_user: dict = Depends(get_current_user),
):
    """List all institute-visible files with optional filters."""
    db = get_db()

    query: dict = {"visibility": "institute"}
    if year is not None:
        query["academic.year"] = year
    if branch:
        query["academic.branch"] = branch
    if subject:
        query["academic.subject"] = subject
    if doc_type:
        query["academic.doc_type"] = doc_type
    if file_type:
        query["file_type"] = file_type

    cursor = db.file_metadata.find(
        query,
        {"storage_path": 0, "sha256_hash": 0, "_id": 0},
    ).sort("uploaded_at", -1)

    files = await cursor.to_list(length=100)

    # Attach playback_url to each file
    for f in files:
        f["playback_url"] = _build_playback_url(f)
        # Include youtube_video_id when source is youtube
        source = f.get("source", {})
        if source.get("type") == "youtube":
            f["youtube_video_id"] = source.get("youtube_video_id")

    return {"files": files, "count": len(files)}


# ── GET /api/files/{file_id} ───────────────────────────────────────

@files_router.get("/{file_id}", status_code=status.HTTP_200_OK)
async def get_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return metadata for a single file by file_id."""
    db = get_db()

    doc = await db.file_metadata.find_one(
        {"file_id": file_id},
        {"storage_path": 0, "sha256_hash": 0, "_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Visibility gate – only institute-level files are accessible
    if doc.get("visibility") != "institute":
        raise HTTPException(status_code=403, detail="Access denied")

    doc["playback_url"] = _build_playback_url(doc)

    source = doc.get("source", {})
    if source.get("type") == "youtube":
        doc["youtube_video_id"] = source.get("youtube_video_id")

    return doc
