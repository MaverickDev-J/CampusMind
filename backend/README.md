# CampusMind Backend

> Smart Campus AI Knowledge Base — FastAPI + Motor (MongoDB) + JWT Auth

---

## How to Run

```bash
cd backend
uv run uvicorn main:app --reload
```

| Resource | URL |
|---|---|
| Swagger UI | [http://localhost:8000/docs](http://localhost:8000/docs) |
| Health Check | `GET /health` |
| Static Files | `http://localhost:8000/static/pdfs/...` |

---

## 🔐 Authentication

### `POST /api/auth/register`

The `profile` field changes based on `role`:

<details>
<summary><b>👨‍🎓 Student</b> — requires <code>roll_no</code>, <code>branch</code>, <code>year</code></summary>

```json
{
  "email": "jatin.student@tcet.com",
  "name": "Jatin Sharma",
  "password": "secret123",
  "role": "student",
  "profile": {
    "roll_no": "2101",
    "branch": "AI&DS",
    "year": 3
  }
}
```

> `can_upload` is auto-set to `false`. An admin must grant it via `/api/admin/grant-upload`.

</details>

<details>
<summary><b>👨‍🏫 Faculty</b> — requires <code>department</code></summary>

```json
{
  "email": "jatin.faculty@tcet.com",
  "name": "Prof. Jatin Sharma",
  "password": "secret123",
  "role": "faculty",
  "profile": {
    "department": "AI&DS"
  }
}
```

</details>

<details>
<summary><b>🛡️ Admin</b> — requires <code>admin_secret_key</code></summary>

```json
{
  "email": "jatin.admin@tcet.com",
  "name": "Admin Jatin",
  "password": "secret123",
  "role": "admin",
  "admin_secret_key": "TCET_HACK_2026"
}
```

> Without the correct `admin_secret_key` → **403 Forbidden**.

</details>

### `POST /api/auth/login`

Uses `OAuth2PasswordRequestForm` (`username` = email, `password`).

```json
// Response
{ "access_token": "eyJhbG...", "token_type": "bearer" }
```

### `GET /api/users/me`

Returns the authenticated user's full profile. Requires `Authorization: Bearer <token>`.

### 📋 Allowed Enum Values

| Field | Allowed Values |
|---|---|
| `role` | `admin`, `faculty`, `student` |
| `branch` / `department` | `AI&DS`, `COMP`, `IT`, `EXTC`, `MECH`, `CIVIL` |
| `year` | `1`, `2`, `3`, `4` (integers only) |

---

## 🛠️ API Documentation

### Admin Management

> 🔒 **Auth Level:** Admin Only — all endpoints require `role: "admin"` in JWT.

| Method | Endpoint | Description |
|---|---|---|
| `PATCH` | `/api/admin/grant-upload` | Grants upload permission to a student (CR) |
| `PATCH` | `/api/admin/revoke-upload` | Revokes upload permission from a student |
| `GET` | `/api/admin/users` | Lists all users (passwords excluded) |

**Grant / Revoke — Request Body:**

```json
{ "target_user_id": "stu_540d241f85f6" }
```

```json
// Response (200)
{ "message": "Upload permission granted", "user_id": "stu_540d241f85f6" }
```

**List Users — Query Params:**

```
GET /api/admin/users                → all users
GET /api/admin/users?role=student   → students only
GET /api/admin/users?role=faculty   → faculty only
```

```json
// Response (200)
{ "users": [ { "user_id": "...", "email": "...", "role": "...", ... } ], "count": 5 }
```

| Error Case | Status |
|---|---|
| Non-admin JWT | `403` |
| Target user not found | `404` |
| Target is not a student | `400` |

---

### File & Knowledge Base

> 🔒 **Auth Level:** Admin, Faculty, or CR Students (with `can_upload: true`)

#### `POST /api/upload/file`

Multipart file upload with streaming SHA-256 deduplication.

**Form Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `UploadFile` | ✅ | The binary file to upload |
| `year` | `int` | ✅ | Academic year (`1`–`4`) |
| `branch` | `str` | ✅ | Branch enum (`COMP`, `AI&DS`, etc.) |
| `subject` | `str` | ✅ | Free text (e.g., `"Machine Learning"`) |
| `doc_type` | `str` | ✅ | `lecture` · `notes` · `pyq` · `lab` · `reference` |
| `unit` | `int` | ❌ | Unit number (optional) |

**Allowed MIME Types:**

| Role | PDF | Images (PNG/JPEG/WebP) | Video (MP4/WebM) | Audio |
|---|---|---|---|---|
| Admin / Faculty | ✅ | ✅ | ✅ | ❌ |
| CR Student (`can_upload: true`) | ✅ | ✅ | ❌ | ❌ |
| Normal Student | ❌ Upload blocked | ❌ Upload blocked | ❌ | ❌ |

> ⚠️ **Audio files are not supported.** Normal students cannot upload — an admin must first grant `can_upload` via `PATCH /api/admin/grant-upload`.

**Responses:**

```json
// 202 Accepted — new file uploaded
{
  "file_id": "file_cd88e078d7f7...",
  "original_name": "Module 02.pdf",
  "file_type": "pdf",
  "status": "pending",
  "message": "Uploaded. Processing in background."
}
```

```json
// 200 OK — duplicate file detected (same SHA-256 hash)
{
  "file_id": "file_cd88e078d7f7...",
  "message": "File already exists",
  "status": "pending"
}
```

| Error Case | Status |
|---|---|
| Student without `can_upload` | `403` |
| CR student uploading video | `403` |
| Unsupported MIME type | `415` |
| No auth token | `401` |

#### `GET /api/files`

> 🔒 **Auth Level:** Any authenticated user (institute content is visible to all roles)

Lists all institute-wide academic resources with multi-filter support, sorted by newest first.

**Query Parameters (all optional):**

| Param | Type | Example | Description |
|---|---|---|---|
| `year` | `int` | `?year=3` | Academic year (1–4) |
| `branch` | `str` | `?branch=COMP` | Branch filter |
| `subject` | `str` | `?subject=Machine Learning` | Subject name |
| `doc_type` | `str` | `?doc_type=notes` | `lecture` · `notes` · `pyq` · `lab` · `reference` |
| `file_type` | `str` | `?file_type=pdf` | `pdf` · `image` · `video` |

```json
// Response (200)
{
  "files": [
    {
      "file_id": "file_cd88e078d7f7...",
      "original_name": "Module 02.pdf",
      "file_type": "pdf",
      "file_size_bytes": 849220,
      "academic": { "year": 3, "branch": "COMP", "subject": "Machine Learning", "doc_type": "notes" },
      "processing": { "status": "pending", "chunk_count": 0 },
      "uploaded_by": "fac_19664f621900",
      "playback_url": "/static/pdfs/file_cd88e078d7f7.pdf"
    }
  ],
  "count": 1
}
```

> 💡 **`playback_url`** maps directly to the `/static` mount — use it in the frontend to render or link files without building URLs manually.

#### `GET /api/files/{file_id}`

Returns detailed metadata for a single resource by its `file_id`.

```json
// Response (200)
{
  "file_id": "file_b9b2406793d5...",
  "original_name": "download.jpeg",
  "file_type": "image",
  "playback_url": "/static/images/file_b9b2406793d5.jpeg",
  ...
}
```

| Error Case | Status |
|---|---|
| File not found | `404` |
| Visibility is not `institute` | `403` |

> 🔐 **Security:** `storage_path` and `sha256_hash` are **strictly excluded** from all public responses. Only `playback_url` is exposed for file access.

#### 🖥️ Frontend Integration Note

> React **Smart Cards** should use the `playback_url` field from the API response to display or link files:
> - **PDFs** → embed in `<iframe>` or link to `playback_url`
> - **Images** → render with `<img src={playback_url} />`
> - **Videos** → play with `<video src={playback_url} />`
>
> The URL is ready to use — just prepend your API base URL (e.g., `http://localhost:8000`) for local dev.

---

## 📁 Storage & Static Serving

```
storage/
├── uploads/
│   ├── pdfs/       ← PDF files
│   ├── images/     ← PNG, JPEG, WebP
│   └── videos/     ← MP4, WebM
└── temp/           ← SHA-256 dedup staging (auto-cleaned)
```

Files are served publicly via the **`/static`** prefix:

```
http://localhost:8000/static/pdfs/file_cd88e078d7f7.pdf
http://localhost:8000/static/images/file_b9b24067.jpeg
http://localhost:8000/static/videos/file_a1c3e5f7.mp4
```

---

## 🚀 Quick Test

**1. Login & get token:**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -d "username=jatin.faculty@tcet.com&password=secret123" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

**2. Upload a file:**

```bash
curl -X POST http://localhost:8000/api/upload/file \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "file=@./test_upload_files/Module 02.pdf" \
  -F "year=3" \
  -F "branch=COMP" \
  -F "subject=Machine Learning" \
  -F "doc_type=notes" \
  -F "unit=2"
```

**3. Check MongoDB:**

```bash
mongosh
use campus_ai
db.file_metadata.find().pretty()
db.users.find().pretty()
```

---

## 📦 Tech Stack

| Component | Technology |
|---|---|
| Framework | FastAPI |
| Database | MongoDB (Motor async driver) |
| Auth | PyJWT + bcrypt |
| File I/O | aiofiles |
| Deps | UV package manager |
