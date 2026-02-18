"""
state.py — CampusMind LangGraph State Definition
=================================================
Single source of truth for all data flowing through the agent graph.
Every node reads from and writes to this TypedDict.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional, TypedDict


# ── Sub-types ───────────────────────────────────────────────────────


@dataclass
class UserProfile:
    """Loaded from MongoDB ``users`` collection in entry_node."""

    user_id: str
    name: str
    role: Literal["admin", "faculty", "student"]
    year: Optional[int] = None
    branch: Optional[str] = None
    department: Optional[str] = None  # faculty only


@dataclass
class ChatMessage:
    """A single message from chat history (last 6 loaded per query)."""

    role: Literal["user", "assistant"]
    content: str


@dataclass
class RetrievedChunk:
    """A single chunk returned from ChromaDB retriever_vector_node."""

    text: str
    source_file: str  # e.g. "ML_Lecture_Unit3.pdf"
    file_type: str  # "pdf", "video", "audio", "image"
    page_number: Optional[int] = None
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    subject: Optional[str] = None
    relevance_score: Optional[float] = None


@dataclass
class RouterOutput:
    """Structured output from router_node (Flash-Lite JSON mode)."""

    intent: Literal[
        "RAG_SEARCH",  # → retriever_vector_node
        "DEEP_STUDY",  # → retriever_cache_node  (deferred)
        "CONVERSATIONAL",  # → synthesis_node directly
        "OUT_OF_SCOPE",  # → synthesis_node with rejection
    ]
    scope_year: Optional[int] = None
    scope_branch: Optional[str] = None
    scope_subject: Optional[str] = None
    target_file_id: Optional[str] = None
    confidence: Optional[float] = None


# ── Main Graph State ────────────────────────────────────────────────


class GraphState(TypedDict):
    """
    The single state object passed through every node.

    FLOW:
      entry_node     → user_profile, chat_history, query_embedding
      router_node    → router_output
      retriever_*    → retrieved_chunks, response_sources, no_chunks_found
      synthesis_node → final_response (or yields tokens)
    """

    # ── INPUT (set by FastAPI before graph invocation) ────────────
    query: str
    session_id: str
    user_id: str

    # ── ENTRY NODE outputs ────────────────────────────────────────
    user_profile: Optional[UserProfile]
    chat_history: Optional[list[ChatMessage]]
    query_embedding: Optional[list[float]]

    # ── ROUTER NODE outputs ───────────────────────────────────────
    router_output: Optional[RouterOutput]

    # ── RETRIEVER NODE outputs ────────────────────────────────────
    retrieved_chunks: Optional[list[RetrievedChunk]]
    response_sources: Optional[list[dict]]
    no_chunks_found: Optional[bool]  # True when RAG found 0 results

    # ── SYNTHESIS NODE outputs ────────────────────────────────────
    final_response: Optional[str]

    # ── METADATA ──────────────────────────────────────────────────
    processing_status: Optional[str]
    error: Optional[str]
