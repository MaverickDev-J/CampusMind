"""
nodes.py — CampusMind LangGraph Node Definitions (Production)
=============================================================
4 nodes.  Uses shared DB singletons.  New ``google-genai`` SDK.

NODE 1 : entry_node              — MongoDB + embed_content
NODE 2 : router_node             — Gemini Flash-Lite (JSON mode)
NODE 3A: retriever_vector_node   — ChromaDB semantic search
NODE 4 : synthesis_node_stream   — Gemini Flash streaming (async generator)

Deep Study (retriever_cache_node) is stubbed for future implementation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import AsyncGenerator

from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

from database.chroma import get_chroma_collection
from database.mongo import get_db

from .state import (
    ChatMessage,
    GraphState,
    RetrievedChunk,
    RouterOutput,
    UserProfile,
)

# ── Configuration ───────────────────────────────────────────────────

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

EMBED_MODEL = "models/gemini-embedding-001"        # must match ingestion
ROUTER_MODEL = "gemini-2.5-flash-lite"              # fast + cheap
SYNTHESIS_MODEL = "gemini-2.5-flash"                # quality streaming


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    return genai.Client(api_key=api_key)


# ═════════════════════════════════════════════════════════════════════
# NODE 1: entry_node
# Purpose: Load user profile, chat history, query embedding.
#          Pure data-loading — no LLM generation.
# ═════════════════════════════════════════════════════════════════════

async def entry_node(state: dict) -> dict:
    """Load user profile, last 6 messages, and query embedding."""
    logger.info(
        "[entry_node] user=%s session=%s", state["user_id"], state["session_id"]
    )

    db = get_db()

    # ── 1. User profile ─────────────────────────────────────────
    user_doc = await db.users.find_one({"user_id": state["user_id"]})
    if not user_doc:
        logger.error("[entry_node] User %s not found", state["user_id"])
        return {"error": f"User {state['user_id']} not found"}

    profile = UserProfile(
        user_id=user_doc["user_id"],
        name=user_doc["name"],
        role=user_doc["role"],
        year=user_doc.get("profile", {}).get("year"),
        branch=user_doc.get("profile", {}).get("branch"),
        department=user_doc.get("profile", {}).get("department"),
    )

    # ── 2. Last 6 messages (3 turns) ────────────────────────────
    cursor = (
        db.chat_history.find({"session_id": state["session_id"]})
        .sort("timestamp", -1)
        .limit(6)
    )
    raw = await cursor.to_list(length=6)
    raw.reverse()  # chronological
    chat_history = [ChatMessage(role=m["role"], content=m["content"]) for m in raw]

    # ── 3. Embed the query ──────────────────────────────────────
    client = _get_client()
    embed_result = await client.aio.models.embed_content(
        model=EMBED_MODEL,
        contents=state["query"],
        config={"task_type": "RETRIEVAL_QUERY"},
    )
    query_embedding = list(embed_result.embeddings[0].values)

    logger.info(
        "[entry_node] profile=%s history=%d msgs embedding=%d-dim",
        profile.role,
        len(chat_history),
        len(query_embedding),
    )
    return {
        "user_profile": profile,
        "chat_history": chat_history,
        "query_embedding": query_embedding,
        "processing_status": "routing",
    }


# ═════════════════════════════════════════════════════════════════════
# NODE 2: router_node
# Purpose: Classify query → RAG_SEARCH | CONVERSATIONAL | OUT_OF_SCOPE
# ═════════════════════════════════════════════════════════════════════

ROUTER_SYSTEM_PROMPT = """You are a query router for a college knowledge base AI system.

Classify the user's query into one of these 4 intents and output STRICT JSON.

CRITICAL DECISION RULE:
>>> When in doubt between RAG_SEARCH and CONVERSATIONAL, ALWAYS choose RAG_SEARCH. <<<
>>> If the query mentions ANY academic topic, concept, subject, or asks about content → RAG_SEARCH. <<<

INTENTS (in priority order):

1. RAG_SEARCH — DEFAULT for ANY question about academic content, concepts, or topics.
   USE THIS when the user asks about:
   - Any academic concept (backpropagation, sorting, OS scheduling, etc.)
   - Notes, PDFs, documents, uploaded material
   - Subject topics (ML, DBMS, Networks, OS, etc.)
   - "What is X?", "Explain X", "Tell me about X" where X is academic
   - Requests to find, search, or look up information
   Examples: "What is backpropagation?", "Explain neural networks",
             "What do my notes say about sorting?", "Find info about page replacement",
             "Tell me about machine learning algorithms"

