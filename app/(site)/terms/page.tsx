import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs, Container } from "@/components/site/ui";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "Terms that apply to quotes, bookings and services provided by Brilliance Cleaning & Property Staging.",
  path: "/terms",
});

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Breadcrumbs items={[{ name: "Terms of service", path: "/terms" }]} />
      <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink">Terms of service</h1>
      <div className="prose-content mt-8">
        <p>These terms apply to quotes and services provided by {s.businessName}. Your written quote or service agreement takes priority if it says something different.</p>
        <h2>Quotes</h2>
        <p>
          Quotes are based on the information you provide. If the property size, condition or scope on the day is materially different, we will discuss any change in
          price with you before continuing.
        </p>
        <h2>Bookings, access and cancellations</h2>
        <p>
          Please make sure we can access the property at the booked time and that power and water are connected. Let us know as early as possible if you need to
          reschedule. Cancellation terms are confirmed with your quote.
        </p>
        <h2>Payment</h2>
        <p>Payment terms are set out on your quote or invoice.</p>
        <h2>Feedback</h2>
        <p>
          If you are unhappy with any part of the service, contact us as soon as possible on {s.phoneDisplay} or {s.email} so we can look into it.
        </p>
        <h2>Australian Consumer Law</h2>
        <p>Nothing in these terms excludes, restricts or modifies any consumer guarantee or right you have under the Australian Consumer Law.</p>
      </div>
    </Container>
  );
}
