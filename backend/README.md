# CampusMind Backend

## Registration Examples (POST `/api/auth/register`)

The `profile` field changes based on the `role`. Here are working examples for each:

---

### 1. Student Registration

**Profile requires:** `roll_no` (str), `branch` (enum), `year` (1-4 integer)

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

> `can_upload` is automatically set to `false` by the server. An admin must grant it later.

---

### 2. Faculty Registration

**Profile requires:** `department` (a branch enum value)

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

> No `roll_no` or `year` needed — only `department`.

---

### 3. Admin Registration

**Profile:** empty or omit entirely. **Requires** `admin_secret_key`.

```json
{
  "email": "jatin.admin@tcet.com",
  "name": "Admin Jatin",
  "password": "secret123",
  "role": "admin",
  "admin_secret_key": "TCET_HACK_2026"
}
```

> Without the correct `admin_secret_key`, the server returns **403 Forbidden**.

---

### Allowed Enum Values

| Field    | Allowed Values                                   |
|----------|--------------------------------------------------|
| `role`   | `admin`, `faculty`, `student`                    |
| `branch` / `department` | `AI&DS`, `COMP`, `IT`, `EXTC`, `MECH`, `CIVIL` |
| `year`   | `1`, `2`, `3`, `4` (integers only)               |

---

## How to Run

```bash
cd backend
uv run uvicorn main:app --reload
# Swagger UI → http://localhost:8000/docs
```


## How to check database
```bash
mongosh
use campus_ai
db.users.find().pretty()
```
