"use client";

import { useActionState, type ReactNode } from "react";
import { Notice } from "./ui";

export type ActionResult = { error?: string; message?: string };

export function ActionForm({ action, children, className = "space-y-3" }: {
  action: (state: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
}) {
  const [state, submit] = useActionState(action, {});
  return (
    <form action={submit} className={className} onReset={(event) => event.preventDefault()}>
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      {children}
    </form>
  );
}
