# venue-search

Search and scoring code for finding buildings (venues) for Haus residencies.
Copied from [riaarora016/haus-fund-housing-network](https://github.com/riaarora016/haus-fund-housing-network) at commit `a6eeb38`. File paths match the source repo.

These are the search files only. They are not a runnable app on their own: the map (`40-map.js`), detail drawer (`60-drawer.js`), views (`70-views.js`), `template.html`, the build scripts and the data stay in the source repo.

## Files

**Main app** (`data/inventory/src/`, concatenated into one HTML page in the source repo)

- `30-filters.js`: `parsePrompt()` turns plain text ("40 beds, kitchen, under $1,000, 15 min walk, from Sep 15") into filters; `matches()` applies them, `sortFn()` sorts, and the search state goes into the URL.
- `20-scoring.js`: `hausFit()`, a 0 to 100 score from price per bed, walk time, kitchen, bed count, safety and timing, with a note per part.
- `10-model.js`, `00-config.js`: building records, score weights, target price per bed.
- `90-app.js`: `runPrompt()` connects the search box to the parser, map and results.
- `50-list.js`: the results list.

**Older web site** (`web/src/`, Vite + React)

- `pages/FindPage.tsx`: the founder search page (arrival, nights, max price, kitchen, walk time).
- `lib/filters.ts`, `components/FiltersBar.tsx`: filters for the ops view.
- `lib/staleness.ts`: price freshness.

**Offline scoring:** `data/score.ts`.
