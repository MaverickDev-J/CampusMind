"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/app/components/Header";
import {
    MessageSquare,
    Plus,
    Search,
    PanelLeft,
    PanelRight,
    Send,
    Paperclip,
    Mic,
    BookOpen,
    Video,
    FileText,
    Sparkles,
    Download,
    X,
    ChevronRight,
    Play
} from "lucide-react";

// Mock Data
const INITIAL_HISTORY = [
    { id: 1, title: "Quantum Physics Notes", time: "Today", active: true },
    { id: 2, title: "Calculus Review", time: "Today", active: false },
    { id: 3, title: "History Essay Outline", time: "Yesterday", active: false },
    { id: 4, title: "Biology Midterm Prep", time: "Yesterday", active: false },
];

const INITIAL_MESSAGES = [
    {
        id: 1,
        role: "user",
        content: "Explain the Heisenberg Uncertainty Principle and find a relevant video example from my lectures this semester.",
        time: "10:42 AM"
    },
    {
        id: 2,
        role: "ai",
        content: `The **Heisenberg Uncertainty Principle** is a fundamental concept in quantum mechanics. It states that there is a limit to the precision with which certain pairs of physical properties, such as position and momentum, can be known simultaneously.

In simpler terms, the more precisely you know where a particle is (position), the less precisely you can know where it's going (momentum), and vice versa. This isn't due to measurement faults, but is a fundamental property of wave-like systems.`,
        time: "10:45 AM",
        sources: [
            { type: "video", title: "Quantum Mechanics Intro", timestamp: "06:35", author: "Prof. Davis" }
        ]
    }
];

const CITATIONS = [
    {
        id: 1,
        type: "video",
        title: "Lecture 4: Quantum Mechanics Intro",
        author: "Prof. Davis",
        duration: "06:35 / 55:00",
        thumbnail: "bg-gradient-to-br from-emerald-900 to-slate-900"
    },
    {
        id: 2,
        type: "text",
        title: "Principles of Quantum Mechanics",
        excerpt: "The uncertainty principle is one of the variety of mathematical inequalities...",
        page: "42",
        source: "Textbook"
    },
    {
        id: 3,
        type: "text",
        title: "Course Syllabus Week 4",
        excerpt: "Topic 4.2: Operators and Measurement. Discussion on commutation relations.",
        page: "3",
        source: "PDF"
    }
];

