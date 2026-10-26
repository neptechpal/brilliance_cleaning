import type { Metadata } from "next";
import { getPageSeo } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { CtaBand, WhyUs } from "@/components/site/sections";
import { Breadcrumbs, Container, SectionHeading } from "@/components/site/ui";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "About Us | Local Newcastle Cleaning Team",
    description:
      "Meet Brilliance Cleaning & Property Staging: a Newcastle team providing cleaning, property staging and hospitality staffing across the Hunter Region.",
    path: "/about",
    override: await getPageSeo("/about"),
  });
}

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <>
      <section className="hero-bg">
        <Container className="max-w-4xl py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "About", path: "/about" }]} />
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">A local team that handles the details</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Brilliance Cleaning &amp; Property Staging looks after homes, workplaces and hospitality venues across Newcastle and the Hunter Region. Our job is simple:
            take the cleaning, styling and staffing off your plate, and do it properly.
          </p>
        </Container>
      </section>
      <section className="py-14">
        <Container className="grid max-w-5xl gap-10 md:grid-cols-2">
          <div className="prose-content">
            <h2>What we do</h2>
            <p>
              Hospitality is a big part of what we do — keeping pubs, restaurants, clubs and function venues clean, and supplying chefs, cooks, kitchen hands and
              cleaners when venues are stretched. Alongside that, the same team delivers residential cleaning, end of lease cleans, commercial cleaning, post-construction cleaning and property staging.
            </p>
            <p>
              Whether you&apos;re preparing a property for sale, moving out of a rental, opening a new fit-out or running a busy venue, we put together a package that
              suits the job and work around your schedule.
            </p>
          </div>
          <div className="prose-content">
            <h2>How we work</h2>
            <ul>
              <li>
                <strong>Trained professionals</strong> who follow a written checklist on every job.
              </li>
              <li>
                <strong>Packages built around you</strong> — one-off, regular, after-hours or event-based.
              </li>
              <li>
                <strong>Flexible scheduling</strong>, including early mornings, late nights and weekends.
              </li>
              <li>
                <strong>One point of contact</strong> for cleaning, staging and staffing.
              </li>
            </ul>
          </div>
        </Container>
        <Container className="mt-12 max-w-5xl">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [s.statCustomers, "Happy customers"],
              [s.statStaff, "Team members"],
              ["6", "Hunter regions"],
              ["Free", "No-obligation quotes"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-line bg-white p-5 text-center">
                <dt className="sr-only">{l}</dt>
                <dd className="text-3xl font-extrabold text-brand-600">{v}</dd>
                <dd className="mt-1 text-sm font-medium text-ink-soft">{l}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
      <section className="bg-sand py-14 sm:py-16">
        <Container>
          <SectionHeading title="Why customers choose us" />
          <div className="mt-10">
            <WhyUs s={s} />
          </div>
        </Container>
      </section>
      <CtaBand s={s} label="about-cta" />
    </>
  );
}
