"""CampusMind FastAPI application entry-point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database.mongo import connect_db, close_db, get_db
from database.chroma import connect_chroma
from api.routers import auth as auth_router
from api.routers import admin as admin_router
from api.routers import upload as upload_router
from api.routers import chat as chat_router


# ── Lifespan ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB and create unique indexes
    await connect_db()
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.file_metadata.create_index("sha256_hash", unique=True)
    await db.file_metadata.create_index("file_id", unique=True)
    await db.chat_sessions.create_index("session_id", unique=True)
    await db.chat_sessions.create_index("user_id")
    await db.chat_history.create_index([("session_id", 1), ("timestamp", 1)])
    print("[OK] MongoDB connected & indexes ensured")

    # Startup: connect to ChromaDB
    connect_chroma()
    print("[OK] ChromaDB connected (campus_vectors collection ready)")
    yield
    # Shutdown: close the connection
    await close_db()
    print("[STOP] MongoDB connection closed")


# ── App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="CampusMind API",
    description="Smart Campus AI Knowledge Base",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────

app.include_router(auth_router.router)
app.include_router(admin_router.router)
app.include_router(upload_router.router)
app.include_router(upload_router.files_router)
app.include_router(chat_router.router)

# ── Static files ────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory="storage/uploads"), name="static")


# ── Health check ────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Ping MongoDB to verify the connection is alive."""
    db = get_db()
    try:
        await db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
