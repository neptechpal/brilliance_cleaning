"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { readSettings } from "@/lib/settings";
import { MAIL_KEY, mailer, readMailSettings, type MailSettings } from "@/lib/mailer";

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function saveMailSettings(fd: FormData) {
  await requireAdmin();
  const cur = await readMailSettings();
  const newKey = String(fd.get("smtp2goApiKey") ?? "").trim();
  const fromEmail = String(fd.get("fromEmail") ?? "").trim();
  if (fromEmail && !EMAIL.test(fromEmail)) redirect("/admin/settings?mailerror=" + encodeURIComponent("Sender email doesn't look valid.") + "#email");
  const value: MailSettings = {
    // A blank key field keeps the saved key (it is never sent back to the browser).
    smtp2goApiKey: fd.get("clearApiKey") ? "" : newKey || cur.smtp2goApiKey,
    fromEmail,
    fromName: String(fd.get("fromName") ?? "").trim().replace(/[<>"]/g, ""),
  };
  await db.setting.upsert({ where: { key: MAIL_KEY }, create: { key: MAIL_KEY, value }, update: { value } });
  redirect("/admin/settings?mail=saved#email");
}

export async function sendTestEmail() {
  await requireAdmin();
  const [t, s] = await Promise.all([mailer(), readSettings()]);
  if (!t) redirect("/admin/settings?mailerror=" + encodeURIComponent("Email sending isn't configured — add an SMTP2GO API key first.") + "#email");
  const to = s.notifyEmails.split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length) redirect("/admin/settings?mailerror=" + encodeURIComponent("Add at least one address under 'Send new leads to' first.") + "#email");
  let error = "";
  try {
    await t.sendMail({
      to,
      subject: `Test email from ${s.businessName} website`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px"><p>This is a test email from the website admin.</p><p>If you received it, new lead notifications will arrive at this address.</p></div>`,
    });
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 300) : "Send failed";
  }
  redirect(error ? "/admin/settings?mailerror=" + encodeURIComponent(error) + "#email" : "/admin/settings?mail=sent#email");
}
