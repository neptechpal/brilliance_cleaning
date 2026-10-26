"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, MapPin, Pencil, Plus, X } from "lucide-react";
import { saveAttendance, setAttendancePaid, setAttendanceStatus } from "@/app/admin/actions/roster";

export type AttRow = {
  id: number;
  employeeId: number;
  employee: string;
  site: string;
  shiftId: number | null;
  date: string; // sign-in Sydney date
  rostered: string | null;
  signIn: string; // HH:MM Sydney
  signOutDate: string | null;
  signOut: string | null;
  inAddress: string | null;
  inMap: string | null;
  inDistance: number | null;
  outAddress: string | null;
  outMap: string | null;
  duration: string;
  minutes: number | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED";
  paid: boolean;
  manual: boolean;
};

type Opt = { id: number; label: string };

export function AttendanceTable({ rows, employees, shifts }: { rows: AttRow[]; employees: Opt[]; shifts: (Opt & { employeeId: number; date: string })[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<number[]>([]);
  const [edit, setEdit] = useState<null | Partial<AttRow> & { id?: number }>(null);
  const [error, setError] = useState("");
  const all = rows.length > 0 && sel.length === rows.length;

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      setSel([]);
      router.refresh();
    });

  const save = () =>
    start(async () => {
      if (!edit?.employeeId) return setError("Choose an employee.");
      const res = await saveAttendance({
        id: edit.id,
        employeeId: Number(edit.employeeId),
        shiftId: edit.shiftId ? Number(edit.shiftId) : null,
        date: edit.date ?? "",
        signIn: edit.signIn ?? "",
        signOutDate: edit.signOutDate ?? undefined,
        signOut: edit.signOut ?? undefined,
        notes: edit.notes ?? "",
      });
      if (!res.ok) return setError(res.error ?? "Could not save");
      setEdit(null);
      router.refresh();
    });

  const totalHours = rows.reduce((a, r) => a + (r.minutes ?? 0), 0) / 60;
  const input = "w-full rounded-lg border border-line px-3 py-2 text-sm";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setEdit({ date: new Date().toISOString().slice(0, 10), signIn: "05:00", signOut: "09:00" })} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          <Plus className="size-4" /> Manual entry
        </button>
        <button disabled={!sel.length || pending} onClick={() => act(() => setAttendanceStatus(sel, "APPROVED"))} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 disabled:opacity-50">
          <Check className="size-4" /> Approve selected
        </button>
        <button disabled={!sel.length || pending} onClick={() => act(() => setAttendanceStatus(sel, "DECLINED"))} className="inline-flex items-center gap-1.5 rounded-lg bg-coral-50 px-3 py-2 text-sm font-semibold text-coral-700 ring-1 ring-coral-200 disabled:opacity-50">
          <X className="size-4" /> Decline selected
        </button>
        {pending && <Loader2 className="size-4 animate-spin text-brand-600" />}
        <span className="ml-auto text-sm text-ink-soft">
          {rows.length} records · <b className="text-ink">{totalHours.toFixed(1)} h</b>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-line bg-sand text-xs uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-3 py-2.5">
                <input type="checkbox" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} aria-label="Select all" className="size-4 accent-brand-600" />
              </th>
              {["Employee", "Site", "Date", "Rostered", "Sign in", "Location in", "Sign out", "Location out", "Duration", "Status", "Paid", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={sel.includes(r.id) ? "bg-brand-50/50" : ""}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : [...sel, r.id])} aria-label={`Select ${r.employee} ${r.date}`} className="size-4 accent-brand-600" />
                </td>
                <td className="px-3 py-2 font-semibold text-ink">{r.employee}</td>
                <td className="px-3 py-2">
                  {r.site}
                  {r.manual && <span className="ml-1 rounded bg-sand px-1 text-[10px] font-bold text-ink-soft">MANUAL</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.date}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-soft">{r.rostered ?? "No roster"}</td>
                <td className="whitespace-nowrap px-3 py-2">{r.signIn}</td>
                <td className="max-w-[12rem] px-3 py-2 text-xs">
                  {r.inMap ? (
                    <a href={r.inMap} target="_blank" className="inline-flex items-start gap-1 hover:underline">
                      <MapPin className="mt-0.5 size-3 shrink-0 text-brand-600" />
                      <span className="line-clamp-2">{r.inAddress || "Map"}</span>
                    </a>
                  ) : (
                    r.inAddress || "—"
                  )}
                  {r.inDistance != null && <span className="block text-[10px] text-ink-soft">{r.inDistance} m from site</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{r.signOut ? `${r.signOut}${r.signOutDate && r.signOutDate !== r.date ? ` (${r.signOutDate.slice(5)})` : ""}` : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">On site</span>}</td>
                <td className="max-w-[12rem] px-3 py-2 text-xs">
                  {r.outMap ? (
                    <a href={r.outMap} target="_blank" className="inline-flex items-start gap-1 hover:underline">
                      <MapPin className="mt-0.5 size-3 shrink-0 text-brand-600" />
                      <span className="line-clamp-2">{r.outAddress || "Map"}</span>
                    </a>
                  ) : (
                    r.outAddress || "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{r.duration}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "APPROVED" ? "bg-brand-50 text-brand-700" : r.status === "DECLINED" ? "bg-coral-50 text-coral-700" : "bg-amber-50 text-amber-700"}`}>
                    {r.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={r.paid} onChange={(e) => act(() => setAttendancePaid(r.id, e.target.checked))} aria-label="Paid" className="size-4 accent-brand-600" />
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button onClick={() => act(() => setAttendanceStatus([r.id], "APPROVED"))} className="rounded p-1 text-brand-600 hover:bg-brand-50" title="Approve" aria-label="Approve">
                    <Check className="size-4" />
                  </button>
                  <button onClick={() => act(() => setAttendanceStatus([r.id], "DECLINED"))} className="rounded p-1 text-coral-600 hover:bg-coral-50" title="Decline" aria-label="Decline">
                    <X className="size-4" />
                  </button>
                  <button onClick={() => (setError(""), setEdit(r))} className="rounded p-1 text-ink-soft hover:bg-sand" title="Edit" aria-label="Edit">
                    <Pencil className="size-4" />
                  </button>
                  {r.notes && <span className="block max-w-[10rem] truncate text-[10px] text-ink-soft" title={r.notes}>📝 {r.notes}</span>}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-ink-soft">
                  No records for these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{edit.id ? "Edit attendance" : "Manual attendance entry"}</h2>
              <button onClick={() => setEdit(null)} aria-label="Close" className="rounded-lg p-1 hover:bg-sand">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-ink-soft">{edit.id ? "Changes are logged as a manual edit." : "For shifts where staff forgot to sign in or out."}</p>
            <div className="grid gap-3">
              <label className="block text-xs font-semibold">
                Employee
                <select className={input} value={edit.employeeId ?? ""} onChange={(e) => setEdit({ ...edit, employeeId: Number(e.target.value) })}>
                  <option value="">— Select —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Linked shift (optional)
                <select className={input} value={edit.shiftId ?? ""} onChange={(e) => setEdit({ ...edit, shiftId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— None (ad hoc) —</option>
                  {shifts
                    .filter((s) => !edit.employeeId || s.employeeId === edit.employeeId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold">
                  Date
                  <input type="date" className={input} value={edit.date ?? ""} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold">
                  Sign in
                  <input type="time" className={input} value={edit.signIn ?? ""} onChange={(e) => setEdit({ ...edit, signIn: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold">
                  Sign-out date
                  <input type="date" className={input} value={edit.signOutDate ?? edit.date ?? ""} onChange={(e) => setEdit({ ...edit, signOutDate: e.target.value })} />
                </label>
                <label className="block text-xs font-semibold">
                  Sign out
                  <input type="time" className={input} value={edit.signOut ?? ""} onChange={(e) => setEdit({ ...edit, signOut: e.target.value })} />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Notes
                <textarea rows={2} className={input} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </label>
              {error && <p className="rounded-lg bg-coral-50 px-3 py-2 text-sm text-coral-700">{error}</p>}
              <button onClick={save} disabled={pending} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">
                {pending && <Loader2 className="size-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
