import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ooro.in"),
  title: "OORO — Advertising that moves with your city",
  description: "OORO is a smart mobility advertising network founded by Varneeth Varma Nandimandalam, starting in Tirupati and expanding city by city across India.",
  keywords: ["OORO", "OORO advertising", "OORO Tirupati", "mobility advertising India", "digital vehicle advertising", "vehicle screen advertising", "Tirupati advertising", "Andhra Pradesh advertising", "smart city advertising", "digital out-of-home advertising", "DOOH India", "real world advertising", "Varneeth Varma", "Varneeth Varma Nandimandalam", "Sumanth Vasilanka", "Siri Girish"],
  authors: [{ name: "Varneeth Varma Nandimandalam", url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/" }, { name: "Sumanth Vasilanka", url: "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/" }, { name: "Siri Girish", url: "https://www.linkedin.com/in/siri-girish-7b7b65378/" }],
  creator: "Varneeth Varma Nandimandalam",
  publisher: "OORO",
  alternates: { canonical: "/" },
  openGraph: { title: "OORO — Advertising that moves with your city", description: "A smart mobility advertising network starting in Tirupati, Andhra Pradesh.", type: "website", url: "/", siteName: "OORO", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: "OORO — Advertising that moves with your city", description: "A smart mobility advertising network starting in Tirupati." },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const varneeth = { "@type": "Person", "@id": "https://ooro.in/#varneeth-varma", name: "Varneeth Varma Nandimandalam", alternateName: ["Varneeth Varma", "Varneeth"], jobTitle: "CEO and Founder", url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/", sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44"] };
  const sumanth = { "@type": "Person", "@id": "https://ooro.in/#sumanth-vasilanka", name: "Sumanth Vasilanka", jobTitle: "COO and Co-Founder", url: "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/", sameAs: ["https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/"] };
  const siri = { "@type": "Person", "@id": "https://ooro.in/#siri-girish", name: "Siri Girish", jobTitle: "CMO and Brand Strategist", url: "https://www.linkedin.com/in/siri-girish-7b7b65378/", sameAs: ["https://www.linkedin.com/in/siri-girish-7b7b65378/"] };
  const organizationSchema = { "@context": "https://schema.org", "@type": "Organization", "@id": "https://ooro.in/#organization", name: "OORO", legalName: "OORO", description: "OORO is a smart mobility advertising network starting in Tirupati, Andhra Pradesh, India.", url: "https://ooro.in/", logo: "https://ooro.in/ooro-auto-screen.svg", foundingLocation: { "@type": "Place", name: "Tirupati, Andhra Pradesh, India" }, areaServed: { "@type": "Country", name: "India" }, founder: [varneeth, sumanth], employee: [varneeth, sumanth, siri], sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44", "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/", "https://www.linkedin.com/in/siri-girish-7b7b65378/"] };
  const websiteSchema = { "@context": "https://schema.org", "@type": "WebSite", "@id": "https://ooro.in/#website", name: "OORO", url: "https://ooro.in/", description: "Advertising that moves with your city. OORO is a smart mobility advertising network starting in Tirupati.", publisher: { "@id": "https://ooro.in/#organization" }, inLanguage: "en-IN" };
  const serviceSchema = { "@context": "https://schema.org", "@type": "Service", name: "OORO Smart Mobility Advertising Network", serviceType: "Mobility advertising and digital out-of-home media", provider: { "@id": "https://ooro.in/#organization" }, areaServed: { "@type": "City", name: "Tirupati", containedInPlace: { "@type": "State", name: "Andhra Pradesh" } }, description: "Location-aware advertising delivered through digital displays on vehicles moving through the city." };
  const peopleSchema = { "@context": "https://schema.org", "@graph": [varneeth, sumanth, siri] };
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(peopleSchema) }}/></body></html>;
}
