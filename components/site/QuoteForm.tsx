"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock } from "lucide-react";
import { beacon, getAttribution, trackLead } from "@/lib/track-client";

type Opt = { slug: string; name: string };

const EXTRAS = ["Oven", "Carpet steam clean", "Inside windows", "Walls / marks", "Blinds", "Fridge", "Balcony / patio", "Garage"];
const RESIDENTIAL = ["end-of-lease-cleaning", "house-cleaning", "deep-cleaning", "pre-sale-cleaning", "airbnb-cleaning", "carpet-cleaning", "window-cleaning", "ndis-cleaning"];

const input =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[0.95rem] text-ink placeholder:text-ink-soft/60 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-coral-500";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink";

export function QuoteForm({
  services,
  areas = [],
  defaultService = "",
  defaultSuburb = "",
  variant = "compact",
  title,
  subtitle,
}: {
  services: Opt[];
  areas?: string[];
  defaultService?: string;
  defaultSuburb?: string;
  variant?: "compact" | "full" | "contact";
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const mountedAt = useRef(0);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [f, setF] = useState({
    serviceSlug: defaultService,
    propertyType: "House",
    bedrooms: "2",
    bathrooms: "1",
    frequency: "",
    preferredDate: "",
    extras: [] as string[],
    name: "",
    phone: "",
    email: "",
    suburb: defaultSuburb,
    message: "",
    website: "",
  });

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const set = (k: keyof typeof f, v: string | string[]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((e) => ({ ...e, [k]: "" }));
  };
  const onFocus = () => {
    if (started.current) return;
    started.current = true;
    beacon("form_start", { label: variant });
  };

  const isResidential = RESIDENTIAL.includes(f.serviceSlug);
  const isRegular = f.serviceSlug === "house-cleaning" || f.serviceSlug === "commercial-cleaning" || f.serviceSlug === "hospitality-cleaning";
  const serviceName = services.find((s) => s.slug === f.serviceSlug)?.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (variant === "full" && step === 1) {
      if (!f.serviceSlug) {
        setFieldErrors({ serviceSlug: "Please choose a service" });
        return;
      }
      setStep(2);
      return;
    }
    setBusy(true);
    setError("");
    setFieldErrors({});
    const formType = variant === "full" ? "quote" : variant === "contact" ? "contact" : "quick";
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType,
          name: f.name,
          phone: f.phone,
          email: f.email,
          suburb: f.suburb,
          serviceSlug: f.serviceSlug || undefined,
          serviceName,
          message: f.message,
          website: f.website,
          elapsedMs: Date.now() - mountedAt.current,
          ...(variant === "full"
            ? {
                propertyType: isResidential ? f.propertyType : undefined,
                bedrooms: isResidential ? f.bedrooms : undefined,
                bathrooms: isResidential ? f.bathrooms : undefined,
                frequency: f.frequency || undefined,
                preferredDate: f.preferredDate || undefined,
                extras: isResidential ? f.extras : undefined,
              }
            : {}),
          attribution: getAttribution(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setFieldErrors(data.fieldErrors || {});
        setError(data.error || "Something went wrong. Please call us instead.");
        if (data.fieldErrors && variant === "full" && data.fieldErrors.serviceSlug) setStep(1);
        setBusy(false);
        return;
      }
      trackLead(data.id, f.serviceSlug, formType);
      try {
        sessionStorage.setItem("bc_lead", JSON.stringify({ id: data.id, name: f.name.split(" ")[0], service: serviceName }));
      } catch {}
      router.push("/thank-you");
    } catch {
      setError("Network error. Please try again or call us.");
      setBusy(false);
    }
  }

  const err = (k: string) =>
    fieldErrors[k] ? (
      <p className="mt-1 text-sm font-medium text-coral-600" role="alert">
        {fieldErrors[k]}
      </p>
    ) : null;

  const contactFields = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`${variant}-name`}>
            Name<span className="text-coral-600">*</span>
          </label>
          <input id={`${variant}-name`} className={input} autoComplete="name" required value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!fieldErrors.name} />
          {err("name")}
        </div>
        <div>
          <label className={labelCls} htmlFor={`${variant}-phone`}>
            Phone<span className="text-coral-600">*</span>
          </label>
          <input
            id={`${variant}-phone`}
            className={input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="04xx xxx xxx"
            value={f.phone}
            onChange={(e) => set("phone", e.target.value)}
            aria-invalid={!!fieldErrors.phone}
          />
          {err("phone")}
        </div>
        <div>
          <label className={labelCls} htmlFor={`${variant}-email`}>
            Email
          </label>
          <input id={`${variant}-email`} className={input} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!fieldErrors.email} />
          {err("email")}
        </div>
        <div>
          <label className={labelCls} htmlFor={`${variant}-suburb`}>
            Suburb
          </label>
          <input
            id={`${variant}-suburb`}
            className={input}
            list={areas.length ? `${variant}-suburbs` : undefined}
            autoComplete="address-level2"
            placeholder="e.g. Merewether"
            value={f.suburb}
            onChange={(e) => set("suburb", e.target.value)}
          />
          {areas.length > 0 && (
            <datalist id={`${variant}-suburbs`}>
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          )}
        </div>
      </div>
      <div className="mt-3">
        <label className={labelCls} htmlFor={`${variant}-message`}>
          {variant === "contact" ? "Message" : "Anything we should know?"}
        </label>
        <textarea
          id={`${variant}-message`}
          className={`${input} min-h-[5.5rem]`}
          rows={variant === "compact" ? 2 : 4}
          placeholder={variant === "contact" ? "How can we help?" : "Property size, access, timing…"}
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </div>
    </>
  );

  const serviceSelect = (
    <div>
      <label className={labelCls} htmlFor={`${variant}-service`}>
        Service{variant !== "contact" && <span className="text-coral-600">*</span>}
      </label>
      <select
        id={`${variant}-service`}
        className={input}
        required={variant !== "contact"}
        value={f.serviceSlug}
        onChange={(e) => set("serviceSlug", e.target.value)}
        aria-invalid={!!fieldErrors.serviceSlug}
      >
        <option value="">{variant === "contact" ? "General enquiry" : "Choose a service…"}</option>
        {services.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
        <option value="other">Something else</option>
      </select>
      {err("serviceSlug")}
    </div>
  );

  return (
    <form onSubmit={submit} onFocusCapture={onFocus} noValidate={false} className="relative" aria-label={title || "Quote request"}>
      {title && <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}

      {/* honeypot */}
      <div aria-hidden className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>

      <div className={title ? "mt-5" : ""}>
        {variant === "full" && (
          <ol className="mb-5 flex items-center gap-2 text-sm font-semibold" aria-label="Progress">
            {["Your clean", "Your details"].map((t, i) => (
              <li key={t} className={`flex items-center gap-2 ${step === i + 1 ? "text-brand-700" : step > i + 1 ? "text-brand-600" : "text-ink-soft"}`}>
                <span className={`flex size-7 items-center justify-center rounded-full text-xs ${step >= i + 1 ? "bg-brand-600 text-white" : "bg-line text-ink-soft"}`}>
                  {step > i + 1 ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                {t}
                {i === 0 && <span className="mx-1 h-px w-8 bg-line" />}
              </li>
            ))}
          </ol>
        )}

        {variant === "full" && step === 1 && (
          <div className="space-y-4">
            {serviceSelect}
            {isResidential && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls} htmlFor="q-type">
                    Property
                  </label>
                  <select id="q-type" className={input} value={f.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
                    {["House", "Apartment / unit", "Townhouse", "Studio"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="q-bed">
                    Bedrooms
                  </label>
                  <select id="q-bed" className={input} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)}>
                    {["1", "2", "3", "4", "5", "6"].map((o) => (
                      <option key={o} value={o}>
                        {o === "6" ? "6+" : o}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="q-bath">
                    Bathrooms
                  </label>
                  <select id="q-bath" className={input} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)}>
                    {["1", "2", "3", "4"].map((o) => (
                      <option key={o} value={o}>
                        {o === "4" ? "4+" : o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {isRegular && (
                <div>
                  <label className={labelCls} htmlFor="q-freq">
                    How often?
                  </label>
                  <select id="q-freq" className={input} value={f.frequency} onChange={(e) => set("frequency", e.target.value)}>
                    <option value="">Choose…</option>
                    {["One-off", "Weekly", "Fortnightly", "Monthly", "Several times a week", "Daily"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="q-date">
                  Preferred date
                </label>
                <input id="q-date" type="date" className={input} value={f.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} />
              </div>
            </div>
            {isResidential && (
              <fieldset>
                <legend className={labelCls}>Add-ons (optional)</legend>
                <div className="flex flex-wrap gap-2">
                  {EXTRAS.map((x) => {
                    const on = f.extras.includes(x);
                    return (
                      <button
                        type="button"
                        key={x}
                        aria-pressed={on}
                        onClick={() => set("extras", on ? f.extras.filter((y) => y !== x) : [...f.extras, x])}
                        className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink hover:border-brand-500"}`}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {variant === "full" && step === 2 && contactFields}

        {variant === "compact" && (
          <div className="space-y-3">
            {serviceSelect}
            {contactFields}
          </div>
        )}

        {variant === "contact" && (
          <div className="space-y-3">
            {contactFields}
            {serviceSelect}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-coral-50 px-4 py-3 text-sm font-medium text-coral-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {variant === "full" && step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-3 font-semibold text-ink hover:bg-sand">
              <ArrowLeft className="size-4" /> Back
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin" /> Sending…
              </>
            ) : variant === "full" && step === 1 ? (
              <>
                Next: your details <ArrowRight className="size-4" />
              </>
            ) : variant === "contact" ? (
              "Send message"
            ) : (
              "Get my free quote"
            )}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          <Lock className="size-3.5" aria-hidden /> No spam. We only use your details to respond to your request.
        </p>
      </div>
    </form>
  );
}