export default function DeepLearnPage() {
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [history, setHistory] = useState(INITIAL_HISTORY);

    const handleNewChat = () => {
        setMessages([]);
        setHistory(prev => prev.map(chat => ({ ...chat, active: false })));
        setRightOpen(false);
    };

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0e1a] text-slate-200">
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {/* ── Left Sidebar: History ────────────────────────── */}
                <AnimatePresence mode="wait">
                    {leftOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="h-full border-r border-slate-800/50 bg-[#070b14] flex flex-col"
                        >
                            {/* New Chat Button */}
                            <div className="p-4">
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-purple-900/20 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    New Chat
                                </button>
                            </div>

                            {/* History List */}
                            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
                                {/* Today */}
                                <div>
                                    <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Today</h3>
                                    <div className="space-y-1">
                                        {history.filter(h => h.time === "Today").map(chat => (
                                            <button
                                                key={chat.id}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${chat.active
                                                    ? "bg-slate-800/80 text-white shadow-sm border border-slate-700/50"
                                                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                                                    }`}
                                            >
                                                <MessageSquare className="w-4 h-4 shrink-0" />
                                                <span className="text-sm truncate">{chat.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Yesterday */}
                                <div>
                                    <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Yesterday</h3>
                                    <div className="space-y-1">
                                        {history.filter(h => h.time === "Yesterday").map(chat => (
                                            <button
                                                key={chat.id}
                                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors"
                                            >
                                                <MessageSquare className="w-4 h-4 shrink-0" />
                                                <span className="text-sm truncate">{chat.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Knowledge Base Progress */}
                            <div className="p-4 border-t border-slate-800/50">
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                    <span>Knowledge Base</span>
                                    <span className="text-purple-400 font-medium">65%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[65%] rounded-full" />
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Middle: Main Chat ────────────────────────────── */}
                <main className="flex-1 flex flex-col relative min-w-0">

                    {/* Sidebar Toggles */}
                    <button
                        onClick={() => setLeftOpen(!leftOpen)}
                        className="absolute top-4 left-4 z-10 p-2 rounded-lg text-slate-500 hover:bg-slate-800/50 transition-colors"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setRightOpen(!rightOpen)}
                        className="absolute top-4 right-4 z-10 p-2 rounded-lg text-slate-500 hover:bg-slate-800/50 transition-colors"
                    >
                        <PanelRight className="w-5 h-5" />
                    </button>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        <div className="h-12" /> {/* Spacer for toggles */}

                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                                <Sparkles className="w-12 h-12 mb-4 text-indigo-500/50" />
                                <p className="text-lg font-medium">Start a new learning session</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {msg.role === "ai" && (
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    )}

                                    <div className={`max-w-[80%] space-y-2`}>
                                        <div
                                            className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                ? "bg-blue-600 text-white rounded-tr-sm"
                                                : "bg-[#0f1523] border border-slate-800 text-slate-200 rounded-tl-sm shadow-xl"
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>

                                        {/* Embedded Citation in AI Message */}
                                        {msg.sources && (
                                            <div className="bg-[#0f1523] border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                                                <div className="w-16 h-10 rounded-lg bg-slate-800 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                                                    <Play className="w-4 h-4 text-white fill-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase">Lecture 4</span>
                                                        <span className="text-xs text-slate-500">Week 4 • Prof. Davis</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                                                        Quantum Mechanics Intro
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                                            </div>
                                        )}

                                        <div className={`flex items-center gap-2 text-[10px] text-slate-500 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                            <span>{msg.time}</span>
                                        </div>
                                    </div>

                                    {msg.role === "user" && (
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-bold text-white">U</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4">
                        <div className="max-w-4xl mx-auto relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative bg-[#0f1523] border border-slate-700/50 rounded-2xl p-2 flex items-end gap-2 shadow-2xl">
                                <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <textarea
                                    placeholder="Ask anything about your coursework..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 resize-none py-3 max-h-32 text-sm"
                                    rows={1}
                                />
                                <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                                    <Mic className="w-5 h-5" />
                                </button>
                                <button className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 transition-all">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-center text-[10px] text-slate-600 mt-2">
                                CampusAI can make mistakes. Verify important information from your course materials.
                            </p>
                        </div>
                    </div>
                </main>

                {/* ── Right Sidebar: Sources ───────────────────────── */}
                <AnimatePresence mode="wait">
                    {rightOpen && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="h-full border-l border-slate-800/50 bg-[#070b14] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-400" />
                                    Sources & Citations
                                </h2>
                                <button
                                    onClick={() => setRightOpen(false)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                {/* Video Citation */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-500 uppercase tracking-wider">Video Citation</span>
                                        <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            Live
                                        </span>
                                    </div>
                                    <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden group border border-slate-800">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-slate-900/40" />
                                        {/* Mock Waveform */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="absolute border border-indigo-500 rounded-full" style={{ width: `${(i + 1) * 20}%`, height: `${(i + 1) * 20}%`, opacity: 1 - (i * 0.2) }} />
                                            ))}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform">
                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-xs font-medium text-white">Lecture 4: Quantum Mechanics Intro</p>
                                            <div className="flex justify-between items-center mt-1 text-[10px] text-slate-300">
                                                <span>Prof. Davis</span>
                                                <span>06:35 / 55:00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Text References */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Text References</h3>
                                    {CITATIONS.filter(c => c.type === "text").map((cite, i) => (
                                        <div key={cite.id} className="p-3 rounded-xl bg-[#0f1523] border border-slate-800 hover:border-indigo-500/30 transition-colors group cursor-pointer">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                    {i + 1}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                                                        {cite.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                                                        "{cite.excerpt}"
                                                    </p>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Page {cite.page}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{cite.source}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Related Concepts */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Related Concepts</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {["Wave Function", "Momentum Operator", "Planck's Constant"].map(tag => (
                                            <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors cursor-pointer">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-800/50">
                                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-slate-700">
                                    <Download className="w-3.5 h-3.5" />
                                    Export All Citations
                                </button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
