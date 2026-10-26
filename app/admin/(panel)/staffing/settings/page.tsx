import { requireAdmin } from "@/lib/auth";
import { readStaffingSettings } from "@/lib/staffing-settings";
import { PageHeader } from "@/components/admin/ui";
import { StaffingSettingsForm } from "@/components/admin/StaffingSettingsForm";

export default async function StaffingSettingsPage() {
  await requireAdmin();
  const settings = await readStaffingSettings();
  return <><PageHeader title="Staffing settings" intro="Rates, booking policies and client emails." /><StaffingSettingsForm settings={settings} /></>;
}
