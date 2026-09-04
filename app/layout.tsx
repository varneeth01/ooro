import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteName = "OORO";
const siteDescription = "OORO is a smart mobility advertising network that helps brands reach people in the real world through digital displays on moving vehicles, starting in Tirupati, Andhra Pradesh, India.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.jpeg", shortcut: "/favicon.jpeg", apple: "/favicon.jpeg" },
  title: { default: "OORO | Smart mobility advertising in India", template: "%s | OORO" },
  description: siteDescription,
  keywords: ["OORO", "OORO advertising", "OORO Tirupati", "mobility advertising India", "digital vehicle advertising", "vehicle screen advertising", "Tirupati advertising", "Andhra Pradesh advertising", "smart city advertising", "digital out-of-home advertising", "DOOH India", "real world advertising", "Varneeth Varma", "Varneeth Varma Nandimandalam", "Sumanth Vasilanka", "Siri Girish"],
  authors: [{ name: "Varneeth Varma Nandimandalam", url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/" }, { name: "Sumanth Vasilanka", url: "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/" }, { name: "Siri Girish", url: "https://www.linkedin.com/in/siri-girish-7b7b65378/" }],
  creator: "Varneeth Varma Nandimandalam",
  publisher: "OORO",
  alternates: { canonical: "/" },
  openGraph: { title: "OORO | Smart mobility advertising in India", description: siteDescription, type: "website", url: "/", siteName, locale: "en_IN", images: [{ url: "/ooro-auto-screen.svg", width: 1200, height: 630, alt: "OORO smart mobility advertising network" }] },
  twitter: { card: "summary_large_image", title: "OORO | Smart mobility advertising in India", description: siteDescription, images: ["/ooro-auto-screen.svg"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const founders = [
    { "@type": "Person", "@id": `${siteUrl}/about#varneeth-varma-nandimandalam`, name: "Varneeth Varma Nandimandalam", alternateName: ["Varneeth Varma", "Varneeth"], jobTitle: "CEO and Founder", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#varneeth-varma-nandimandalam`, sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44"] },
    { "@type": "Person", "@id": `${siteUrl}/about#sumanth-vasilanka`, name: "Sumanth Vasilanka", jobTitle: "COO and Co-Founder", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#sumanth-vasilanka`, sameAs: ["https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/"] },
    { "@type": "Person", "@id": `${siteUrl}/about#siri-girish`, name: "Siri Girish", jobTitle: "CMO and Brand Strategist", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#siri-girish`, sameAs: ["https://www.linkedin.com/in/siri-girish-7b7b65378/"] },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: siteName, alternateName: ["Ooro", "Ooro mobility", "OORO advertising"], url: siteUrl, logo: `${siteUrl}/favicon.jpeg`, description: siteDescription, foundingLocation: { "@type": "Place", name: "Tirupati, Andhra Pradesh, India" }, founder: founders.slice(0, 2), employee: founders.slice(2), sameAs: founders.flatMap((founder) => founder.sameAs) },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: siteName, alternateName: "Ooro", description: siteDescription, publisher: { "@id": `${siteUrl}/#organization` }, inLanguage: "en-IN" },
      { "@type": "WebPage", "@id": `${siteUrl}/#webpage`, url: siteUrl, name: "OORO | Smart mobility advertising in India", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${siteUrl}/#organization` }, description: siteDescription, inLanguage: "en-IN" },
      { "@type": "OfferCatalog", "@id": `${siteUrl}/#campaign-pricing`, name: "OORO Tirupati campaign pricing", url: `${siteUrl}/#campaign-pricing`, itemListElement: [3000, 6000, 9000, 15000, 5000, 10000, 15000, 25000].map((price, index) => ({ "@type": "Offer", name: `Tirupati ${[5, 10, 15, 25, 5, 10, 15, 25][index]}-auto ${index < 4 ? 4 : 8}-hour campaign`, price: String(price), priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${siteUrl}/#campaign-pricing` })) },
      ...founders,
    ],
  };
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></body></html>;
}
