import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Container } from "@/components/site/ui";
import { ThankYouName } from "./ThankYouName";

export const metadata: Metadata = {
  title: { absolute: "Thanks – we've got your request | Brilliance Cleaning" },
  robots: { index: false, follow: false },
};

export default async function ThankYouPage() {
  const s = await getSettings();
  return (
    <section className="hero-bg">
      <Container className="max-w-2xl py-16 text-center sm:py-24">
        <CheckCircle2 className="mx-auto size-16 text-brand-600" aria-hidden />
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink">
          Thanks<ThankYouName />, we&apos;ve got your request
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          A member of our team will be in touch shortly — usually within a few business hours. Keep an eye on your phone and inbox.
        </p>
        <div className="mt-8 rounded-2xl border border-line bg-white p-6" data-track-label="thank-you">
          <p className="font-semibold text-ink">Need us urgently?</p>
          <a href={`tel:${s.phone}`} className="mt-2 inline-flex items-center gap-2 text-2xl font-extrabold text-coral-600 hover:underline">
            <Phone className="size-6" aria-hidden /> {s.phoneDisplay}
          </a>
        </div>
        <p className="mt-8">
          <Link href="/blog" className="font-bold text-brand-700 hover:underline">
            Browse our cleaning guides while you wait →
          </Link>
        </p>
      </Container>
    </section>
  );
}
