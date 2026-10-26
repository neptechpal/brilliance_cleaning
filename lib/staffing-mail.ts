import nodemailer from "nodemailer";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { SITE_URL } from "./seo";
import { readSettings } from "./settings";
import { fillBookingTemplate, readStaffingSettings } from "./staffing-settings";
import { fmtDay } from "./sydney";

type Activity = { at: string; actor: string; type: string; message: string };

function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const asHtml = (body: string) => `<div style="font-family:Arial,sans-serif;max-width:600px;white-space:pre-wrap;line-height:1.5">${esc(body)}</div>`;

export async function logActivity(id: number, entry: Omit<Activity, "at">) {
  const b = await db.staffBooking.findUnique({ where: { id }, select: { activity: true } });
  const list = (Array.isArray(b?.activity) ? b!.activity : []) as Activity[];
  await db.staffBooking.update({ where: { id }, data: { activity: [...list, { at: new Date().toISOString(), ...entry }] as unknown as Prisma.InputJsonValue } });
}

function vars(b: Awaited<ReturnType<typeof db.staffBooking.findUniqueOrThrow>>, siteName: string) {
  return {
    VENUE: b.venue,
    ADDRESS: b.address,
    CONTACT_NAME: b.contactName,
    CONTACT_EMAIL: b.contactEmail,
    CONTACT_PHONE: b.contactPhone,
    POSITION: b.position,
    DATE: fmtDay(b.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    START_TIME: b.startTime,
    END_TIME: b.endTime,
    QUANTITY: b.quantity,
    NOTES: b.notes,
    SITE_NAME: siteName,
  };
}

/** New booking: notify the office and acknowledge the client. Never throws. */
export async function sendBookingEmails(id: number) {
  try {
    const t = transport();
    if (!t) return logActivity(id, { actor: "system", type: "email", message: "Emails not sent — SMTP not configured" });
    const [b, s, site] = await Promise.all([db.staffBooking.findUniqueOrThrow({ where: { id } }), readStaffingSettings(), readSettings()]);
    const v = vars(b, site.businessName);
    const from = process.env.MAIL_FROM || "Brilliance Website <no-reply@brillianceservices.com.au>";
    const office = [s.notifyEmail, ...site.notifyEmails.split(",")].map((x) => x.trim()).filter(Boolean);
    await t.sendMail({
      from,
      to: [...new Set(office)],
      replyTo: b.contactEmail,
      subject: `New staff booking: ${b.quantity} × ${b.position} at ${b.venue} (${b.date})`,
      html: asHtml(
        `New hospitality staffing request #${b.id}\n\nVenue: ${b.venue}\nAddress: ${b.address}\nPosition: ${b.quantity} × ${b.position}\nDate: ${v.DATE}\nTime: ${b.startTime}–${b.endTime}\nContact: ${b.contactName} · ${b.contactPhone} · ${b.contactEmail}\nEstimate: ${b.estimateAud ? `$${b.estimateAud.toFixed(2)} ex GST` : "—"}\nNotes: ${b.notes ?? "—"}\n\nOpen in admin: ${SITE_URL}/admin/staffing/bookings/${b.id}`,
      ),
    });
    await logActivity(id, { actor: "system", type: "email", message: `Office notified (${office.join(", ")})` });
    await t.sendMail({
      from: `${s.confirmFromName} <${(from.match(/<(.+)>/) ?? [])[1] ?? from}>`,
      to: b.contactEmail,
      replyTo: s.notifyEmail || site.email,
      subject: fillBookingTemplate(s.ackSubject, v),
      html: asHtml(fillBookingTemplate(s.ackBody, v)),
    });
    await logActivity(id, { actor: "client", type: "email", message: "Client acknowledgement sent" });
  } catch (e) {
    await logActivity(id, { actor: "system", type: "error", message: `Email failed: ${e instanceof Error ? e.message.slice(0, 200) : "unknown"}` }).catch(() => {});
  }
}

/** Sends a template or custom email to the booking contact and logs it. */
export async function sendBookingMail(id: number, opts: { kind: "confirmation" } | { kind: "custom"; to: string; subject: string; body: string }, actor: string) {
  const t = transport();
  if (!t) return { ok: false, error: "SMTP isn't configured on the server yet." };
  const [b, s, site] = await Promise.all([db.staffBooking.findUniqueOrThrow({ where: { id } }), readStaffingSettings(), readSettings()]);
  const v = vars(b, site.businessName);
  const fromAddr = ((process.env.MAIL_FROM || "").match(/<(.+)>/) ?? [])[1] ?? "no-reply@brillianceservices.com.au";
  const msg =
    opts.kind === "confirmation"
      ? { to: b.contactEmail, subject: fillBookingTemplate(s.confirmSubject, v), body: fillBookingTemplate(s.confirmBody, v) }
      : { to: opts.to, subject: opts.subject, body: opts.body };
  try {
    await t.sendMail({ from: `${s.confirmFromName} <${fromAddr}>`, to: msg.to, replyTo: s.notifyEmail || site.email, subject: msg.subject, html: asHtml(msg.body) });
    await logActivity(id, { actor, type: "email", message: `${opts.kind === "confirmation" ? "Confirmation" : "Email"} sent to ${msg.to}: ${msg.subject}` });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message.slice(0, 200) : "send failed";
    await logActivity(id, { actor: "system", type: "error", message: `Email to ${msg.to} failed: ${err}` });
    return { ok: false, error: err };
  }
}
