import type { Metadata } from "next";
import { CalmHome } from "@/components/marketing/calm-home";

export const metadata: Metadata = {
  title: "The city moves. So should your brand. | OORO",
  description: "Your next customer could be in the next auto. OORO helps Bengaluru businesses and brands plan advertising on passenger-facing digital screens inside auto-rickshaws. Availability is confirmed before booking.",
  alternates: { canonical: "/" },
  keywords: [
    "OORO",
    "auto rickshaw advertising Bengaluru",
    "advertising inside autos",
    "Bengaluru local advertising",
    "passenger facing digital screens",
    "mobility advertising",
  ],
  openGraph: {
    title: "OORO | Your next customer could be in the next auto.",
    description: "Digital advertising inside everyday auto journeys. Built in Bengaluru, with real-world operations and a clear campaign process.",
    url: "/",
    type: "website",
    images: [{ url: "/ooro-social-preview.png", width: 1200, height: 630, alt: "OORO advertising inside Bengaluru auto-rickshaws" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OORO | Advertising Inside Autos in Bengaluru",
    description: "Put your brand in front of passengers during everyday auto journeys.",
    images: ["/ooro-social-preview.png"],
  },
};

export default function Home() {
  return <CalmHome />;
}
