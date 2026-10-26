"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Lock, UserRound } from "lucide-react";
import { estimateBooking } from "@/lib/staffing-estimate";
import { beacon, getAttribution, trackLead } from "@/lib/track-client";

type Position = { name: string; rate: number };
type Staff = { id: number; name: string; roles: string[]; experience: string; expertise: string[]; areas: string; photo: boolean };
type Mult = { saturday: number; sunday: number; publicHoliday: number; evening: number; night: number };

const input =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[0.95rem] text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-coral-500";
const label = "mb-1.5 block text-sm font-semibold text-ink";

export function BookingForm({ positions, multipliers, staff, allowPreference, policiesHtml }: { positions: Position[]; multipliers: Mult; staff: Staff[]; allowPreference: boolean; policiesHtml: string }) {
  const mounted = useRef(0);
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({ venue: "", address: "", contactName: "", contactPhone: "", contactEmail: "", position: "", date: "", startTime: "", endTime: "", quantity: "1", notes: "", accepted: false, website: "" });
  const [prefs, setPrefs] = useState<number[]>([]);

  useEffect(() => {
    mounted.current = Date.now();
  }, []);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const pos = positions.find((p) => p.name === f.position);
  const est = useMemo(
    () => (pos ? estimateBooking({ rate: pos.rate, date: f.date, start: f.startTime, end: f.endTime, quantity: Number(f.quantity) || 1, m: multipliers }) : null),
    [pos, f.date, f.startTime, f.endTime, f.quantity, multipliers],
  );
  const matching = staff.filter((s) => !f.position || s.roles.includes(f.position));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, preferredStaffIds: prefs, elapsedMs: Date.now() - mounted.current, attribution: getAttribution() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrors(data.fieldErrors || {});
        setError(data.error || "Something went wrong — please call us.");
        setBusy(false);
        return;
      }
      trackLead(data.id, "hospitality-staffing", "staff-booking");
      setDone(true);
    } catch {
      setError("Network error — please try again or call us.");
      setBusy(false);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-sm font-medium text-coral-600" role="alert">
        {errors[k]}
      </p>
    ) : null;

  if (done)
    return (
      <div className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-brand-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-extrabold text-ink">Booking request received</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Thanks {f.contactName.split(" ")[0]} — we&apos;re organising staff for {f.venue} and will confirm as soon as possible. A copy of your request is on its way to {f.contactEmail}.
        </p>
      </div>
    );

  return (
    <form
      onSubmit={submit}
      onFocusCapture={() => {
        if (!started.current) {
          started.current = true;
          beacon("form_start", { label: "staff-booking" });
        }
      }}
      className="space-y-5"
      aria-label="Book hospitality staff"
    >
      <div aria-hidden className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["venue", "Company / venue name", "organization", "text"],
            ["address", "Venue address", "street-address", "text"],
            ["contactName", "Contact name", "name", "text"],
            ["contactPhone", "Contact phone", "tel", "tel"],
            ["contactEmail", "Contact email", "email", "email"],
          ] as const
        ).map(([k, l, ac, type]) => (
          <div key={k} className={k === "contactEmail" ? "sm:col-span-2" : ""}>
            <label className={label} htmlFor={`bk-${k}`}>
              {l}
              <span className="text-coral-600">*</span>
            </label>
            <input id={`bk-${k}`} type={type} autoComplete={ac} className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
            {err(k)}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <label className={label} htmlFor="bk-position">
            Position needed<span className="text-coral-600">*</span>
          </label>
          <select id="bk-position" className={input} value={f.position} onChange={(e) => (set("position", e.target.value), setPrefs([]))} aria-invalid={!!errors.position}>
            <option value="">Select…</option>
            {positions.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — ${p.rate}/hr
              </option>
            ))}
          </select>
          {err("position")}
        </div>
        <div>
          <label className={label} htmlFor="bk-qty">
            Number of staff<span className="text-coral-600">*</span>
          </label>
          <input id="bk-qty" type="number" min={1} max={50} className={input} value={f.quantity} onChange={(e) => set("quantity", e.target.value)} aria-invalid={!!errors.quantity} />
          {err("quantity")}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["date", "Date", "date"],
            ["startTime", "Start time", "time"],
            ["endTime", "End time", "time"],
          ] as const
        ).map(([k, l, type]) => (
          <div key={k}>
            <label className={label} htmlFor={`bk-${k}`}>
              {l}
              <span className="text-coral-600">*</span>
            </label>
            <input id={`bk-${k}`} type={type} className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
            {err(k)}
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
        {pos ? (
          <>
            <p className="text-sm text-ink">
              <b>Base rate:</b> ${pos.rate}/hr per {pos.name.toLowerCase()} (ex GST, casual loading included)
            </p>
            {est ? (
              <p className="mt-1 text-lg font-extrabold text-ink">
                Estimate: ${est.total.toFixed(2)} <span className="text-sm font-semibold text-ink-soft">ex GST · {est.hours} h × {f.quantity || 1} staff</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">Add the date and times to see an estimate.</p>
            )}
            <p className="mt-1 text-xs text-ink-soft">Weekend, public holiday, evening and night loadings are applied per the Hospitality Award. Final invoices use current Award values.</p>
          </>
        ) : (
          <p className="text-sm text-ink-soft">Prices exclude GST. Choose a position to see the rate and a live estimate.</p>
        )}
      </div>

      <div>
        <label className={label} htmlFor="bk-notes">
          Additional requirements / notes
        </label>
        <textarea id="bk-notes" rows={3} className={input} placeholder="Uniform, parking, who to report to, menu style…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>

      {allowPreference && f.position && matching.length > 0 && (
        <fieldset>
          <legend className={label}>Available staff (preference optional)</legend>
          <p className="-mt-1 mb-2 text-xs text-ink-soft">We&apos;ll try to assign your preferred team if they&apos;re available.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {matching.map((s) => {
              const on = prefs.includes(s.id);
              return (
                <label key={s.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition ${on ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:border-brand-500"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => setPrefs(on ? prefs.filter((x) => x !== s.id) : [...prefs, s.id])} />
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/staff-photo/${s.id}`} alt="" className="size-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sand text-ink-soft">
                      <UserRound className="size-6" />
                    </span>
                  )}
                  <span className="min-w-0 text-sm">
                    <span className="block font-bold text-ink">{s.name}</span>
                    <span className="line-clamp-2 block text-xs text-ink-soft">{s.experience}</span>
                    {s.expertise.length > 0 && <span className="mt-0.5 block truncate text-xs text-brand-700">{s.expertise.join(", ")}</span>}
                    {s.areas && <span className="block truncate text-xs text-ink-soft">📍 {s.areas}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <details className="rounded-2xl border border-line bg-white">
        <summary className="cursor-pointer px-4 py-3 font-semibold text-ink">Policies &amp; privacy (please read)</summary>
        <div className="prose-content max-h-96 overflow-y-auto border-t border-line px-4 py-3 text-sm" dangerouslySetInnerHTML={{ __html: policiesHtml }} />
      </details>

      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={f.accepted} onChange={(e) => set("accepted", e.target.checked)} aria-invalid={!!errors.accepted} />
        <span>
          I have read and agree to the policies and understand prices exclude GST.<span className="text-coral-600">*</span>
        </span>
      </label>
      {err("accepted")}

      {error && (
        <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-70">
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Sending…
          </>
        ) : (
          "Submit booking request"
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <Lock className="size-3.5" aria-hidden /> We&apos;ll confirm staff and times with you before the shift.
      </p>
    </form>
  );
}
