import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api/", "/login", "/signup", "/welcome", "/campaigns", "/creatives", "/analytics", "/reports", "/settings", "/billing", "/brands", "/team", "/audience", "/discover", "/locations", "/plan", "/quotes", "/intelligence", "/ad-lab", "/agency", "/onboarding", "/verification"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
