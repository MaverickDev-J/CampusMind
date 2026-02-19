"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/app/context/auth-context";

const API = "http://localhost:8000/api";

// ── Types ───────────────────────────────────────────────────────

export interface ChatSession {
    session_id: string;
    title: string;
    file_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: SourceRef[];
    timestamp?: string;
}

export interface SourceRef {
    file_name: string;
    page_number: number;
    relevance_score: number;
    chunk_preview?: string;
}

// ── Hook ────────────────────────────────────────────────────────

export function useChat() {
    const { user } = useAuth();

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sources, setSources] = useState<SourceRef[]>([]);
    const [status, setStatus] = useState<string>("");
    const [streaming, setStreaming] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const msgCounter = useRef(0);

    const headers = useCallback(() => {
        const h: HeadersInit = { "Content-Type": "application/json" };
        if (user?.token) h["Authorization"] = `Bearer ${user.token}`;
        return h;
    }, [user]);

    // ── List Sessions ───────────────────────────────────────────

    const listSessions = useCallback(async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(`${API}/chat/sessions`, { headers: headers() });
            if (!res.ok) throw new Error("Failed to list sessions");
            const data = await res.json();
            setSessions(data.sessions ?? []);
        } catch (e) {
            console.error("[useChat] listSessions error:", e);
        }
    }, [user, headers]);

    // ── Create Session ──────────────────────────────────────────

    const createSession = useCallback(
        async (title?: string, fileId?: string): Promise<string | null> => {
            if (!user?.token) return null;
            setError(null);
            try {
                const body: Record<string, string | undefined> = {};
                if (title) body.title = title;
                if (fileId) body.file_id = fileId;

                const res = await fetch(`${API}/chat/sessions`, {
                    method: "POST",
                    headers: headers(),
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || "Failed to create session");
                }

                const data = await res.json();
                const sid = data.session_id as string;
                setActiveSessionId(sid);
                setMessages([]);
                setSources([]);
                setStatus("");
                // Refresh session list
                await listSessions();
                return sid;
            } catch (e: any) {
                setError(e.message);
                return null;
            }
        },
        [user, headers, listSessions]
    );

    // ── Load History ────────────────────────────────────────────

    const loadHistory = useCallback(
        async (sessionId: string) => {
            if (!user?.token) return;
            setLoading(true);
            setError(null);
            setActiveSessionId(sessionId);
            setSources([]);
            setStatus("");

            try {
                const res = await fetch(
                    `${API}/chat/sessions/${sessionId}/history`,
                    { headers: headers() }
                );
                if (!res.ok) throw new Error("Failed to load history");
                const data = await res.json();

                const msgs: ChatMessage[] = (data.messages ?? []).map(
                    (m: any, i: number) => ({
                        id: `hist_${i}`,
                        role: m.role,
                        content: m.content,
                        sources: m.sources,
                        timestamp: m.timestamp,
                    })
                );
                setMessages(msgs);

                // If the last message has sources, show them
                const last = msgs.findLast((m) => m.role === "assistant");
                if (last?.sources?.length) {
                    setSources(last.sources);
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        },
        [user, headers]
    );

    // ── Send Message (SSE) ──────────────────────────────────────

    const sendMessage = useCallback(
        async (query: string) => {
            if (!user?.token || !activeSessionId || streaming) return;

            setError(null);
            setSources([]);
            setStatus("");

            // Add user message immediately
            const userMsgId = `msg_${++msgCounter.current}`;
            const userMsg: ChatMessage = {
                id: userMsgId,
                role: "user",
                content: query,
            };
            setMessages((prev) => [...prev, userMsg]);

            // Prepare AI message placeholder
            const aiMsgId = `msg_${++msgCounter.current}`;
            const aiMsg: ChatMessage = {
                id: aiMsgId,
                role: "assistant",
                content: "",
            };
            setMessages((prev) => [...prev, aiMsg]);

            setStreaming(true);

            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const res = await fetch(
                    `${API}/chat/sessions/${activeSessionId}/message`,
                    {
                        method: "POST",
                        headers: headers(),
                        body: JSON.stringify({ query }),
                        signal: controller.signal,
                    }
                );

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || "Chat request failed");
                }

                const reader = res.body?.getReader();
                if (!reader) throw new Error("No response body");

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || ""; // keep incomplete line

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data: ")) continue;

                        try {
                            const payload = JSON.parse(trimmed.slice(6));
                            const { t, d } = payload;

                            switch (t) {
                                case "status":
                                    setStatus(d);
                                    break;

                                case "token":
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === aiMsgId
                                                ? { ...m, content: m.content + d }
                                                : m
                                        )
                                    );
                                    break;

                                case "sources":
                                    setSources(d ?? []);
                                    // Also attach to the AI message
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === aiMsgId
                                                ? { ...m, sources: d }
                                                : m
                                        )
                                    );
                                    break;

                                case "error":
                                    setError(d);
                                    break;

                                case "done":
                                    break;
                            }
                        } catch {
                            // skip malformed JSON lines
                        }
                    }
                }
            } catch (e: any) {
                if (e.name !== "AbortError") {
                    setError(e.message);
                }
            } finally {
                setStreaming(false);
                setStatus("");
                abortRef.current = null;

                // Refresh sessions to update timestamps
                listSessions();
            }
        },
        [user, headers, activeSessionId, streaming, listSessions]
    );

    // ── Stop Streaming ──────────────────────────────────────────

    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setStreaming(false);
        setStatus("");
    }, []);

    // ── Return ──────────────────────────────────────────────────

    return {
        // State
        sessions,
        activeSessionId,
        messages,
        sources,
        status,
        streaming,
        loading,
        error,

        // Actions
        listSessions,
        createSession,
        loadHistory,
        sendMessage,
        stopStreaming,
        setActiveSessionId,
    };
}
