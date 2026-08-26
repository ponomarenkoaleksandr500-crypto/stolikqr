import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    // Uploaded dish photos are served by the backend (see backend/src/main.ts's
    // useStaticAssets) as absolute URLs, not from public/ - allow that origin.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
    // The backend origin above is our own local dev API (localhost:4000), which
    // Next's image optimizer otherwise refuses as a private-IP SSRF risk. Never
    // enable this against a real production API_URL.
    ...(process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
