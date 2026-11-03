# Geocode lab addresses, cached in labs/geocache.json. Re-runs only look up addresses not placed yet.
# US: OpenStreetMap Nominatim (1 request per second), retried without suite / floor / building prefixes.
# Japan: the Geospatial Information Authority of Japan address search (GSI), using the Japanese address
# in parentheses; it resolves to the block (chome / banchi), which is close enough for walk estimates.
# Usage: python3 labs/geocode.py
import json, glob, subprocess, time, urllib.parse, os, re
CACHE = 'labs/geocache.json'
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
recs = [r for f in sorted(glob.glob('labs/research/*.json')) for r in json.load(open(f))]

def get(url):
    out = subprocess.run(['curl', '-s', '-H', 'User-Agent: haus-lab-finder/1.0 (github.com/Haus-Fund/venue-search)', url], capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return []

def nominatim(q):
    hit = get('https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({'q': q, 'format': 'json', 'limit': 1}))
    time.sleep(1.1)
    return {'lat': float(hit[0]['lat']), 'lng': float(hit[0]['lon']), 'display': hit[0]['display_name'], 'via': 'nominatim'} if hit else None

def gsi(q):
    hit = get('https://msearch.gsi.go.jp/address-search/AddressSearch?' + urllib.parse.urlencode({'q': q}))
    return {'lat': hit[0]['geometry']['coordinates'][1], 'lng': hit[0]['geometry']['coordinates'][0], 'display': hit[0]['properties']['title'], 'via': 'gsi'} if hit else None

def us_variants(a):
    v = [a]
    b = re.sub(r',?\s*(suite|ste\.?|unit|#|floor|fl\.?)\s*[\w-]+', '', a, flags=re.I); v.append(b)
    c = re.sub(r'^[^,]*\b(hall|building|bldg|center)\b[^,]*,\s*', '', b, flags=re.I); v.append(c)
    v.append(re.sub(r'\s+\d{5}(-\d{4})?$', '', c))
    return list(dict.fromkeys(x.strip(' ,') for x in v))

def jp_query(a):
    m = re.search(r'[（(]([^()（）]*[぀-ヿ一-鿿][^()（）]*)[)）]', a)
    if not m: return None
    j = m.group(1)
    j = re.sub(r'\s.*$', '', j)                        # drop building name and floor after the street address
    j = re.sub(r'(番地?の?|号)$', '', j)
    return j.translate(str.maketrans('０１２３４５６７８９－', '0123456789-'))

todo = sorted({r['address'] for r in recs if r.get('address') and not cache.get(r['address'])})
for i, addr in enumerate(todo):
    hit = None
    if re.search(r'[぀-ヿ一-鿿]', addr):
        q = jp_query(addr)
        hit = gsi(q) if q else None
        if not hit and q: hit = gsi(re.sub(r'[\d-]+$', '', q))     # fall back to the chome
    else:
        for q in us_variants(addr):
            hit = nominatim(q)
            if hit: break
    cache[addr] = hit
    print(f"{i+1}/{len(todo)} {'ok ' if hit else 'MISS'} {addr}{'  -> ' + hit['display'][:60] if hit else ''}")
    json.dump(cache, open(CACHE, 'w'), indent=1, ensure_ascii=False)
print(f"{sum(1 for r in recs if r.get('address') and cache.get(r['address']))}/{len(recs)} records placed")
