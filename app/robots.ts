import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api/", "/campaigns", "/creatives", "/analytics", "/reports", "/settings", "/billing", "/brands", "/team", "/audience", "/discover", "/locations", "/plan", "/quotes", "/intelligence", "/ad-lab", "/agency", "/onboarding", "/network/status"],
      },
      {
        // OpenAI uses this crawler to discover pages for ChatGPT Search.
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api/", "/campaigns", "/creatives", "/analytics", "/reports", "/settings", "/billing", "/brands", "/team", "/audience", "/discover", "/locations", "/plan", "/quotes", "/intelligence", "/ad-lab", "/agency", "/onboarding", "/network/status"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
