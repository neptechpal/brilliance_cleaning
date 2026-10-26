"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { int, str } from "@/lib/admin-format";

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST", "SPAM"];

export async function updateLead(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const status = String(fd.get("status")) as LeadStatus;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return;
  const data: { status?: LeadStatus; valueAud?: number | null } = {};
  if (STATUSES.includes(status) && status !== lead.status) data.status = status;
  if (fd.has("valueAud")) data.valueAud = int(fd.get("valueAud"));
  await db.lead.update({ where: { id }, data });
  if (data.status) {
    await db.leadNote.create({ data: { leadId: id, body: `Status changed ${lead.status} → ${data.status}`, authorName: user.name } });
  }
  revalidatePath(`/admin/leads/${id}`);
}

export async function quickStatus(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const status = String(fd.get("status")) as LeadStatus;
  if (!STATUSES.includes(status)) return;
  await db.lead.update({ where: { id }, data: { status } });
  revalidatePath("/admin/leads");
}

export async function addNote(fd: FormData) {
  const user = await requireUser();
  const id = Number(fd.get("id"));
  const body = str(fd.get("body"));
  if (!body) return;
  await db.leadNote.create({ data: { leadId: id, body: body.slice(0, 4000), authorName: user.name } });
  revalidatePath(`/admin/leads/${id}`);
}

export async function deleteLead(fd: FormData) {
  await requireAdmin();
  await db.lead.delete({ where: { id: Number(fd.get("id")) } });
  redirect("/admin/leads?deleted=1");
}
