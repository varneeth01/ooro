import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const canonical = path ? `/${path}` : "/";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title: `${title} | OORO`, description, siteName: "OORO", locale: "en_IN", images: [{ url: "/ooro-social-preview.png", width: 1200, height: 630, alt: "OORO mobility advertising in Bengaluru" }] },
    twitter: { card: "summary_large_image", title: `${title} | OORO`, description, images: ["/ooro-social-preview.png"] },
  };
}

export function articleJsonLd(slug: string, title: string, description: string, dateModified: string) {
  const url = `${siteUrl}/guides/${slug}`;
  return { "@context": "https://schema.org", "@type": "Article", headline: title, description, dateModified, inLanguage: "en-IN", mainEntityOfPage: url, author: { "@type": "Organization", name: "OORO Editorial", url: siteUrl }, publisher: { "@type": "Organization", name: "OORO", url: siteUrl, logo: { "@type": "ImageObject", url: `${siteUrl}/ooro-mark-3d.png` } } };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${siteUrl}${item.path}` })),
  };
}
