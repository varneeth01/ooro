import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const siteName = "OORO";
const siteDescription = "OORO is a smart mobility advertising network that helps brands reach people in the real world through digital displays on moving vehicles, starting in Bengaluru, Karnataka, India.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon-32.png", shortcut: "/favicon-32.png", apple: "/apple-touch-icon.png" },
  title: { default: "OORO | Digital advertising in autos and cabs in Bengaluru", template: "%s | OORO" },
  description: siteDescription,
  publisher: "OORO",
  openGraph: { title: "OORO | Smart mobility advertising in India", description: siteDescription, type: "website", url: "/", siteName, locale: "en_IN", images: [{ url: "/ooro-social-preview.png", width: 1200, height: 630, alt: "OORO advertising that moves through Bengaluru" }] },
  twitter: { card: "summary_large_image", title: "OORO | Smart mobility advertising in India", description: siteDescription, images: ["/ooro-social-preview.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: siteName, alternateName: ["Ooro", "Ooro mobility", "OORO advertising"], url: siteUrl, logo: `${siteUrl}/ooro-mark-3d.png`, description: siteDescription, areaServed: { "@type": "City", name: "Bengaluru" }, founder: [
        { "@type": "Person", "@id": `${siteUrl}/about#founder-1`, name: "Varneeth Varma Nandimandalam", jobTitle: "Founder & CEO", url: `${siteUrl}/about#founder-1`, sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/"] },
        { "@type": "Person", "@id": `${siteUrl}/about#founder-2`, name: "Siri Girish", jobTitle: "Co-founder & CMO", url: `${siteUrl}/about#founder-2`, sameAs: ["https://www.linkedin.com/in/siri-girish-7b7b65378/"] },
        { "@type": "Person", "@id": `${siteUrl}/about#founder-3`, name: "Jay Chandrudu Thammadi", jobTitle: "Co-founder, Hardware & Operations", url: `${siteUrl}/about#founder-3` },
      ] },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: siteName, alternateName: "Ooro", description: siteDescription, publisher: { "@id": `${siteUrl}/#organization` }, inLanguage: "en-IN" },
    ],
  };
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></body></html>;
}
