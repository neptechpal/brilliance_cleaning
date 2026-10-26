import { requireUser } from "@/lib/auth";
import { LinkBtn, PageHeader, Panel } from "@/components/admin/ui";
import { StaffProfileForm } from "@/components/admin/StaffProfileForm";

export default async function NewStaffPage() {
  await requireUser();
  return <><PageHeader title="Add staff" intro="Create a hospitality staff profile." actions={<LinkBtn variant="ghost" href="/admin/applications">← Staff & applications</LinkBtn>} /><Panel><StaffProfileForm /></Panel></>;
}
