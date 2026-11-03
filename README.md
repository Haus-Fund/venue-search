# venue-search

Search for buildings (venues) for Haus residencies. You type what a house needs in plain words ("40 beds, kitchen, under $1,500, 15 min walk") and get matching buildings on a map, ranked by a 0 to 100 fit score.

Copied from [riaarora016/haus-fund-housing-network](https://github.com/riaarora016/haus-fund-housing-network) at commit `a6eeb38`. File paths match the source repo. The Google Sheet sync, scrapers and email refresh engine stay there.

## Run it

Main app (one self-contained HTML page):

```bash
npm install
npm run build        # data/properties.json -> data/inventory/inventory.json -> data/exports/haus-fund-housing-network.html
```

Open `data/exports/haus-fund-housing-network.html` in a browser. It works offline.

Satellite imagery is optional and not in git. Without it the map shows streets on a dark background. To add it, run `npm run fetch:tiles` and then `npm run build` again.

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
