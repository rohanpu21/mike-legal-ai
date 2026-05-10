import type { NextConfig } from "next";

const backendProxyUrl = (
    process.env.BACKEND_PROXY_URL ?? "https://backend-production-732a.up.railway.app"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    async rewrites() {
        return [
            {
                source: "/sitemap.xml",
                destination: "/api/sitemap/sitemap.xml",
            },
            {
                source: "/sitemap_:slug.xml",
                destination: "/api/sitemap/sitemap_:slug.xml",
            },
            {
                source: "/api/:path*",
                destination: `${backendProxyUrl}/:path*`,
            },
        ];
    },
    skipTrailingSlashRedirect: true,
};

export default nextConfig;
