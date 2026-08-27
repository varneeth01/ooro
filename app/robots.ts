import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { const base = process.env.NEXT_PUBLIC_SITE_URL || "https://theooro.com"; return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/", "/login", "/signup", "/welcome"] }], sitemap: `${base}/sitemap.xml`, host: base }; }
