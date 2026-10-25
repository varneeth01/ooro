import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const siteName = "OORO";
const siteDescription = "OORO is a smart mobility advertising network that helps brands reach people in the real world through digital displays on moving vehicles, starting in Bengaluru, Karnataka, India.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: { icon: "/favicon.jpeg", shortcut: "/favicon.jpeg", apple: "/favicon.jpeg" },
  title: { default: "OORO | Digital advertising in autos and cabs in Bengaluru", template: "%s | OORO" },
  description: siteDescription,
  keywords: ["OORO", "OORO advertising", "OORO Bengaluru", "mobility advertising India", "digital vehicle advertising", "vehicle screen advertising", "Bengaluru advertising", "Bangalore advertising", "Karnataka advertising", "smart city advertising", "digital out-of-home advertising", "DOOH India", "real world advertising", "Varneeth Varma", "Varneeth Varma Nandimandalam", "Siri Girish", "Jay Chandrudu Thammadi"],
  authors: [{ name: "Varneeth Varma Nandimandalam", url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/" }, { name: "Siri Girish", url: "https://www.linkedin.com/in/siri-girish-7b7b65378/" }, { name: "Jay Chandrudu Thammadi" }],
  creator: "Varneeth Varma Nandimandalam",
  publisher: "OORO",
  openGraph: { title: "OORO | Smart mobility advertising in India", description: siteDescription, type: "website", url: "/", siteName, locale: "en_IN", images: [{ url: "/ooro-auto-screen.svg", width: 1200, height: 630, alt: "OORO smart mobility advertising network" }] },
  twitter: { card: "summary_large_image", title: "OORO | Smart mobility advertising in India", description: siteDescription, images: ["/ooro-auto-screen.svg"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const team = [
    { "@type": "Person", "@id": `${siteUrl}/about#varneeth-varma-nandimandalam`, name: "Varneeth Varma Nandimandalam", alternateName: ["Varneeth Varma", "Varneeth"], jobTitle: "CEO and Founder", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#varneeth-varma-nandimandalam`, sameAs: ["https://www.linkedin.com/in/varneeth-varma-nandimandalam/", "https://www.instagram.com/varneeth_44"] },
    { "@type": "Person", "@id": `${siteUrl}/about#siri-girish`, name: "Siri Girish", jobTitle: "CMO and Brand Strategist", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#siri-girish`, sameAs: ["https://www.linkedin.com/in/siri-girish-7b7b65378/"] },
    { "@type": "Person", "@id": `${siteUrl}/about#jay-chandrudu-thammadi`, name: "Jay Chandrudu Thammadi", jobTitle: "Operations and Hardware R&D", worksFor: { "@id": `${siteUrl}/#organization` }, url: `${siteUrl}/about#jay-chandrudu-thammadi` },
  ];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: siteName, alternateName: ["Ooro", "Ooro mobility", "OORO advertising"], url: siteUrl, logo: `${siteUrl}/favicon.jpeg`, description: siteDescription, areaServed: { "@type": "City", name: "Bengaluru" }, founder: { "@id": `${siteUrl}/about#varneeth-varma-nandimandalam` }, employee: team.slice(1).map(person => ({ "@id": person["@id"] })), sameAs: team.flatMap((person) => "sameAs" in person ? person.sameAs : []) },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: siteName, alternateName: "Ooro", description: siteDescription, publisher: { "@id": `${siteUrl}/#organization` }, inLanguage: "en-IN" },
      { "@type": "WebPage", "@id": `${siteUrl}/#webpage`, url: siteUrl, name: "OORO | Smart mobility advertising in India", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${siteUrl}/#organization` }, description: siteDescription, inLanguage: "en-IN" },
      ...team,
    ],
  };
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/></body></html>;
}
