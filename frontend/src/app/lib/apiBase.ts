const PROXY_API_BASE = "/api";

const DIRECT_BACKEND_HOSTS = new Set([
    "backend-production-732a.up.railway.app",
    "localhost:3001",
    "127.0.0.1:3001",
]);

export function getApiBase(): string {
    const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!configured) return PROXY_API_BASE;

    try {
        const url = new URL(configured);
        if (DIRECT_BACKEND_HOSTS.has(url.host)) return PROXY_API_BASE;
    } catch {
        // Relative values such as "/api" are valid.
    }

    return configured.replace(/\/+$/, "") || PROXY_API_BASE;
}

export const API_BASE = getApiBase();