2. OUT_OF_SCOPE — Non-academic queries OR academic cheating requests.
   Examples: "What's the weather?", "Write my assignment for me", "Tell me a joke"

3. DEEP_STUDY — User wants to study a SPECIFIC file they explicitly reference by name/ID.
   Examples: "Summarize this video", "Quiz me on this PDF"
   NOTE: Only use this if a specific file is referenced.

4. CONVERSATIONAL — ONLY for meta-conversation with NO academic topic.
   This is STRICTLY limited to:
   - Greetings: "Hi", "Hello", "Good morning"
   - Gratitude: "Thanks!", "Thank you"
   - Clarification of the AI's PREVIOUS response: "Can you explain that differently?", "Simplify that"
   - Study advice with NO specific topic: "What should I study first?"
   DO NOT use this for any question that mentions a subject, concept, or topic.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "intent": "RAG_SEARCH" | "DEEP_STUDY" | "CONVERSATIONAL" | "OUT_OF_SCOPE",
  "scope_year": <int or null>,
  "scope_branch": "<string or null>",
  "scope_subject": "<string or null>",
  "target_file_id": "<string or null>",
  "confidence": <float 0.0-1.0>
}

SCOPE INFERENCE RULES:
- If user mentions a year (1st year, Year 2), set scope_year.
- If user mentions a branch (CSE, AI&DS, MECH), set scope_branch.
- If user mentions a subject (ML, DBMS, Networks), set scope_subject.
- If not mentioned, set scope fields to null (profile defaults will apply).
"""


async def router_node(state: dict) -> dict:
    """Route the query to the correct retrieval path."""
    logger.info("[router_node] query=%s", state["query"][:80])

    profile: UserProfile = state["user_profile"]

    user_context = (
        f"USER PROFILE:\n"
        f"- Role: {profile.role}\n"
        f"- Year: {profile.year or 'N/A'}\n"
        f"- Branch: {profile.branch or 'N/A'}\n"
    )

    # Last 2 messages for router context
    history_snippet = ""
    if state.get("chat_history"):
        recent = state["chat_history"][-2:]
        history_snippet = "\nRECENT CONVERSATION:\n" + "\n".join(
            f"{m.role.upper()}: {m.content[:200]}" for m in recent
        )

    full_prompt = f"{user_context}{history_snippet}\n\nCURRENT QUERY: {state['query']}"

    client = _get_client()

    # ── Try router with retry + model fallback ──────────────────
    models_to_try = [ROUTER_MODEL, "gemini-2.5-flash"]
    response = None

    for model in models_to_try:
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=ROUTER_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=200,
                ),
            )
            logger.info("[router_node] Success with model=%s", model)
            break
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                logger.warning("[router_node] 429 on %s — retrying with next model", model)
                await asyncio.sleep(2)
                continue
            else:
                logger.warning("[router_node] Error on %s: %s", model, e)
                break

    if response and response.text:
        try:
            parsed = json.loads(response.text.strip())
            router_output = RouterOutput(
                intent=parsed.get("intent", "RAG_SEARCH"),
                scope_year=parsed.get("scope_year") or profile.year,
                scope_branch=parsed.get("scope_branch") or profile.branch,
                scope_subject=parsed.get("scope_subject"),
                target_file_id=parsed.get("target_file_id"),
                confidence=parsed.get("confidence", 0.9),
            )
            logger.info(
                "[router_node] intent=%s scope=y%s/%s conf=%s",
                router_output.intent,
                router_output.scope_year,
                router_output.scope_branch,
                router_output.confidence,
            )
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning("[router_node] JSON parse failed: %s — fallback RAG_SEARCH", e)
            router_output = RouterOutput(
                intent="RAG_SEARCH",
                scope_year=profile.year,
                scope_branch=profile.branch,
                confidence=0.0,
            )
    else:
        logger.warning("[router_node] All models failed — fallback RAG_SEARCH")
        router_output = RouterOutput(
            intent="RAG_SEARCH",
            scope_year=profile.year,
            scope_branch=profile.branch,
            confidence=0.0,
        )

    return {"router_output": router_output, "processing_status": "retrieving"}


# ═════════════════════════════════════════════════════════════════════
# NODE 3A: retriever_vector_node
# Purpose: Semantic search in ChromaDB with scope + visibility filters
# ═════════════════════════════════════════════════════════════════════

async def retriever_vector_node(state: dict) -> dict:
    """
    Query ChromaDB for top 8 relevant chunks.

    Sets ``no_chunks_found = True`` when zero results are returned so
    that synthesis_node knows to give a polite "not found" response.
    """
    logger.info("[retriever_vector_node] Starting ChromaDB retrieval")

    scope: RouterOutput = state["router_output"]
    profile: UserProfile = state["user_profile"]
    collection = get_chroma_collection()

    # ── Build where= filter ─────────────────────────────────────
    visibility_filter = {
        "$or": [
            {"visibility": {"$eq": "institute"}},
            {"uploaded_by": {"$eq": profile.user_id}},
        ]
    }

    conditions = [visibility_filter]
    if scope.scope_year is not None:
        conditions.append({"year": {"$eq": scope.scope_year}})
    if scope.scope_branch is not None:
        conditions.append({"branch": {"$eq": scope.scope_branch}})
    if scope.scope_subject is not None:
        conditions.append({"subject": {"$eq": scope.scope_subject}})

    where_filter = {"$and": conditions} if len(conditions) > 1 else conditions[0]

    logger.info("[retriever_vector_node] filter=%s", where_filter)

    # ── Query (sync → to_thread) ────────────────────────────────
    try:
        results = await asyncio.to_thread(
            collection.query,
            query_embeddings=[state["query_embedding"]],
            n_results=8,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.error("[retriever_vector_node] ChromaDB query failed: %s", e)
        return {
            "retrieved_chunks": [],
            "response_sources": [],
            "no_chunks_found": True,
            "processing_status": "generating",
        }

    # ── Parse results ───────────────────────────────────────────
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    retrieved_chunks: list[RetrievedChunk] = []
    for doc, meta, dist in zip(documents, metadatas, distances):
        retrieved_chunks.append(
            RetrievedChunk(
                text=doc,
                source_file=meta.get("file_name", "Unknown"),
                file_type=meta.get("file_type", "unknown"),
                page_number=meta.get("page_number"),
                timestamp_start=meta.get("timestamp_start"),
                timestamp_end=meta.get("timestamp_end"),
                subject=meta.get("subject"),
                relevance_score=round(1 - dist, 4),
            )
        )

    no_chunks = len(retrieved_chunks) == 0

    if no_chunks:
        logger.info("[retriever_vector_node] No chunks found — flagging for synthesis")
    else:
        logger.info(
            "[retriever_vector_node] %d chunks (top=%.4f)",
            len(retrieved_chunks),
            retrieved_chunks[0].relevance_score,
        )

    response_sources = [
        {
            "file_name": c.source_file,
            "file_type": c.file_type,
            "page_number": c.page_number,
            "timestamp_start": c.timestamp_start,
            "timestamp_end": c.timestamp_end,
            "relevance_score": c.relevance_score,
        }
        for c in retrieved_chunks
    ]

    return {
        "retrieved_chunks": retrieved_chunks,
        "response_sources": response_sources,
        "no_chunks_found": no_chunks,
        "processing_status": "generating",
    }


# ═════════════════════════════════════════════════════════════════════
# NODE 4: synthesis_node_stream (async generator)
# Purpose: Generate the final response using Gemini Flash streaming.
#          Yields individual tokens for SSE forwarding.
#          Does NOT save to MongoDB — the SSE endpoint handles that.
# ═════════════════════════════════════════════════════════════════════

SYNTHESIS_SYSTEM_PROMPT = """You are CampusAI, an expert academic tutor for engineering students.

