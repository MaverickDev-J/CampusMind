"use client";

import { useState, useEffect, type FormEvent } from "react";
import { User, Mail, Lock, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/app/context/auth-context";
import { useRouter } from "next/navigation";

const Globe = dynamic(() => import("@/app/components/Globe"), { ssr: false });

export default function SignupPage() {
    const { signup, loading, error, clearError, user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (user) router.push("/");
    }, [user, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError(null);

        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters.");
            return;
        }

        await signup(name, email, password);
    };

    const displayError = localError || error;

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* ── Left Panel: Globe ──────────────────────────────── */}
            <div className="hidden lg:flex w-1/2 bg-[#0a0e1a] relative flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <Globe />
                </div>
                <div className="absolute bottom-12 left-10 right-10 z-10">
                    <p className="text-slate-400 text-sm mb-1">Join</p>
                    <h2 className="text-white text-4xl font-bold leading-tight">
                        CampusMind.
                    </h2>
                    <h2 className="text-white text-4xl font-bold leading-tight">
                        Start Your Journey.
                    </h2>
                    <p className="text-slate-500 text-sm mt-3 max-w-md">
                        Create your neural link and begin your AI-powered academic experience today.
                    </p>
                </div>
            </div>

            {/* ── Right Panel: Form ──────────────────────────────── */}
            <div className="w-full lg:w-1/2 bg-[#0d1117] flex flex-col items-center justify-center px-6 sm:px-12 relative">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
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
                            Create Your Account
                        </p>
                    </div>

                    {/* Error */}
                    {displayError && (
                        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                            {displayError}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Institute Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-transparent border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg font-medium text-sm text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {/* Login link */}
                    <p className="mt-6 text-center text-sm text-slate-400">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1"
                        >
                            <ArrowLeft className="w-3 h-3" />
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
