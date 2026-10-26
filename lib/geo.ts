/** Great-circle distance in metres. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Server-side address lookup via OpenStreetMap Nominatim (same provider the old portal used). */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const q = address.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": "BrillianceCleaningRoster/1.0 (admin@brillianceservices.com.au)" }, cache: "no-store" });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    if (!rows.length) return null;
    return { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon) };
  } catch {
    return null;
  }
}

export function mapsLink(lat?: number | null, lng?: number | null, address?: string | null) {
  if (lat != null && lng != null) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  return null;
}

export type LocationFix = { lat: number | null; lng: number | null; accuracy: number | null };
export type Geofence = { lat: number | null; lng: number | null; radius: number };

/** A configured fence requires both a site pin and a valid GPS fix. */
export function checkGeofence(site: Geofence, loc: LocationFix) {
  const distance = loc.lat != null && loc.lng != null && site.lat != null && site.lng != null
    ? distanceMeters(loc.lat, loc.lng, site.lat, site.lng) : null;
  if (site.radius <= 0) return { distance };
  if (site.lat == null || site.lng == null) return { distance, error: "This site's map pin is missing. Please contact the office." };
  if (distance == null) return { distance, error: "Location is required at this site. Please allow location access." };
  const slack = Math.min(Math.max(loc.accuracy ?? 0, 0), 150);
  if (distance > site.radius + slack) return { distance, error: `You're about ${distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`} from the site. You need to be within ${site.radius} m.` };
  return { distance };
}
