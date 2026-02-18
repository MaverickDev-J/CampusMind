// ============================================================
// NeuralCampus — FastAPI Backend API Helpers
// ============================================================

export const API_BASE_URL = "http://localhost:8000/api";

// ── Types ───────────────────────────────────────────────────

export interface LoginRequest {
    username: string; // FastAPI OAuth2PasswordRequestForm expects 'username' (which is email)
    password: string;
}

export interface SignupRequest {
    email: string;
    name: string;
    password: string;
    role: "student" | "faculty" | "admin";
    profile?: {
        roll_no?: string;
        branch?: string; // Enum: AI&DS, COMP, IT, etc.
        year?: number;   // 1, 2, 3, 4
        department?: string; // For faculty
        [key: string]: any;
    };
    admin_secret_key?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface UserProfile {
    user_id: string;
    email: string;
    name: string;
    role: "student" | "faculty" | "admin";
    institute_id: string;
    profile: {
        roll_no?: string;
        branch?: string;
        year?: number;
        department?: string;
        can_upload?: boolean;
        [key: string]: any;
    };
}

// ── API Functions ───────────────────────────────────────────

/**
 * POST /api/auth/login
 * Form-urlencoded per OAuth2 spec
 */
export async function apiLogin(data: LoginRequest): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append("username", data.username);
    formData.append("password", data.password);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Login failed");
    }

    return res.json();
}

/**
 * POST /api/auth/register
 */
export async function apiSignup(data: SignupRequest): Promise<UserProfile> { // Returns UserResponse, not Token
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Signup failed");
    }

    return res.json();
}

/**
 * GET /api/users/me
 */
export async function apiGetProfile(token: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error("Failed to fetch profile");
    }

    return res.json();
}

/**
 * Logout (Client-side only)
 */
export async function apiLogout(token: string): Promise<void> {
    // Backend is stateless JWT, so we just discard token on client.
    // If you had a blacklist/redis, you'd call an endpoint here.
    return Promise.resolve();
}
