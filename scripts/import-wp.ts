/**
 * Create-only WordPress migration. Run from the app directory:
 *   WP_EXPORT_DIR=/private/path/to/export npx tsx scripts/import-wp.ts
 * Export JSON and temp-passwords.txt must stay outside the repository.
 * Existing legacy rows are never updated; failed photos are reported, not retried
 * on subsequent runs once their StaffApplication has been imported.
 */
import { constants } from "node:fs";
import { open, readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { randomInt } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { Prisma, type CostCentre, type Employee, type Shift } from "@prisma/client";
import { z } from "zod";
import { distanceMeters, geocode } from "../lib/geo";
import { fromSydneyString } from "../lib/sydney";
import { MAX_PHOTO } from "../lib/staffing";

// Load before importing modules that capture DATABASE_URL or STORAGE_DIR.
loadEnvConfig(process.cwd());

const DEFAULT_EXPORT_DIR = "/Volumes/TRANSCEND/clients/Brilliance Cleaning servoces/wp-export";
// Same palette as app/admin/actions/roster.ts (do not import server actions into a CLI).
const PALETTE = ["#2d5be3", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#0b7a5f", "#f05152"];
const ADMIN_EMAIL = "legacy-admin-test@brillianceservices.com.au";
const ADMIN_NAMES = new Set(["", "mahesh sapkota", "sulove3939"]);
const id = z.coerce.number().int().positive();
const text = z.string();
const optionalText = text.nullish();
const date = text.regex(/^\d{4}-\d{2}-\d{2}$/);
const time = text.regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timestamp = text.regex(/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/);
const list = z.union([text, z.array(text)]).transform((v) =>
  (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean));
const exportSchema = z.object({
  costCentres: z.array(z.object({
    ccId: id, name: text.min(1), address: text, contact_name: optionalText,
    contact_phone: optionalText, notes: optionalText, radius: z.number().int().nonnegative(),
  })),
  employees: z.array(z.object({
    empId: id, name: text.trim().min(1), email: text.trim().min(1), phone: text,
    address: optionalText, emergency_name: optionalText, emergency_phone: optionalText,
    comments: optionalText, cost_centre: optionalText,
  })),
  shifts: z.array(z.tuple([id, id, text, optionalText, date, time, time])),
  hosStaff: z.array(z.object({
    id, name: text.trim().min(1), email: optionalText, phone: optionalText,
    experience: text, roles: list, expertise: list, areas: text, active: z.boolean(),
    source: z.enum(["form", "admin"]), created: timestamp, photo: optionalText,
  })),
  hosBookings: z.array(z.object({
    id, created: timestamp, venue: text, address: text, contactName: text,
    contactPhone: text, contactEmail: text, position: text, date, start: time,
    end: time, quantity: z.number().int().positive(), notes: optionalText,
    activity: z.array(z.object({ at: text, actor: text, type: text, message: text }).passthrough()),
  })),
});
const attendanceSchema = z.array(z.tuple([
  id, text, text, id.nullable(), timestamp.nullable(), timestamp.nullable(), text, text,
  optionalText, z.number().min(-90).max(90).nullable(), z.number().min(-180).max(180).nullable(),
  optionalText, z.number().min(-90).max(90).nullable(), z.number().min(-180).max(180).nullable(),
  z.enum(["Pending", "Approved"]), z.union([z.literal(0), z.literal(1)]),
]));

const summary = {
  CostCentre: { created: 0, skipped: 0 },
  Employee: { created: 0, skipped: 0 },
  Shift: { created: 0, skipped: 0 },
  Attendance: { created: 0, skipped: 0 },
  StaffApplication: { created: 0, skipped: 0 },
  ApplicantFile: { created: 0, skipped: 0 },
  StaffBooking: { created: 0, skipped: 0 },
};
const warnings: string[] = [];
function warn(message: string) {
  warnings.push(message);
  console.warn(`Warning: ${message}`);
}
const nullable = (s?: string | null) => s?.trim() || null;
const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
function splitName(name: string) {
  const words = name.trim().split(/\s+/);
  return { firstName: words.length > 1 ? words.slice(0, -1).join(" ") : words[0], lastName: words.length > 1 ? words.at(-1)! : "" };
}
function address(s?: string | null) {
  return s && !["—", "location not available"].includes(key(s)) ? nullable(s) : null;
}
function distance(lat: number | null, lng: number | null, site?: { lat: number | null; lng: number | null }) {
  return lat != null && lng != null && site?.lat != null && site.lng != null
    ? distanceMeters(lat, lng, site.lat, site.lng) : null;
}
function unique<T>(rows: T[], getKey: (row: T) => string | number, label: string) {
  if (new Set(rows.map(getKey)).size !== rows.length) throw new Error(`Duplicate ${label} in export; resolve before importing.`);
}
function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function main() {
  const exportDir = await realpath(resolve(process.env.WP_EXPORT_DIR || DEFAULT_EXPORT_DIR));
  const withinRepo = relative(await realpath(process.cwd()), exportDir);
  if (!withinRepo || (!isAbsolute(withinRepo) && withinRepo !== ".." && !withinRepo.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))) {
    throw new Error("WP_EXPORT_DIR must be outside the app repository.");
  }
  const [part1, part2] = await Promise.all([
    readFile(join(exportDir, "part1.json"), "utf8"),
    readFile(join(exportDir, "part2-attendance.json"), "utf8"),
  ]);
  // Validate both complete exports before writing any database records.
  const data = exportSchema.parse(JSON.parse(part1));
  const attendance = attendanceSchema.parse(JSON.parse(part2));
  unique(data.costCentres, (r) => r.ccId, "cost-centre IDs");
  unique(data.costCentres, (r) => key(r.name), "cost-centre names");
  unique(data.employees, (r) => r.empId, "employee IDs");
  unique(data.employees, (r) => key(r.name), "employee names");
  unique(data.employees, (r) => r.email.toLowerCase(), "employee emails");
  unique(data.shifts, (r) => r[0], "shift IDs");
  unique(attendance, (r) => r[0], "attendance IDs");
  unique(data.hosStaff, (r) => r.id, "staff IDs");
  unique(data.hosBookings, (r) => r.id, "booking IDs");

  const { db } = await import("../lib/db");
  const { DEFAULT_STAFFING } = await import("../lib/staffing-settings");
  const { sniff, saveUpload, deleteUpload } = await import("../lib/storage");
  let passwords: Awaited<ReturnType<typeof open>> | undefined;
  try {
    await db.$connect();
    const target = new URL(process.env.DATABASE_URL!);
    console.log(`Import target: ${target.hostname}${target.pathname}`);
    const sites = new Map<string, CostCentre>();
    let geocoded = false;
    for (const row of data.costCentres) {
      let site = await db.costCentre.findUnique({ where: { legacyId: row.ccId } });
      if (site) summary.CostCentre.skipped++;
      else {
        if (geocoded) await wait(1100);
        const point = await geocode(row.address);
        geocoded = true;
        if (!point) warn(`CostCentre legacyId=${row.ccId}: geocode failed; lat/lng left null.`);
        site = await db.costCentre.create({ data: {
          legacyId: row.ccId, name: row.name, address: nullable(row.address),
          contactName: nullable(row.contact_name), contactPhone: nullable(row.contact_phone),
          notes: nullable(row.notes), geofenceRadius: row.radius,
          lat: point?.lat ?? null, lng: point?.lng ?? null,
        } });
        summary.CostCentre.created++;
      }
      sites.set(key(row.name), site);
    }

    const employees = new Map<number, Employee>();
    const employeesByName = new Map<string, Employee>();
    for (const [index, row] of data.employees.entries()) {
      let employee = await db.employee.findUnique({ where: { legacyEmpId: row.empId } });
      if (employee) summary.Employee.skipped++;
      else {
        const site = sites.get(key(row.cost_centre ?? ""));
        if (row.cost_centre && !site) warn(`Employee legacyEmpId=${row.empId}: unmatched cost-centre name.`);
        // Open only when creating employees. Never print passwords or rewrite on reruns.
        if (!passwords) {
          passwords = await open(join(exportDir, "temp-passwords.txt"), constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
          await passwords.chmod(0o600);
        }
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        const password = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
        const passwordHash = await bcrypt.hash(password, 12);
        // A credential write failure rolls back this employee instead of leaving a
        // portal account whose initial password was never recorded for the office.
        employee = await db.$transaction(async (tx) => {
          const created = await tx.employee.create({ data: {
            ...splitName(row.name), legacyEmpId: row.empId, email: row.email.toLowerCase(),
            phone: row.phone, address: nullable(row.address), emergencyName: nullable(row.emergency_name),
            emergencyPhone: nullable(row.emergency_phone), comments: nullable(row.comments),
            costCentreId: site?.id ?? null, active: true, color: PALETTE[index % PALETTE.length],
            passwordHash, mustSetPassword: true,
          } });
          await passwords!.writeFile([row.name, created.email, password].map(csvCell).join(", ") + "\n");
          await passwords!.sync();
          return created;
        });
        summary.Employee.created++;
      }
      employees.set(row.empId, employee);
      employeesByName.set(key(row.name), employee);
    }
    let admin: Employee | null = null;
    if (attendance.some((r) => ADMIN_NAMES.has(key(r[2])))) {
      admin = await db.employee.findUnique({ where: { email: ADMIN_EMAIL } });
      if (admin) {
        if (admin.active || admin.passwordHash) throw new Error("Legacy admin/test email belongs to an enabled account; resolve before importing.");
        summary.Employee.skipped++;
      } else {
        admin = await db.employee.create({ data: {
          firstName: "Legacy", lastName: "Admin-Test", email: ADMIN_EMAIL,
          phone: "-", active: false, passwordHash: null, mustSetPassword: false,
        } });
        summary.Employee.created++;
      }
    }

    const attendedShifts = new Set(attendance.map((r) => r[3]));
    const shifts = new Map<number, Shift>();
    for (const [legacyId, empId, siteName, siteAddress, date, startTime, endTime] of data.shifts) {
      let shift = await db.shift.findUnique({ where: { legacyId } });
      if (shift) summary.Shift.skipped++;
      else {
        const employee = employees.get(empId);
        if (!employee) throw new Error(`Shift legacyId=${legacyId}: unmatched employee legacyEmpId=${empId}.`);
        const site = sites.get(key(siteName));
        if (!site) warn(`Shift legacyId=${legacyId}: unmatched cost-centre name; site link/coordinates left null.`);
        shift = await db.shift.create({ data: {
          legacyId, employeeId: employee.id, costCentreId: site?.id ?? null, siteName,
          siteAddress: nullable(siteAddress) ?? site?.address ?? null,
          siteLat: site?.lat ?? null, siteLng: site?.lng ?? null, date, startTime, endTime,
          status: attendedShifts.has(legacyId) ? "COMPLETED" : "SCHEDULED",
        } });
        summary.Shift.created++;
      }
      shifts.set(legacyId, shift);
    }
    for (const [legacyId, , name, shiftId, signIn, signOut, notes, siteName, inAddr, inLat, inLng, outAddr, outLat, outLng, status, paid] of attendance) {
      if (await db.attendance.findUnique({ where: { legacyId } })) {
        summary.Attendance.skipped++;
        continue;
      }
      const employee = ADMIN_NAMES.has(key(name)) ? admin : employeesByName.get(key(name));
      if (!employee) throw new Error(`Attendance legacyId=${legacyId}: unmatched employee name (see the private export).`);
      const shift = shiftId == null ? undefined : shifts.get(shiftId);
      if (shiftId != null && !shift) warn(`Attendance legacyId=${legacyId}: missing shift legacyId=${shiftId}; shift link left null.`);
      const site = shift ? { lat: shift.siteLat, lng: shift.siteLng } : sites.get(key(siteName));
      await db.attendance.create({ data: {
        legacyId, employeeId: employee.id, shiftId: shift?.id ?? null,
        signInAt: fromSydneyString(signIn), signOutAt: fromSydneyString(signOut),
        signInLat: inLat, signInLng: inLng, signOutLat: outLat, signOutLng: outLng,
        signInAddress: address(inAddr), signOutAddress: address(outAddr),
        signInDistance: distance(inLat, inLng, site), signOutDistance: distance(outLat, outLng, site),
        notes: nullable(notes), status: status === "Approved" ? "APPROVED" : "PENDING", paid: paid === 1,
      } });
      summary.Attendance.created++;
    }

    for (const row of data.hosStaff) {
      const photoUrl = row.photo && /^https?:\/\//i.test(row.photo) ? row.photo : null;
      if (await db.staffApplication.findUnique({ where: { legacyId: row.id } })) {
        summary.StaffApplication.skipped++;
        if (photoUrl) summary.ApplicantFile.skipped++;
        continue;
      }
      const application = await db.staffApplication.create({ data: {
        legacyId: row.id, ...splitName(row.name), email: nullable(row.email)?.toLowerCase() ?? null,
        phone: nullable(row.phone), experience: row.experience, roles: row.roles, expertise: row.expertise,
        locations: row.areas, active: row.active, source: row.source, signature: row.name,
        consent: true, status: "APPROVED", createdAt: fromSydneyString(row.created)!,
        qualifications: [], employmentType: [], shiftTypes: [], availability: [],
      } });
      summary.StaffApplication.created++;
      if (photoUrl) {
        let storedName: string | undefined;
        try {
          const response = await fetch(photoUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
            signal: AbortSignal.timeout(30_000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length > MAX_PHOTO) throw new Error("photo exceeds 5 MB limit");
          const type = sniff(buffer, ["image/jpeg", "image/png", "image/webp"]);
          if (!type) throw new Error("unrecognised photo bytes");
          storedName = await saveUpload(buffer, type.ext);
          await db.applicantFile.create({ data: {
            applicationId: application.id, kind: "photo", originalName: basename(new URL(photoUrl).pathname) || `photo.${type.ext}`,
            mime: type.mime, size: buffer.length, storedName,
          } });
          summary.ApplicantFile.created++;
        } catch (error) {
          if (storedName) await deleteUpload(storedName);
          // Never include Prisma error contents (which can contain personal data).
          const reason = error instanceof Prisma.PrismaClientKnownRequestError ? `database ${error.code}`
            : error instanceof Error && /^(HTTP \d+|photo exceeds|unrecognised photo)/.test(error.message) ? error.message : "download or storage failed";
          warn(`StaffApplication legacyId=${row.id}: photo failed (${reason}); profile retained without photo.`);
          summary.ApplicantFile.skipped++;
        }
      }
    }
    for (const row of data.hosBookings) {
      if (await db.staffBooking.findUnique({ where: { legacyId: row.id } })) {
        summary.StaffBooking.skipped++;
        continue;
      }
      const position = DEFAULT_STAFFING.positions.find((p) => key(p.name) === key(row.position));
      if (!position) warn(`StaffBooking legacyId=${row.id}: unmatched position; rateAud left null.`);
      await db.staffBooking.create({ data: {
        legacyId: row.id, createdAt: fromSydneyString(row.created)!, status: "COMPLETED",
        venue: row.venue, address: row.address, contactName: row.contactName, contactPhone: row.contactPhone,
        contactEmail: row.contactEmail, position: row.position, rateAud: position?.rate ?? null,
        date: row.date, startTime: row.start, endTime: row.end, quantity: row.quantity,
        notes: nullable(row.notes), acceptedPolicies: true, activity: row.activity as Prisma.InputJsonValue,
        preferredStaffIds: [], assignedStaffIds: [],
      } });
      summary.StaffBooking.created++;
    }
  } finally {
    await passwords?.close();
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.exitCode = 1;
  if (error instanceof z.ZodError) {
    warn(`Invalid export fields: ${error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    warn(`Import stopped: database error ${error.code}. Existing imports are preserved; resolve the conflict and rerun.`);
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    warn("Import stopped: database connection failed; check DATABASE_URL and database availability.");
  } else {
    warn(`Import stopped: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}).finally(() => {
  console.table(summary);
  console.log(`Warnings: ${warnings.length}${warnings.length ? " (listed above)" : ""}`);
});
