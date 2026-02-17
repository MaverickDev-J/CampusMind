"use client";

import { Search, Cpu, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/app/context/auth-context";

export default function Header() {
    const { user, logout } = useAuth();

    // Get user initials for avatar
    const initials = user?.name
        ? user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "CM";

    return (
        <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30">
                    <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-white">
                        Campus<span className="text-blue-400">Mind</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 -mt-0.5">
                        Academic Intelligence
                    </p>
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Global Search..."
                        className="w-64 pl-10 pr-4 py-2.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
                    />
                </div>

                {/* Notifications */}
                <button className="relative flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700/40 transition-colors hover:border-slate-600/60">
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse-glow" />
                </button>

                {/* Logout */}
                <button
                    onClick={logout}
                    title="Disconnect"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/50 border border-slate-700/40 transition-colors hover:border-red-500/40 hover:bg-red-500/10 group"
                >
                    <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                </button>

                {/* Avatar with user initials */}
                <div className="relative group cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 p-[2px]">
                        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">{initials}</span>
                        </div>
                    </div>
                    {/* Tooltip with user info */}
                    <div className="absolute right-0 top-full mt-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        <p className="text-xs font-medium text-white">{user?.name}</p>
                        <p className="text-[10px] text-slate-400">{user?.email}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
