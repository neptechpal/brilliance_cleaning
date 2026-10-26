// Plain-text formats used by admin textareas for structured JSON fields.

import type { Inclusion, QA, Step } from "./data";

/** Textarea value with browser CRLF line endings normalised to LF. */
export const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\r\n?/g, "\n");

export const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const str = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s || null;
};

export const int = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};

export const num = (v: FormDataEntryValue | null) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

export const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true" || v === "1";

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** "## Kitchen\n- item\n- item" ⇄ [{ area, items }] */
export function inclusionsToText(v: Inclusion[]) {
  return v.map((g) => `## ${g.area}\n${g.items.map((i) => `- ${i}`).join("\n")}`).join("\n\n");
}
export function textToInclusions(t: string): Inclusion[] {
  const out: Inclusion[] = [];
  for (const raw of t.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith("## ")) out.push({ area: l.slice(3).trim(), items: [] });
    else if (out.length) out[out.length - 1].items.push(l.replace(/^[-*]\s*/, ""));
  }
  return out.filter((g) => g.area);
}

/** "## Title\ntext" ⇄ [{ title, text }] */
export function stepsToText(v: Step[]) {
  return v.map((s) => `## ${s.title}\n${s.text}`).join("\n\n");
}
export function textToSteps(t: string): Step[] {
  const out: Step[] = [];
  for (const raw of t.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith("## ")) out.push({ title: l.slice(3).trim(), text: "" });
    else if (out.length) out[out.length - 1].text = `${out[out.length - 1].text} ${l}`.trim();
  }
  return out.filter((s) => s.title);
}

/** "Q: …\nA: …" blocks ⇄ [{ q, a }] */
export function faqsToText(v: QA[]) {
  return v.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}
export function textToFaqs(t: string): QA[] {
  const out: QA[] = [];
  let cur: QA | null = null;
  for (const raw of t.split("\n")) {
    const l = raw.trim();
    if (/^Q:/i.test(l)) {
      cur = { q: l.slice(2).trim(), a: "" };
      out.push(cur);
    } else if (/^A:/i.test(l) && cur) cur.a = l.slice(2).trim();
    else if (l && cur) cur.a = `${cur.a} ${l}`.trim();
  }
  return out.filter((f) => f.q && f.a);
}
