"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type Check = { ok: boolean | "warn"; label: string };

/**
 * Live on-page SEO checklist + Google snippet preview for an admin edit form.
 * Reads the form's fields by name, so it works with any editor.
 */
export function SeoAssistant({
  formId,
  path,
  titleField = "metaTitle",
  descField = "metaDescription",
  h1Field = "h1",
  bodyFields = ["body"],
  fallbackTitleField = "name",
  minWords = 600,
  defaultKeyword = "",
}: {
  formId: string;
  path: string;
  titleField?: string;
  descField?: string;
  h1Field?: string;
  bodyFields?: string[];
  fallbackTitleField?: string;
  minWords?: number;
  defaultKeyword?: string;
}) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [v, setV] = useState({ title: "", desc: "", h1: "", body: "" });

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = () => {
      const get = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "").trim();
      setV({
        title: get(titleField) || get(fallbackTitleField),
        desc: get(descField),
        h1: get(h1Field) || get(fallbackTitleField),
        body: bodyFields.map(get).join("\n\n"),
      });
    };
    read();
    form.addEventListener("input", read);
    return () => form.removeEventListener("input", read);
  }, [formId, titleField, descField, h1Field, bodyFields, fallbackTitleField]);

  const kw = keyword.toLowerCase().trim();
  // Natural variants count ("end of lease cleaning in Newcastle" matches "end of lease cleaning newcastle")
  const STOP = new Set(["in", "the", "and", "&", "a", "for", "near", "me", "to"]);
  const kwWords = kw.split(/\s+/).filter((w) => w && !STOP.has(w));
  const has = (s: string) => {
    if (!kwWords.length) return false;
    const text = ` ${s.toLowerCase().replace(/[^a-z0-9&]+/g, " ")} `;
    return kwWords.every((w) => text.includes(` ${w} `));
  };
  const words = v.body.split(/\s+/).filter(Boolean);
  const first100 = words.slice(0, 100).join(" ");
  const internalLinks = (v.body.match(/\]\(\/[^)]*\)/g) || []).length;
  const h2s = (v.body.match(/^##\s/gm) || []).length;
  const tLen = v.title.length;
  const dLen = v.desc.length;

  const checks: Check[] = [
    { ok: tLen >= 30 && tLen <= 60 ? true : tLen > 0 && tLen <= 65 ? "warn" : false, label: `Title length ${tLen} (aim 30–60)` },
    { ok: dLen >= 120 && dLen <= 160 ? true : dLen > 0 ? "warn" : false, label: `Description length ${dLen} (aim 120–160)` },
    { ok: words.length >= minWords ? true : words.length >= minWords * 0.6 ? "warn" : false, label: `Content ${words.length} words (aim ${minWords}+)` },
    { ok: h2s >= 2 ? true : h2s === 1 ? "warn" : false, label: `${h2s} H2 subheadings` },
    { ok: internalLinks >= 2 ? true : internalLinks === 1 ? "warn" : false, label: `${internalLinks} internal links (aim 2+)` },
    { ok: !/^#\s/m.test(v.body), label: "No extra H1 inside the content" },
    ...(kw
      ? [
          { ok: has(v.title), label: "Keyword in title" },
          { ok: has(v.h1), label: "Keyword in H1" },
          { ok: has(v.desc), label: "Keyword in description" },
          { ok: has(first100), label: "Keyword in first 100 words" } as Check,
          { ok: (v.body.match(/^##.*$/gm) || []).some((h) => has(h)) ? true : "warn", label: "Keyword in an H2" } as Check,
        ]
      : []),
  ];
  const score = Math.round((checks.reduce((a, c) => a + (c.ok === true ? 1 : c.ok === "warn" ? 0.5 : 0), 0) / checks.length) * 100);
  const shownTitle = v.title.length + 22 <= 62 ? `${v.title} | Brilliance Cleaning` : v.title;

  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold text-ink">SEO assistant</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${score >= 80 ? "bg-brand-50 text-brand-700" : score >= 50 ? "bg-amber-50 text-amber-700" : "bg-coral-50 text-coral-700"}`}>{score}/100</span>
      </div>
      <div className="space-y-4 p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Focus keyword</span>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. end of lease cleaning newcastle" className="w-full rounded-lg border border-line px-3 py-2 text-sm" />
        </label>
        <div className="rounded-lg border border-line p-3">
          <p className="text-xs text-ink-soft">Google preview</p>
          <p className="mt-1 truncate text-xs text-[#202124]">brillianceservices.com.au{path}</p>
          <p className="truncate text-[1.05rem] leading-snug text-[#1a0dab]">{shownTitle || "Page title"}</p>
          <p className="line-clamp-2 text-xs leading-relaxed text-[#4d5156]">{v.desc || "Meta description will show here…"}</p>
        </div>
        <ul className="space-y-1.5 text-sm">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              {c.ok === true ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
              ) : c.ok === "warn" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-coral-500" />
              )}
              <span className="text-ink-soft">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
