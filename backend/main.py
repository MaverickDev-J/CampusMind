"""CampusMind FastAPI application entry-point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.mongo import connect_db, close_db, get_db
from api.routers import auth as auth_router


# ── Lifespan ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to MongoDB and create unique indexes
    await connect_db()
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    print("✅  MongoDB connected & indexes ensured")
    yield
    # Shutdown: close the connection
    await close_db()
    print("🛑  MongoDB connection closed")


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
