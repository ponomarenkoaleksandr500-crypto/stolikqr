import type { NextConfig } from "next";

// Uploaded dish photos are served by the backend (see backend/src/main.ts's
// useStaticAssets) as absolute URLs, not from public/ - allow that origin.
// Always includes local dev (localhost:4000); also includes the real deployed
// API origin when NEXT_PUBLIC_API_URL points somewhere else (e.g. Railway).
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
];

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (apiUrl) {
  try {
    const parsed = new URL(apiUrl);
    if (parsed.hostname !== "localhost") {
      remotePatterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
        pathname: "/uploads/**",
      });
    }
  } catch {
    // Malformed NEXT_PUBLIC_API_URL - ignore, local dev pattern above still applies.
  }
}

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    remotePatterns,
    // localhost:4000 above is our own local dev API, which Next's image
    // optimizer otherwise refuses as a private-IP SSRF risk. Never enable
    // this in production - the real deployed API origin is a public host.
    ...(process.env.NODE_ENV !== "production" ? { dangerouslyAllowLocalIP: true } : {}),
  },
};

export default nextConfig;
