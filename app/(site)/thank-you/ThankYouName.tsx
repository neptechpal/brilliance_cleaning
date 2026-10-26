"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

function firstName() {
  try {
    return JSON.parse(sessionStorage.getItem("bc_lead") || "null")?.name ?? "";
  } catch {
    return "";
  }
}

export function ThankYouName() {
  const name = useSyncExternalStore(noop, firstName, () => "");
  return name ? <>{` ${name}`}</> : null;
}
