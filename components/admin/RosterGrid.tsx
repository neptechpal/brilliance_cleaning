"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardPaste, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import { copyWeek, deleteShift, saveShift } from "@/app/admin/actions/roster";

type Emp = { id: number; name: string; color: string; costCentreId: number | null };
type Site = { id: number; name: string; address: string | null };
type Shift = { id: number; employeeId: number; costCentreId: number | null; siteName: string; siteAddress: string | null; date: string; startTime: string; endTime: string; notes: string | null; status: string };
type Group = { name: string; employees: Emp[] };

const fmt = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
};

export function RosterGrid({
  days,
  today,
  groups,
  shifts,
  sites,
  employees,
  prevMonday,
}: {
  days: { date: string; label: string; day: string }[];
  today: string;
  groups: Group[];
  shifts: Shift[];
  sites: Site[];
  employees: Emp[];
  prevMonday: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState<null | { shift?: Shift; employeeId: number; date: string }>(null);
  const [clip, setClip] = useState<Shift | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employeeId: 0, costCentreId: "", siteName: "", siteAddress: "", date: "", startTime: "05:00", endTime: "09:00", notes: "", repeat: [] as string[] });

  const open = (employeeId: number, date: string, shift?: Shift) => {
    if (clip && !shift) {
      start(async () => {
        const res = await saveShift({ employeeId, date, costCentreId: clip.costCentreId, siteName: clip.siteName, siteAddress: clip.siteAddress ?? "", startTime: clip.startTime, endTime: clip.endTime, notes: clip.notes ?? "" });
        if (!res.ok) return setError(res.error || "Could not paste shift");
        setError("");
        router.refresh();
      });
      return;
    }
    const emp = employees.find((e) => e.id === employeeId);
    setError("");
    setForm({
      employeeId,
      costCentreId: String(shift?.costCentreId ?? (shift ? "" : emp?.costCentreId ?? "")),
      siteName: shift && !shift.costCentreId ? shift.siteName : "",
      siteAddress: shift && !shift.costCentreId ? shift.siteAddress ?? "" : "",
      date,
      startTime: shift?.startTime ?? "05:00",
      endTime: shift?.endTime ?? "09:00",
      notes: shift?.notes ?? "",
      repeat: [],
    });
    setModal({ shift, employeeId, date });
  };

  const save = () =>
    start(async () => {
      const res = await saveShift({
        id: modal?.shift?.id,
        employeeId: Number(form.employeeId),
        costCentreId: form.costCentreId ? Number(form.costCentreId) : null,
        siteName: form.siteName,
        siteAddress: form.siteAddress,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        notes: form.notes,
        repeatDays: modal?.shift ? [] : form.repeat,
      });
      if (!res.ok) return setError(res.error || "Could not save");
      setModal(null);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (modal?.shift) {
        const res = await deleteShift(modal.shift.id);
        if (!res.ok) return setError(res.error || "Could not cancel shift");
      }
      setModal(null);
      router.refresh();
    });

  const byCell = (empId: number, date: string) => shifts.filter((s) => s.employeeId === empId && s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const input = "w-full rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <>
      {error && !modal && <p role="alert" className="mb-3 text-sm text-coral-700">{error}</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {clip ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 ring-1 ring-amber-200">
            <ClipboardPaste className="size-4" /> Paste mode: click any empty day to add “{clip.siteName} {fmt(clip.startTime)}–{fmt(clip.endTime)}”
            <button onClick={() => setClip(null)} className="ml-1 rounded p-0.5 hover:bg-amber-100" aria-label="Stop pasting">
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <span className="text-ink-soft">Click an empty day to add a shift · click a shift to edit or copy it.</span>
        )}
        <button
          onClick={() =>
            start(async () => {
              if (!window.confirm("Copy all shifts from last week into this week?")) return;
              const res = await copyWeek(prevMonday, days[0].date);
              if (!res.ok) return setError(res.error || "Could not copy week");
              setError("");
              router.refresh();
            })
          }
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink hover:bg-sand"
        >
          <Copy className="size-4" /> Copy last week
        </button>
        {pending && <Loader2 className="size-4 animate-spin text-brand-600" />}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead className="bg-sand">
            <tr>
              <th className="w-48 px-3 py-2 text-left text-xs uppercase tracking-wider text-ink-soft">Employee</th>
              {days.map((d) => (
                <th key={d.date} className={`px-1 py-2 text-center ${d.date === today ? "text-brand-700" : "text-ink"}`}>
                  <span className="block text-[11px] font-bold uppercase tracking-wider">{d.day}</span>
                  <span className={`mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-extrabold ${d.date === today ? "bg-brand-600 text-white" : ""}`}>{d.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <FragmentRows key={g.name} group={g} days={days} today={today} byCell={byCell} open={open} clip={clip} />
            ))}
            {!groups.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-soft">
                  No active employees yet — add them under Roster → Employees.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink">{modal.shift ? "Edit shift" : "Add shift"}</h2>
              <button onClick={() => setModal(null)} aria-label="Close" className="rounded-lg p-1 hover:bg-sand">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="block text-xs font-semibold">
                Employee
                <select className={input} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: Number(e.target.value) })}>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Site
                <select className={input} value={form.costCentreId} onChange={(e) => setForm({ ...form, costCentreId: e.target.value })}>
                  <option value="">Other / one-off site…</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {!form.costCentreId && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className={input} placeholder="Site name" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} />
                  <input className={input} placeholder="Address (optional)" value={form.siteAddress} onChange={(e) => setForm({ ...form, siteAddress: e.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-xs font-semibold">
                  Date
                  <input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold">
                  Start
                  <input type="time" className={input} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold">
                  End
                  <input type="time" className={input} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Notes for the employee
                <textarea rows={2} className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              {!modal.shift && (
                <fieldset>
                  <legend className="text-xs font-semibold">Also add on</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {days
                      .filter((d) => d.date !== form.date)
                      .map((d) => {
                        const on = form.repeat.includes(d.date);
                        return (
                          <button
                            type="button"
                            key={d.date}
                            onClick={() => setForm({ ...form, repeat: on ? form.repeat.filter((x) => x !== d.date) : [...form.repeat, d.date] })}
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}
                          >
                            {d.day} {d.label}
                          </button>
                        );
                      })}
                  </div>
                </fieldset>
              )}
              {error && <p className="rounded-lg bg-coral-50 px-3 py-2 text-sm text-coral-700">{error}</p>}
              <div className="mt-1 flex flex-wrap gap-2">
                <button onClick={save} disabled={pending} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
                  {pending && <Loader2 className="size-4 animate-spin" />} Save shift
                </button>
                {modal.shift && (
                  <>
                    <button
                      onClick={() => {
                        setClip(modal.shift!);
                        setModal(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold"
                    >
                      <Copy className="size-4" /> Copy
                    </button>
                    <button onClick={remove} className="inline-flex items-center gap-1.5 rounded-lg border border-coral-200 px-3 py-2 text-sm font-semibold text-coral-600 hover:bg-coral-50">
                      <Trash2 className="size-4" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FragmentRows({
  group,
  days,
  today,
  byCell,
  open,
  clip,
}: {
  group: Group;
  days: { date: string }[];
  today: string;
  byCell: (empId: number, date: string) => Shift[];
  open: (employeeId: number, date: string, shift?: Shift) => void;
  clip: Shift | null;
}) {
  return (
    <>
      <tr className="bg-brand-50/60">
        <td colSpan={8} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
          {group.name} <span className="font-semibold text-ink-soft">· {group.employees.length} staff</span>
        </td>
      </tr>
      {group.employees.map((e) => (
        <tr key={e.id} className="border-t border-line">
          <td className="px-3 py-2">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: e.color }}>
                {e.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="truncate">{e.name}</span>
            </span>
          </td>
          {days.map((d) => {
            const list = byCell(e.id, d.date);
            return (
              <td key={d.date} className={`h-16 border-l border-line p-1 align-top ${d.date === today ? "bg-brand-50/40" : ""}`}>
                <div className="flex h-full flex-col gap-1">
                  {list.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => open(e.id, d.date, s)}
                      className="w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold leading-tight text-white"
                      style={{ background: e.color, opacity: s.status === "COMPLETED" ? 0.6 : 1 }}
                      title={`${s.siteName} ${fmt(s.startTime)}–${fmt(s.endTime)}${s.notes ? ` · ${s.notes}` : ""}`}
                    >
                      {fmt(s.startTime)}–{fmt(s.endTime)}
                      <span className="block truncate font-medium opacity-90">{s.siteName}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => open(e.id, d.date)}
                    className={`flex flex-1 items-center justify-center rounded-md border border-dashed text-ink-soft/50 hover:border-brand-500 hover:text-brand-600 ${clip ? "border-amber-300 bg-amber-50/50" : "border-transparent"}`}
                    aria-label={`Add shift for ${e.name} on ${d.date}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
