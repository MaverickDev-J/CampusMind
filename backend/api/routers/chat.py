"""Chat sessions, history & SSE streaming — LangGraph integration."""

from __future__ import annotations

import json as _json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.agent.nodes import (
    entry_node,
    retriever_vector_node,
    router_node,
    synthesis_node_stream,
)
from api.dependencies import get_current_user
from database.mongo import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ── Helpers ─────────────────────────────────────────────────────────

def _sse(event_type: str, data) -> str:
    """Format a single SSE line: ``data: {"t":"...","d":"..."}\n\n``."""
    payload = _json.dumps({"t": event_type, "d": data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


# ── Request / Response models ───────────────────────────────────────

class CreateSessionBody(BaseModel):
    title: Optional[str] = None
    file_id: Optional[str] = None


class ChatMessageBody(BaseModel):
    query: str


# ── Endpoint 1: Create Session ──────────────────────────────────────

@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_session(
    body: CreateSessionBody = CreateSessionBody(),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new chat session.

    If ``file_id`` is provided the file must exist in ``file_metadata``
    with ``processing.status == "completed"`` (i.e. fully ingested).
    """
    db = get_db()
    user_id: str = current_user["user_id"]

    # ── Optional file validation ────────────────────────────────
    if body.file_id:
        file_doc = await db.file_metadata.find_one({"file_id": body.file_id})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File {body.file_id} not found",
            )
        if file_doc.get("processing", {}).get("status") != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {body.file_id} is not yet processed (status: {file_doc.get('processing', {}).get('status', 'unknown')})",
            )

    # ── Build session document ──────────────────────────────────
    now = datetime.now(timezone.utc)
    session_id = f"sess_{uuid4().hex[:12]}"

    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "title": body.title or "New Chat",
        "file_id": body.file_id,          # None if not provided
        "created_at": now,
        "updated_at": now,
    }

    await db.chat_sessions.insert_one(session_doc)

    return {
        "session_id": session_id,
        "title": session_doc["title"],
        "file_id": body.file_id,
        "created_at": now.isoformat(),
    }


# ── Endpoint 2: List User Sessions ─────────────────────────────────

@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """Return all chat sessions for the authenticated user, newest first."""
    db = get_db()
    user_id: str = current_user["user_id"]

    cursor = db.chat_sessions.find(
        {"user_id": user_id},
        {"_id": 0},                       # exclude Mongo ObjectId
    ).sort("updated_at", -1)

    sessions = await cursor.to_list(length=200)

    # Serialise datetimes
    for s in sessions:
        for key in ("created_at", "updated_at"):
            if isinstance(s.get(key), datetime):
                s[key] = s[key].isoformat()

    return {"sessions": sessions, "count": len(sessions)}


# ── Endpoint 3: Load Chat History ───────────────────────────────────

@router.get("/sessions/{session_id}/history")
async def load_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Return all messages for a session, sorted chronologically.

    Security: the session must belong to the requesting user.
    """
    db = get_db()
    user_id: str = current_user["user_id"]

    # ── Verify ownership ────────────────────────────────────────
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    if session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )

    # ── Fetch messages ──────────────────────────────────────────
    cursor = db.chat_history.find(
        {"session_id": session_id},
        {"_id": 0},
    ).sort("timestamp", 1)

    messages = await cursor.to_list(length=500)

    for m in messages:
        if isinstance(m.get("timestamp"), datetime):
            m["timestamp"] = m["timestamp"].isoformat()

    return {"messages": messages, "count": len(messages)}


# ── Endpoint 4: SSE Chat (The Main Event) ──────────────────────────

@router.post("/sessions/{session_id}/message")
async def chat_message(
    session_id: str,
    body: ChatMessageBody,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message and stream the AI response via SSE.

    The endpoint orchestrates the LangGraph nodes manually so we get
    real per-token streaming from Gemini.

    SSE event types: ``status``, ``token``, ``sources``, ``done``, ``error``
    """
    db = get_db()
    user_id: str = current_user["user_id"]

    # ── Validate session ownership ──────────────────────────────
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if session["user_id"] != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not own this session")

    query = body.query

    # ── Async generator that drives the whole pipeline ──────────
    async def event_stream():
        state: dict = {
            "query": query,
            "session_id": session_id,
            "user_id": user_id,
        }

        try:
            # ── Step 1: entry_node ──────────────────────────────
            yield _sse("status", "Analyzing your question...")
            entry_result = await entry_node(state)
            state.update(entry_result)

            if state.get("error"):
                yield _sse("error", state["error"])
                yield _sse("done", "")
                return

            # ── Step 2: router_node ─────────────────────────────
            yield _sse("status", "Routing...")
            router_result = await router_node(state)
            state.update(router_result)

            intent = state["router_output"].intent
            logger.info("[chat_message] intent=%s", intent)

            # ── Step 3: conditional retrieval ───────────────────
            if intent == "RAG_SEARCH":
                yield _sse("status", "Searching knowledge base...")
                retriever_result = await retriever_vector_node(state)
                state.update(retriever_result)
            # DEEP_STUDY, CONVERSATIONAL, OUT_OF_SCOPE → skip retrieval

            # ── Step 4: synthesis (streaming tokens) ────────────
            yield _sse("status", "Generating answer...")

            accumulated = []
            async for token in synthesis_node_stream(state):
                accumulated.append(token)
                yield _sse("token", token)

            full_response = "".join(accumulated)

            # ── Step 5: save to MongoDB ─────────────────────────
            now = datetime.now(timezone.utc)
            await db.chat_history.insert_many([
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "role": "user",
                    "content": query,
                    "timestamp": now,
                },
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "role": "assistant",
                    "content": full_response,
                    "sources": state.get("response_sources", []),
                    "intent": intent,
                    "timestamp": now,
                },
            ])

            await db.chat_sessions.update_one(
                {"session_id": session_id},
                {"$set": {"updated_at": now}},
            )

            # ── Step 6: send sources + done ─────────────────────
            yield _sse("sources", state.get("response_sources", []))
            yield _sse("done", "")

        except Exception as exc:
            logger.exception("[chat_message] Stream error: %s", exc)
            yield _sse("error", f"Something went wrong: {str(exc)[:200]}")
            yield _sse("done", "")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",      # nginx: don't buffer SSE
        },
    )

