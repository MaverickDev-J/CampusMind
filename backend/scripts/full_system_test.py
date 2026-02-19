"""
full_system_test.py — 4-Phase System Reset, Seeding & RAG Verification
=======================================================================
Phase 0: Clean Slate (wipe MongoDB + ChromaDB)
Phase 1: Actor Registration (2 faculty + 1 student)
Phase 2: Seed Demo Dataset (4 file uploads + wait for ingestion)
Phase 3: RAG Verification (4 queries via SSE chat)
"""

import json
import os
import shutil
import sys
import time

import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Fix Windows console encoding for emoji characters
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8000"
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "..", "test_upload_files")
RESULTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "full_system_results.txt")

# Open results file for clean output
OUT = open(RESULTS_FILE, "w", encoding="utf-8")


def log(msg=""):
    print(msg)
    OUT.write(msg + "\n")
    OUT.flush()


# ════════════════════════════════════════════════════════════════════
# PHASE 0: THE CLEAN SLATE
# ════════════════════════════════════════════════════════════════════

def phase_0():
    log("=" * 70)
    log("PHASE 0: THE CLEAN SLATE")
    log("=" * 70)

    # ── Wipe MongoDB ────────────────────────────────────────────────
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    db = client["campus_ai"]

    collections = ["users", "file_metadata", "chat_sessions", "chat_history"]
    for col in collections:
        result = db[col].delete_many({})
        log(f"  [MONGO] Dropped {col}: {result.deleted_count} docs removed")

    client.close()
    log("  [MONGO] ✅ All collections wiped")

    # ── Wipe ChromaDB (via API to avoid locked-file issues on Windows) ─
    try:
        import chromadb
        chroma_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                  "chroma_data")
        chroma_client = chromadb.PersistentClient(path=chroma_dir)
        collection_name = "campus_vectors"
        try:
            chroma_client.delete_collection(collection_name)
            log(f"  [CHROMA] Deleted collection '{collection_name}'")
        except Exception:
            log(f"  [CHROMA] Collection '{collection_name}' not found (already clean)")
        # Recreate empty collection so the server doesn't error
        chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        log(f"  [CHROMA] ✅ Collection recreated (empty)")
    except Exception as e:
        log(f"  [CHROMA] ⚠️ Could not reset via API: {e}")

    # ── Wipe storage ────────────────────────────────────────────────
    storage_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                               "storage")
    for sub in ["uploads/pdfs", "uploads/images", "uploads/videos", "temp"]:
        full = os.path.join(storage_dir, sub)
        if os.path.exists(full):
            for f in os.listdir(full):
                os.remove(os.path.join(full, f))
    log("  [STORAGE] ✅ Cleared upload directories")

    log("")


# ════════════════════════════════════════════════════════════════════
# PHASE 1: ACTOR REGISTRATION
# ════════════════════════════════════════════════════════════════════

def register_user(email, name, password, role, profile=None):
    payload = {
        "email": email,
        "name": name,
        "password": password,
        "role": role,
    }
    if profile:
        payload["profile"] = profile

    r = requests.post(f"{BASE}/api/auth/register", json=payload)
    if r.status_code != 201:
        log(f"  ❌ Register {email} failed: {r.status_code} {r.text}")
        return None
    data = r.json()
    log(f"  ✅ Registered {email} → user_id={data['user_id']}")
    return data


def login_user(email, password):
    r = requests.post(f"{BASE}/api/auth/login",
                      data={"username": email, "password": password})
    if r.status_code != 200:
        log(f"  ❌ Login {email} failed: {r.status_code} {r.text}")
        return None
    token = r.json()["access_token"]
    log(f"  🔑 Login {email} → token obtained")
    return token


