"use client";

import { Search, Cpu, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/app/context/auth-context";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const tabs = [
        { id: "dashboard", label: "Dashboard", path: "/" },
        { id: "deep-base", label: "Deep Base", path: "/deep-base" },
        { id: "deep-learn", label: "Deep Learn", path: "/deep-learn" },
    ];

    const activeTab = tabs.find(t => t.path === pathname)?.label || "Dashboard";

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
        <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10 h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 relative z-20">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30">
                    <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div className="hidden sm:block">
                    <h1 className="text-lg font-bold tracking-tight text-white">
                        Campus<span className="text-blue-400">Mind</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 -mt-0.5">
                        Academic Intelligence
                    </p>
                </div>
            </div>

            {/* Centered Navigation Tabs */}
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 p-1.5 rounded-full bg-slate-900/40 border border-slate-700/30 backdrop-blur-md shadow-xl">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={tab.path}
                        className={`relative px-5 py-2 text-sm font-medium transition-colors duration-300 rounded-full ${activeTab === tab.label ? "text-white" : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        {activeTab === tab.label && (
                            <motion.div
                                layoutId="active-tab-indicator"
                                className="absolute inset-0 bg-slate-700/60 rounded-full border border-slate-600/50"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4 relative z-20">
                {/* Search */}
                <div className="relative hidden xl:block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Global Search..."
                        className="w-56 pl-10 pr-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all backdrop-blur-sm"
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
                <div className="relative group cursor-pointer hidden sm:block">
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
