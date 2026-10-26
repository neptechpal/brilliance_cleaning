import { after, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { classifyChannel } from "@/lib/attribution";
import { clientIp, clip, deviceFromUa, hashIp, rateLimited } from "@/lib/request";
import { sendLeadNotification } from "@/lib/mail";
import { readSettings } from "@/lib/settings";

const str = (max = 200) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

const LeadSchema = z.object({
  formType: z.enum(["quote", "quick", "contact", "callback"]).default("quote"),
  name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Please enter a valid phone number"),
  email: z.string().trim().max(160).email("Please enter a valid email").optional().or(z.literal("").transform(() => undefined)),
  suburb: str(120),
  postcode: str(10),
  serviceSlug: str(80),
  serviceName: str(120),
  propertyType: str(60),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  bathrooms: z.coerce.number().int().min(0).max(20).optional().catch(undefined),
  preferredDate: str(40),
  frequency: str(40),
  message: str(3000),
  extras: z.array(z.string().max(80)).max(20).optional(),
  // anti-spam
  website: z.string().optional(), // honeypot — must stay empty
  elapsedMs: z.coerce.number().optional(),
  // attribution (sent by the browser)
  attribution: z
    .object({
      pagePath: str(500),
      landingPage: str(500),
      referrer: str(500),
      utmSource: str(),
      utmMedium: str(),
      utmCampaign: str(),
      utmTerm: str(),
      utmContent: str(),
      gclid: str(300),
      fbclid: str(300),
      msclkid: str(300),
      visitorId: str(64),
      firstTouch: z.record(z.string(), z.unknown()).optional(),
    })
    .partial()
    .optional(),
});

const fmtPhone = (p: string) => {
  const d = p.replace(/[^\d+]/g, "");
  if (/^04\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return p.trim();
};

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields", fieldErrors }, { status: 422 });
  }
  const d = parsed.data;
  const ua = req.headers.get("user-agent") || "";
  const ipHash = hashIp(clientIp(req.headers));

  if (rateLimited(`lead:${ipHash}`, 8, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many submissions — please call us instead." }, { status: 429 });
  }

  // Spam is flagged, never silently dropped, so a real enquiry can always be recovered from the Spam tab.
  let spamReason: string | undefined;
  if (d.website) spamReason = "honeypot";
  else if (d.elapsedMs !== undefined && d.elapsedMs < 2500) spamReason = "submitted too fast";
  else if (/(https?:\/\/|www\.)\S+.*(https?:\/\/|www\.)/i.test(d.message || "")) spamReason = "multiple links";
  else if (/\b(casino|crypto|seo services|backlinks|viagra|loan offer)\b/i.test(`${d.message} ${d.name}`)) spamReason = "spam keywords";

  const a = d.attribution || {};
  const ownHost = new URL(req.url).hostname;
  const channel = classifyChannel({ ...a, ownHost });

  const lead = await db.lead.create({
    data: {
      formType: d.formType,
      status: spamReason ? "SPAM" : "NEW",
      spamReason,
      name: d.name,
      phone: fmtPhone(d.phone),
      email: d.email?.toLowerCase(),
      suburb: d.suburb,
      postcode: d.postcode,
      serviceSlug: d.serviceSlug,
      serviceName: d.serviceName,
      propertyType: d.propertyType,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      preferredDate: d.preferredDate,
      frequency: d.frequency,
      message: d.message,
      extras: d.extras?.length ? d.extras : undefined,
      pagePath: a.pagePath,
      landingPage: a.landingPage,
      referrer: a.referrer,
      channel,
      utmSource: a.utmSource,
      utmMedium: a.utmMedium,
      utmCampaign: a.utmCampaign,
      utmTerm: a.utmTerm,
      utmContent: a.utmContent,
      gclid: a.gclid,
      fbclid: a.fbclid,
      msclkid: a.msclkid,
      firstTouch: a.firstTouch ? JSON.parse(JSON.stringify(a.firstTouch).slice(0, 4000)) : undefined,
      visitorId: a.visitorId,
      device: deviceFromUa(ua),
      userAgent: clip(ua, 400),
      ipHash,
    },
  });

  if (!spamReason) {
    // Lead is already stored; email goes out after the response so the visitor never waits on SMTP.
    after(async () => {
      const settings = await readSettings();
      const res = await sendLeadNotification(lead, settings);
      await db.lead.update({ where: { id: lead.id }, data: { emailSent: res.ok, emailError: res.error ?? null } });
    });
  }

  return NextResponse.json({ ok: true, id: lead.id });
}
