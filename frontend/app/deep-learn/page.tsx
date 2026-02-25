"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Header from "@/app/components/Header";
import {
    MessageSquare,
    Plus,
    PanelLeft,
    PanelRight,
    Send,
    BookOpen,
    FileText,
    Sparkles,
    X,
    ArrowLeft,
    Loader2,
    StopCircle,
    Image,
    Video,
    Trash2,
    Pencil,
} from "lucide-react";
import { useChat, type ChatMessage, type SourceRef } from "@/app/hooks/useChat";
import { useFiles, type FileMetadata } from "@/app/hooks/useFiles";
import { useAuth } from "@/app/context/auth-context";

// ── View States ─────────────────────────────────────────────────
type View = "sessions" | "file-select" | "chat";

export default function DeepLearnPage() {
    const { user } = useAuth();
    const {
        sessions,
        activeSessionId,
        messages,
        sources,
        status,
        streaming,
        loading,
        error,
        listSessions,
        createSession,
        renameSession,
        deleteSession,
        loadHistory,
        sendMessage,
        stopStreaming,
    } = useChat();

    const { files, loading: filesLoading } = useFiles({});

    const [view, setView] = useState<View>("sessions");
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [inputText, setInputText] = useState("");
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ── Load sessions on mount ──────────────────────────────────
    useEffect(() => {
        listSessions();
    }, [listSessions]);

    // ── Auto-scroll to bottom ───────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, status]);

    // ── Processed files only ────────────────────────────────────
    const processedFiles = files.filter(
        (f) => f.processing.status === "completed"
    );

    // ── Handlers ────────────────────────────────────────────────

    const handleNewChat = () => {
        setSelectedFileIds([]);
        setView("file-select");
    };

    const handleToggleFile = (fileId: string) => {
        setSelectedFileIds((prev) =>
            prev.includes(fileId)
                ? prev.filter((id) => id !== fileId)
                : [...prev, fileId]
        );
    };

    const handleSelectAll = () => {
        if (selectedFileIds.length === processedFiles.length) {
            setSelectedFileIds([]);
        } else {
            setSelectedFileIds(processedFiles.map((f) => f.file_id));
        }
    };

    const handleStartChat = async () => {
        if (selectedFileIds.length === 0) return;
        const selectedFiles = processedFiles.filter((f) => selectedFileIds.includes(f.file_id));
        let title: string;
        if (selectedFiles.length === 1) {
            title = selectedFiles[0].original_name;
        } else if (selectedFiles.length === 2) {
            title = selectedFiles.map((f) => f.original_name.replace(/\.[^.]+$/, "")
            ).join(" & ");
        } else {
            title = `${selectedFiles[0].original_name.replace(/\.[^.]+$/, "")} & ${selectedFiles.length - 1} more`;
        }
        const sid = await createSession(title, selectedFileIds);
        if (sid) {
            setView("chat");
            setRightOpen(false);
        }
    };

    const handleSessionClick = async (sessionId: string) => {
        await loadHistory(sessionId);
        setView("chat");
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Don't trigger session click
        if (!confirm("Delete this chat session?")) return;
        await deleteSession(sessionId);
        if (activeSessionId === sessionId) {
            setView("sessions");
        }
    };

    const handleStartRename = (e: React.MouseEvent, sessionId: string, currentTitle: string) => {
        e.stopPropagation();
        setEditingSessionId(sessionId);
        setEditingTitle(currentTitle);
    };

    const handleSaveRename = async () => {
        if (!editingSessionId || !editingTitle.trim()) {
            setEditingSessionId(null);
            return;
        }
        await renameSession(editingSessionId, editingTitle.trim());
        setEditingSessionId(null);
    };

    const handleSend = async () => {
        const q = inputText.trim();
        if (!q || streaming) return;
        setInputText("");
        setRightOpen(true);
        await sendMessage(q);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Group sessions by date ──────────────────────────────────
    const todaySessions = sessions.filter((s) => {
        const d = new Date(s.updated_at || s.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    });
    const olderSessions = sessions.filter((s) => {
        const d = new Date(s.updated_at || s.created_at);
        const now = new Date();
        return d.toDateString() !== now.toDateString();
    });

    // ── File icon helper ────────────────────────────────────────
    const FileIcon = ({ type }: { type: string }) => {
        if (type === "image") return <Image className="w-5 h-5" />;
        if (type === "video") return <Video className="w-5 h-5" />;
        return <FileText className="w-5 h-5" />;
    };

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#0a0e1a] text-slate-200">
            <Header />

            <div className="flex flex-1 overflow-hidden relative">
                {/* ── Left Sidebar: Sessions ────────────────────────── */}
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

                            {/* Session List */}
                            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
                                {todaySessions.length > 0 && (
                                    <div>
                                        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            Today
                                        </h3>
                                        <div className="space-y-1">
                                            {todaySessions.map((s) => (
                                                <button
                                                    key={s.session_id}
                                                    onClick={() =>
                                                        handleSessionClick(
                                                            s.session_id
                                                        )
                                                    }
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 transition-colors group/item ${activeSessionId ===
                                                        s.session_id
                                                        ? "bg-slate-800/80 text-white shadow-sm border border-slate-700/50"
                                                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                                                        }`}
                                                >
                                                    <MessageSquare className="w-4 h-4 shrink-0" />
                                                    {editingSessionId === s.session_id ? (
                                                        <input
                                                            autoFocus
                                                            value={editingTitle}
                                                            onChange={(e) => setEditingTitle(e.target.value)}
                                                            onBlur={handleSaveRename}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveRename();
                                                                if (e.key === "Escape") setEditingSessionId(null);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-sm flex-1 bg-slate-700/50 border border-slate-600 rounded px-2 py-0.5 text-white outline-none focus:border-indigo-500"
                                                        />
                                                    ) : (
                                                        <span className="text-sm truncate flex-1">
                                                            {s.title}
                                                        </span>
                                                    )}
                                                    <span
                                                        onClick={(e) => handleStartRename(e, s.session_id, s.title)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-slate-600/50 hover:text-white transition-all cursor-pointer"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleDeleteSession(e, s.session_id)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {olderSessions.length > 0 && (
                                    <div>
                                        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                            Earlier
                                        </h3>
                                        <div className="space-y-1">
                                            {olderSessions.map((s) => (
                                                <button
                                                    key={s.session_id}
                                                    onClick={() =>
                                                        handleSessionClick(
                                                            s.session_id
                                                        )
                                                    }
                                                    className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-colors group/item"
                                                >
                                                    <MessageSquare className="w-4 h-4 shrink-0" />
                                                    {editingSessionId === s.session_id ? (
                                                        <input
                                                            autoFocus
                                                            value={editingTitle}
                                                            onChange={(e) => setEditingTitle(e.target.value)}
                                                            onBlur={handleSaveRename}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") handleSaveRename();
                                                                if (e.key === "Escape") setEditingSessionId(null);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-sm flex-1 bg-slate-700/50 border border-slate-600 rounded px-2 py-0.5 text-white outline-none focus:border-indigo-500"
                                                        />
                                                    ) : (
                                                        <span className="text-sm truncate flex-1">
                                                            {s.title}
                                                        </span>
                                                    )}
                                                    <span
                                                        onClick={(e) => handleStartRename(e, s.session_id, s.title)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-slate-600/50 hover:text-white transition-all cursor-pointer"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </span>
                                                    <span
                                                        onClick={(e) => handleDeleteSession(e, s.session_id)}
                                                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {sessions.length === 0 && (
                                    <div className="text-center text-slate-600 text-sm py-8">
                                        No conversations yet
                                    </div>
                                )}
                            </div>

                            {/* Session count */}
                            <div className="p-4 border-t border-slate-800/50">
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Total Sessions</span>
                                    <span className="text-purple-400 font-medium">
                                        {sessions.length}
                                    </span>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Middle: Main Content ────────────────────────────── */}
                <main className="flex-1 flex flex-col relative min-w-0">
                    {/* Sidebar Toggles */}
                    <button
                        onClick={() => setLeftOpen(!leftOpen)}
                        className="absolute top-4 left-4 z-10 p-2 rounded-lg text-slate-500 hover:bg-slate-800/50 transition-colors"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>
                    {view === "chat" && (
                        <button
                            onClick={() => setRightOpen(!rightOpen)}
                            className={`absolute top-4 right-4 z-10 p-2 rounded-lg flex items-center gap-2 transition-all ${rightOpen
                                ? "text-slate-500 hover:bg-slate-800/50"
                                : "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30"
                                }`}
                        >
                            <PanelRight className="w-5 h-5" />
                            {!rightOpen && <span className="text-xs font-medium">Sources</span>}
                        </button>
                    )}

                    {/* ── View: Sessions (Start Screen) ─────────────── */}
                    {view === "sessions" && (
                        <div className="flex-1 flex flex-col items-center justify-center px-6">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                                    <Sparkles className="w-10 h-10 text-indigo-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Deep Learn
                            </h2>
                            <p className="text-slate-400 text-sm max-w-md text-center mb-8">
                                Ask questions about your uploaded course
                                materials. Select a file to start a
                                contextual AI conversation.
                            </p>
                            <button
                                onClick={handleNewChat}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-purple-900/30 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Start New Chat
                            </button>
                        </div>
                    )}

                    {/* ── View: File Selection ──────────────────────── */}
                    {view === "file-select" && (
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                            <div className="h-12" />
                            <button
                                onClick={() => setView("sessions")}
                                className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="text-sm">Back</span>
                            </button>

                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        Select Files
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Choose one or more processed files to scope your AI conversation.
                                    </p>
                                </div>
                            </div>

                            {filesLoading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                </div>
                            ) : processedFiles.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p className="font-medium">
                                        No processed files available
                                    </p>
                                    <p className="text-xs mt-2">
                                        Upload files in Deep Base and wait
                                        for processing to complete.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Select All / Count bar */}
                                    <div className="flex items-center justify-between mb-4 mt-4">
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            {selectedFileIds.length === processedFiles.length
                                                ? "Deselect All"
                                                : "Select All"}
                                        </button>
                                        {selectedFileIds.length > 0 && (
                                            <span className="text-xs text-slate-400">
                                                {selectedFileIds.length} file{selectedFileIds.length !== 1 ? "s" : ""} selected
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                                        {processedFiles.map((file) => {
                                            const isSelected = selectedFileIds.includes(file.file_id);
                                            return (
                                                <motion.button
                                                    key={file.file_id}
                                                    onClick={() => handleToggleFile(file.file_id)}
                                                    whileHover={{ y: -2 }}
                                                    className={`group text-left bg-[#0f1523] border rounded-xl overflow-hidden transition-all ${isSelected
                                                        ? "border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                                                        : "border-slate-800 hover:border-slate-700"
                                                        }`}
                                                >
                                                    <div className={`h-24 p-4 flex items-end transition-colors ${isSelected
                                                        ? "bg-gradient-to-br from-indigo-900/40 to-slate-900"
                                                        : "bg-gradient-to-br from-slate-800 to-slate-900 group-hover:from-slate-800/80"
                                                        }`}>
                                                        <div className="flex items-center gap-2 w-full">
                                                            {/* Checkbox */}
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                                ? "bg-indigo-600 border-indigo-500"
                                                                : "border-slate-600 group-hover:border-slate-500"
                                                                }`}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                                                <FileIcon type={file.file_type} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium text-white truncate">
                                                                    {file.original_name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 uppercase">
                                                                    {file.academic.subject} • {file.academic.branch}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 flex items-center justify-between text-xs text-slate-500">
                                                        <span>
                                                            {file.processing.chunk_count} chunks
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                                                            Ready
                                                        </span>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* Sticky Start Chat button */}
                                    {selectedFileIds.length > 0 && (
                                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
                                            <button
                                                onClick={handleStartChat}
                                                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-2xl shadow-purple-900/40 transition-all text-sm"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Start Chat with {selectedFileIds.length} file{selectedFileIds.length !== 1 ? "s" : ""}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── View: Chat ────────────────────────────────── */}
                    {view === "chat" && (
                        <>
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-8 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                <div className="h-12" />

                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
                                        <Sparkles className="w-12 h-12 mb-4 text-indigo-500/50" />
                                        <p className="text-lg font-medium">
                                            Ask something about your file
                                        </p>
                                        <p className="text-sm mt-1">
                                            Your AI tutor is ready
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => (
                                        <MessageBubble
                                            key={msg.id}
                                            msg={msg}
                                            isStreaming={
                                                streaming &&
                                                msg.role === "assistant" &&
                                                idx === messages.length - 1
                                            }
                                        />
                                    ))
                                )}

                                {/* Status indicator */}
                                {status && (
                                    <div className="flex items-center gap-3 text-sm text-indigo-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>{status}</span>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4">
                                <div className="max-w-4xl mx-auto relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative bg-[#0f1523] border border-slate-700/50 rounded-2xl p-2 flex items-end gap-2 shadow-2xl">
                                        <textarea
                                            ref={textareaRef}
                                            placeholder="Ask anything about your coursework..."
                                            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-200 placeholder-slate-500 resize-none py-3 px-3 max-h-32 text-sm"
                                            rows={1}
                                            value={inputText}
                                            onChange={(e) =>
                                                setInputText(e.target.value)
                                            }
                                            onKeyDown={handleKeyDown}
                                            disabled={streaming}
                                        />
                                        {streaming ? (
                                            <button
                                                onClick={stopStreaming}
                                                className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg transition-all"
                                            >
                                                <StopCircle className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSend}
                                                disabled={
                                                    !inputText.trim()
                                                }
                                                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-center text-[10px] text-slate-600 mt-2">
                                        CampusAI can make mistakes. Verify
                                        important information from your
                                        course materials.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </main>

                {/* ── Right Sidebar: Sources ───────────────────────── */}
                <AnimatePresence mode="wait">
                    {rightOpen && view === "chat" && (
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
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {sources.length === 0 ? (
                                    <div className="text-center text-slate-600 text-sm py-10">
                                        <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
                                        <p>
                                            Sources will appear here after
                                            the AI responds
                                        </p>
                                    </div>
                                ) : (
                                    sources.map(
                                        (src: SourceRef, i: number) => (
                                            <div
                                                key={i}
                                                className="p-3 rounded-xl bg-[#0f1523] border border-slate-800 hover:border-indigo-500/30 transition-colors group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-6 h-6 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                                        {i + 1}
                                                    </div>
                                                    <div className="space-y-1.5 min-w-0">
                                                        <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                                                            {src.file_name}
                                                        </p>
                                                        {src.chunk_preview && (
                                                            <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                                                                &ldquo;
                                                                {
                                                                    src.chunk_preview
                                                                }
                                                                &rdquo;
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-2 pt-1">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                                Page{" "}
                                                                {
                                                                    src.page_number
                                                                }
                                                            </span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                                {(
                                                                    src.relevance_score *
                                                                    100
                                                                ).toFixed(
                                                                    0
                                                                )}
                                                                % match
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )
                                )}
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ── Message Bubble Component ────────────────────────────────────

function MessageBubble({ msg, isStreaming = false }: { msg: ChatMessage; isStreaming?: boolean }) {
    return (
        <div
            className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
        >
            {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <Sparkles className="w-4 h-4" />
                </div>
            )}

            <div className="max-w-[80%] space-y-2">
                <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-[#0f1523] border border-slate-800 text-slate-200 rounded-tl-sm shadow-xl"
                        }`}
                >
                    {msg.role === "assistant" ? (
                        isStreaming ? (
                            <p className="whitespace-pre-wrap">
                                {msg.content}
                                <span className="inline-block w-2 h-4 ml-0.5 bg-indigo-400 rounded-sm animate-pulse" />
                            </p>
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-indigo-300 prose-ul:my-1.5 prose-ol:my-1.5">
                                <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                            </div>
                        )
                    ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                </div>

                {msg.timestamp && (
                    <div
                        className={`flex items-center gap-2 text-[10px] text-slate-500 ${msg.role === "user"
                            ? "justify-end"
                            : "justify-start"
                            }`}
                    >
                        <span>
                            {new Date(msg.timestamp).toLocaleTimeString(
                                [],
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }
                            )}
                        </span>
                    </div>
                )}
            </div>

            {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">U</span>
                </div>
            )}
        </div>
    );
}
