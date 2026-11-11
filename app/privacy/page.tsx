import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { pageMetadata } from "@/lib/seo";
import "../legal-pages.css";

export const metadata: Metadata = {
  ...pageMetadata("privacy", "OORO Privacy Policy", "Understand how information may be collected, used and protected when you visit OORO, enquire about advertising, or use its services."),
  // Review with the company privacy owner before allowing search indexing.
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
 return <main className="ooro-legal">
   <Navbar />
   <article>
     <Link className="ooro-policy-back" href="/">← Back to OORO</Link>
     <p className="ooro-policy-meta">OORO / Legal · Draft for operator review · 11 November 2026</p>
     <h1>Privacy Policy</h1>
     <p>OORO provides information about advertising on passenger-facing screens and tools for planning campaigns. This page explains the categories of information that can arise when people use our website and services. Specific processing and retention details must be confirmed against our deployed systems before this policy is approved.</p>
     <p className="ooro-policy-note"><strong>Publication review:</strong> This is a working policy draft, not a confirmed statement about every live integration. The business and legal/privacy owner must validate the data inventory, recipients, storage periods, contact channel and applicable statutory requirements before removing the noindex directive.</p>
     <h2>1. Who this policy covers</h2>
     <p>This policy is intended for website visitors, advertising enquiries, campaign users and prospective partners. Driver, technician and employee services may require additional role-specific notices.</p>
     <h2>2. Information we may receive</h2>
     <ul>
       <li>Details you provide, such as name, business or organization name, work contact information, enquiry messages and campaign preferences.</li>
       <li>Account and transaction-related information used to authenticate authorized users and process campaign activity.</li>
       <li>Uploaded advertising creatives and the instructions, dates and locations associated with a requested campaign.</li>
       <li>Technical data generated when you browse or use the service, such as IP address, device/browser information, security events and diagnostic logs.</li>
       <li>Information from operational partners and connected devices where necessary for an authorized service, subject to their applicable notices.</li>
     </ul>
     <h2>3. Why information is used</h2>
     <p>Information may be used to respond to enquiries, operate accounts and campaign requests, review creative, provide support, secure services, investigate abuse, meet legal obligations and improve reliability. Marketing communications should be sent only where permitted and with suitable controls.</p>
     <h2>4. Payments and service providers</h2>
     <p>Authorized payment, hosting, communication, storage and infrastructure providers may process limited information to deliver their services. The exact providers and their roles must be verified before this policy is finalized. Payment card information should be handled through authorized payment providers rather than described as stored by OORO without evidence.</p>
     <h2>5. Cookies, analytics and browser storage</h2>
     <p>Essential session and security storage may be necessary for authenticated features. Optional analytics and advertising technologies, if enabled, should be disclosed here with relevant consent or opt-out controls. Do not assume optional trackers are active solely because they are contemplated.</p>
     <h2>6. Retention and security</h2>
     <p>Retention depends on the purpose, contractual obligations, security requirements and applicable law. OORO should define verified retention schedules and deletion processes for each data category. We seek to use appropriate access controls and safeguards, but no internet service can guarantee absolute security.</p>
     <h2>7. Your choices and requests</h2>
     <p>You may request access, correction, withdrawal of applicable consent or deletion subject to legal and operational constraints. Requests should be directed through the official contact channel listed on our <Link href="/contact">Contact page</Link>. Account security and identity verification may be required before changes are made.</p>
     <h2>8. Children and third-party links</h2>
     <p>Our advertiser-facing services are not directed to children. External websites are governed by their own privacy policies.</p>
     <h2>9. Changes and contact</h2>
     <p>We may revise this policy as products and legal requirements evolve. The version and effective date should be updated when the policy is approved. For privacy-related questions, see <Link href="/contact">Contact OORO</Link>.</p>
   </article>
   <Footer />
 </main>;
}
