import { after, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { classifyChannel } from "@/lib/attribution";
import { clientIp, clip, deviceFromUa, hashIp, rateLimited } from "@/lib/request";
import { readSettings } from "@/lib/settings";
import { sendApplicationNotification } from "@/lib/mail";
import { deleteUpload, saveUpload, sniff } from "@/lib/storage";
import {
  DAY_PARTS,
  DAYS,
  EMPLOYMENT_TYPES,
  MAX_CERTS,
  MAX_DOC,
  MAX_PHOTO,
  MAX_TOTAL,
  QUALIFICATIONS,
  ROLES,
  SHIFT_TYPES,
  WORK_RIGHTS,
} from "@/lib/staffing";

const opt = (max = 200) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const AVAIL = new Set(DAYS.flatMap((d) => DAY_PARTS.map((p) => `${d}:${p}`)));

const Schema = z.object({
  firstName: z.string().trim().min(1, "Required").max(80),
  lastName: z.string().trim().min(1, "Required").max(80),
  email: z.string().trim().max(160).email("Please enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Please enter a valid phone number"),
  experience: z.string().trim().min(3, "Please describe your experience").max(3000),
  roles: z.array(z.enum(ROLES)).max(4),
  expertise: z.array(z.string().trim().min(1).max(40)).min(1, "Add at least one area of expertise").max(25),
  qualifications: z.array(z.string()).max(20).transform((a) => a.filter((q) => QUALIFICATIONS.includes(q))),
  workRights: opt().refine((v) => !v || WORK_RIGHTS.includes(v), "Invalid option"),
  employmentType: z.array(z.string()).max(2).transform((a) => a.filter((x) => EMPLOYMENT_TYPES.includes(x))),
  locations: z.string().trim().min(2, "Please list your preferred areas").max(300),
  languages: opt(200),
  linkedinUrl: opt(300).refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Please enter a full URL starting with https://"),
  shiftTypes: z.array(z.string()).max(4).transform((a) => a.filter((x) => SHIFT_TYPES.includes(x))),
  ownTransport: z.boolean().default(false),
  availability: z.array(z.string()).max(21).transform((a) => a.filter((x) => AVAIL.has(x))),
  referee1: opt(200),
  referee2: opt(200),
  emergencyName: opt(120),
  emergencyPhone: opt(30),
  consent: z.literal(true, { error: "Please agree to the Privacy & Consent terms" }),
  signature: z.string().trim().min(3, "Type your full name to sign").max(120),
  website: z.string().optional(),
  elapsedMs: z.coerce.number().optional(),
  attribution: z.record(z.string(), z.unknown()).optional(),
});

function jsonField(fd: FormData, key: string) {
  try {
    return JSON.parse(String(fd.get(key) ?? "null"));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const ipHash = hashIp(clientIp(req.headers));
  if (rateLimited(`apply:${ipHash}`, 5, 30 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many submissions — please try again later." }, { status: 429 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Upload too large or invalid. Keep files under 8 MB each." }, { status: 400 });
  }

  const parsed = Schema.safeParse(jsonField(fd, "data"));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields", fieldErrors }, { status: 422 });
  }
  const d = parsed.data;

  // ── files: validate everything before writing anything ──
  const photo = fd.get("photo");
  const resume = fd.get("resume");
  const certs = fd.getAll("certificates").filter((f): f is File => f instanceof File && f.size > 0);
  const files: { kind: string; file: File; max: number; allowed: string[] }[] = [];
  if (photo instanceof File && photo.size > 0) files.push({ kind: "photo", file: photo, max: MAX_PHOTO, allowed: ["image/jpeg", "image/png", "image/webp"] });
  if (resume instanceof File && resume.size > 0) files.push({ kind: "resume", file: resume, max: MAX_DOC, allowed: ["application/pdf"] });
  if (certs.length > MAX_CERTS) return NextResponse.json({ ok: false, error: `Up to ${MAX_CERTS} certificates please`, fieldErrors: { certificates: `Up to ${MAX_CERTS} files` } }, { status: 422 });
  for (const c of certs) files.push({ kind: "certificate", file: c, max: MAX_DOC, allowed: ["application/pdf", "image/jpeg", "image/png", "image/webp"] });

  const total = files.reduce((a, f) => a + f.file.size, 0);
  if (total > MAX_TOTAL) return NextResponse.json({ ok: false, error: "Files are too large in total (max 30 MB)." }, { status: 413 });

  const prepared: { kind: string; originalName: string; buf: Buffer; mime: string; ext: string }[] = [];
  for (const f of files) {
    const field = f.kind === "certificate" ? "certificates" : f.kind;
    if (f.file.size > f.max) {
      return NextResponse.json({ ok: false, error: "A file is too large", fieldErrors: { [field]: `Max ${Math.round(f.max / 1024 / 1024)} MB per file` } }, { status: 422 });
    }
    const buf = Buffer.from(await f.file.arrayBuffer());
    const type = sniff(buf, f.allowed);
    if (!type) {
      const want = f.kind === "resume" ? "PDF" : f.kind === "photo" ? "JPG, PNG or WebP" : "PDF, JPG or PNG";
      return NextResponse.json({ ok: false, error: "Unsupported file type", fieldErrors: { [field]: `Please upload ${want}` } }, { status: 422 });
    }
    prepared.push({ kind: f.kind, originalName: f.file.name.slice(0, 200), buf, mime: type.mime, ext: type.ext });
  }

  let spamReason: string | undefined;
  if (d.website) spamReason = "honeypot";
  else if (d.elapsedMs !== undefined && d.elapsedMs < 4000) spamReason = "submitted too fast";

  const a = (d.attribution ?? {}) as Record<string, string | undefined>;
  const ua = req.headers.get("user-agent") || "";
  const stored: string[] = [];
  try {
    const saved = [];
    for (const p of prepared) {
      const storedName = await saveUpload(p.buf, p.ext);
      stored.push(storedName);
      saved.push({ kind: p.kind, originalName: p.originalName, mime: p.mime, size: p.buf.length, storedName });
    }
    const appRow = await db.staffApplication.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email.toLowerCase(),
        phone: d.phone,
        experience: d.experience,
        roles: d.roles,
        expertise: [...new Set(d.expertise)],
        qualifications: d.qualifications,
        workRights: d.workRights,
        employmentType: d.employmentType,
        locations: d.locations,
        languages: d.languages,
        linkedinUrl: d.linkedinUrl,
        shiftTypes: d.shiftTypes,
        ownTransport: d.ownTransport,
        availability: d.availability,
        referee1: d.referee1,
        referee2: d.referee2,
        emergencyName: d.emergencyName,
        emergencyPhone: d.emergencyPhone,
        consent: d.consent,
        signature: d.signature,
        status: spamReason ? "ARCHIVED" : "NEW",
        spamReason,
        pagePath: clip(a.pagePath, 500),
        referrer: clip(a.referrer, 500),
        channel: classifyChannel({ utmSource: clip(a.utmSource), utmMedium: clip(a.utmMedium), gclid: clip(a.gclid), referrer: clip(a.referrer), ownHost: new URL(req.url).hostname }),
        utmSource: clip(a.utmSource),
        utmMedium: clip(a.utmMedium),
        utmCampaign: clip(a.utmCampaign),
        visitorId: clip(a.visitorId, 64),
        device: deviceFromUa(ua),
        userAgent: clip(ua, 400),
        ipHash,
        files: { create: saved },
      },
    });

    if (!spamReason) {
      after(async () => {
        const res = await sendApplicationNotification(appRow, await readSettings());
        await db.staffApplication.update({ where: { id: appRow.id }, data: { emailSent: res.ok, emailError: res.error ?? null } });
      });
    }
    return NextResponse.json({ ok: true, id: appRow.id });
  } catch (e) {
    await Promise.all(stored.map(deleteUpload));
    console.error("application save failed", e);
    return NextResponse.json({ ok: false, error: "We couldn't save your application. Please try again or call us." }, { status: 500 });
  }
}
