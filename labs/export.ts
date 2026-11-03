// labs/research/*.json (researched lab spaces) -> labs/inventory.json in the shape the shared app modules read.
// Field mapping (internal names are the housing app's): total_beds = benches, kitchen_status = BSL-2 (communal = yes,
// none = BSL-1 only), safety_flag = wet lab (ok = wet lab, rough-block = dry lab only), property_type = space type.
// Never invents values: anything the research did not find stays null. Walk minutes are estimated from straight-line
// distance to the market anchor (x1.25 for streets, 80 m per minute) and marked as estimates.
import fs from 'node:fs';
import path from 'node:path';

const JPY_PER_USD = 150;   // approximate rate for comparing Kobe prices in dollars; the yen price is kept in the record
const base = JSON.parse(fs.readFileSync('data/inventory/inventory.json', 'utf8'));
const geo: Record<string, { lat: number; lng: number } | null> = fs.existsSync('labs/geocache.json') ? JSON.parse(fs.readFileSync('labs/geocache.json', 'utf8')) : {};
const research = fs.readdirSync('labs/research').filter((f) => f.endsWith('.json')).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join('labs/research', f), 'utf8')));
const markets = new Map<string, any>(base.markets.map((m: any) => [m.id, m]));
const EAST_BAY = /\b(oakland|berkeley|emeryville|alameda|richmond|san leandro|hayward|fremont)\b/i;

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
  const eq: string[] = r.equipment || [];
  const wet = eq.includes('wet_lab') || eq.includes('bsl2_suite') || eq.includes('biosafety_cabinet') || eq.includes('fume_hood') || r.bsl != null || ['incubator_bench', 'community_lab'].includes(r.space_type);
  const dryOnly = !wet && eq.includes('dry_lab');
  const bsl2 = (r.bsl ?? 0) >= 2 || eq.includes('bsl2_suite');
  const cur = r.currency || markets.get(r.market)?.currency || 'USD';
  return {
    id: r.id, property_name: r.name, name_detail: r.operator && r.operator !== r.name ? r.operator : null,
    inventory_class: 'candidate', deal_status: 'not_contacted', market: r.market, city: r.city, address: r.address,
    lat: g?.lat ?? null, lng: g?.lng ?? null, geo_precision: g ? 'address' : null, neighborhood: r.neighborhood,
    east_bay: EAST_BAY.test(`${r.city} ${r.address || ''}`),
    operator_name: r.operator, operator_type: r.space_type === 'university_core' ? 'institution' : 'operator', property_type: r.space_type,
    total_rooms: null, total_beds: r.benches_total, available_beds: r.benches_available,
    sqft_total: r.sqft_total, sqft_available: r.sqft_available, bsl: r.bsl, equipment: eq,
    kitchen_status: bsl2 ? 'communal' : r.bsl === 1 ? 'none' : 'unknown',
    safety_flag: wet ? 'ok' : dryOnly ? 'rough-block' : null, safety_reviews: null,
    asking_per_bed: usd(r.price_per_bench_month, cur), price_sqft_yr: usd(r.price_per_sqft_year, cur),
    fx_note: cur === 'JPY' && (r.price_per_bench_month != null || r.price_per_sqft_year != null) ? `converted from yen at ${JPY_PER_USD} JPY per USD` : null,
    asking_raw: r.price_raw, verified_per_bed: null, negotiated_per_bed: null, negotiated_monthly: null, currency: cur,
    min_term_months: r.min_term_months, minimum_stay_days: r.min_term_months != null ? Math.round(r.min_term_months * 30) : null,
    available_from: r.available_from, office_included: r.office_included, access_24_7: r.access_24_7, application_required: r.application_required,
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
fs.writeFileSync('labs/inventory.json', JSON.stringify(out));
const placed = records.filter((r) => r.lat != null).length;
console.log(`${records.length} lab spaces (${placed} on the map); by market: ${[...new Set(records.map((r) => r.market))].map((m) => `${m}=${records.filter((r) => r.market === m).length}`).join(', ')}; with a bench price: ${records.filter((r) => r.asking_per_bed != null).length}`);
