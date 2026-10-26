import Link from "next/link";
import * as Icons from "lucide-react";
import { ChevronRight, Phone } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { breadcrumbJsonLd } from "@/lib/seo";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, intro, center = true }: { eyebrow?: string; title: string; intro?: string; center?: boolean }) {
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-ink-soft">{intro}</p>}
    </div>
  );
}

export function CallButton({
  phone,
  display,
  label,
  className = "",
  size = "md",
}: {
  phone: string;
  display: string;
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "lg" ? "px-6 py-3.5 text-lg" : size === "sm" ? "px-3.5 py-2 text-sm" : "px-5 py-3 text-base";
  return (
    <a
      href={`tel:${phone}`}
      data-track-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-coral-600 font-bold text-white shadow-sm transition hover:bg-coral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-600 ${sz} ${className}`}
    >
      <Phone className="size-[1.1em]" aria-hidden />
      <span>{display}</span>
    </a>
  );
}

export function QuoteButton({
  href = "/quote",
  label,
  children = "Get a free quote",
  className = "",
  variant = "solid",
}: {
  href?: string;
  label: string;
  children?: ReactNode;
  className?: string;
  variant?: "solid" | "outline" | "white";
}) {
  const v =
    variant === "outline"
      ? "border-2 border-brand-600 text-brand-700 hover:bg-brand-50"
      : variant === "white"
        ? "bg-white text-brand-700 hover:bg-brand-50"
        : "bg-brand-600 text-white hover:bg-brand-700";
  return (
    <Link
      href={href}
      data-track="quote_cta"
      data-track-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-bold transition ${v} ${className}`}
    >
      {children}
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

export function Icon({ name, className = "size-6" }: { name?: string | null; className?: string }) {
  const Cmp = ((name && (Icons as unknown as Record<string, Icons.LucideIcon>)[name]) || Icons.Sparkles) as Icons.LucideIcon;
  return <Cmp className={className} aria-hidden />;
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 text-ink-soft/60" aria-hidden />}
              {i < all.length - 1 ? (
                <Link href={it.path} className="hover:text-brand-700 hover:underline">
                  {it.name}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-ink">
                  {it.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </>
  );
}

export function FaqList({ faqs, className = "" }: { faqs: { q: string; a: string }[]; className?: string }) {
  if (!faqs.length) return null;
  return (
    <div className={`divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      {faqs.map((f, i) => (
        <details key={i} className="group" {...(i === 0 ? { open: true } : {})}>
          <summary className="flex cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left font-semibold text-ink hover:bg-brand-50 sm:px-6">
            <h3 className="text-base sm:text-[1.05rem]">{f.q}</h3>
            <Icons.Plus className="mt-0.5 size-5 shrink-0 text-brand-600 transition group-open:rotate-45" aria-hidden />
          </summary>
          <div className="px-5 pb-5 text-ink-soft leading-relaxed sm:px-6">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

export function Markdown({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`prose-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(15_42_54/0.04)] ${className}`} {...props} />;
}
