import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/** Renders admin-authored markdown. Internal links stay relative; external links open safely. */
export function renderMarkdown(md: string): string {
  const html = marked.parse(md || "", { async: false }) as string;
  return html
    .replace(/<a href="(https?:\/\/(?!brillianceservices\.com\.au)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener nofollow"')
    .replace(/<script[\s\S]*?<\/script>/gi, "");
}

export function wordCount(md: string): number {
  return (md || "")
    .replace(/[#*_>`\-\[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function plainText(md: string, max = 160): string {
  const t = (md || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s\S*$/, "") + "…" : t;
}
