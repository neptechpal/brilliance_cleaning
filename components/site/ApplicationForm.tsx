"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Lock, Upload, UserRound, X } from "lucide-react";
import { getAttribution } from "@/lib/track-client";
import { DAY_PARTS, DAYS, EMPLOYMENT_TYPES, EXPERTISE, MAX_CERTS, QUALIFICATIONS, ROLES, SHIFT_TYPES, WORK_RIGHTS } from "@/lib/staffing";

const input =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-coral-500";
const label = "mb-1.5 block text-sm font-semibold text-ink";
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm font-medium transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink hover:border-brand-500"}`;

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-6 first:border-0 first:pt-0">
      <legend className="mb-4 flex items-center gap-2 text-lg font-extrabold text-ink">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-600 text-sm text-white">{n}</span>
        {title}
      </legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

export function ApplicationForm({ areas = [] }: { areas?: string[] }) {
  const mountedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [certs, setCerts] = useState<File[]>([]);
  const [tag, setTag] = useState("");
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    experience: "",
    roles: [] as string[],
    expertise: [] as string[],
    qualifications: [] as string[],
    workRights: "",
    employmentType: [] as string[],
    locations: "",
    languages: "",
    linkedinUrl: "",
    shiftTypes: [] as string[],
    ownTransport: false,
    availability: [] as string[],
    referee1: "",
    referee2: "",
    emergencyName: "",
    emergencyPhone: "",
    consent: false,
    signature: "",
    website: "",
  });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const pickPhoto = (file: File | null) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(file);
    setPhotoUrl(file ? URL.createObjectURL(file) : "");
  };

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const toggle = (k: "roles" | "qualifications" | "employmentType" | "shiftTypes" | "expertise", v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const addTag = (v: string) => {
    const t = v.trim().replace(/,$/, "");
    if (t && !f.expertise.some((x) => x.toLowerCase() === t.toLowerCase()) && f.expertise.length < 25) set("expertise", [...f.expertise, t]);
    setTag("");
  };

  // availability grid helpers
  const slot = (d: string, p: string) => `${d}:${p}`;
  const has = (d: string, p: string) => f.availability.includes(slot(d, p));
  const setSlots = (slots: string[], on: boolean) =>
    set("availability", on ? [...new Set([...f.availability, ...slots])] : f.availability.filter((s) => !slots.includes(s)));
  const toggleGroup = (slots: string[]) => setSlots(slots, !slots.every((s) => f.availability.includes(s)));

  const err = (k: string) =>
    errors[k] ? (
      <p className="mt-1 text-sm font-medium text-coral-600" role="alert">
        {errors[k]}
      </p>
    ) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.set("data", JSON.stringify({ ...f, elapsedMs: Date.now() - mountedAt.current, attribution: getAttribution() }));
    if (photo) fd.set("photo", photo);
    if (resume) fd.set("resume", resume);
    certs.forEach((c) => fd.append("certificates", c));
    setBusy(true);
    try {
      const res = await fetch("/api/applications", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErrors(data.fieldErrors || {});
        setError(data.error || (res.status === 413 ? "Files are too large. Keep each under 8 MB." : "Something went wrong. Please try again."));
        setBusy(false);
        requestAnimationFrame(() => formRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "staff_application", roles: f.roles.join(",") });
      setDone(true);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setError("Network error — please check your connection and try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="py-10 text-center">
        <CheckCircle2 className="mx-auto size-14 text-brand-600" aria-hidden />
        <h2 className="mt-4 text-2xl font-extrabold text-ink">Thanks {f.firstName}, your application is in</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">We&apos;ll review your details and contact you when there&apos;s a suitable role or shift in your area.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-8" aria-label="Staff application" noValidate>
      <div aria-hidden className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>

      <Section n={1} title="About you">
        <div className="flex items-center gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover" /> : <UserRound className="size-9 text-ink-soft/50" aria-hidden />}
          </span>
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand-500">
              <Upload className="size-4" aria-hidden /> {photo ? "Change photo" : "Profile photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <p className="mt-1 text-xs text-ink-soft">Optional. Square image works best (JPG/PNG, max 5 MB).</p>
            {err("photo")}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["firstName", "First name", "given-name", "text"],
              ["lastName", "Last name", "family-name", "text"],
              ["email", "Email", "email", "email"],
              ["phone", "Phone", "tel", "tel"],
            ] as const
          ).map(([k, l, ac, type]) => (
            <div key={k}>
              <label className={label} htmlFor={`ap-${k}`}>
                {l}
                <span className="text-coral-600">*</span>
              </label>
              <input id={`ap-${k}`} type={type} autoComplete={ac} className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
              {err(k)}
            </div>
          ))}
        </div>
      </Section>

      <Section n={2} title="Experience & skills">
        <div>
          <label className={label} htmlFor="ap-exp">
            Experience (years, venues, sections)<span className="text-coral-600">*</span>
          </label>
          <textarea
            id="ap-exp"
            rows={4}
            className={input}
            placeholder="e.g. 6+ years, fine dining & bistro, grill & sauce, banquets, high-volume service…"
            value={f.experience}
            onChange={(e) => set("experience", e.target.value)}
            aria-invalid={!!errors.experience}
          />
          {err("experience")}
        </div>
        <div>
          <p className={label}>Roles you&apos;re interested in</p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button type="button" key={r} aria-pressed={f.roles.includes(r)} onClick={() => toggle("roles", r)} className={chip(f.roles.includes(r))}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ap-tag">
            Area of expertise<span className="text-coral-600">*</span>
          </label>
          <div className={`${input} flex flex-wrap items-center gap-1.5 !py-2`} aria-invalid={!!errors.expertise}>
            {f.expertise.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-medium text-brand-700">
                {t}
                <button type="button" onClick={() => toggle("expertise", t)} aria-label={`Remove ${t}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            <input
              id="ap-tag"
              value={tag}
              onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value) : setTag(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tag);
                } else if (e.key === "Backspace" && !tag && f.expertise.length) set("expertise", f.expertise.slice(0, -1));
              }}
              onBlur={() => tag && addTag(tag)}
              placeholder={f.expertise.length ? "Add more…" : "Type a skill and press Enter (e.g. Italian, Larder, Grill)"}
              className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-[0.95rem] outline-none"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXPERTISE.filter((x) => !f.expertise.includes(x)).map((x) => (
              <button type="button" key={x} onClick={() => addTag(x)} className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700">
                + {x}
              </button>
            ))}
          </div>
          {err("expertise")}
        </div>
        <div>
          <p className={label}>Qualifications (optional)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUALIFICATIONS.map((q) => (
              <label key={q} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" className="size-4 accent-brand-600" checked={f.qualifications.includes(q)} onChange={() => toggle("qualifications", q)} />
                {q}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section n={3} title="Work details">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ap-rights">
              Work rights
            </label>
            <select id="ap-rights" className={input} value={f.workRights} onChange={(e) => set("workRights", e.target.value)}>
              <option value="">Select…</option>
              {WORK_RIGHTS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </div>
          <div>
            <p className={label}>Employment type (preferred)</p>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_TYPES.map((t) => (
                <button type="button" key={t} aria-pressed={f.employmentType.includes(t)} onClick={() => toggle("employmentType", t)} className={chip(f.employmentType.includes(t))}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="ap-loc">
              Preferred locations / areas<span className="text-coral-600">*</span>
            </label>
            <input
              id="ap-loc"
              className={input}
              list={areas.length ? "ap-areas" : undefined}
              placeholder="e.g. Newcastle CBD, Maitland, Hunter Valley"
              value={f.locations}
              onChange={(e) => set("locations", e.target.value)}
              aria-invalid={!!errors.locations}
            />
            {areas.length > 0 && (
              <datalist id="ap-areas">
                {areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            )}
            {err("locations")}
          </div>
          <div>
            <label className={label} htmlFor="ap-lang">
              Languages (optional)
            </label>
            <input id="ap-lang" className={input} value={f.languages} onChange={(e) => set("languages", e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ap-li">
              LinkedIn / portfolio URL (optional)
            </label>
            <input id="ap-li" type="url" className={input} placeholder="https://" value={f.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} aria-invalid={!!errors.linkedinUrl} />
            {err("linkedinUrl")}
          </div>
        </div>
        <div>
          <p className={label}>Shift types</p>
          <div className="flex flex-wrap gap-2">
            {SHIFT_TYPES.map((t) => (
              <button type="button" key={t} aria-pressed={f.shiftTypes.includes(t)} onClick={() => toggle("shiftTypes", t)} className={chip(f.shiftTypes.includes(t))}>
                {t}
              </button>
            ))}
            <label className={`${chip(f.ownTransport)} flex cursor-pointer items-center gap-2`}>
              <input type="checkbox" className="sr-only" checked={f.ownTransport} onChange={(e) => set("ownTransport", e.target.checked)} />
              Own transport
            </label>
          </div>
        </div>
      </Section>

      <Section n={4} title="Availability">
        <div className="flex flex-wrap gap-2">
          {DAY_PARTS.map((p) => (
            <button type="button" key={p} onClick={() => setSlots(DAYS.map((d) => slot(d, p)), true)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold capitalize text-ink hover:border-brand-500">
              All {p}
            </button>
          ))}
          <button type="button" onClick={() => set("availability", [])} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-coral-600 hover:border-coral-500">
            Clear all
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-sand">
              <tr>
                <th className="w-16 px-2 py-2" />
                {DAY_PARTS.map((p) => (
                  <th key={p} className="px-1 py-2">
                    <button type="button" onClick={() => toggleGroup(DAYS.map((d) => slot(d, p)))} className="text-xs font-bold capitalize text-ink hover:text-brand-700">
                      {p}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DAYS.map((d) => (
                <tr key={d}>
                  <th className="px-2 py-1.5 text-left">
                    <button type="button" onClick={() => toggleGroup(DAY_PARTS.map((p) => slot(d, p)))} className="text-sm font-bold text-ink hover:text-brand-700">
                      {d}
                    </button>
                  </th>
                  {DAY_PARTS.map((p) => (
                    <td key={p} className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        aria-pressed={has(d, p)}
                        aria-label={`${d} ${p}`}
                        onClick={() => toggleGroup([slot(d, p)])}
                        className={`h-9 w-full max-w-24 rounded-lg border text-xs font-semibold transition ${has(d, p) ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-soft hover:border-brand-500"}`}
                      >
                        {has(d, p) ? "✓" : ""}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-soft">Tip: tap a day or a column heading to toggle the whole row or column.</p>
      </Section>

      <Section n={5} title="Documents">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className={label}>Resume / CV (PDF)</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink hover:border-brand-500">
              <FileText className="size-5 text-brand-600" aria-hidden />
              <span className="truncate">{resume ? resume.name : "Choose PDF (max 8 MB)"}</span>
              <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </label>
            {err("resume")}
          </div>
          <div>
            <p className={label}>Certificates (PDF/JPG/PNG, up to {MAX_CERTS})</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink hover:border-brand-500">
              <Upload className="size-5 text-brand-600" aria-hidden />
              <span>{certs.length ? `${certs.length} file(s) selected` : "Choose files"}</span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => setCerts([...certs, ...Array.from(e.target.files ?? [])].slice(0, MAX_CERTS))}
              />
            </label>
            {certs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {certs.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-sand px-3 py-1.5 text-xs text-ink">
                    <span className="truncate">{c.name}</span>
                    <button type="button" onClick={() => setCerts(certs.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`}>
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-ink-soft">e.g. RSA, WWCC, police check, food safety, first aid.</p>
            {err("certificates")}
          </div>
        </div>
      </Section>

      <Section n={6} title="References & emergency contact">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["referee1", "Referee 1 (name & phone)"],
              ["referee2", "Referee 2 (name & phone)"],
              ["emergencyName", "Emergency contact name"],
              ["emergencyPhone", "Emergency contact phone"],
            ] as const
          ).map(([k, l]) => (
            <div key={k}>
              <label className={label} htmlFor={`ap-${k}`}>
                {l}
              </label>
              <input id={`ap-${k}`} className={input} value={f[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      <Section n={7} title="Privacy, consent & declaration">
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-line bg-sand p-4 text-sm leading-relaxed text-ink-soft">
          <p>
            <strong className="text-ink">What we collect:</strong> contact and identity details, photo, work history, availability, qualifications and clearances (e.g. RSA, WWCC, police check), work rights/visa, preferred locations and referees.
          </p>
          <p>
            <strong className="text-ink">Why:</strong> labour-hire placement and rostering, WHS and Fair Work compliance, payroll onboarding, client suitability and shift allocation.
          </p>
          <p>
            <strong className="text-ink">Sharing:</strong> with prospective and current clients for engagement, trusted service providers (secure hosting, messaging) and regulators where required by law.
          </p>
          <p>
            <strong className="text-ink">Retention & your rights:</strong> we keep your information only as long as needed for business, accounting or legal purposes. You can ask to access or correct it, or withdraw consent (which may affect placement), and you can complain to us or the OAIC.
          </p>
          <p>
            <strong className="text-ink">Checks:</strong> we may verify certifications or clearances with your permission, and you authorise us to contact your referees.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={!!errors.consent} />
          <span>
            I have read and agree to the Privacy &amp; Consent terms.<span className="text-coral-600">*</span>
          </span>
        </label>
        {err("consent")}
        <div>
          <p className="text-sm text-ink-soft">
            I declare the information provided is true and complete. I understand providing false or misleading information may affect my engagement.
          </p>
          <label className={`${label} mt-3`} htmlFor="ap-sig">
            Type your full name as your signature<span className="text-coral-600">*</span>
          </label>
          <input id="ap-sig" className={`${input} font-semibold italic`} value={f.signature} onChange={(e) => set("signature", e.target.value)} aria-invalid={!!errors.signature} />
          {err("signature")}
        </div>
      </Section>

      {error && (
        <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-70"
      >
        {busy ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Sending application…
          </>
        ) : (
          "Send application"
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <Lock className="size-3.5" aria-hidden /> Your documents are stored privately and only seen by our team.
      </p>
    </form>
  );
}
