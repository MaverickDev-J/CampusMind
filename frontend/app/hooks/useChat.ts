"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/app/context/auth-context";

const API = "http://localhost:8000/api";

// ── Types ──────────────────────────────────────────────────────

export interface ChatSession {
    session_id: string;
    title: string;
    file_ids: string[];
    created_at: string;
    updated_at?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: string;
}

export interface SourceRef {
    file_name: string;
    file_type: string;
    page_number?: number;
    timestamp_start?: string;
    timestamp_end?: string;
    relevance_score: number;
    chunk_preview?: string;
}

// ── Hook ───────────────────────────────────────────────────────

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

    // ── Auth header helper ──────────────────────────────────────
    const headers = useCallback(
        (json = false): HeadersInit => {
            const h: HeadersInit = {
                Authorization: `Bearer ${user?.token}`,
            };
            if (json) h["Content-Type"] = "application/json";
            return h;
        },
        [user]
    );

    // ── List Sessions ───────────────────────────────────────────
    const listSessions = useCallback(async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(`${API}/chat/sessions`, {
                headers: headers(),
            });
            if (!res.ok) throw new Error("Failed to load sessions");
            const data = await res.json();
            setSessions(data.sessions ?? data ?? []);
        } catch (e: any) {
            console.error("[useChat] listSessions:", e);
        }
    }, [user, headers]);

    // ── Create Session ──────────────────────────────────────────
    const createSession = useCallback(
        async (title: string, fileIds: string[]): Promise<string | null> => {
            if (!user?.token) return null;
            setError(null);
            try {
                const res = await fetch(`${API}/chat/sessions`, {
                    method: "POST",
                    headers: headers(true),
                    body: JSON.stringify({ title, file_ids: fileIds }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.detail || "Failed to create session");
                }
                const data = await res.json();
                const sid = data.session_id;
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
                const history: ChatMessage[] = (
                    data.messages ?? data ?? []
                ).map((m: any, i: number) => ({
                    id: m._id ?? m.id ?? `hist-${i}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                }));
                setMessages(history);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        },
        [user, headers]
    );

    // ── Rename Session ────────────────────────────────────────────
    const renameSession = useCallback(
        async (sessionId: string, newTitle: string) => {
            if (!user?.token) return;
            try {
                const res = await fetch(
                    `${API}/chat/sessions/${sessionId}`,
                    {
                        method: "PATCH",
                        headers: headers(true),
                        body: JSON.stringify({ title: newTitle }),
                    }
                );
                if (!res.ok) throw new Error("Failed to rename session");
                await listSessions();
            } catch (e: any) {
                setError(e.message);
            }
        },
        [user, headers, listSessions]
    );

    // ── Delete Session ────────────────────────────────────────────
    const deleteSession = useCallback(
        async (sessionId: string) => {
            if (!user?.token) return;
            try {
                const res = await fetch(
                    `${API}/chat/sessions/${sessionId}`,
                    { method: "DELETE", headers: headers() }
                );
                if (!res.ok) throw new Error("Failed to delete session");
                // If deleting the active session, reset chat state
                if (activeSessionId === sessionId) {
                    setActiveSessionId(null);
                    setMessages([]);
                    setSources([]);
                    setStatus("");
                }
                await listSessions();
            } catch (e: any) {
                setError(e.message);
            }
        },
        [user, headers, activeSessionId, listSessions]
    );

    // ── Send Message (SSE streaming) ────────────────────────────
    const sendMessage = useCallback(
        async (query: string) => {
            if (!user?.token || !activeSessionId) return;
            setError(null);
            setStreaming(true);
            setSources([]);
            setStatus("Thinking...");

            // Optimistic user message
            const userMsg: ChatMessage = {
                id: `u-${Date.now()}`,
                role: "user",
                content: query,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userMsg]);

            // Placeholder assistant message
            const assistantId = `a-${Date.now()}`;
            const assistantMsg: ChatMessage = {
                id: assistantId,
                role: "assistant",
                content: "",
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            const controller = new AbortController();
            abortRef.current = controller;

            try {
                const res = await fetch(
                    `${API}/chat/sessions/${activeSessionId}/message`,
                    {
                        method: "POST",
                        headers: headers(true),
                        body: JSON.stringify({ query }),
                        signal: controller.signal,
                    }
                );

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(
                        errBody.detail || `HTTP ${res.status}`
                    );
                }

                // ── Stream SSE ──────────────────────────────────
                const reader = res.body?.getReader();
                if (!reader) throw new Error("No response stream");

                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data: ")) continue;

                        const jsonStr = trimmed.slice(6);
                        if (!jsonStr || jsonStr === "[DONE]") continue;

                        try {
                            const evt = JSON.parse(jsonStr);
                            const { t, d } = evt;

                            switch (t) {
                                case "status":
                                    setStatus(d);
                                    break;

                                case "token":
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === assistantId
                                                ? {
                                                    ...m,
                                                    content:
                                                        m.content + d,
                                                }
                                                : m
                                        )
                                    );
                                    break;

                                case "sources":
                                    if (Array.isArray(d)) {
                                        setSources(d);
                                    }
                                    break;

                                case "done":
                                    setStatus("");
                                    break;

                                case "error":
                                    setError(
                                        typeof d === "string"
                                            ? d
                                            : "An error occurred"
                                    );
                                    setStatus("");
                                    break;
                            }
                        } catch {
                            // skip malformed JSON lines
                        }
                    }
                }
            } catch (e: any) {
                if (e.name !== "AbortError") {
                    setError(e.message || "Stream failed");
                }
            } finally {
                setStreaming(false);
                setStatus("");
                abortRef.current = null;
            }
        },
        [user, activeSessionId, headers]
    );

    // ── Stop Streaming ──────────────────────────────────────────
    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        setStreaming(false);
        setStatus("");
    }, []);

    return {
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
    };
}
