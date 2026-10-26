"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CalendarDays, CheckCircle2, Clock, History, Loader2, LogOut, MapPin, Navigation, Play, Square, StickyNote } from "lucide-react";
import { portalLogout, saveNotes, signIn, signOut } from "@/app/brilliance-roster/actions";

type Site = { lat: number | null; lng: number | null; radius: number };
type TodayShift = Site & { id: number; site: string; address: string | null; time: string; notes: string | null };
type Fix = { lat: number; lng: number; accuracy: number; address: string };

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Street, suburb, postcode — same short format the old portal used. */
function shortAddress(n: { address?: Record<string, string>; display_name?: string }) {
  const a = n.address;
  if (!a) return n.display_name ?? "";
  const parts: string[] = [];
  if (a.road) parts.push(`${a.house_number ? `${a.house_number} ` : ""}${a.road}`);
  const sub = a.suburb || a.city_district || a.town || a.city;
  if (sub) parts.push(sub);
  if (a.postcode) parts.push(a.postcode);
  return parts.join(", ") || n.display_name || "";
}

function useLocation() {
  const [fix, setFix] = useState<Fix | null>(null);
  const [state, setState] = useState<"idle" | "locating" | "ok" | "denied" | "unavailable">("idle");
  const locate = useCallback(() => {
    if (!navigator.geolocation) return setState("unavailable");
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
          address = shortAddress(await r.json()) || address;
        } catch {}
        setFix({ lat, lng, accuracy, address });
        setState("ok");
      },
      () => setState("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);
  return { fix, state, locate };
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const m = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  return (
    <>
      {Math.floor(m / 60)}h {m % 60}m
    </>
  );
}

export function Portal(props: {
  greeting: string;
  name: string;
  initials: string;
  open: { id: number; signInAt: string; site: string; address: string | null; notes: string } | null;
  todayShifts: TodayShift[];
  adHocSite: (Site & { name: string }) | null;
  upcoming: { id: number; day: string; time: string; site: string; address: string | null; notes: string | null; contact: string | null }[];
  history: { id: number; day: string; site: string; time: string; duration: string; status: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"sign" | "upcoming" | "history">("sign");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [shiftId, setShiftId] = useState<number | "">(props.todayShifts[0]?.id ?? "");
  const [notes, setNotes] = useState(props.open?.notes ?? "");
  const { fix, state, locate } = useLocation();

  useEffect(() => {
    locate();
  }, [locate]);

  const target: (Site & { label: string }) | null = (() => {
    const s = props.todayShifts.find((x) => x.id === shiftId);
    if (s) return { lat: s.lat, lng: s.lng, radius: s.radius, label: s.site };
    if (props.adHocSite) return { ...props.adHocSite, label: props.adHocSite.name };
    return null;
  })();
  const fenced = !!target && target.radius > 0 && target.lat != null && target.lng != null;
  const dist = fix && target?.lat != null && target.lng != null ? distance(fix, { lat: target.lat, lng: target.lng! }) : null;
  const inside = !fenced || (dist != null && dist <= target!.radius + Math.min(fix?.accuracy ?? 0, 150));
  const canSignIn = !pending && (fenced ? state === "ok" && inside : state !== "locating");

  const doSignIn = () =>
    start(async () => {
      setError("");
      const res = await signIn({ shiftId: shiftId || null, ...(fix ?? {}) });
      if (!res.ok) return setError(res.error ?? "Could not sign in");
      router.refresh();
    });
  const doSignOut = () =>
    start(async () => {
      setError("");
      if (!props.open) return;
      const res = await signOut({ attendanceId: props.open.id, notes, ...(fix ?? {}) });
      if (!res.ok) return setError(res.error ?? "Could not sign out");
      router.refresh();
    });

  const card = "rounded-3xl bg-white p-5 shadow-sm ring-1 ring-line";

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-extrabold text-white">{props.initials}</span>
          <div>
            <p className="text-sm text-ink-soft">Good {props.greeting}</p>
            <p className="text-lg font-extrabold leading-tight text-ink">{props.name}</p>
          </div>
        </div>
        <button onClick={() => start(async () => (await portalLogout(), router.refresh()))} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line">
          <LogOut className="size-4" /> Sign out
        </button>
      </header>

      <div className={`mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${props.open ? "bg-brand-600 text-white" : "bg-white text-ink-soft ring-1 ring-line"}`}>
        <span className={`size-2.5 rounded-full ${props.open ? "animate-pulse bg-white" : "bg-ink-soft/40"}`} />
        {props.open ? (
          <>
            On shift at {props.open.site} since{" "}
            {new Date(props.open.signInAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })} · <Elapsed since={props.open.signInAt} />
          </>
        ) : (
          "You haven't started a shift yet"
        )}
      </div>

      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
        {(
          [
            ["sign", "Sign in/out", Clock],
            ["upcoming", `Upcoming (${props.upcoming.length})`, CalendarDays],
            ["history", "History", History],
          ] as const
        ).map(([k, l, I]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold ${tab === k ? "bg-ink text-white" : "text-ink-soft"}`}>
            <I className="size-4" /> {l}
          </button>
        ))}
      </nav>

      {tab === "sign" && (
        <section className={`${card} mt-4`}>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            {props.open ? <Square className="size-5 text-coral-600" /> : <Play className="size-5 text-brand-600" />}
            {props.open ? "Finish your shift" : "Start your shift"}
          </h2>

          {!props.open && (
            <div className="mt-4 space-y-2">
              {props.todayShifts.length > 0 ? (
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Today&apos;s shift
                  <select value={shiftId} onChange={(e) => setShiftId(e.target.value ? Number(e.target.value) : "")} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-semibold normal-case tracking-normal text-ink">
                    {props.todayShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.site} · {s.time}
                      </option>
                    ))}
                    <option value="">Unrostered / ad hoc shift</option>
                  </select>
                </label>
              ) : (
                <p className="rounded-xl bg-sand px-3 py-2 text-sm text-ink-soft">No rostered shift today — you can still sign in for an ad hoc shift{props.adHocSite ? ` at ${props.adHocSite.name}` : ""}.</p>
              )}
              {(() => {
                const s = props.todayShifts.find((x) => x.id === shiftId);
                return s ? (
                  <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-ink">
                    {s.address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" /> {s.address}
                      </p>
                    )}
                    {s.notes && (
                      <p className="mt-1 flex items-start gap-1.5 text-ink-soft">
                        <StickyNote className="mt-0.5 size-4 shrink-0" /> {s.notes}
                      </p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-sand p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Navigation className="size-4 text-brand-600" />
              {state === "locating" && "Detecting your location…"}
              {state === "ok" && fix && fix.address}
              {state === "denied" && <span className="text-coral-700">Location blocked — allow location access in your browser settings, then retry.</span>}
              {state === "unavailable" && "Location isn't available on this device."}
              {state === "idle" && "Waiting for location…"}
            </p>
            {fix && (
              <iframe
                title="Your location"
                className="mt-2 h-40 w-full rounded-xl border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${fix.lng - 0.003},${fix.lat - 0.002},${fix.lng + 0.003},${fix.lat + 0.002}&layer=mapnik&marker=${fix.lat},${fix.lng}`}
              />
            )}
            {!props.open && fenced && fix && (
              <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${inside ? "text-brand-700" : "text-coral-700"}`}>
                {inside ? <CheckCircle2 className="size-4" /> : <MapPin className="size-4" />}
                {inside ? `Location verified — ${dist} m from ${target!.label}` : `You're ${dist! >= 1000 ? `${(dist! / 1000).toFixed(1)} km` : `${dist} m`} from ${target!.label} (must be within ${target!.radius} m)`}
              </p>
            )}
            {(state === "denied" || (fix && !inside)) && (
              <button onClick={locate} className="mt-2 text-sm font-semibold text-brand-700 underline">
                Try again
              </button>
            )}
          </div>

          {props.open && (
            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Shift notes (optional)
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => props.open && saveNotes(props.open.id, notes)}
                placeholder="e.g. Vacuum not working in room 3, all tasks completed"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-base normal-case tracking-normal text-ink"
              />
            </label>
          )}

          {error && <p className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-sm font-medium text-coral-700">{error}</p>}

          {props.open ? (
            <button onClick={doSignOut} disabled={pending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-coral-600 py-4 text-lg font-extrabold text-white disabled:opacity-60">
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Square className="size-5" />} Sign out now
            </button>
          ) : (
            <button onClick={doSignIn} disabled={!canSignIn} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-lg font-extrabold text-white disabled:opacity-45">
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />} Sign in now
            </button>
          )}
        </section>
      )}

      {tab === "upcoming" && (
        <section className="mt-4 space-y-3">
          {props.upcoming.map((s) => (
            <div key={s.id} className={card}>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-700">{s.day}</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{s.site}</p>
              <p className="text-sm font-semibold text-ink-soft">{s.time}</p>
              {s.address && (
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(s.address)}`} target="_blank" className="mt-2 flex items-start gap-1.5 text-sm text-brand-700 underline">
                  <MapPin className="mt-0.5 size-4 shrink-0" /> {s.address}
                </a>
              )}
              {s.notes && <p className="mt-2 rounded-xl bg-sand px-3 py-2 text-sm text-ink-soft">{s.notes}</p>}
              {s.contact && <p className="mt-2 text-xs text-ink-soft">Site contact: {s.contact}</p>}
            </div>
          ))}
          {!props.upcoming.length && <p className={`${card} text-center text-ink-soft`}>No upcoming shifts in the next 30 days.</p>}
        </section>
      )}

      {tab === "history" && (
        <section className={`${card} mt-4 divide-y divide-line p-0`}>
          {props.history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-bold text-ink">{h.site}</p>
                <p className="text-xs text-ink-soft">
                  {h.day} · {h.time}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-ink">{h.duration}</p>
                <p className={`text-xs font-semibold ${h.status === "APPROVED" ? "text-brand-700" : h.status === "DECLINED" ? "text-coral-700" : "text-amber-700"}`}>{h.status.toLowerCase()}</p>
              </div>
            </div>
          ))}
          {!props.history.length && <p className="px-5 py-6 text-center text-ink-soft">No completed shifts yet.</p>}
        </section>
      )}
    </div>
  );
}
