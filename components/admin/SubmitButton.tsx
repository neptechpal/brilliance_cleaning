"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function SubmitButton({
  children = "Save",
  variant = "primary",
  confirm,
  className = "",
  name,
  value,
  formAction,
}: {
  children?: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  confirm?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  const v =
    variant === "danger"
      ? "bg-coral-600 text-white hover:bg-coral-700"
      : variant === "ghost"
        ? "border border-line bg-white text-ink hover:bg-sand"
        : "bg-brand-600 text-white hover:bg-brand-700";
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      formNoValidate={!!formAction}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${v} ${className}`}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
