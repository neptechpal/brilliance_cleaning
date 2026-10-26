"use client";

import { marked } from "marked";
import { useState } from "react";

export function MarkdownField({ name, label, defaultValue = "", rows = 22, hint }: { name: string; label: string; defaultValue?: string; rows?: number; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const words = value.split(/\s+/).filter(Boolean).length;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-soft">{words} words</span>
          <div className="flex rounded-md bg-sand p-0.5 text-xs font-semibold">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded px-2 py-1 capitalize ${tab === t ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${tab === "preview" ? "hidden" : ""}`}
      />
      {tab === "preview" && (
        <div className="prose-content max-h-[40rem] overflow-y-auto rounded-lg border border-line bg-white p-5 text-[0.95rem]" dangerouslySetInnerHTML={{ __html: marked.parse(value, { async: false }) as string }} />
      )}
      <p className="mt-1 text-xs text-ink-soft">{hint ?? "Markdown: ## heading, ### subheading, - bullet, **bold**, [link text](/services/house-cleaning)."}</p>
    </div>
  );
}
