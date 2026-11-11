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
    ...["careers", "contact", "advertise", "for-brands", "for-agencies", "how-it-works", "how-to-advertise-on-ooro-screens", "methodology", "bengaluru", "coverage", "digital-advertising-bengaluru", "cab-advertising-bengaluru", "auto-rickshaw-advertising-bangalore", "outdoor-advertising-bengaluru", "small-business-advertising-bangalore", "auto-advertising-cost-bengaluru", "guides", "field-journal", "tools/ad-budget-planner", "tools/campaign-brief-builder"].map(path => ({
      url: `${siteUrl}/${path}`,
      lastModified: lastUpdated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(path === "digital-advertising-bengaluru" ? { images: [`${siteUrl}/field/ooro-bengaluru-auto-02.webp`] } : {}),
    })),
    ...["advertise-business-bengaluru", "outdoor-advertising-bangalore", "auto-rickshaw-advertising", "set-local-advertising-budget", "dooh-creative-specifications", "digital-vs-outdoor-advertising", "small-business-marketing-ideas-bengaluru", "auto-advertising-vs-billboards", "restaurant-local-advertising", "advertise-cafe-bengaluru", "digital-advertising-campaign-examples-bengaluru", "proof-of-play-dooh", "dooh-campaign-brief-bengaluru", "what-is-dooh-advertising-bengaluru", "dooh-vs-social-ads-bengaluru", "programmatic-dooh-explained", "dooh-campaign-roi-measurement", "hyperlocal-dooh-strategy-bengaluru", "dooh-for-startups-bengaluru", "dooh-for-real-estate-bengaluru", "dooh-for-retail-and-fmcg-bengaluru", "dooh-ad-creative-best-practices", "how-outdoor-advertising-works-bengaluru", "mobile-dooh-vs-digital-billboards", "dooh-audience-targeting-and-privacy"].map(slug => ({ url: `${siteUrl}/guides/${slug}`, lastModified: lastUpdated, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
