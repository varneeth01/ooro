import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { pageMetadata } from "@/lib/seo";
import "../legal-pages.css";

export const metadata: Metadata = {
  ...pageMetadata("terms", "OORO Website and Advertising Terms", "Read the draft terms for using OORO's website and exploring advertising campaigns in Bengaluru."),
  robots: { index: false, follow: true },
};

export default function TermsPage() {
 return <main className="ooro-legal">
   <Navbar />
   <article>
     <Link className="ooro-policy-back" href="/">← Back to OORO</Link>
     <p className="ooro-policy-meta">OORO / Legal · Draft for operator review · 11 November 2026</p>
     <h1>Terms of Use</h1>
     <p>These draft terms describe expected rules for browsing OORO&apos;s public website and exploring advertising services. They are not a substitute for approved campaign order terms, and they require company/legal review before publication as binding terms.</p>
     <p className="ooro-policy-note"><strong>Publication review:</strong> Confirm the contracting legal entity, applicable law and jurisdiction, payment/refund policy, cancellation terms, dispute process and authorized contact before treating this page as final. It remains noindex pending approval.</p>
     <h2>1. Using the website</h2>
     <p>Visitors should use the website lawfully and avoid interfering with security, availability, accounts, content or systems. Access to authenticated features is limited to authorized users.</p>
     <h2>2. Campaign planning and availability</h2>
     <p>Planning tools, proposed locations, pricing examples and preliminary estimates are informational unless OORO separately confirms the applicable inventory, creative approval, dates, scope and total price. Submission of an enquiry does not by itself guarantee inventory or campaign delivery.</p>
     <h2>3. Advertising creatives and permissions</h2>
     <p>Advertisers are responsible for ensuring the materials they submit are accurate, lawful and appropriately licensed, including permissions for trademarks, images, audio and personal information. OORO may review or reject materials that do not meet applicable requirements or campaign specifications.</p>
     <h2>4. Bookings, payments and changes</h2>
     <p>Any booking, billing, cancellation, refund or rescheduling rules must be described in the specific approved order, invoice or separate campaign agreement. This public draft does not establish a universal refund or cancellation entitlement.</p>
     <h2>5. Service limitations</h2>
     <p>Connected inventory, network conditions, device status and scheduling may affect service availability. Unless expressly agreed in a confirmed order, website content does not guarantee a level of impressions, audience reach, geographic targeting, conversion or return on investment.</p>
     <h2>6. Intellectual property</h2>
     <p>OORO branding and website materials remain subject to applicable ownership and licensing rights. Submitted campaign content remains subject to its owners&apos; rights and the permissions granted under an approved campaign agreement.</p>
     <h2>7. Third-party services and links</h2>
     <p>Payment gateways, maps, hosting providers and external links may have their own terms. OORO is not responsible for third-party information outside its control.</p>
     <h2>8. Privacy and contact</h2>
     <p>For information-handling questions, read the <Link href="/privacy">Privacy Policy</Link>. For enquiries and issues, use the <Link href="/contact">Contact page</Link>.</p>
     <h2>9. Amendments</h2>
     <p>The final approved terms should identify an effective date, the contracting entity, governing law, and any necessary dispute-resolution procedure. Material changes should be communicated as required by applicable law and agreements.</p>
   </article>
   <Footer />
 </main>;
}
