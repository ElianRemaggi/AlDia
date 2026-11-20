import type { NextConfig } from "next";

// Where the Express API lives. The browser always calls same-origin `/api/v1`
// (so the httpOnly refresh cookie — sameSite=strict, path=/api/v1/auth/refresh —
// works without CORS); Next forwards those requests here.
// In production the reverse proxy routes /api/* to the API before reaching Next.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // The /api/v1 rewrite buffers request bodies (default cap 10MB, which silently
    // truncated price-list uploads). The API allows 20MB and answers 413 above that,
    // so let a bit more than 20MB through and keep the real limit in one place.
    proxyClientMaxBodySize: "25mb",
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_PROXY_TARGET}/api/v1/:path*` }];
  },
};

export default nextConfig;
