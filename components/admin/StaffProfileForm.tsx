import type { StaffApplication } from "@prisma/client";
import { saveStaffProfile } from "@/app/admin/actions/applications";
import { ActionForm } from "./ActionForm";
import { Area, Check, Field } from "./ui";
import { SubmitButton } from "./SubmitButton";

export function StaffProfileForm({ staff: s }: { staff?: StaffApplication }) {
  return (
    <ActionForm action={saveStaffProfile}>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name" name="firstName" required maxLength={80} defaultValue={s?.firstName} />
        <Field label="Last name" name="lastName" required maxLength={80} defaultValue={s?.lastName} />
        <Field label="Email (optional)" name="email" type="email" maxLength={160} defaultValue={s?.email ?? ""} />
        <Field label="Phone (optional)" name="phone" type="tel" maxLength={30} defaultValue={s?.phone ?? ""} />
      </div>
      <Field label="Roles" name="roles" hint="Comma separated, e.g. Chef, Cook, Kitchen Hand, Cleaner" maxLength={2000} defaultValue={s?.roles.join(", ")} />
      <Field label="Expertise" name="expertise" hint="Separate skills with commas." maxLength={2000} defaultValue={s?.expertise.join(", ")} />
      <Field label="Qualifications" name="qualifications" hint="Separate qualifications with commas." maxLength={2000} defaultValue={s?.qualifications.join(", ")} />
      <Field label="Locations" name="locations" maxLength={300} defaultValue={s?.locations} />
      <Area label="Experience" name="experience" rows={4} maxLength={3000} defaultValue={s?.experience} />
      <Area label="Public bio" name="bio" rows={3} maxLength={3000} defaultValue={s?.bio ?? ""} />
      <Field label={s ? "Replace profile photo (optional)" : "Profile photo (optional)"} name="photo" type="file" accept="image/jpeg,image/png,image/webp" hint="JPG, PNG or WebP, up to 5 MB." />
      <Check label="Active" name="active" defaultChecked={s?.active ?? false} hint="Shows this staff member and their photo in the public booking staff picker." />
      <SubmitButton>{s ? "Save profile" : "Add staff"}</SubmitButton>
    </ActionForm>
  );
}
