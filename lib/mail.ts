import nodemailer from "nodemailer";
import type { Lead, StaffApplication } from "@prisma/client";
import type { SiteSettings } from "./settings";
import { channelLabel } from "./attribution";
import { SITE_URL } from "./seo";

function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendLeadNotification(lead: Lead, s: SiteSettings): Promise<{ ok: boolean; error?: string }> {
  const t = transport();
  if (!t) return { ok: false, error: "SMTP not configured" };
  const to = s.notifyEmails.split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length) return { ok: false, error: "No notification emails set" };

  const rows: [string, unknown][] = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Service", lead.serviceName || lead.serviceSlug],
    ["Suburb", [lead.suburb, lead.postcode].filter(Boolean).join(" ")],
    ["Property", [lead.propertyType, lead.bedrooms && `${lead.bedrooms} bed`, lead.bathrooms && `${lead.bathrooms} bath`].filter(Boolean).join(", ")],
    ["Preferred date", lead.preferredDate],
    ["Frequency", lead.frequency],
    ["Message", lead.message],
    ["Form", lead.formType],
    ["Page", lead.pagePath],
    ["Source", channelLabel(lead.channel) + (lead.utmCampaign ? ` · ${lead.utmCampaign}` : "")],
    ["Landing page", lead.landingPage],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#0b6b5a;margin:0 0 12px">New ${esc(lead.formType)} lead #${lead.id}</h2>
      <p style="margin:0 0 16px"><a href="tel:${esc(lead.phone.replace(/\s/g, ""))}" style="background:#f05152;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Call ${esc(lead.name)} · ${esc(lead.phone)}</a></p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .filter(([, v]) => v)
          .map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;width:130px">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`)
          .join("")}
      </table>
      <p style="margin-top:16px"><a href="${SITE_URL}/admin/leads/${lead.id}">Open in admin →</a></p>
    </div>`;

  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `Brilliance Website <no-reply@brillianceservices.com.au>`,
      to,
      replyTo: lead.email || undefined,
      subject: `New lead: ${lead.serviceName || "Enquiry"} – ${lead.name}${lead.suburb ? ` (${lead.suburb})` : ""}`,
      html,
    });
    if (s.autoReply && lead.email) {
      await t.sendMail({
        from: process.env.MAIL_FROM || `Brilliance Cleaning <no-reply@brillianceservices.com.au>`,
        to: lead.email,
        replyTo: s.email,
        subject: `Thanks ${lead.name.split(" ")[0]} – we've got your request`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <p>Hi ${esc(lead.name.split(" ")[0])},</p>
          <p>Thanks for contacting ${esc(s.businessName)}. We've received your ${esc(lead.serviceName || "enquiry")} request and will be in touch shortly, usually within a few business hours.</p>
          <p>Need us sooner? Call <a href="tel:${esc(s.phone)}">${esc(s.phoneDisplay)}</a>.</p>
          <p>– The Brilliance team</p></div>`,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "send failed" };
  }
}

export async function sendApplicationNotification(a: StaffApplication, s: SiteSettings): Promise<{ ok: boolean; error?: string }> {
  const t = transport();
  if (!t) return { ok: false, error: "SMTP not configured" };
  const to = s.notifyEmails.split(",").map((e) => e.trim()).filter(Boolean);
  if (!to.length) return { ok: false, error: "No notification emails set" };
  const name = `${a.firstName} ${a.lastName}`;
  const rows: [string, unknown][] = [
    ["Roles", a.roles.join(", ")],
    ["Phone", a.phone],
    ["Email", a.email],
    ["Preferred areas", a.locations],
    ["Expertise", a.expertise.join(", ")],
    ["Qualifications", a.qualifications.join(", ")],
    ["Work rights", a.workRights],
    ["Shift types", a.shiftTypes.join(", ")],
    ["Own transport", a.ownTransport ? "Yes" : "No"],
    ["Availability", `${a.availability.length} of 21 slots`],
  ];
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || `Brilliance Website <no-reply@brillianceservices.com.au>`,
      to,
      replyTo: a.email ?? undefined,
      subject: `New staff application: ${name}${a.roles.length ? ` (${a.roles.join(", ")})` : ""}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#0b6b5a;margin:0 0 12px">New staff application #${a.id}: ${esc(name)}</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          ${rows
            .filter(([, v]) => v)
            .map(([k, v]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#666;width:130px">${k}</td><td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(v)}</td></tr>`)
            .join("")}
        </table>
        <p style="margin-top:16px"><a href="${SITE_URL}/admin/applications/${a.id}">Review application, CV and certificates →</a></p>
      </div>`,
    });
    if (s.autoReply && a.email) {
      await t.sendMail({
        from: process.env.MAIL_FROM || `Brilliance Cleaning <no-reply@brillianceservices.com.au>`,
        to: a.email,
        replyTo: s.email,
        subject: `Thanks ${a.firstName} – we've received your application`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <p>Hi ${esc(a.firstName)},</p>
          <p>Thanks for applying to join ${esc(s.businessName)}. We'll review your details and be in touch if there's a suitable role or shift.</p>
          <p>Questions? Call <a href="tel:${esc(s.phone)}">${esc(s.phoneDisplay)}</a>.</p>
          <p>– The Brilliance team</p></div>`,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "send failed" };
  }
}