def phase_1():
    log("=" * 70)
    log("PHASE 1: ACTOR REGISTRATION")
    log("=" * 70)

    tokens = {}

    # Faculty A (CS Dept)
    register_user("faculty.cs@tcet.com", "Prof. CS Faculty", "secret123",
                  "faculty", {"department": "COMP"})
    tokens["A"] = login_user("faculty.cs@tcet.com", "secret123")

    # Faculty B (AI Dept)
    register_user("faculty.ai@tcet.com", "Prof. AI Faculty", "secret123",
                  "faculty", {"department": "AI&DS"})
    tokens["B"] = login_user("faculty.ai@tcet.com", "secret123")

    # Student
    register_user("student.demo@tcet.com", "Demo Student", "secret123",
                  "student", {"roll_no": "221001", "branch": "COMP", "year": 3})
    tokens["S"] = login_user("student.demo@tcet.com", "secret123")

    log("")
    return tokens


# ════════════════════════════════════════════════════════════════════
# PHASE 2: SEED DEMO DATASET
# ════════════════════════════════════════════════════════════════════

MIME_MAP = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
}


def upload_file(token, filename, year, branch, subject, doc_type):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        log(f"  ❌ File not found: {filepath}")
        return None

    ext = os.path.splitext(filename)[1].lower()
    mime = MIME_MAP.get(ext, "application/octet-stream")

    h = {"Authorization": f"Bearer {token}"}
    with open(filepath, "rb") as f:
        files = {"file": (filename, f, mime)}
        data = {
            "year": str(year),
            "branch": branch,
            "subject": subject,
            "doc_type": doc_type,
        }
        r = requests.post(f"{BASE}/api/upload/file", headers=h, files=files, data=data)

    if r.status_code not in (200, 202):
        log(f"  ❌ Upload {filename} failed: {r.status_code} {r.text}")
        return None

    resp = r.json()
    file_id = resp.get("file_id")
    log(f"  📤 Uploaded {filename} → file_id={file_id}  status={resp.get('status')}")
    return file_id


def wait_for_processing(token, file_ids, timeout=180):
    """Poll GET /api/files/{id} until all files show 'completed'."""
    h = {"Authorization": f"Bearer {token}"}
    start = time.time()
    pending = set(file_ids)

    while pending and (time.time() - start) < timeout:
        for fid in list(pending):
            r = requests.get(f"{BASE}/api/files/{fid}", headers=h)
            if r.status_code == 200:
                status = r.json().get("processing", {}).get("status", "unknown")
                if status == "completed":
                    chunks = r.json().get("processing", {}).get("chunk_count", 0)
                    log(f"  ✅ {fid} → completed ({chunks} chunks)")
                    pending.discard(fid)
                elif status == "failed":
                    error = r.json().get("processing", {}).get("error", "unknown")
                    log(f"  ❌ {fid} → FAILED: {error}")
                    pending.discard(fid)

        if pending:
            remaining = list(pending)
            elapsed = int(time.time() - start)
            log(f"  ⏳ Waiting... {len(remaining)} files still processing ({elapsed}s elapsed)")
            time.sleep(10)

    if pending:
        log(f"  ⚠️ Timeout! Still pending: {pending}")


def phase_2(tokens):
    log("=" * 70)
    log("PHASE 2: SEED DEMO DATASET")
    log("=" * 70)

    file_ids = []

    # Token A (Faculty CS)
    log("\n  Using Token A (Faculty CS):")
    fid = upload_file(tokens["A"], "NWT chp 1.pdf", 3, "COMP", "NWT", "lecture")
    if fid: file_ids.append(fid)

    fid = upload_file(tokens["A"], "Operating_system_mod4.pdf", 2, "COMP", "OS", "notes")
    if fid: file_ids.append(fid)

    # Token B (Faculty AI)
    log("\n  Using Token B (Faculty AI):")
    fid = upload_file(tokens["B"], "ai_drug.png", 4, "AI&DS", "Bio-Info", "research")
    if fid: file_ids.append(fid)

    fid = upload_file(tokens["B"], "software_engineering.png", 2, "IT", "SE", "diagram")
    if fid: file_ids.append(fid)

    # Wait for all to complete
    log(f"\n  Polling for processing completion ({len(file_ids)} files)...")
    # Use any faculty token for polling
    wait_for_processing(tokens["A"], file_ids)

    log("")
    return file_ids


# ════════════════════════════════════════════════════════════════════
# PHASE 3: RAG VERIFICATION
# ════════════════════════════════════════════════════════════════════

