import { ExternalLink, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapsLink } from "@/lib/geo";
import { deleteCostCentre, saveCostCentre } from "@/app/admin/actions/roster";
import { RosterTabs } from "@/components/admin/RosterTabs";
import { Area, Badge, Check, Field, Notice, PageHeader, Panel } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";

const ERR: Record<string, string> = { name: "A site with that name already exists.", inuse: "This site has employees or roster history. Deactivate it instead.", coordinates: "Enter a valid latitude (−90 to 90) and longitude (−180 to 180)." };

export default async function SitesPage({ searchParams }: PageProps<"/admin/roster/sites">) {
  const user = await requireUser();
  const sp = await searchParams;
  const sites = await db.costCentre.findMany({ include: { _count: { select: { employees: true, shifts: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  const form = (s?: (typeof sites)[number]) => (
    <form action={saveCostCentre} className="grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Name" name="name" required defaultValue={s?.name} />
      <Field label="Geofence radius (metres)" name="geofenceRadius" type="number" min={0} defaultValue={s?.geofenceRadius ?? 200} hint="Staff must be within this distance to sign in and out. 0 turns it off." />
      <Field label="Full address" name="address" className="sm:col-span-2" defaultValue={s?.address ?? ""} hint="Used for the map pin and geofence (looked up automatically)." />
      <Field label="Contact person" name="contactName" defaultValue={s?.contactName ?? ""} />
      <Field label="Contact phone" name="contactPhone" defaultValue={s?.contactPhone ?? ""} />
      <Field label="Latitude" name="lat" defaultValue={s?.lat ?? ""} />
      <Field label="Longitude" name="lng" defaultValue={s?.lng ?? ""} />
      <Area label="Notes / instructions for staff" name="notes" rows={2} className="sm:col-span-2" defaultValue={s?.notes ?? ""} hint="Access codes, parking, special instructions — shown to staff on their shift." />
      <div className="flex items-center gap-4 sm:col-span-2">
        <Check label="Active" name="active" defaultChecked={s?.active ?? true} />
        <SubmitButton variant={s ? "ghost" : "primary"}>{s ? "Save site" : "Add site"}</SubmitButton>
      </div>
    </form>
  );
  return (
    <>
      <PageHeader title="Sites (cost centres)" intro="Schools, venues and other places your staff work. Each site's geofence controls where staff can sign in and out." />
      <RosterTabs active="/admin/roster/sites" />
      {sp.saved && <Notice>Saved{sp.nogeo ? " — but the address couldn't be found on the map. Enter latitude/longitude manually for the geofence to work." : "."}</Notice>}
      {sp.deleted && <Notice>Site deleted.</Notice>}
      {typeof sp.error === "string" && <Notice tone="bad">{ERR[sp.error] ?? "Could not save."}</Notice>}
      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Panel title="Add site" className="xl:sticky xl:top-6 xl:self-start">
          {form()}
        </Panel>
        <div className="space-y-3">
          {sites.map((s) => {
            const map = mapsLink(s.lat, s.lng, s.address);
            return (
              <details key={s.id} className="group rounded-xl border border-line bg-white">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-3">
                  <span className="font-bold text-ink">{s.name}</span>
                  <Badge tone="PLANNED">{s._count.employees} staff</Badge>
                  <Badge tone={s.geofenceRadius ? "warn" : undefined}>{s.geofenceRadius ? `${s.geofenceRadius} m fence` : "No fence"}</Badge>
                  {s.lat == null && s.address && <Badge tone="bad">Not on map</Badge>}
                  {!s.active && <Badge>Inactive</Badge>}
                  <span className="flex w-full items-center gap-1 text-xs text-ink-soft">
                    <MapPin className="size-3" /> {s.address || "No address"}
                    {map && (
                      <a href={map} target="_blank" className="ml-1 inline-flex items-center gap-0.5 text-brand-700 hover:underline">
                        Map <ExternalLink className="size-3" />
                      </a>
                    )}
                    {s.contactName && <span className="ml-2">· {s.contactName} {s.contactPhone}</span>}
                  </span>
                </summary>
                <div className="border-t border-line p-4">
                  {form(s)}
                  {user.role === "ADMIN" && s._count.employees === 0 && s._count.shifts === 0 && (
                    <form action={deleteCostCentre} className="mt-3">
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="ghost" className="text-coral-600" confirm={`Delete ${s.name}?`}>
                        Delete site
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </>
  );
}
