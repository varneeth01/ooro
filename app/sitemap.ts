import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const lastUpdated = new Date("2026-11-12T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: lastUpdated,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${siteUrl}/ooro-social-preview.png`],
    },
    {
      url: `${siteUrl}/about`,
      lastModified: lastUpdated,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...["careers", "contact", "advertise", "for-brands", "for-agencies", "how-it-works", "methodology", "bengaluru", "coverage", "digital-advertising-bengaluru", "auto-rickshaw-advertising-bangalore", "outdoor-advertising-bengaluru", "small-business-advertising-bangalore", "auto-advertising-cost-bengaluru", "guides", "field-journal", "tools/ad-budget-planner"].map(path => ({
      url: `${siteUrl}/${path}`,
      lastModified: lastUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(path === "digital-advertising-bengaluru" ? { images: [`${siteUrl}/field/ooro-bengaluru-auto-02.webp`] } : {}),
    })),
    ...["advertise-business-bengaluru", "outdoor-advertising-bangalore", "auto-rickshaw-advertising", "set-local-advertising-budget", "dooh-creative-specifications"].map(slug => ({ url: `${siteUrl}/guides/${slug}`, lastModified: lastUpdated, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
