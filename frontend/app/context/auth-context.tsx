"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// ── Types ───────────────────────────────────────────────────

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    token: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

// ── Dummy user for development ──────────────────────────────
const DUMMY_USER: User = {
    id: "usr_neural_001",
    name: "Aarav Sharma",
    email: "demo@neuralcampus.ai",
    avatar: undefined,
    token: "dummy-jwt-token-neuralcampus-2026",
};

const DUMMY_PASSWORD = "neural123";

// ── Cookie helpers ──────────────────────────────────────────

function setAuthCookie(token: string) {
    document.cookie = `neural-auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeAuthCookie() {
    document.cookie = "neural-auth-token=; path=/; max-age=0";
}

function getAuthCookie(): string | null {
    const match = document.cookie.match(/(?:^|; )neural-auth-token=([^;]*)/);
    return match ? match[1] : null;
}

// ── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // ── Hydrate session on mount ────────────────────────────
    useEffect(() => {
        const token = getAuthCookie();
        if (token) {
            // TODO: Replace with FastAPI call → apiGetProfile(token)
            // For now, if the dummy token exists, restore the dummy user
            if (token === DUMMY_USER.token) {
                setUser(DUMMY_USER);
            } else {
                // TODO: When FastAPI is connected, fetch real profile:
                // apiGetProfile(token)
                //   .then(profile => setUser({ ...profile, token }))
                //   .catch(() => { removeAuthCookie(); });
                removeAuthCookie();
            }
        }
        setLoading(false);
    }, []);

    // ── Login ───────────────────────────────────────────────
    const login = useCallback(
        async (email: string, password: string) => {
            setError(null);
            setLoading(true);

            try {
                // TODO: Replace this entire block with FastAPI backend call:
                // ─────────────────────────────────────────────────────
                // import { apiLogin } from "@/app/lib/api";
                //
                // const res = await apiLogin({ email, password });
                // const loggedInUser: User = {
                //   id: res.user.id,
                //   name: res.user.name,
                //   email: res.user.email,
                //   avatar: res.user.avatar,
                //   token: res.access_token,
                // };
                // setAuthCookie(res.access_token);
                // setUser(loggedInUser);
                // router.push("/");
                // ─────────────────────────────────────────────────────

                // Dummy auth — remove when FastAPI is ready
                await new Promise((r) => setTimeout(r, 800)); // simulate network delay
                if (
                    email.toLowerCase() === DUMMY_USER.email &&
                    password === DUMMY_PASSWORD
                ) {
                    setAuthCookie(DUMMY_USER.token);
                    setUser(DUMMY_USER);
                    router.push("/");
                } else {
                    throw new Error("Invalid credentials. Try demo@neuralcampus.ai / neural123");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Login failed");
            } finally {
                setLoading(false);
            }
        },
        [router]
    );

    // ── Signup ──────────────────────────────────────────────
    const signup = useCallback(
        async (name: string, email: string, password: string) => {
            setError(null);
            setLoading(true);

            try {
                // TODO: Replace this entire block with FastAPI backend call:
                // ─────────────────────────────────────────────────────
                // import { apiSignup } from "@/app/lib/api";
                //
                // const res = await apiSignup({ name, email, password });
                // const newUser: User = {
                //   id: res.user.id,
                //   name: res.user.name,
                //   email: res.user.email,
                //   avatar: res.user.avatar,
                //   token: res.access_token,
                // };
                // setAuthCookie(res.access_token);
                // setUser(newUser);
                // router.push("/");
                // ─────────────────────────────────────────────────────

                // Dummy signup — remove when FastAPI is ready
                await new Promise((r) => setTimeout(r, 800));
                const newUser: User = {
                    id: "usr_new_" + Date.now(),
                    name,
                    email,
                    token: "dummy-jwt-signup-" + Date.now(),
                };
                setAuthCookie(newUser.token);
                setUser(newUser);
                router.push("/");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Signup failed");
            } finally {
                setLoading(false);
            }
        },
        [router]
    );

    // ── Logout ──────────────────────────────────────────────
    const logout = useCallback(() => {
        // TODO: Optionally call FastAPI logout endpoint:
        // import { apiLogout } from "@/app/lib/api";
        // apiLogout(user?.token || "").catch(() => {});

        removeAuthCookie();
        setUser(null);
        router.push("/login");
    }, [router]);

    // ── Clear error ─────────────────────────────────────────
    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider
            value={{ user, loading, error, login, signup, logout, clearError }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
