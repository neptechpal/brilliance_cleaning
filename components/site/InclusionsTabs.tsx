"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Tab = { slug: string; name: string; inclusions: { area: string; items: string[] }[] };

/** All panels are rendered into the HTML (hidden when inactive) so crawlers can read every checklist. */
export function InclusionsTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.slug);
  if (!tabs.length) return null;
  return (
    <div>
      <div role="tablist" aria-label="Service checklists" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {tabs.map((t) => (
          <button
            key={t.slug}
            role="tab"
            id={`tab-${t.slug}`}
            aria-selected={active === t.slug}
            aria-controls={`panel-${t.slug}`}
            onClick={() => setActive(t.slug)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active === t.slug ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-brand-500"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.slug} role="tabpanel" id={`panel-${t.slug}`} aria-labelledby={`tab-${t.slug}`} hidden={active !== t.slug} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.inclusions.map((g) => (
              <div key={g.area} className="rounded-2xl border border-line bg-white p-5">
                <h3 className="font-bold text-ink">{g.area}</h3>
                <ul className="mt-3 space-y-2">
                  {g.items.map((it) => (
                    <li key={it} className="flex gap-2 text-sm text-ink-soft">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
