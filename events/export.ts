// events/research/*.json (researched event venues) -> events/inventory.json in the shape the shared app modules read.
// Field mapping (internal names are the housing app's): total_beds = capacity (standing, else seated),
// asking_per_bed = price per hour, kitchen_status = food allowed (communal = yes, none = no), safety_flag = AV on site
// (ok = yes), property_type = venue type. Never invents values: anything the research did not find stays null.
// Walk minutes are estimated from straight-line distance to the market anchor (x1.25 for streets, 80 m per minute).
import fs from 'node:fs';
import path from 'node:path';

const JPY_PER_USD = 150;   // approximate rate for comparing Kobe prices in dollars; the yen price is kept as published
const base = JSON.parse(fs.readFileSync('data/inventory/inventory.json', 'utf8'));
const geo: Record<string, { lat: number; lng: number } | null> = fs.existsSync('events/geocache.json') ? JSON.parse(fs.readFileSync('events/geocache.json', 'utf8')) : {};
const research = fs.readdirSync('events/research').filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join('events/research', f), 'utf8')));
const markets = new Map<string, any>(base.markets.map((m: any) => [m.id, m]));
const EAST_BAY = /\b(oakland|berkeley|emeryville|alameda|richmond)\b/i;
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const usd = (v: number | null, cur: string) => v == null ? null : cur === 'JPY' ? Math.round(v / JPY_PER_USD) : v;

const seen = new Set<string>();
const records = research.filter((r: any) => !seen.has(r.id) && seen.add(r.id)).map((r: any) => {
  const g = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : r.address ? geo[r.address] ?? null : null;
  const anchor = markets.get(r.market)?.anchor;
  const d = g && anchor ? km(g, anchor) : null;
  const am: string[] = r.amenities || [];
  const food = r.outside_food_allowed === true || am.some((a) => ['catering_allowed', 'in_house_catering', 'kitchen'].includes(a));
  const av = r.av_included === true || am.some((a) => ['projector', 'screen', 'pa_mics'].includes(a));
  const cur = r.currency || markets.get(r.market)?.currency || 'USD';
  const conv = (v: number | null) => usd(v, cur);
  return {
    id: r.id, property_name: r.name, name_detail: r.operator && r.operator !== r.name ? r.operator : null,
    inventory_class: 'candidate', deal_status: 'not_contacted', market: r.market, city: r.city, address: r.address,
    lat: g?.lat ?? null, lng: g?.lng ?? null, geo_precision: g ? 'address' : null, neighborhood: r.neighborhood,
    east_bay: EAST_BAY.test(`${r.city} ${r.address || ''}`),
    operator_name: r.operator, operator_type: 'operator', property_type: r.venue_type,
    total_rooms: null, total_beds: r.capacity_standing ?? r.capacity_seated, available_beds: null,
    capacity_standing: r.capacity_standing, capacity_seated: r.capacity_seated, sqft_total: r.sqft, amenities: am,
    kitchen_status: food ? 'communal' : r.outside_food_allowed === false && !am.includes('in_house_catering') ? 'none' : 'unknown',
    safety_flag: av ? 'ok' : null, safety_reviews: null,
    outside_food_allowed: r.outside_food_allowed, av_included: r.av_included, exclusive_use: r.exclusive_use, nonprofit_discount: r.nonprofit_discount,
    asking_per_bed: conv(r.price_per_hour), price_day: conv(r.price_per_day), min_spend: conv(r.min_spend), min_hours: r.min_hours,
    fx_note: cur === 'JPY' && (r.price_per_hour != null || r.price_per_day != null || r.min_spend != null) ? `converted from yen at ${JPY_PER_USD} JPY per USD` : null,
    asking_raw: r.price_raw, verified_per_bed: null, negotiated_per_bed: null, negotiated_monthly: null, currency: cur,
    minimum_stay_days: null, available_from: null,
    frontier_walk_minutes: null, frontier_transit_minutes_est: d != null ? Math.round(d * 1000 * 1.25 / 80) : null,
    distance_miles: d != null ? +(d / 1.609).toFixed(1) : null,
    contact_name: r.contact_name, contact_org: r.operator, contact_phone: r.contact_phone, contact_email: r.contact_email, contact_path: r.contact_path,
    website_url: r.website_url, listing_url: null, source_links: r.source_links || [], source_type: 'web-research',
    last_price_verified_at: null, last_availability_verified_at: null, last_contacted_at: null, next_followup_at: null,
    last_checked_at: r.last_checked_at, created_at: r.last_checked_at, updated_at: r.last_checked_at,
    haus_node_ids: [], cohort_ids: [], notes: r.notes ? `[${r.last_checked_at} web research] ${r.notes}` : '',
  };
});
const out = { ...base, generated: new Date().toISOString().slice(0, 10), haus_nodes: base.haus_nodes.map((n: any) => ({ ...n, profile: null, linked_candidate_ids: [] })), records };
fs.writeFileSync('events/inventory.json', JSON.stringify(out));
console.log(`${records.length} venues (${records.filter((r) => r.lat != null).length} on the map); by market: ${[...new Set(records.map((r) => r.market))].map((m) => `${m}=${records.filter((r) => r.market === m).length}`).join(', ')}; with an hourly price: ${records.filter((r) => r.asking_per_bed != null).length}`);
