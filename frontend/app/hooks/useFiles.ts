import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/auth-context";

// Types matching the API response
export interface FileMetadata {
    file_id: string;
    original_name: string;
    mime_type: string;
    file_type: string;
    file_size_bytes: number;
    source: {
        type: string;
        youtube_video_id: string | null;
    };
    academic: {
        year: number;
        branch: string;
        subject: string;
        unit: number;
        doc_type: string;
    };
    processing: {
        status: string;
        chunk_count: number;
        page_count: number | null;
        error: string | null;
    };
    visibility: string;
    uploaded_by: string;
    uploaded_at: string;
    playback_url: string;
}

interface FilesResponse {
    files: FileMetadata[];
    count: number;
}

interface FileFilters {
    year?: number | null;
    branch?: string | null;
    subject?: string | null;
    doc_type?: string | null;
    file_type?: string | null;
}

export function useFiles(filters: FileFilters | number) {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    // Normalize input: if number, treat as year
    const activeFilters: FileFilters = typeof filters === "number" ? { year: filters } : filters;

    const fetchFiles = useCallback(async () => {
        if (!user || !user.token) return;

        setLoading(true);
        setError(null);
        try {
            const token = user.token;

            const headers: HeadersInit = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            };

            // Construct query string
            const params = new URLSearchParams();
            if (activeFilters.year) params.append("year", activeFilters.year.toString());
            if (activeFilters.branch) params.append("branch", activeFilters.branch);
            if (activeFilters.subject) params.append("subject", activeFilters.subject);
            if (activeFilters.doc_type) params.append("doc_type", activeFilters.doc_type);
            if (activeFilters.file_type) params.append("file_type", activeFilters.file_type);

            const res = await fetch(`http://localhost:8000/api/files?${params.toString()}`, {
                headers: headers,
            });

            if (!res.ok) {
                // If 404/Empty or just error?
                // API returns empty list or error? 
                // Let's assume error if not 200
                throw new Error(`Failed to fetch files: ${res.statusText}`);
            }

            const data: FilesResponse = await res.json();
            setFiles(data.files || []);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }, [user, JSON.stringify(activeFilters)]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    return { files, loading, error, refetch: fetchFiles };
}
