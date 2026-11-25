import nodemailer from "nodemailer";
import { db } from "./db";

/**
 * Outgoing mail. Config comes from Admin → Settings → Email sending (stored server-side only, in the
 * "mail" Setting row — never in SiteSettings, which is passed to public pages). Server .env values
 * (SMTP2GO_API_KEY / SMTP_* / MAIL_FROM) are used as a fallback.
 * Prefers the SMTP2GO HTTP API; falls back to plain SMTP. mailer() returns null when neither is set.
 */
export const MAIL_KEY = "mail";
export type MailSettings = { smtp2goApiKey: string; fromEmail: string; fromName: string };

type Address = string | { name: string; address: string };
export type MailMessage = { from?: Address; to: string | string[]; replyTo?: string; subject: string; html: string };
export type Mailer = { from: { name: string; address: string }; via: string; sendMail(msg: MailMessage): Promise<void> };

const DEFAULT_FROM = { name: "Brilliance Cleaning", address: "no-reply@brillianceservices.com.au" };

export async function readMailSettings(): Promise<MailSettings> {
  const row = await db.setting.findUnique({ where: { key: MAIL_KEY } });
  const v = (row?.value && typeof row.value === "object" ? row.value : {}) as Partial<MailSettings>;
  return { smtp2goApiKey: String(v.smtp2goApiKey ?? ""), fromEmail: String(v.fromEmail ?? ""), fromName: String(v.fromName ?? "") };
}

function envFrom() {
  const f = process.env.MAIL_FROM?.trim();
  if (!f) return null;
  const m = f.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: "", address: f };
}

const fmt = (a: Address) => (typeof a === "string" ? a : a.name ? `${a.name.replace(/[<>"]/g, "")} <${a.address}>` : a.address);

function smtp2go(apiKey: string): Mailer["sendMail"] {
  const base = (process.env.SMTP2GO_API_URL || "https://api.smtp2go.com/v3/").replace(/\/?$/, "/");
  return async (m) => {
    const res = await fetch(`${base}email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Smtp2go-Api-Key": apiKey },
      body: JSON.stringify({
        sender: fmt(m.from!),
        to: Array.isArray(m.to) ? m.to : [m.to],
        subject: m.subject,
        html_body: m.html,
        ...(m.replyTo ? { custom_headers: [{ header: "Reply-To", value: m.replyTo }] } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { succeeded?: number; failed?: number; failures?: unknown[]; error?: string } } | null;
    const d = json?.data;
    if (!res.ok || !d || d.error || !d.succeeded || d.failed) {
      throw new Error(`SMTP2GO ${res.status}: ${d?.error ?? JSON.stringify(d?.failures ?? json ?? "no response").slice(0, 200)}`);
    }
  };
}

export async function mailer(): Promise<Mailer | null> {
  const s = await readMailSettings().catch(() => null);
  const env = envFrom();
  const from = {
    name: s?.fromName || env?.name || DEFAULT_FROM.name,
    address: s?.fromEmail || env?.address || DEFAULT_FROM.address,
  };
  const apiKey = s?.smtp2goApiKey || process.env.SMTP2GO_API_KEY;
  let send: Mailer["sendMail"];
  let via: string;
  if (apiKey) {
    send = smtp2go(apiKey);
    via = "SMTP2GO";
  } else if (process.env.SMTP_HOST) {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    send = async (m) => void (await t.sendMail({ ...m, from: fmt(m.from!) }));
    via = "SMTP";
  } else return null;
  return { from, via, sendMail: (m) => send({ ...m, from: m.from ?? from }) };
}

export async function mailConfigured() {
  return !!(await mailer());
}