YOUR IDENTITY:
- You help students understand concepts, NOT do their work for them.
- You are precise, clear, and cite your sources always.
- You adapt your explanation depth to the question complexity.

ACADEMIC INTEGRITY RULES (NON-NEGOTIABLE):
1. NEVER provide direct answers to exam questions or assignment problems.
2. For PYQs, explain the APPROACH and CONCEPT only — not the answer.
3. If asked to "write my assignment" or "solve this for me", decline and offer to explain the concept.
4. Guide understanding. Always.

CITATION RULES:
- For PDF sources: "According to [filename, Page X]..."
- For video sources: "As explained in [filename] at [timestamp]..."
- For image/scan sources: "From the notes in [filename]..."
- If you have NO retrieved chunks (CONVERSATIONAL intent), answer from general knowledge.

RESPONSE FORMAT:
- Use markdown formatting (headers, bullet points, code blocks where appropriate).
- Keep responses focused and not unnecessarily long.
- End with a follow-up prompt if appropriate: "Want me to dive deeper into [specific aspect]?"

OUT OF SCOPE:
- If the query is OUT_OF_SCOPE, respond with:
  "I'm here to help with your academic studies. I can't help with that topic,
   but I can help you with your coursework. What subject are you studying?"
"""


async def synthesis_node_stream(state: dict) -> AsyncGenerator[str, None]:
    """
    Async generator that yields individual tokens from Gemini streaming.

    The SSE endpoint collects these tokens, accumulates the full response,
    and handles MongoDB persistence after the stream completes.
    """
    intent = state["router_output"].intent

    # ── OUT_OF_SCOPE: instant rejection, no LLM call ────────────
    if intent == "OUT_OF_SCOPE":
        rejection = (
            "I'm here to help with your academic studies. "
            "I can't assist with that request, but I'm happy to help you "
            "with any of your coursework. What subject are you working on?"
        )
        yield rejection
        return

    # ── Build prompt parts ──────────────────────────────────────
    prompt_parts = _build_synthesis_prompt(state)

    client = _get_client()
    config = types.GenerateContentConfig(
        system_instruction=SYNTHESIS_SYSTEM_PROMPT,
        temperature=0.4,
        max_output_tokens=2048,
    )

    # ── Stream from Gemini (async) ──────────────────────────────
    try:
        stream = await client.aio.models.generate_content_stream(
            model=SYNTHESIS_MODEL,
            contents=prompt_parts,
            config=config,
        )

        async for chunk in stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error("[synthesis_node_stream] Gemini generation failed: %s", e)
        yield (
            "I encountered an issue generating a response. "
            "Please try again in a moment."
        )


def _build_synthesis_prompt(state: dict) -> str:
    """Assemble the full prompt: history + context + question."""
    parts: list[str] = []

    # ── Chat history ────────────────────────────────────────────
    if state.get("chat_history"):
        history_text = "CONVERSATION HISTORY:\n"
        for msg in state["chat_history"]:
            history_text += f"{msg.role.upper()}: {msg.content}\n"
        parts.append(history_text)

    # ── Retrieved chunks (RAG path) ─────────────────────────────
    chunks = state.get("retrieved_chunks", [])
    no_chunks = state.get("no_chunks_found", False)

    if chunks:
        context = "\nRELEVANT COURSE MATERIAL:\n" + "─" * 50 + "\n"
        for i, c in enumerate(chunks, 1):
            if c.file_type == "video" and c.timestamp_start:
                cite = f"[{c.source_file} | {c.timestamp_start}-{c.timestamp_end}]"
            elif c.file_type == "pdf" and c.page_number:
                cite = f"[{c.source_file} | Page {c.page_number}]"
            else:
                cite = f"[{c.source_file}]"
            context += f"\nSOURCE {i} {cite}:\n{c.text}\n" + "─" * 50 + "\n"
        parts.append(context)

    elif no_chunks and state["router_output"].intent == "RAG_SEARCH":
        parts.append(
            "\nIMPORTANT: No relevant course material was found in the knowledge "
            "base for this query. Tell the student politely that you couldn't find "
            "matching notes or documents, and suggest they try rephrasing or check "
            "if the materials have been uploaded. Do NOT make up information.\n"
        )

    elif state["router_output"].intent == "RAG_SEARCH":
        parts.append(
            "\nNOTE: No relevant course material was found. Answer from general "
            "academic knowledge if possible, but clearly state this isn't from "
            "the college's uploaded materials.\n"
        )

    # ── The question ────────────────────────────────────────────
    parts.append(f"\nSTUDENT QUESTION: {state['query']}")

    return "\n".join(parts)
