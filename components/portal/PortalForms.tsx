"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { portalLogin, setOwnPassword } from "@/app/brilliance-roster/actions";

const input = "w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl shadow-brand-900/10 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-160.png" alt="" className="mx-auto h-14 w-auto" />
        <h1 className="mt-4 text-center text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">{sub}</p>
        {children}
        <p className="mt-6 text-center text-xs text-ink-soft">Brilliance Roster · Brilliance Cleaning &amp; Property Staging</p>
      </div>
    </div>
  );
}

export function PortalLogin() {
  const router = useRouter();
  const [state, action, pending] = useActionState(portalLogin, undefined);
  useEffect(() => {
    if (state && !state.error) router.refresh();
  }, [state, router]);
  return (
    <Shell title="Staff Portal" sub="Sign in to manage your shifts & attendance">
      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Email</span>
          <input name="email" type="email" autoComplete="username" required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className={input} />
        </label>
        {state?.error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">{state.error}</p>}
        <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending && <Loader2 className="size-5 animate-spin" />} Sign in →
        </button>
        <p className="text-center text-sm text-ink-soft">
          Forgot your password? Call <a href="tel:+61411463552" className="font-semibold text-brand-700">0411 463 552</a> and we&apos;ll reset it.
        </p>
      </form>
    </Shell>
  );
}

export function SetPassword({ name }: { name: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setOwnPassword, undefined);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <Shell title={`Welcome, ${name}`} sub="Choose your own password to continue">
      <form action={action} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Confirm password</span>
          <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={input} />
        </label>
        {state?.error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">{state.error}</p>}
        <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />} Save password
        </button>
      </form>
    </Shell>
  );
}
