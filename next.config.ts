import type { NextConfig } from "next";

const securityHeaders = [
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
