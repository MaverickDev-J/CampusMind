"""Background ingestion service – extracts text, embeds, stores in ChromaDB."""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import os
from pathlib import Path

import fitz  # PyMuPDF
from dotenv import load_dotenv
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter
from PIL import Image

from database.chroma import get_chroma_collection
from database.mongo import get_db

logger = logging.getLogger(__name__)

# ── Load Gemini API key ────────────────────────────────────────────

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

EMBED_MODEL = "models/gemini-embedding-001"
VISION_MODEL_PRIMARY = "gemini-2.5-flash-lite"
VISION_MODEL_FALLBACK = "gemini-2.5-flash"

VISION_PROMPT = (
    "Extract ALL content from this academic image. Include all text (printed or "
    "handwritten), equations in LaTeX format, tables as Markdown, and describe any "
    "diagrams or flowcharts in technical detail. Output plain text only, no special prefixes."
)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
EMBED_BATCH_SIZE = 100


# ── Helpers ─────────────────────────────────────────────────────────

def _get_gemini_client() -> genai.Client:
    """Return a Gemini client; raises if GEMINI_API_KEY is missing."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    return genai.Client(api_key=GEMINI_API_KEY)


def _pixmap_to_pil(pixmap: fitz.Pixmap) -> Image.Image:
    """Convert a PyMuPDF Pixmap to a PIL Image."""
    if pixmap.n > 4:
        pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
    if pixmap.alpha:
        mode = "RGBA"
    elif pixmap.n >= 3:
        mode = "RGB"
    else:
        mode = "L"
    return Image.frombytes(mode, (pixmap.width, pixmap.height), pixmap.samples)


def _pil_to_image_part(image: Image.Image, image_format: str = "PNG") -> types.Part:
    """Encode a PIL Image as a Gemini Part."""
    if image_format.upper() in ("JPG", "JPEG"):
        image_format = "JPEG"
    if image_format not in ("JPEG", "PNG", "WEBP"):
        image_format = "PNG"
    if image_format == "JPEG" and image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[image_format]
    buf = io.BytesIO()
    image.save(buf, format=image_format)
    return types.Part.from_bytes(data=buf.getvalue(), mime_type=mime)


async def _vision_extract(client: genai.Client, image: Image.Image, fmt: str = "PNG") -> str:
    """
    Use Gemini Vision to OCR a page rendered as an image.
    Tries flash-lite first; on rate-limit (429) or API error, retries with flash.
    """
    part = _pil_to_image_part(image, image_format=fmt)

    for model in (VISION_MODEL_PRIMARY, VISION_MODEL_FALLBACK):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=[VISION_PROMPT, part],
            )
            text = (response.text or "").strip()
            if not text:
                raise RuntimeError(f"{model} returned empty text")
            return text
        except Exception as exc:
            exc_str = str(exc).lower()
            is_rate_limit = "429" in exc_str or "rate" in exc_str or "resource" in exc_str
            if model == VISION_MODEL_PRIMARY and is_rate_limit:
                logger.warning(
                    f"{VISION_MODEL_PRIMARY} rate-limited, falling back to {VISION_MODEL_FALLBACK}: {exc}"
                )
                await asyncio.sleep(1)  # brief cooldown before fallback
                continue
            raise  # re-raise if fallback also fails or non-rate-limit error

    raise RuntimeError("All vision models failed")


# ── PDF & Image extraction ──────────────────────────────────────────

async def _extract_pdf_pages(client: genai.Client, file_path: str) -> list[tuple[int, str]]:
    """Extract text from each page of a PDF; falls back to Vision OCR for scanned pages."""
    pages: list[tuple[int, str]] = []
    with fitz.open(file_path) as pdf:
        for page_num, page in enumerate(pdf, start=1):
            text = (page.get_text() or "").strip()
            if len(text) > 50:
                pages.append((page_num, text))
            else:
                pix = page.get_pixmap()
                pil_image = _pixmap_to_pil(pix)
                vision_text = await _vision_extract(client, pil_image, fmt="PNG")
                pages.append((page_num, vision_text))
    return pages


async def _extract_image_pages(client: genai.Client, file_path: str) -> list[tuple[int, str]]:
    """Extract text from a standalone image file using Gemini Vision."""
    ext = Path(file_path).suffix.lower()
    fmt = "JPEG" if ext in (".jpg", ".jpeg") else "WEBP" if ext == ".webp" else "PNG"
    with Image.open(file_path) as img:
        text = await _vision_extract(client, img.copy(), fmt=fmt)
    return [(1, text)]


# ── Main entry point ────────────────────────────────────────────────

async def process_file_background(file_id: str) -> None:
    """
    Full ingestion pipeline for a single file:
      1. Lookup file_metadata in MongoDB
      2. Set processing.status = 'processing'
      3. Extract text (PyMuPDF + Vision fallback)
      4. Chunk, embed, store in ChromaDB with academic metadata
      5. Update MongoDB status to 'completed' or 'failed'
    """
    db = get_db()

    try:
        # ── Step 1: lookup ──────────────────────────────────────────
        doc = await db.file_metadata.find_one({"file_id": file_id})
        if not doc:
            logger.error(f"file_id={file_id} not found in file_metadata")
            return

        storage_path = doc["storage_path"]
        file_type = doc["file_type"]
        academic = doc.get("academic", {})
        original_name = doc.get("original_name", "unknown")
        uploaded_by = doc.get("uploaded_by", "")
        visibility = doc.get("visibility", "institute")
        unit = academic.get("unit")  # may be None

        # ── Step 2: mark as processing ──────────────────────────────
        await db.file_metadata.update_one(
            {"file_id": file_id},
            {"$set": {"processing.status": "processing"}},
        )

        # ── Step 3: extract text ────────────────────────────────────
        client = _get_gemini_client()

        if file_type == "pdf":
            pages = await _extract_pdf_pages(client, storage_path)
        elif file_type == "image":
            pages = await _extract_image_pages(client, storage_path)
        else:
            raise ValueError(f"Unsupported file_type for ingestion: {file_type}")

        if not pages:
            raise RuntimeError("No pages were extracted from the file")

        # ── Step 4: chunk, embed, store ─────────────────────────────
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
        )

        chunk_records: list[dict] = []
        for page_num, page_text in pages:
            page_chunks = splitter.split_text(page_text)
            for chunk_idx, chunk_text in enumerate(page_chunks, start=1):
                chunk_records.append({
                    "id": f"{file_id}_p{page_num}_c{chunk_idx}",
                    "page_number": page_num,
                    "chunk_index": chunk_idx,
                    "text": chunk_text,
                })

        if not chunk_records:
            raise RuntimeError("Chunking produced zero chunks")

        # Batch embed
        all_embeddings: list[list[float]] = []
        for start in range(0, len(chunk_records), EMBED_BATCH_SIZE):
            batch = chunk_records[start : start + EMBED_BATCH_SIZE]
            batch_texts = [r["text"] for r in batch]

            embed_resp = await client.aio.models.embed_content(
                model=EMBED_MODEL,
                contents=batch_texts,
                config={"task_type": "RETRIEVAL_DOCUMENT"},
            )

            if not getattr(embed_resp, "embeddings", None):
                raise RuntimeError("Embedding API returned no embeddings")

            for emb in embed_resp.embeddings:
                values = getattr(emb, "values", None)
                if values is None:
                    raise RuntimeError("Embedding object missing values")
                all_embeddings.append(list(values))

        if len(all_embeddings) != len(chunk_records):
            raise RuntimeError(
                f"Embedding count mismatch: {len(all_embeddings)} vs {len(chunk_records)}"
            )

        # Build ChromaDB payloads with full academic metadata
        ids = [r["id"] for r in chunk_records]
        documents = [r["text"] for r in chunk_records]
        metadatas = []
        for r in chunk_records:
            meta = {
                "file_id": file_id,
                "file_name": original_name,
                "file_type": file_type,
                "page_number": r["page_number"],
                "chunk_index": r["chunk_index"],
                "year": academic.get("year", 0),
                "branch": academic.get("branch", ""),
                "subject": academic.get("subject", ""),
                "doc_type": academic.get("doc_type", ""),
                "visibility": visibility,
                "uploaded_by": uploaded_by,
            }
            # Only add unit if it has a value (ChromaDB rejects None)
            if unit is not None:
                meta["unit"] = unit
            metadatas.append(meta)

        collection = get_chroma_collection()
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=all_embeddings,
            metadatas=metadatas,
        )

        # ── Step 5: mark completed ──────────────────────────────────
        await db.file_metadata.update_one(
            {"file_id": file_id},
            {
                "$set": {
                    "processing.status": "completed",
                    "processing.chunk_count": len(chunk_records),
                    "processing.page_count": len(pages),
                    "processing.error": None,
                }
            },
        )
        logger.info(
            f"Ingestion complete: {file_id} | "
            f"{len(pages)} pages, {len(chunk_records)} chunks"
        )

    except Exception as exc:
        logger.exception(f"Ingestion failed for {file_id}: {exc}")
        try:
            await db.file_metadata.update_one(
                {"file_id": file_id},
                {
                    "$set": {
                        "processing.status": "failed",
                        "processing.error": str(exc)[:500],
                    }
                },
            )
        except Exception:
            logger.exception("Failed to update error status in MongoDB")
