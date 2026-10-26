import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { ChefHat, Clock, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getPageSeo } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { getStaffingSettings } from "@/lib/staffing-settings";
import { renderMarkdown } from "@/lib/markdown";
import { buildMetadata } from "@/lib/seo";
import { BookingForm } from "@/components/site/BookingForm";
import { Breadcrumbs, Card, Container } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Book Hospitality Staff Newcastle | Chefs, Cooks & Kitchen Hands",
    description: "Book chefs, cooks, kitchen hands and cleaners for your Newcastle or Hunter venue online. See base rates and a live estimate. Fast confirmation.",
    path: "/booking",
    override: await getPageSeo("/booking"),
  });
}

async function activeStaff() {
  "use cache";
  cacheTag("staff");
  cacheLife("hours");
  const rows = await db.staffApplication.findMany({ where: { active: true }, include: { files: { where: { kind: "photo" }, select: { id: true } } }, orderBy: { firstName: "asc" } });
  return rows.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, roles: s.roles, experience: s.experience, expertise: s.expertise.slice(0, 6), areas: s.locations, photo: s.files.length > 0 }));
}

export default async function BookingPage() {
  const [s, st, staff] = await Promise.all([getSettings(), getStaffingSettings(), activeStaff()]);
  return (
    <section className="hero-bg">
      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Breadcrumbs items={[{ name: "Book hospitality staff", path: "/booking" }]} />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Book hospitality staff</h1>
          <p className="mt-4 text-lg text-ink-soft">Tell us what you need — we&apos;ll confirm ASAP. Chefs, cooks, kitchen hands and cleaners for venues across Newcastle and the Hunter.</p>
          <ul className="mt-8 space-y-4">
            {[
              [Clock, "Allow 4+ hours", "Urgent same-day staffing is often possible — call us."],
              [ChefHat, "Base rates shown up front", "Live estimate including weekend and evening loadings."],
              [ShieldCheck, "Casual engagement", "Staff are engaged as casuals; we handle their pay."],
            ].map(([I, t, d]) => {
              const IconCmp = I as typeof Clock;
              return (
                <li key={t as string} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-brand-100">
                    <IconCmp className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-bold text-ink">{t as string}</span>
                    <span className="block text-sm text-ink-soft">{d as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <a href={`tel:${s.phone}`} data-track-label="booking-page" className="mt-8 inline-flex items-center gap-2 text-2xl font-extrabold text-coral-600 hover:underline">
            {s.phoneDisplay}
          </a>
          <p className="mt-6 text-sm text-ink-soft">
            Want to work with us instead?{" "}
            <Link href="/careers" className="font-semibold text-brand-700 hover:underline">
              Join our team
            </Link>
            .
          </p>
        </div>
        <Card className="p-5 shadow-xl shadow-brand-900/5 sm:p-8">
          <BookingForm positions={st.positions} multipliers={st.multipliers} staff={staff} allowPreference={st.allowStaffPreference} policiesHtml={renderMarkdown(st.policies)} />
        </Card>
      </Container>
    </section>
  );
}
