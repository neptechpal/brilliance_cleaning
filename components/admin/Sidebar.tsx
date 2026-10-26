"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  ExternalLink,
  FileSearch,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Map as MapIcon,
  Menu,
  PhoneCall,
  Settings,
  Shuffle,
  Star,
  Target,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/admin/actions/auth";

const NAV = [
  { group: "Leads", items: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/leads", label: "Leads", icon: Inbox, badge: "new" },
    { href: "/admin/calls", label: "Call clicks", icon: PhoneCall },
    { href: "/admin/traffic", label: "Traffic & conversions", icon: BarChart3 },
  ] },
  { group: "Content", items: [
    { href: "/admin/services", label: "Services", icon: Briefcase },
    { href: "/admin/areas", label: "Areas / suburbs", icon: MapPin },
    { href: "/admin/service-areas", label: "Service × area pages", icon: MapIcon },
    { href: "/admin/posts", label: "Blog posts", icon: BookOpen },
    { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
  ] },
  { group: "SEO", items: [
    { href: "/admin/seo", label: "SEO audit & meta", icon: FileSearch },
    { href: "/admin/seo/keywords", label: "Content strategy", icon: Target },
    { href: "/admin/seo/redirects", label: "Redirects", icon: Shuffle },
  ] },
  { group: "System", items: [
    { href: "/admin/settings", label: "Settings & tracking", icon: Settings, admin: true },
    { href: "/admin/users", label: "Users", icon: Users, admin: true },
  ] },
];

export function Sidebar({ name, role, newLeads }: { name: string; role: string; newLeads: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || (pathname.startsWith(href + "/") && !(href === "/admin/seo" && /keywords|redirects/.test(pathname))));

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-160.png" alt="" className="h-8 w-auto" />
        <span className="font-extrabold text-white">Brilliance</span>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/40">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items
                .filter((i) => !("admin" in i && i.admin) || role === "ADMIN")
                .map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium ${isActive(i.href) ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                    >
                      <i.icon className="size-4" />
                      <span className="flex-1">{i.label}</span>
                      {"badge" in i && newLeads > 0 && <span className="rounded-full bg-coral-600 px-1.5 text-[11px] font-bold text-white">{newLeads}</span>}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 p-3">
        <a href="/" target="_blank" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 hover:text-white">
          <ExternalLink className="size-4" /> View website
        </a>
        <form action={logout}>
          <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/70 hover:text-white">
            <LogOut className="size-4" /> Sign out <span className="ml-auto truncate text-xs text-white/40">{name}</span>
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-ink lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <span className="font-extrabold text-white">Brilliance admin</span>
        <button onClick={() => setOpen(true)} className="text-white" aria-label="Open menu">
          <Menu className="size-6" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-ink">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-white" aria-label="Close menu">
              <X className="size-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
