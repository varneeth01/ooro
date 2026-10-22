import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep one deterministic app stylesheet in standalone/Netlify output. This
  // avoids the Next 15 CSS chunk manifest pointing at the virtual
  // `static/css/app/layout.css` path when only hashed chunks were emitted.
  experimental: { cssChunking: false },
  async redirects() {
    return [
      { source: "/cities", destination: "/#cities", permanent: false },
      { source: "/network", destination: "/#network", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
