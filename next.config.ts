import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
