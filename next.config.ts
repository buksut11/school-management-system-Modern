import type { NextConfig } from "next";

// Everything the app talks to lives on Supabase; every other origin is
// blocked outright, so even an injected script has nowhere to send data.
// 'unsafe-inline' is required by Next's own bootstrap scripts and the
// theme snippet (upgrading to per-request nonces means making every
// route dynamic — worth doing, tracked in docs/AUDIT-2026-07.md).
// 'unsafe-eval' is dev-only: React uses eval for error overlays there.
// frame-src blob: lets the hidden print iframe (lib/pdf/print.ts) load
// generated PDFs.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // No <iframe> embedding anywhere else — blocks clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops the browser guessing content-types away from what we declare.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry IDs) to third-party referrers.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app doesn't use the camera/mic/geolocation/etc.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Force HTTPS on repeat visits once served over it once.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
