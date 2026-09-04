import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const lastUpdated = new Date("2026-08-27T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: lastUpdated,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${siteUrl}/ooro-auto-screen.svg`],
    },
    {
      url: `${siteUrl}/about`,
      lastModified: lastUpdated,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date("2026-01-01T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date("2026-01-01T00:00:00.000Z"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
