"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login } from "../actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const next = useSearchParams().get("next") || "/admin";
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">Email</span>
        <input name="email" type="email" autoComplete="username" required className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-ink">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="w-full rounded-lg border border-line px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      </label>
      {state?.error && <p className="rounded-lg bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-600 py-2.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
