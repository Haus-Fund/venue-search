# Merge private notes (e.g. what CellHaus emails say about Kobe places) into an app's inventory.json, for a private build.
# The overlay file and the outputs live in private/, which git ignores: nothing from it reaches the public repo.
#
# Usage: python3 overlay.py <housing|lab|venue> <inventory.json> <overlay.json> <out.json>
#
# Overlay format: {"needs": {...}, "places": [{kind, name, existing_id, address, neighborhood, status, contact_name,
#   contact_org, contact_email, contact_phone, last_contacted_at, next_action, next_followup_at, terms, summary, sources}],
#   "events": [{title, date, venue_name, existing_venue_id, headcount, notes, sources}]}
# Places of the matching kind update the record with existing_id (status, contact, follow-up, a dated note) or are added
# as new records. Needs become the start-screen note and example searches for the market, and the house's bed range.
import json, math, sys
from geocode import geocode

KIND, INV, OVERLAY, OUT = sys.argv[1:5]
MARKET, HOUSE = 'kobe', 'cell-haus'
data = json.load(open(INV))
ov = json.load(open(OVERLAY))
needs = ov.get('needs') or {}
STATUS = {'contacted': 'contacted', 'awaiting_reply': 'awaiting_reply', 'call_scheduled': 'call_scheduled', 'negotiating': 'negotiating',
          'verbal_yes': 'verbal_yes', 'signed': 'signed', 'used': 'signed', 'rejected': 'rejected', 'unavailable': 'unavailable'}
anchor = next((m['anchor'] for m in data['markets'] if m['id'] == MARKET), None)
recs = {r['id']: r for r in data['records']}

def walk(lat, lng):
    if lat is None or not anchor: return None, None
    p = math.pi / 180
    h = math.sin((anchor['lat'] - lat) * p / 2) ** 2 + math.cos(lat * p) * math.cos(anchor['lat'] * p) * math.sin((anchor['lng'] - lng) * p / 2) ** 2
    km = 2 * 6371 * math.asin(math.sqrt(h))
    return round(km * 1000 * 1.25 / 80), round(km / 1.609, 1)

def src_line(s):
    return f"{s.get('subject', 'email')} ({s.get('date', '?')}, from {s.get('from', '?')})"

def note(date, text):
    return f"[{date or '?'} CellHaus email] {text}"

added = updated = 0
for p in ov.get('places', []):
    if p.get('kind') != KIND: continue
    srcs = p.get('sources') or []
    first = min((s.get('date') or '' for s in srcs), default='') or None
    text = ' '.join(x for x in [p.get('summary'), f"Terms: {p['terms']}." if p.get('terms') else None, f"Next: {p['next_action']}." if p.get('next_action') else None] if x)
    text += ' Sources: ' + '; '.join(src_line(s) for s in srcs) if srcs else ''
    r = recs.get(p.get('existing_id') or '')
    if r is None:
        g = geocode(p['address']) if p.get('address') else None
        mins, miles = walk(g['lat'], g['lng']) if g else (None, None)
        r = {'id': f"cellhaus-{KIND}-{len(recs)}", 'property_name': p['name'], 'name_detail': p.get('contact_org'), 'inventory_class': 'candidate',
             'deal_status': 'not_contacted', 'market': MARKET, 'city': 'Kobe', 'address': p.get('address'), 'neighborhood': p.get('neighborhood'),
             'lat': g and g['lat'], 'lng': g and g['lng'], 'geo_precision': 'address' if g else None, 'east_bay': False,
             'property_type': None, 'frontier_transit_minutes_est': mins, 'distance_miles': miles, 'source_type': 'cellhaus-email',
             'source_links': [], 'haus_node_ids': [], 'cohort_ids': [], 'notes': '', 'kitchen_status': 'unknown', 'safety_flag': None,
             'created_at': first, 'last_checked_at': first, 'amenities': [], 'equipment': []}
        recs[r['id']] = r; data['records'].append(r); added += 1
    else:
        updated += 1
    if p.get('status') in STATUS: r['deal_status'] = STATUS[p['status']]
    if p.get('status') == 'used': r['inventory_class'] = 'contracted_partner'
    for k in ['contact_name', 'contact_org', 'contact_email', 'contact_phone', 'last_contacted_at', 'next_action', 'next_followup_at']:
        if p.get(k): r[k] = p[k]
    if r.get('contact_email') or r.get('contact_phone'): r['contact_verify'] = False
    r['haus_node_ids'] = sorted(set((r.get('haus_node_ids') or []) + [HOUSE]))
    r['notes'] = ' | '.join(x for x in [r.get('notes'), note(first, text)] if x)

if KIND == 'venue':
    for e in ov.get('events', []):
        r = recs.get(e.get('existing_venue_id') or '')
        if not r: continue
        bits = [e.get('title'), f"{e['headcount']} people" if e.get('headcount') else None, e.get('notes')]
        r['notes'] = ' | '.join(x for x in [r.get('notes'), note(e.get('date'), 'Haus event here: ' + ', '.join(b for b in bits if b))] if x)
        r['haus_node_ids'] = sorted(set((r.get('haus_node_ids') or []) + [HOUSE]))

# needs -> start screen note, example searches, and the house's bed range for housing
head, start = needs.get('headcount'), needs.get('start_date')
summary = {'housing': needs.get('housing_needs'), 'lab': needs.get('lab_needs'), 'venue': needs.get('event_needs')}[KIND]
facts = [f"{head} people" if head else None, f"from {start}" if start else None, f"to {needs['end_date']}" if needs.get('end_date') else None,
         f"companies: {', '.join(needs['companies'])}" if needs.get('companies') else None, summary, f"Budget: {needs['budget']}" if needs.get('budget') else None]
text = '. '.join(f for f in facts if f)
if text:
    data['intro_note'] = {**(data.get('intro_note') or {}), MARKET: {'title': f"{needs.get('cohort_name') or 'CellHaus'} needs (from email):", 'text': text}}
ex = {'housing': [f"Cellhaus: {head} beds near KBIC" if head else 'Cellhaus near KBIC', f"{head or 12} beds with a kitchen on Port Island"],
      'lab': ['BSL-2 wet lab near KBIC', 'Incubator on Port Island', 'Contacted'],
      'venue': [f"Meetup for {head} near KBIC" if head else 'Meetup near KBIC', 'Talk for 100 in Sannomiya with a projector', 'Contacted']}[KIND]
data['examples'] = {**(data.get('examples') or {}), MARKET: ex}
if KIND == 'housing' and head:
    for n in data['haus_nodes']:
        if n['id'] == HOUSE and n.get('profile'):
            n['profile'] = {**n['profile'], 'beds_min': head, 'beds_max': math.ceil(head * 1.3), 'note': (n['profile'].get('note') or '') + ' Bed range set from CellHaus emails.'}

json.dump(data, open(OUT, 'w'), ensure_ascii=False)
print(f"{KIND}: {updated} records updated, {added} added from {OVERLAY}")
