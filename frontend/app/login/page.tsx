"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Github, Linkedin } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/app/context/auth-context";
import { useRouter } from "next/navigation";

// Dynamic import globe to avoid SSR issues with canvas
const Globe = dynamic(() => import("@/app/components/Globe"), { ssr: false });

export default function LoginPage() {
    const { login, loading, error, clearError, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        if (user) router.push("/");
    }, [user, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        clearError();
        await login(email, password);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* ── Left Panel: Globe ──────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-[#0a0e1a] relative flex-col items-center justify-center overflow-hidden">
                {/* Globe */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Globe />
                </div>

                {/* Bottom text overlay */}
                <div className="absolute bottom-12 left-10 right-10 z-10">
                    <p className="text-slate-400 text-sm mb-1">Welcome to</p>
                    <h2 className="text-white text-4xl font-bold leading-tight">
                        CampusMind.
                    </h2>
                    <h2 className="text-white text-4xl font-bold leading-tight">
                        Your Academic Intelligence.
                    </h2>
                    <p className="text-slate-500 text-sm mt-3 max-w-md">
                        Home to thousands of engineering students, researchers, and innovators building the future of education.
                    </p>
                </div>
            </div>

            {/* ── Right Panel: Form ──────────────────────────────── */}
            <div className="w-full lg:w-1/2 bg-[#0d1117] flex flex-col items-center justify-center px-6 sm:px-12 relative">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 mb-3">
                            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            Campus<span className="text-blue-400">Mind</span>
                        </h1>
                        <p className="text-xs text-slate-500 tracking-wider">
                            Academic Intelligence
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg font-medium text-sm text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                "Log In"
                            )}
                        </button>
                    </form>

                    {/* Utility row */}
                    <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-600 bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-xs text-slate-400">Remember me</span>
                        </label>
                        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                            Forgot password?
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-xs text-slate-500">or</span>
                        <div className="flex-1 h-px bg-slate-700" />
                    </div>

                    {/* Social auth */}
                    <div className="space-y-3">
                        {/* Google */}
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                        // TODO: Connect to FastAPI Google OAuth endpoint
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* LinkedIn & GitHub row */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                            // TODO: Connect to FastAPI LinkedIn OAuth endpoint
                            >
                                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                                LinkedIn
                            </button>
                            <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-600 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                            // TODO: Connect to FastAPI GitHub OAuth endpoint
                            >
                                <Github className="w-4 h-4" />
                                GitHub
                            </button>
                        </div>
                    </div>

                    {/* Signup link */}
                    <p className="mt-8 text-center text-sm text-slate-400">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/signup"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Sign up
                        </Link>
                    </p>


                </div>
            </div>
        </div>
    );
}
