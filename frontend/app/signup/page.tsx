"use client";

import { useState, useEffect, type FormEvent } from "react";
import { User, Mail, Lock, Shield, ArrowLeft, GraduationCap, Building2, KeyRound } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/app/context/auth-context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const Globe = dynamic(() => import("@/app/components/Globe"), { ssr: false });

type Role = "student" | "faculty" | "admin";
type Branch = "AI&DS" | "COMP" | "IT" | "EXTC" | "MECH" | "CIVIL";

const BRANCHES: Branch[] = ["AI&DS", "COMP", "IT", "EXTC", "MECH", "CIVIL"];
const YEARS = [1, 2, 3, 4];

export default function SignupPage() {
    const { signup, loading, error, clearError, user } = useAuth();
    const router = useRouter();

    // Core fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<Role>("student");

    // Dynamic fields
    const [rollNo, setRollNo] = useState("");
    const [branch, setBranch] = useState<Branch>("AI&DS");
    const [year, setYear] = useState<string>("1"); // Store as string for select, parse to int
    const [adminSecret, setAdminSecret] = useState("");

    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (user) router.push("/");
    }, [user, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        clearError();
        setLocalError(null);

        // Validation
        if (password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setLocalError("Password must be at least 6 characters.");
            return;
        }

        // Construct profile data based on role
        let profileData: any = {};
        let finalSecret: string | undefined = undefined;

        if (role === "student") {
            if (!rollNo) {
                setLocalError("Roll Number is required for students.");
                return;
            }
            profileData = {
                roll_no: rollNo,
                branch: branch,
                year: parseInt(year),
            };
        } else if (role === "faculty") {
            profileData = {
                department: branch, // Faculty uses 'department' which maps to BranchEnum
            };
        } else if (role === "admin") {
            if (!adminSecret) {
                setLocalError("Admin Secret Key is required.");
                return;
            }
            finalSecret = adminSecret;
        }

        await signup(name, email, password, role, profileData, finalSecret);
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
            <div className="w-full lg:w-1/2 bg-[#0d1117] flex flex-col items-center justify-center px-4 sm:px-12 relative overflow-y-auto">
                <div className="w-full max-w-md py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-slate-400 text-sm">Join the CampusMind network</p>
                    </div>

                    {/* Role Selection Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800/50 rounded-xl mb-8">
                        {(["student", "faculty", "admin"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${role === r
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                                    }`}
                            >
                                {r === "student" && <GraduationCap className="w-4 h-4" />}
                                {r === "faculty" && <Building2 className="w-4 h-4" />}
                                {r === "admin" && <Shield className="w-4 h-4" />}
                                <span className="capitalize">{r}</span>
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {displayError && (
                        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {displayError}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            {/* Common Fields */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                    Personal Info
                                </label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            placeholder="Institute Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Role Fields */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={role}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                        {role === "student" ? "Academic Info" : role === "faculty" ? "Department Info" : "Admin Security"}
                                    </label>

                                    <div className="space-y-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                                        {role === "student" && (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder="Roll Number (e.g. 2101)"
                                                    value={rollNo}
                                                    onChange={(e) => setRollNo(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <select
                                                        value={branch}
                                                        onChange={(e) => setBranch(e.target.value as Branch)}
                                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:outline-none appearance-none"
                                                    >
                                                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                    <select
                                                        value={year}
                                                        onChange={(e) => setYear(e.target.value)}
                                                        className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:outline-none appearance-none"
                                                    >
                                                        {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        {role === "faculty" && (
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1.5 block">Department</label>
                                                <select
                                                    value={branch}
                                                    onChange={(e) => setBranch(e.target.value as Branch)}
                                                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                                                >
                                                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {role === "admin" && (
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-2.5 w-5 h-5 text-amber-500" />
                                                <input
                                                    type="password"
                                                    placeholder="Admin Secret Key"
                                                    value={adminSecret}
                                                    onChange={(e) => setAdminSecret(e.target.value)}
                                                    required
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/50 border border-amber-500/50 text-white focus:border-amber-500 focus:outline-none placeholder:text-slate-600"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Password Fields */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                    Security
                                </label>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            placeholder="Confirm Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {/* Login link */}
                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <p className="text-sm text-slate-400">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Back to Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
