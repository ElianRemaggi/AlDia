import type { NextConfig } from "next";

// Where the Express API lives. The browser always calls same-origin `/api/v1`
// (so the httpOnly refresh cookie — sameSite=strict, path=/api/v1/auth/refresh —
// works without CORS); Next forwards those requests here.
// In production the reverse proxy routes /api/* to the API before reaching Next.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
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
