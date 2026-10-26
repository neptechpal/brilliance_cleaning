import { createHash } from "node:crypto";

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "0.0.0.0";
}

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${process.env.IP_SALT || "brilliance"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function deviceFromUa(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(ua: string): boolean {
  return !ua || /bot|crawl|spider|slurp|preview|lighthouse|headless|curl|wget|python|axios|node-fetch|facebookexternalhit|bingpreview/i.test(ua);
}

// Small in-memory sliding window limiter (single-process deployment).
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return arr.length > max;
}

export function clip(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}
