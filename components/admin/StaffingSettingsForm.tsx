"use client";

import { useState } from "react";
import type { StaffingSettings } from "@/lib/staffing-settings";
import { saveStaffingSettings } from "@/app/admin/actions/staffing";
import { ActionForm } from "./ActionForm";
import { Area, Btn, Check, Field, Panel } from "./ui";
import { MarkdownField } from "./MarkdownField";
import { SubmitButton } from "./SubmitButton";

export function StaffingSettingsForm({ settings: s }: { settings: StaffingSettings }) {
  const [positions, setPositions] = useState(s.positions.map((p, i) => ({ ...p, key: i })));
  const [nextKey, setNextKey] = useState(s.positions.length);
  return (
    <ActionForm action={saveStaffingSettings} className="space-y-4">
      <Panel title="Positions & base rates (ex GST)">
        <div className="space-y-3">
          {positions.map((p) => <div key={p.key} className="flex flex-wrap items-end gap-2">
            <Field className="min-w-40 flex-1" label="Position" name="positionName" defaultValue={p.name} required maxLength={60} />
            <Field label="Hourly rate (AUD)" name="positionRate" type="number" min="0.01" max="10000" step="0.01" defaultValue={p.rate || ""} required />
            <Btn type="button" variant="ghost" onClick={() => setPositions(positions.filter((x) => x.key !== p.key))}>Remove</Btn>
          </div>)}
          <Btn type="button" variant="ghost" onClick={() => { setPositions([...positions, { name: "", rate: 0, key: nextKey }]); setNextKey(nextKey + 1); }}>Add position</Btn>
        </div>
      </Panel>
      <Panel title="Estimate multipliers">
        <div className="grid gap-3 sm:grid-cols-3">{Object.entries(s.multipliers).map(([k, v]) => <Field key={k} label={k === "publicHoliday" ? "Public holiday" : k.charAt(0).toUpperCase() + k.slice(1)} name={k} type="number" step="0.01" min="0.01" max="20" defaultValue={v} required />)}</div>
      </Panel>
      <Panel title="Preferences & notifications"><div className="space-y-3">
        <Field label="Notification email" name="notifyEmail" type="email" required defaultValue={s.notifyEmail} />
        <Check label="Allow staff preference" name="allowStaffPreference" defaultChecked={s.allowStaffPreference} />
        <Field label="Email sender name" name="confirmFromName" required defaultValue={s.confirmFromName} maxLength={200} />
      </div></Panel>
      <Panel title="Policies"><MarkdownField name="policies" label="Booking policies" defaultValue={s.policies} /></Panel>
      <Panel title="Email templates"><div className="space-y-3">
        <p className="text-sm text-ink-soft">Placeholders: {"{VENUE}, {ADDRESS}, {CONTACT_NAME}, {CONTACT_EMAIL}, {CONTACT_PHONE}, {POSITION}, {DATE}, {START_TIME}, {END_TIME}, {QUANTITY}, {NOTES}, {SITE_NAME}"}</p>
        <Field label="Confirmation subject" name="confirmSubject" required defaultValue={s.confirmSubject} maxLength={200} />
        <Area label="Confirmation body (plain text)" name="confirmBody" required defaultValue={s.confirmBody} rows={14} maxLength={20000} />
        <Field label="Acknowledgement subject" name="ackSubject" required defaultValue={s.ackSubject} maxLength={200} />
        <Area label="Acknowledgement body (plain text)" name="ackBody" required defaultValue={s.ackBody} rows={8} maxLength={20000} />
      </div></Panel>
      <SubmitButton>Save staffing settings</SubmitButton>
    </ActionForm>
  );
}
