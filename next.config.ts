import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/cities", destination: "/#cities", permanent: false },
      { source: "/network", destination: "/#network", permanent: false },
    ];
  },
};

export default nextConfig;
