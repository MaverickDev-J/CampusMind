# CampusMind — Project Status & Future Scope

> **Current Status:** Backend is **fully functional and tested end-to-end**. Frontend is **operational with core features built**. The platform delivers a working Upload → Ingest → RAG Chat pipeline today.

---

## 📚 Detailed Documentation

For detailed understanding and API routes please refer to the specific module READMEs:

- ⚙️ **[Backend Documentation](https://github.com/MaverickDev-J/CampusMind/blob/main/backend/README.md)**
- 💻 **[Frontend Documentation](https://github.com/MaverickDev-J/CampusMind/blob/main/frontend/README.md)**

---

## ✅ What's Complete (Production-Ready)

### Backend (100% Core Complete)

| Module                       | Status      | Details                                                                                                                                                                                                                                      |
| ---------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication** | ✅ Complete | JWT-based auth with role-aware registration (Student, Faculty, Admin)                                                                                                                                                                        |
| **Role-Based Permissions** | ✅ Complete | Admin grants upload rights to CRs; normal students are read-only/chat-only                                                                                                                                                                   |
| **File Upload Pipeline** | ✅ Complete | Multipart upload with streaming SHA-256 dedup, MIME validation, role-based file type restrictions                                                                                                                                            |
| **Background Ingestion** | ✅ Complete | PyMuPDF text extraction → Gemini Vision OCR fallback for scanned pages → chunking (800 chars, 100 overlap) → batch embedding → ChromaDB upsert with full academic metadata                                                                   |
| **Vector Knowledge Base** | ✅ Complete | ChromaDB with cosine HNSW, scoped by year/branch/subject/visibility — every chunk carries 12 metadata fields for filtered retrieval                                                                                                          |
| **LangGraph AI Agent** | ✅ Complete | 4-node pipeline: `entry_node` (profile + history + embedding) → `router_node` (Flash-Lite JSON intent classification) → `retriever_vector_node` (ChromaDB semantic search, top 8) → `synthesis_node_stream` (Flash streaming with citations) |
| **SSE Streaming Chat** | ✅ Complete | Real per-token streaming from Gemini through FastAPI → React. Events: `status`, `token`, `sources`, `done`, `error`                                                                                                                          |
| **Chat Persistence** | ✅ Complete | Sessions CRUD + message history in MongoDB. Last 6 messages loaded as context per query                                                                                                                                                      |
| **File Listing & Filters** | ✅ Complete | `GET /api/files` with multi-filter support (year, branch, subject, doc_type, file_type)                                                                                                                                                      |
| **Static File Serving** | ✅ Complete | PDFs, images, videos served via `/static` mount with `playback_url` in API responses                                                                                                                                                         |
| **No-Chunks-Found Handling** | ✅ Complete | When RAG returns zero results, synthesis politely tells the student and suggests rephrasing — prevents hallucination                                                                                                                         |
| **Model Fallback** | ✅ Complete | Vision OCR automatically falls back from `gemini-2.5-flash-lite` to `gemini-2.5-flash` on 429 rate limits                                                                                                                                    |

### Frontend (Core Pages Built)

| Page                            | Status      | Details                                                                                              |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| **Login / Signup** | ✅ Complete | Multi-role registration, JWT cookie storage, auto-redirect                                           |
| **Home Dashboard** | ✅ Complete | 3D globe, year selector, semester-wise curriculum cards                                              |
| **Deep Base (File Repository)** | ✅ Complete | Browse, filter, upload files with academic metadata; drag-and-drop upload modal                      |
| **Deep Learn (AI Chat)** | ✅ Complete | File-scoped chat, SSE token streaming, session sidebar, source citations panel, collapsible sidebars |
| **Route Protection** | ✅ Complete | Middleware redirects unauthenticated users to `/login`                                               |

---

## 🔮 Future Scope — What We're Building Next

### 1. Deep Study — Single-File Immersive Learning

**Priority: HIGH**

> _"Upload a 200-page textbook → click Study → ask anything about it → get instant answers with page citations"_

**What it does:**
When a student clicks "Study This File" on any uploaded PDF, the system creates a dedicated workspace where Gemini has the **entire file loaded into context** — not just the top 8 chunks from vector search, but the complete document.

**How it works:**

- Uses the **Gemini Files API** to upload the full PDF to Google's servers
- Creates a **Gemini Context Cache** (cached content) so the file stays in memory across multiple questions
- The `DEEP_STUDY` intent (already classified by the router) triggers a new `retriever_cache_node` instead of the vector retriever
- Enables capabilities impossible with RAG alone: "Summarize Chapter 5", "Create a quiz from pages 30–45", "Compare the approaches in Section 2 vs Section 4"

**Backend status:** The router already classifies `DEEP_STUDY` intent. The session model already accepts `file_id`. Only the cache node implementation remains.

**Why this matters:** Standard RAG retrieves fragments. Deep Study gives the AI the full picture — this is the difference between a search engine and a tutor.

---

### 2. YouTube Video Processing & Timestamped Citations

**Priority: HIGH**

> _"Paste a lecture video link → AI transcribes it → search it → click a citation → video jumps to that exact timestamp"_

**What it does:**
Faculty paste a YouTube URL. The system downloads the audio, transcribes it with timestamps using Gemini, chunk the transcript into time-segmented pieces, and indexes them in ChromaDB alongside PDFs and images.

**How it works:**

- `POST /api/upload/youtube` endpoint accepts a YouTube URL
- `yt-dlp` downloads the audio track
- Gemini Pro transcribes with word-level timestamps
- Transcript is chunked by natural topic boundaries (not fixed-size)
- Each chunk carries `timestamp_start` and `timestamp_end` in ChromaDB metadata
- When RAG retrieves a video chunk, the citation includes clickable timestamps
- Frontend embeds the YouTube player and seeks to the cited timestamp on click

**Backend status:** The `RetrievedChunk` dataclass already has `timestamp_start` and `timestamp_end` fields. The synthesis prompt already handles video citations (`"As explained in [filename] at [timestamp]..."`). Only the ingestion endpoint and transcription pipeline remain.

**Why this matters:** 70%+ of students learn from video lectures. Making videos searchable and citable turns CampusMind from a "PDF chatbot" into a complete learning platform.

---

### 3. Session Auto-Titling

**Priority: MEDIUM**

> _Instead of every session showing "New Chat", the first message auto-generates a descriptive title._

**What it does:**
After the first message in a session, a lightweight Gemini call generates a 5-word title (e.g., "Backpropagation in Neural Networks") and updates the session. A new SSE event `{"t":"title","d":"..."}` sends it to the frontend so the sidebar updates in real-time.

**Backend status:** Trivial addition to `chat.py` after the MongoDB save step. The session title field already exists.

---

### 4. Admin Analytics Dashboard

**Priority: MEDIUM**

> _Admins see: which subjects are most searched, which files are most cited, peak usage hours, upload activity trends._

**What it does:**
An admin-only dashboard with aggregated insights:

- **Search Analytics:** Most queried topics, intent distribution (RAG vs Conversational vs Out-of-Scope)
- **Content Coverage:** Subjects with the most/least uploaded material, flagging gaps in the knowledge base
- **Usage Patterns:** Active users per day, messages per session, peak hours
- **File Health:** Ingestion success/failure rates, average processing time, storage usage

**Backend status:** All the raw data already exists in MongoDB (`chat_history`, `chat_sessions`, `file_metadata`). Requires aggregation endpoints and a frontend dashboard.

---

## 🏗️ Architecture Readiness for Future Features

The current architecture was designed with these extensions in mind:

| Future Feature | What's Already Built                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep Study     | `DEEP_STUDY` intent in router, `file_id` in session model, `target_file_id` in router output                                                              |
| YouTube        | `timestamp_start`/`timestamp_end` in `RetrievedChunk`, video citation format in synthesis prompt, `source.youtube_video_id` field in file metadata schema |
| Analytics      | All user activity, queries, intents, and file interactions are persisted in MongoDB with timestamps                                                       |

---

## Summary

CampusMind today is a **fully functional AI-powered academic knowledge base** with:

- Complete upload → ingestion → vector search → AI chat pipeline
- Role-based access control (Admin, Faculty, CR Student, Student)
- Real-time SSE streaming with source citations
- Scoped RAG filtering by year, branch, subject, and document type

The backend is production-ready. The frontend delivers the core user experience. The future features listed above are designed to transform CampusMind from a strong hackathon project into a **production academic platform** — and the architecture is already built to support every one of them.
