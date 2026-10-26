import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/admin/Sidebar";

// Every admin page is per-request and behind auth, so navigations are allowed to block.
export const instant = false;

export const metadata: Metadata = { title: { absolute: "Admin | Brilliance" }, robots: { index: false, follow: false } };

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const newLeads = await db.lead.count({ where: { status: "NEW" } });
  return (
    <div className="min-h-screen bg-sand">
      <Sidebar name={user.name} role={user.role} newLeads={newLeads} />
      <div className="lg:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </div>
    </div>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
