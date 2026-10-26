import { after, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { classifyChannel } from "@/lib/attribution";
import { clientIp, clip, deviceFromUa, hashIp, rateLimited } from "@/lib/request";
import { readStaffingSettings } from "@/lib/staffing-settings";
import { estimateBooking } from "@/lib/staffing-estimate";
import { sendBookingEmails } from "@/lib/staffing-mail";
import { addDays, fromSydney, sydneyDate, validDate } from "@/lib/sydney";

const Schema = z.object({
  venue: z.string().trim().min(2, "Please enter the venue name").max(160),
  address: z.string().trim().min(4, "Please enter the venue address").max(300),
  contactName: z.string().trim().min(2, "Please enter a contact name").max(120),
  contactPhone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Please enter a valid phone number"),
  contactEmail: z.string().trim().max(160).email("Please enter a valid email"),
  position: z.string().trim().min(1, "Choose a position").max(60),
  date: z.string().refine(validDate, "Choose a valid date"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose an end time"),
  quantity: z.coerce.number().int().min(1, "At least 1").max(50),
  notes: z.string().trim().max(3000).optional(),
  preferredStaffIds: z.array(z.coerce.number().int()).max(20).optional(),
  accepted: z.literal(true, { error: "Please accept the policies to continue" }),
  website: z.string().optional(),
  elapsedMs: z.coerce.number().optional(),
  attribution: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const ipHash = hashIp(clientIp(req.headers));
  if (rateLimited(`booking:${ipHash}`, 6, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many requests — please call us." }, { status: 429 });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields", fieldErrors }, { status: 422 });
  }
  const d = parsed.data;
  if (d.website || (d.elapsedMs !== undefined && d.elapsedMs < 3000)) return NextResponse.json({ ok: true, id: 0 }); // bot — pretend success

  if (d.date < sydneyDate()) return NextResponse.json({ ok: false, error: "Choose today or a future date", fieldErrors: { date: "Choose today or a future date" } }, { status: 422 });
  try {
    fromSydney(d.date, d.startTime);
    fromSydney(d.endTime <= d.startTime ? addDays(d.date, 1) : d.date, d.endTime);
  } catch {
    return NextResponse.json({ ok: false, error: "A selected time does not exist in Sydney due to daylight saving. Choose another time." }, { status: 422 });
  }
  const settings = await readStaffingSettings();
  const pos = settings.positions.find((p) => p.name === d.position);
  if (!pos) return NextResponse.json({ ok: false, error: "Choose a position", fieldErrors: { position: "Choose a position" } }, { status: 422 });
  const est = estimateBooking({ rate: pos.rate, date: d.date, start: d.startTime, end: d.endTime, quantity: d.quantity, m: settings.multipliers });
  const a = (d.attribution ?? {}) as Record<string, string | undefined>;
  const ua = req.headers.get("user-agent") || "";
  const preferred = settings.allowStaffPreference && d.preferredStaffIds?.length
    ? (await db.staffApplication.findMany({ where: { id: { in: d.preferredStaffIds }, active: true }, select: { id: true } })).map((s) => s.id)
    : [];

  let booking;
  try {
    booking = await db.staffBooking.create({
      data: {
        venue: d.venue,
        address: d.address,
        contactName: d.contactName,
        contactPhone: d.contactPhone,
        contactEmail: d.contactEmail.toLowerCase(),
        position: pos.name,
        rateAud: pos.rate,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        quantity: d.quantity,
        notes: d.notes || null,
        estimateAud: est?.total ?? null,
        preferredStaffIds: preferred,
        acceptedPolicies: true,
        activity: [{ at: new Date().toISOString(), actor: "client", type: "submitted", message: "Booking submitted by client" }],
        pagePath: clip(a.pagePath, 500),
        channel: classifyChannel({ utmSource: clip(a.utmSource), utmMedium: clip(a.utmMedium), gclid: clip(a.gclid), referrer: clip(a.referrer), ownHost: new URL(req.url).hostname }),
        utmSource: clip(a.utmSource),
        utmMedium: clip(a.utmMedium),
        utmCampaign: clip(a.utmCampaign),
        gclid: clip(a.gclid, 300),
        visitorId: clip(a.visitorId, 64),
        device: deviceFromUa(ua),
        ipHash,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "We couldn't save your booking. Please try again or call us." }, { status: 500 });
  }
  after(() => sendBookingEmails(booking.id));
  return NextResponse.json({ ok: true, id: booking.id });
}
