import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ooro.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.jpeg", shortcut: "/favicon.jpeg", apple: "/favicon.jpeg" },
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
  return <html lang="en"><body className={`${geist.variable} ${mono.variable}`}>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "OORO", url: siteUrl, description: "Smart mobility advertising network starting in Tirupati, Andhra Pradesh, India.", founder: [{ "@type": "Person", name: "Varneeth Varma Nandimandalam", alternateName: ["Varneeth Varma", "Varneeth"], jobTitle: "CEO and Founder", url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/", sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44"] }, { "@type": "Person", name: "Sumanth Vasilanka", jobTitle: "COO and Co-Founder", url: "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/" }], employee: [{ "@type": "Person", name: "Siri Girish", jobTitle: "CMO and Brand Strategist", url: "https://www.linkedin.com/in/siri-girish-7b7b65378/" }], sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44", "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/", "https://www.linkedin.com/in/siri-girish-7b7b65378/"] }) }}/></body></html>;
}
