"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { int, str } from "@/lib/admin-format";
import { deleteUpload } from "@/lib/storage";
import { APPLICATION_STATUSES } from "@/lib/staffing";

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
  redirect("/admin/applications?deleted=1");
}
