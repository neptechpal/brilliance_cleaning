"use server";

import { BookingStatus } from "@prisma/client";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity, sendBookingMail } from "@/lib/staffing-mail";
import { STAFFING_KEY } from "@/lib/staffing-settings";
import type { ActionResult } from "@/components/admin/ActionForm";

const idSchema = z.coerce.number().int().positive();
const subject = z.string().trim().min(1).max(200).refine((s) => !/[\r\n]/.test(s), "Use a single line for the subject");
const body = z.string().trim().min(1).max(20000);

export async function updateBooking(_state: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: idSchema, status: z.enum(BookingStatus), assignedStaffIds: z.array(idSchema).max(50) }).safeParse({
    id: fd.get("id"), status: fd.get("status"), assignedStaffIds: fd.getAll("assignedStaffIds"),
  });
  if (!parsed.success) return { error: "Check the status and staff selection." };
  const { id, status, assignedStaffIds } = parsed.data;
  const ids = [...new Set(assignedStaffIds)].sort((a, b) => a - b);
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StaffBooking" WHERE id = ${id} FOR UPDATE`;
    const old = await tx.staffBooking.findUnique({ where: { id } });
    if (!old) return { error: "Booking not found." };
    // Existing inactive assignments can be retained, but only active staff can be added.
    const staff = await tx.staffApplication.findMany({ where: { id: { in: ids }, OR: [{ active: true }, { id: { in: old.assignedStaffIds } }] } });
    if (staff.length !== ids.length) return { error: "A selected staff member is no longer active. Refresh and select again." };
    await tx.staffBooking.update({ where: { id }, data: { status, assignedStaffIds: ids } });
    if (status !== old.status) await logActivity(id, { actor: user.name, type: "status", message: `Status changed ${old.status} → ${status}` }, tx);
    if (JSON.stringify([...old.assignedStaffIds].sort((a, b) => a - b)) !== JSON.stringify(ids)) {
      await logActivity(id, { actor: user.name, type: "assignment", message: `Assigned staff: ${staff.map((s) => `${s.firstName} ${s.lastName} (#${s.id})`).join(", ") || "None"}` }, tx);
    }
    return { message: "Booking updated." };
  });
  revalidatePath("/admin", "layout");
  return result;
}

export async function addBookingNote(_state: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.object({ id: idSchema, body: z.string().trim().min(1).max(4000) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Enter a note (up to 4,000 characters)." };
  await logActivity(parsed.data.id, { actor: user.name, type: "note", message: parsed.data.body });
  revalidatePath(`/admin/staffing/bookings/${parsed.data.id}`);
  return { message: "Note added." };
}

export async function emailBooking(_state: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(fd.get("id"));
  if (!id.success) return { error: "Invalid booking." };
  const kind = fd.get("kind");
  let result;
  if (kind === "confirmation") {
    result = await sendBookingMail(id.data, { kind: "confirmation" }, user.name);
  } else if (kind === "custom") {
    const parsed = z.object({ to: z.string().trim().email().max(160), subject, body }).safeParse(Object.fromEntries(fd));
    if (!parsed.success) return { error: "Enter a valid recipient, subject and message." };
    result = await sendBookingMail(id.data, { kind: "custom", ...parsed.data }, user.name);
  } else return { error: "Invalid email type." };
  revalidatePath(`/admin/staffing/bookings/${id.data}`);
  return result.ok ? { message: "Email sent." } : { error: result.error };
}

export async function deleteBooking(fd: FormData) {
  await requireAdmin();
  const id = idSchema.parse(fd.get("id"));
  await db.staffBooking.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  redirect("/admin/staffing/bookings?deleted=1");
}

export async function saveStaffingSettings(_state: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const names = fd.getAll("positionName");
  const rates = fd.getAll("positionRate");
  const multiplier = z.coerce.number().positive().max(20);
  const parsed = z.object({
    notifyEmail: z.string().trim().email().max(160),
    allowStaffPreference: z.boolean(),
    positions: z.array(z.object({ name: z.string().trim().min(1).max(60), rate: z.coerce.number().positive().max(10000) })).min(1).max(50)
      .refine((rows) => new Set(rows.map((r) => r.name.toLowerCase())).size === rows.length, "Position names must be unique"),
    multipliers: z.object({ saturday: multiplier, sunday: multiplier, publicHoliday: multiplier, evening: multiplier, night: multiplier }),
    policies: body,
    confirmFromName: subject,
    confirmSubject: subject, confirmBody: body, ackSubject: subject, ackBody: body,
  }).safeParse({
    ...Object.fromEntries(fd),
    allowStaffPreference: fd.get("allowStaffPreference") === "on",
    positions: names.map((name, i) => ({ name, rate: rates[i] })),
    multipliers: Object.fromEntries(["saturday", "sunday", "publicHoliday", "evening", "night"].map((k) => [k, fd.get(k)])),
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  await db.setting.upsert({ where: { key: STAFFING_KEY }, create: { key: STAFFING_KEY, value: parsed.data }, update: { value: parsed.data } });
  updateTag("settings");
  return { message: "Staffing settings saved." };
}
