import nodemailer from "nodemailer";

/**
 * Outgoing mail. Prefers the SMTP2GO HTTP API (SMTP2GO_API_KEY) and falls back to plain SMTP (SMTP_HOST).
 * Returns null when neither is configured so callers can log "not configured" instead of failing.
 */
type Address = string | { name: string; address: string };
export type MailMessage = { from: Address; to: string | string[]; replyTo?: string; subject: string; html: string };
export type Mailer = { sendMail(msg: MailMessage): Promise<void> };

export const mailConfigured = () => !!(process.env.SMTP2GO_API_KEY || process.env.SMTP_HOST);

const fmt = (a: Address) => (typeof a === "string" ? a : `${a.name.replace(/[<>"]/g, "")} <${a.address}>`);

function smtp2go(apiKey: string): Mailer {
  const base = (process.env.SMTP2GO_API_URL || "https://api.smtp2go.com/v3/").replace(/\/?$/, "/");
  return {
    async sendMail(m) {
      const res = await fetch(`${base}email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Smtp2go-Api-Key": apiKey },
        body: JSON.stringify({
          sender: fmt(m.from),
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
    },
  };
}

export function mailer(): Mailer | null {
  if (process.env.SMTP2GO_API_KEY) return smtp2go(process.env.SMTP2GO_API_KEY);
  if (!process.env.SMTP_HOST) return null;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return { sendMail: async (m) => void (await t.sendMail(m)) };
}
