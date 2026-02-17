// ============================================================
// NeuralCampus — FastAPI Backend API Helpers
// ============================================================
// TODO: Replace API_BASE_URL with your actual FastAPI server URL.
// TODO: Once you have your OpenAPI JSON from FastAPI, you can
//       auto-generate TypeScript types and replace the interfaces below.
// ============================================================

export const API_BASE_URL = "http://localhost:8000/api/v1";

// ── Types ───────────────────────────────────────────────────
// TODO: Replace these with types generated from your FastAPI OpenAPI schema

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    year?: number;
    department?: string;
}

// ── API Functions ───────────────────────────────────────────
// TODO: Implement these with actual fetch() calls to your FastAPI backend.
// Each function below is a placeholder that mirrors a FastAPI route.

/**
 * POST /api/v1/auth/login
 * FastAPI route: @router.post("/auth/login")
 */
export async function apiLogin(data: LoginRequest): Promise<AuthResponse> {
    // TODO: Uncomment and use when FastAPI backend is ready
    //
    // const res = await fetch(`${API_BASE_URL}/auth/login`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) {
    //   const err = await res.json();
    //   throw new Error(err.detail || "Login failed");
    // }
    // return res.json();

    throw new Error("apiLogin not implemented — connect to FastAPI backend");
}

/**
 * POST /api/v1/auth/signup
 * FastAPI route: @router.post("/auth/signup")
 */
export async function apiSignup(data: SignupRequest): Promise<AuthResponse> {
    // TODO: Uncomment and use when FastAPI backend is ready
    //
    // const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(data),
    // });
    // if (!res.ok) {
    //   const err = await res.json();
    //   throw new Error(err.detail || "Signup failed");
    // }
    // return res.json();

    throw new Error("apiSignup not implemented — connect to FastAPI backend");
}

/**
 * GET /api/v1/auth/me
 * FastAPI route: @router.get("/auth/me")
 */
export async function apiGetProfile(token: string): Promise<UserProfile> {
    // TODO: Uncomment and use when FastAPI backend is ready
    //
    // const res = await fetch(`${API_BASE_URL}/auth/me`, {
    //   headers: { Authorization: `Bearer ${token}` },
    // });
    // if (!res.ok) throw new Error("Failed to fetch profile");
    // return res.json();

    throw new Error("apiGetProfile not implemented — connect to FastAPI backend");
}

/**
 * POST /api/v1/auth/logout
 * FastAPI route: @router.post("/auth/logout")
 */
export async function apiLogout(token: string): Promise<void> {
    // TODO: Uncomment and use when FastAPI backend is ready
    //
    // await fetch(`${API_BASE_URL}/auth/logout`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${token}` },
    // });

    throw new Error("apiLogout not implemented — connect to FastAPI backend");
}
