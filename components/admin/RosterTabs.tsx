import Link from "next/link";

const TABS = [
  ["/admin/roster", "Overview"],
  ["/admin/roster/schedule", "Weekly roster"],
  ["/admin/roster/calendar", "Calendar"],
  ["/admin/roster/attendance", "Attendance"],
  ["/admin/roster/employees", "Employees"],
  ["/admin/roster/sites", "Sites"],
];

export function RosterTabs({ active }: { active: string }) {
  return (
    <nav className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="Roster sections">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${active === href ? "border-brand-600 text-brand-700" : "border-transparent text-ink-soft hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
      <a href="/brilliance-roster" target="_blank" className="ml-auto shrink-0 px-3 py-2 text-sm font-semibold text-brand-700 hover:underline">
        Staff portal ↗
      </a>
    </nav>
  );
}
