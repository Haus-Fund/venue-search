# venue-search

Three searches for Haus residencies, on the same map app: housing (below), lab space ([Lab Finder](#lab-finder)) and event venues ([Venue Finder](#venue-finder)).

Search for buildings (venues) for Haus residencies. You type what a house needs in plain words ("40 beds, kitchen, under $1,500, 15 min walk") and get matching buildings on a map, ranked by a 0 to 100 fit score.

Copied from [riaarora016/haus-fund-housing-network](https://github.com/riaarora016/haus-fund-housing-network) at commit `a6eeb38`. File paths match the source repo. The Google Sheet sync, scrapers and email refresh engine stay there.

## Run it

Main app (one self-contained HTML page):

```bash
npm install
npm run build        # data/properties.json -> data/inventory/inventory.json -> data/exports/haus-fund-housing-network.html
```

Open `data/exports/haus-fund-housing-network.html` in a browser. It works offline. A built copy with satellite imagery is committed, so you can open it without building.

The raw imagery tiles (Esri World Imagery, about 47 MB) are not in git. Without them a fresh build shows streets on a dark background. To get them, run `npm run fetch:tiles` and then `npm run build`. In a sandbox behind a proxy, set `NODE_USE_ENV_PROXY=1` first. Keep the page under 16 MB if you publish it as a Claude artifact; it is about 15.3 MB now.

`data/fetch-tiles-labels.ts` is left out of `fetch:tiles`: CARTO now needs an API key and returns watermarked tiles without one. Street and place names come from OpenStreetMap instead (`data/inventory/roads.json`).

Older React site (ops view at `/`, founder search at `/find`):

```bash
npm --prefix web install
npm run web:dev      # http://localhost:5173
```

## Where the search lives

- `data/inventory/src/30-filters.js`: `parsePrompt()` turns plain text into filters; `matches()` applies them, `sortFn()` sorts, and the search state goes into the URL.
- `data/inventory/src/20-scoring.js`: `hausFit()`, the fit score from price per bed, walk time, kitchen, bed count, safety and timing.
- `data/inventory/src/90-app.js`: `runPrompt()` connects the search box to the parser, map and results.
- `data/inventory/src/` other modules: config, data model, map, results list, detail drawer, views. `data/build-inventory.ts` joins them into `data/inventory/template.html`.
- `web/src/pages/FindPage.tsx`, `web/src/lib/filters.ts`: search in the React site.
- `data/score.ts`: offline scoring.

## Data

- `data/properties.json`: the buildings. In the source repo this is generated from the tracker spreadsheet; here it is a snapshot.
- `data/haus-nodes.json`: houses and their needs (bed range, kitchen rule, score weights, walk limit).
- `data/cohorts.json`: markets (San Francisco, Kobe) and anchors.
- `data/inventory/roads.json`: streets from OpenStreetMap (`npm run fetch:roads` refreshes it).

## Lab Finder

The same app, pointed at lab space instead of housing. Describe what you need ("4 benches, BSL-2, fume hood, under $2,500 per bench, 20 min walk") and see matching lab spaces on the map, ranked by a 0 to 100 fit score: price per bench, walk to the anchor (Frontier Tower in San Francisco, KBIC in Kobe), BSL-2, bench count, wet lab and move-in date.

Open `labs/exports/haus-fund-lab-finder.html` in a browser. To rebuild after editing the data:

```bash
npm run labs:geocode   # only looks up new addresses (OpenStreetMap Nominatim for the US, GSI for Japan)
npm run labs:build
```

- `labs/research/*.json`: the lab spaces, one file per market, from web research. Every record links its sources. Anything the research did not find is null, never guessed. Prices are as listed on the operator's site, not verified by a call.
- `labs/export.ts`: turns the research into `labs/inventory.json`. Walk times are estimated from straight-line distance. Kobe prices are converted to dollars at a fixed approximate rate (`JPY_PER_USD`) so they can be compared; the yen price is kept as published.
- `labs/src/`: the modules that differ from the housing app (config, model, scoring, filters and prompt parser, list, drawer, views). `data/build-inventory.ts` uses them in place of the same-named files in `data/inventory/src/`, so the map engine and app shell are shared.
- The parser understands bench counts, budget, walk time, BSL-2, wet lab, private suite, equipment (fume hood, biosafety cabinet, autoclave, cold room, -80 freezer, tissue culture, vivarium, shared core equipment) and space type (incubator, community lab, coworking, university core, lab building).
- Internally the lab records reuse the housing field names: `total_beds` holds benches, `kitchen_status` holds BSL-2 (communal = yes), `safety_flag` holds wet lab (ok = wet lab, rough-block = dry lab only).

## Venue Finder

The same app for programming and events. Describe the event ("talk for 80 with a projector, under $300/hr", "dinner for 30 with drinks, exclusive", "rooftop party for 100") and see venues on the map, ranked by price per hour, walk to the anchor, capacity against the headcount, food allowed and AV.

Open `events/exports/haus-fund-venue-finder.html` in a browser. To rebuild:

```bash
npm run events:geocode
npm run events:build
```

- `events/research/*.json`: venues from web research, one file per market, with source links. Unknown fields are null. Prices are as listed, not confirmed.
- `events/export.ts`: research to `events/inventory.json`. Capacity is standing capacity, else seated. A venue must hold the whole headcount to match (venues with no published capacity still show).
- `events/src/`: the modules that differ from the housing app. Internally `total_beds` holds capacity, `asking_per_bed` the hourly rate, `kitchen_status` whether food is allowed and `safety_flag` whether AV is on site.
- The parser understands headcount ("for 100", "80 people"), budget per hour, walk time, food, AV, exclusive use, amenities (mics, stage, livestream, alcohol, bar, outdoor, wheelchair access, breakout rooms, whiteboards, kitchen, late night, parking) and venue type.
