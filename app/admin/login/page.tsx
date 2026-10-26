import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: { absolute: "Admin login | Brilliance" }, robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-160.png" alt="" className="mx-auto h-12 w-auto" />
        <h1 className="mt-4 text-center text-xl font-extrabold text-ink">Brilliance admin</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">Sign in to manage leads and content</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
