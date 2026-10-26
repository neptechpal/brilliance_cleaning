import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PageHeader({ title, intro, actions }: { title: string; intro?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {intro && <p className="mt-1 text-sm text-ink-soft">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, className = "", children }: { title?: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "brand" | "coral" }) {
  const c = tone === "brand" ? "text-brand-600" : tone === "coral" ? "text-coral-600" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${c}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  NEW: "bg-coral-50 text-coral-700 ring-coral-200",
  CONTACTED: "bg-amber-50 text-amber-700 ring-amber-200",
  QUOTED: "bg-sky-50 text-sky-700 ring-sky-200",
  WON: "bg-brand-50 text-brand-700 ring-brand-200",
  LOST: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  SPAM: "bg-zinc-100 text-zinc-500 ring-zinc-200",
  PUBLISHED: "bg-brand-50 text-brand-700 ring-brand-200",
  DRAFT: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  IDEA: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  PLANNED: "bg-sky-50 text-sky-700 ring-sky-200",
  WRITING: "bg-amber-50 text-amber-700 ring-amber-200",
  RANKING: "bg-brand-50 text-brand-700 ring-brand-200",
  ok: "bg-brand-50 text-brand-700 ring-brand-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-coral-50 text-coral-700 ring-coral-200",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const k = tone ?? String(children);
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE[k] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200"}`}>{children}</span>;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-sand text-xs uppercase tracking-wider text-ink-soft">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-8 text-center text-sm text-ink-soft">{empty}</p>}
    </div>
  );
}

export const td = "px-3 py-2.5 align-top";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-sand";

export function Field({
  label,
  hint,
  name,
  className = "",
  ...props
}: { label: string; hint?: ReactNode; name: string; className?: string } & ComponentProps<"input">) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      <input name={name} className={inputCls} {...props} />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Area({
  label,
  hint,
  name,
  className = "",
  mono = false,
  ...props
}: { label: string; hint?: ReactNode; name: string; className?: string; mono?: boolean } & ComponentProps<"textarea">) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      <textarea name={name} className={`${inputCls} ${mono ? "font-mono text-[0.8rem] leading-relaxed" : ""}`} {...props} />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  className = "",
  ...props
}: { label: string; name: string; options: (string | [string, string])[]; className?: string } & ComponentProps<"select">) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      <select name={name} className={inputCls} {...props}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-brand-600" />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function Btn({ variant = "primary", className = "", ...props }: { variant?: "primary" | "ghost" | "danger" } & ComponentProps<"button">) {
  const v =
    variant === "danger"
      ? "bg-coral-600 text-white hover:bg-coral-700"
      : variant === "ghost"
        ? "border border-line bg-white text-ink hover:bg-sand"
        : "bg-brand-600 text-white hover:bg-brand-700";
  return <button className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${v} ${className}`} {...props} />;
}

export function LinkBtn({ href, variant = "primary", children, className = "" }: { href: string; variant?: "primary" | "ghost"; children: ReactNode; className?: string }) {
  const v = variant === "ghost" ? "border border-line bg-white text-ink hover:bg-sand" : "bg-brand-600 text-white hover:bg-brand-700";
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${v} ${className}`}>
      {children}
    </Link>
  );
}

export function Notice({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const c = tone === "bad" ? "bg-coral-50 text-coral-700 border-coral-200" : tone === "warn" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-brand-50 text-brand-700 border-brand-200";
  return <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm font-medium ${c}`}>{children}</div>;
}

/** Simple CSS bar chart: values per day. */
export function Bars({ data, series }: { data: { label: string; values: number[] }[]; series: { name: string; color: string }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end justify-center gap-px">
            {d.values.map((v, i) => (
              <div key={i} className="w-full max-w-3 rounded-t-sm" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0, background: series[i].color }} />
            ))}
            <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] text-white group-hover:block">
              {d.label}: {d.values.map((v, i) => `${series[i].name} ${v}`).join(" · ")}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-soft">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-ink-soft">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function fmtDate(d: Date | string | null | undefined, time = true) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    ...(time ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  });
}
