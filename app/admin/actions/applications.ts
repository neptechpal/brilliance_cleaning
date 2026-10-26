"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/components/admin/ActionForm";
import type { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { int, str } from "@/lib/admin-format";
import { deleteUpload, saveUpload, sniff } from "@/lib/storage";
import { APPLICATION_STATUSES, MAX_PHOTO } from "@/lib/staffing";

export async function updateApplication(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const app = await db.staffApplication.findUnique({ where: { id } });
  if (!app) return;
  const status = String(fd.get("status")) as ApplicationStatus;
  const rating = int(fd.get("rating"));
  const data: { status?: ApplicationStatus; rating?: number | null } = { rating: rating && rating >= 1 && rating <= 5 ? rating : null };
  if ((APPLICATION_STATUSES as readonly string[]).includes(status) && status !== app.status) data.status = status;
  await db.staffApplication.update({ where: { id }, data });
  if (data.status) {
    await db.applicationNote.create({ data: { applicationId: id, body: `Status changed ${app.status} → ${data.status}`, authorName: user.name } });
  }
  revalidatePath(`/admin/applications/${id}`);
}

export async function addApplicationNote(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const body = str(fd.get("body"));
  if (!body) return;
  await db.applicationNote.create({ data: { applicationId: id, body: body.slice(0, 4000), authorName: user.name } });
  revalidatePath(`/admin/applications/${id}`);
}

export async function deleteApplication(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const files = await db.applicantFile.findMany({ where: { applicationId: id } });
  await db.staffApplication.delete({ where: { id } });
  await Promise.all(files.map((f) => deleteUpload(f.storedName)));
  updateTag("staff");
  revalidatePath("/admin", "layout");
  redirect("/admin/applications?deleted=1");
}

export async function setApplicationActive(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return;
  const active = fd.get("active") === "true";
  await db.staffApplication.update({ where: { id }, data: { active, notes: { create: { body: `Public staff profile ${active ? "activated" : "deactivated"}`, authorName: user.name } } } });
  updateTag("staff");
  revalidatePath("/admin/applications", "layout");
}

export async function saveStaffProfile(_state: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = fd.get("id") ? Number(fd.get("id")) : undefined;
  if (id !== undefined && (!Number.isSafeInteger(id) || id < 1)) return { error: "Invalid staff profile." };
  const list = z.string().max(2000).transform((s) => [...new Set(s.split(",").map((v) => v.trim()).filter(Boolean))]);
  const parsed = z.object({
    firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
    email: z.union([z.literal(""), z.string().trim().email().max(160)]).transform((s) => s.toLowerCase() || null),
    phone: z.string().trim().max(30).transform((s) => s || null),
    roles: list, expertise: list, qualifications: list,
    locations: z.string().trim().max(300), experience: z.string().trim().max(3000),
    bio: z.string().trim().max(3000).transform((s) => s || null),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Check the name, email and profile field lengths." };
  const photo = fd.get("photo");
  let upload: { kind: string; originalName: string; storedName: string; mime: string; size: number } | undefined;
  if (photo instanceof File && photo.size) {
    if (photo.size > MAX_PHOTO) return { error: "Profile photo must be under 5 MB." };
    const buf = Buffer.from(await photo.arrayBuffer());
    const type = sniff(buf, ["image/jpeg", "image/png", "image/webp"]);
    if (!type) return { error: "Upload a JPG, PNG or WebP photo." };
    upload = { kind: "photo", originalName: photo.name.slice(0, 200), storedName: await saveUpload(buf, type.ext), mime: type.mime, size: buf.length };
  }
  let savedId: number;
  let oldPhotos: { storedName: string }[] = [];
  try {
    savedId = await db.$transaction(async (tx) => {
      const data = { ...parsed.data, active: fd.get("active") === "on" };
      if (id) {
        if (upload) {
          oldPhotos = await tx.applicantFile.findMany({ where: { applicationId: id, kind: "photo" }, select: { storedName: true } });
          await tx.applicantFile.deleteMany({ where: { applicationId: id, kind: "photo" } });
        }
        await tx.staffApplication.update({ where: { id }, data: { ...data, ...(upload ? { files: { create: upload } } : {}), notes: { create: { body: "Staff profile updated", authorName: user.name } } } });
        return id;
      }
      const row = await tx.staffApplication.create({ data: {
        ...data, source: "admin", status: "APPROVED", signature: "", employmentType: [], shiftTypes: [], availability: [],
        ...(upload ? { files: { create: upload } } : {}), notes: { create: { body: "Staff profile added manually", authorName: user.name } },
      } });
      return row.id;
    });
  } catch {
    if (upload) await deleteUpload(upload.storedName);
    return { error: "Could not save the staff profile. Please try again." };
  }
  await Promise.all(oldPhotos.map((f) => deleteUpload(f.storedName)));
  updateTag("staff");
  revalidatePath("/admin", "layout");
  redirect(`/admin/applications/${savedId}?saved=1`);
}
