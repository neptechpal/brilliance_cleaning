// Shared between browser and server: classify where a visit came from.

export type Touch = {
  channel: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  landingPage?: string;
  referrer?: string;
  at?: string;
};

const SEARCH_ENGINES: Record<string, string> = {
  google: "google",
  bing: "bing",
  yahoo: "yahoo",
  duckduckgo: "duckduckgo",
  ecosia: "ecosia",
  baidu: "baidu",
  yandex: "yandex",
};

const SOCIAL = ["facebook", "instagram", "fb.", "t.co", "twitter", "x.com", "linkedin", "tiktok", "pinterest", "youtube", "reddit"];
const AI = ["chatgpt", "openai", "perplexity", "copilot", "gemini", "claude.ai"];

export function classifyChannel(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  msclkid?: string | null;
  referrer?: string | null;
  ownHost?: string;
}): string {
  const src = (input.utmSource || "").toLowerCase();
  const med = (input.utmMedium || "").toLowerCase();
  if (input.gclid || (src.includes("google") && /cpc|ppc|paid/.test(med))) return "google-ads";
  if (input.msclkid || (src.includes("bing") && /cpc|ppc|paid/.test(med))) return "bing-ads";
  if (input.fbclid || /facebook|instagram|meta/.test(src)) return /cpc|paid/.test(med) ? "meta-ads" : "social";
  if (src === "gbp" || src.includes("business") || med === "gbp") return "google-business";
  if (med === "email" || src.includes("newsletter")) return "email";
  if (src) return med ? `${src}/${med}` : src;

  const ref = (input.referrer || "").toLowerCase();
  if (!ref) return "direct";
  let host = "";
  try {
    host = new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return "direct";
  }
  if (input.ownHost && host === input.ownHost.replace(/^www\./, "")) return "internal";
  for (const [key, name] of Object.entries(SEARCH_ENGINES)) if (host.includes(key)) return `${name}-organic`;
  if (AI.some((a) => host.includes(a))) return "ai-search";
  if (SOCIAL.some((s) => host.includes(s))) return "social";
  return "referral";
}

export const CHANNEL_LABELS: Record<string, string> = {
  "google-organic": "Google organic",
  "bing-organic": "Bing organic",
  "google-ads": "Google Ads",
  "bing-ads": "Bing Ads",
  "meta-ads": "Meta Ads",
  "google-business": "Google Business Profile",
  "ai-search": "AI search (ChatGPT etc.)",
  social: "Social",
  referral: "Referral",
  direct: "Direct",
  email: "Email",
  internal: "Internal",
};

export function channelLabel(c?: string | null) {
  if (!c) return "Unknown";
  return CHANNEL_LABELS[c] ?? c;
}
