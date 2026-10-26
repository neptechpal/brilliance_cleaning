import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs, Container } from "@/components/site/ui";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Brilliance Cleaning & Property Staging collects, uses and protects your personal information.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Privacy policy", path: "/privacy" }]} />
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink">Privacy policy</h1>
      <div className="prose-content mt-8">
        <p>
          {s.businessName} (&quot;we&quot;, &quot;us&quot;) respects your privacy and handles personal information in line with the Privacy Act 1988 (Cth) and the
          Australian Privacy Principles.
        </p>
        <h2>What we collect</h2>
        <p>
          When you request a quote, send a message or call us, we collect the details you give us — such as your name, phone number, email, suburb, property details
          and information about the job. Our website also records basic usage information (pages visited, the website or campaign that referred you, device type and
          clicks on our phone number) so we can understand which pages and advertising help customers find us. We store a hashed (non-reversible) form of your IP
          address for spam protection rather than the address itself.
        </p>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to your enquiry, prepare quotes and deliver our services</li>
          <li>To schedule work and contact you about your booking</li>
          <li>To improve our website and measure our marketing</li>
          <li>To meet our legal and accounting obligations</li>
        </ul>
        <p>We do not sell your personal information.</p>
        <h2>Cookies and analytics</h2>
        <p>
          We use browser storage and may use tools such as Google Analytics, Google Ads and Meta to measure visits and enquiries. These tools may set cookies. You can
          block or delete cookies in your browser settings.
        </p>
        <h2>Who we share it with</h2>
        <p>
          We only share your information with team members and service providers who help us run the business (for example email, hosting and analytics providers),
          or where required by law.
        </p>
        <h2>Security and retention</h2>
        <p>
          We take reasonable steps to protect your information from misuse, loss and unauthorised access, and keep it only as long as we need it for the purposes above
          or as required by law.
        </p>
        <h2>Access, correction and complaints</h2>
        <p>
          You can ask to access or correct the personal information we hold about you, or make a privacy complaint, by emailing{" "}
          <a href={`mailto:${s.email}`}>{s.email}</a> or calling {s.phoneDisplay}. If you are not satisfied with our response, you can contact the Office of the
          Australian Information Commissioner (oaic.gov.au).
        </p>
      </div>
    </Container>
  );
}
