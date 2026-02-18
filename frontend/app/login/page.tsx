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



                    {/* Social auth removed for MVP */}


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