def send_query(token, session_id, query):
    """Send a query via SSE and return (full_text, sources, intent)."""
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.post(f"{BASE}/api/chat/sessions/{session_id}/message",
                      headers=h, json={"query": query}, stream=True)

    tokens_list = []
    sources = []
    status_msgs = []

    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        ev = json.loads(line[6:])
        t, d = ev["t"], ev["d"]
        if t == "status":
            status_msgs.append(d)
        elif t == "token":
            tokens_list.append(d)
        elif t == "sources":
            sources = d

    full_text = "".join(tokens_list)
    return full_text, sources, status_msgs


def phase_3(tokens):
    log("=" * 70)
    log("PHASE 3: RAG VERIFICATION")
    log("=" * 70)

    h = {"Authorization": f"Bearer {tokens['S']}", "Content-Type": "application/json"}

    # Create a session
    r = requests.post(f"{BASE}/api/chat/sessions", headers=h,
                      json={"title": "Full System Test"})
    session = r.json()
    sid = session["session_id"]
    log(f"\n  📋 Session created: {sid}")

    # ── Define test queries ─────────────────────────────────────────
    queries = [
        {
            "query": "Explain Wide Area Network (WAN) from NWT chp 1.",
            "goal": "Retrieve from NWT chp 1.pdf",
            "label": "Text RAG (NWT)",
        },
        {
            "query": "What is memory abstraction in section 2?",
            "goal": "Retrieve from Operating_system_mod4.pdf",
            "label": "Complex Text RAG (OS)",
        },
        {
            "query": "What is the diagram given in the ai_drug image?",
            "goal": "Retrieve Gemini Vision description from ai_drug.png",
            "label": "Vision RAG (AI Drug)",
        },
        {
            "query": "What is given in the software engineering image?",
            "goal": "Retrieve from software_engineering.png (cross-branch visibility)",
            "label": "Vision RAG (SE)",
        },
    ]

    # ── Run queries ─────────────────────────────────────────────────
    for i, q in enumerate(queries, 1):
        log(f"\n  {'─' * 60}")
        log(f"  QUERY {i}: {q['label']}")
        log(f"  Goal: {q['goal']}")
        log(f"  Query: \"{q['query']}\"")
        log(f"  {'─' * 60}")

        text, sources, statuses = send_query(tokens["S"], sid, q["query"])

        # Log statuses
        for s in statuses:
            log(f"    ⏳ {s}")

        # Log sources
        if sources:
            log(f"    📚 Sources: {len(sources)} chunk(s)")
            for s in sources[:5]:
                fn = s.get("file_name", "?")
                pg = s.get("page_number", "?")
                sc = s.get("relevance_score", 0)
                log(f"       📄 {fn}  →  Page {pg}  (score: {sc:.4f})")
        else:
            log(f"    📚 Sources: NONE (no_chunks_found triggered)")

        # Log response preview
        preview = text[:300].replace("\n", "\n       ")
        log(f"    💬 Response ({len(text)} chars):")
        log(f"       {preview}...")

        # Determine pass/fail
        rag_hit = "Searching knowledge base..." in statuses
        has_sources = len(sources) > 0
        has_answer = len(text) > 50

        if rag_hit and has_answer:
            if has_sources:
                log(f"    ✅ PASS — RAG retrieved {len(sources)} sources")
            else:
                log(f"    ⚠️ PARTIAL — RAG path used but no chunks matched (no_chunks_found)")
        elif has_answer:
            log(f"    ⚠️ PARTIAL — Got answer but via CONVERSATIONAL (not RAG)")
        else:
            log(f"    ❌ FAIL — No meaningful response")

    log(f"\n{'=' * 70}")
    log("ALL PHASES COMPLETE")
    log(f"{'=' * 70}")


# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    log(f"CampusMind Full System Test — {time.strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"Server: {BASE}")
    log("")

    phase_0()
    tokens = phase_1()
    if not all(tokens.values()):
        log("❌ ABORT: Not all tokens obtained. Check server logs.")
        sys.exit(1)

    file_ids = phase_2(tokens)
    phase_3(tokens)

    OUT.close()
    log(f"\n📝 Results saved to: {RESULTS_FILE}")
