# Geocode lab addresses with OpenStreetMap Nominatim (1 request per second), cached in labs/geocache.json.
# Usage: python3 labs/geocode.py   (re-runs only look up addresses not in the cache)
import json, glob, subprocess, time, urllib.parse, os
CACHE = 'labs/geocache.json'
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
recs = [r for f in sorted(glob.glob('labs/research/*.json')) for r in json.load(open(f))]
todo = [r['address'] for r in recs if r.get('address') and r['address'] not in cache]
for i, addr in enumerate(todo):
    q = urllib.parse.urlencode({'q': addr, 'format': 'json', 'limit': 1})
    out = subprocess.run(['curl', '-s', '-H', 'User-Agent: haus-lab-finder/1.0 (github.com/Haus-Fund/venue-search)', f'https://nominatim.openstreetmap.org/search?{q}'], capture_output=True, text=True).stdout
    try: hit = json.loads(out)
    except Exception: hit = []
    cache[addr] = {'lat': float(hit[0]['lat']), 'lng': float(hit[0]['lon']), 'display': hit[0]['display_name']} if hit else None
    print(f"{i+1}/{len(todo)} {'ok ' if hit else 'MISS'} {addr}")
    json.dump(cache, open(CACHE, 'w'), indent=1, ensure_ascii=False)
    time.sleep(1.1)
print(f"{sum(1 for r in recs if r.get('address') and cache.get(r['address']))}/{len(recs)} records placed")
