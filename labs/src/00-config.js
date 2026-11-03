// Haus Fund Housing Network: configuration. Every tunable number lives here, not in UI code.
const HFI = (window.HFI = {});
HFI.CONFIG = {
  APP_NAME: 'Haus Fund Lab Finder',
  DEFAULT_MARKET: 'sf',
  TARGET_PRICE_PER_BED: 2000,        // planning target per bench per month (USD); a placeholder, editable in the price chip
  WALK_FULL_MIN: 10,                 // full distance points at or under this walk
  WALK_ZERO_MIN: 60,                 // zero distance points at or over this walk
  PRICE_ZERO_MULTIPLIER: 2.2,        // zero price points at target x this
  WEIGHTS: { price: 25, distance: 20, kitchen: 20, capacity: 15, safety: 15, timing: 5 },   // kitchen = BSL-2, safety = wet lab
  HAUS_TAG_BONUS: 5,                 // a building already tagged for the selected house gets this on top
  ZOOM: { MARKET: 14, HOUSE: 16, PROPERTY: 17 },   // google-style zoom levels the app flies to
  STALE: {                           // days: fresh <= a, aging <= b, stale beyond
    price: { fresh: 7, aging: 14, stale: 45 },
    availability: { fresh: 7, aging: 14, stale: 30 },
    contact: { fresh: 14, aging: 30, stale: 60 },
  },
  NEGOTIATION_WAIT_DAYS: 14,
  MAP: {
    CLUSTER: false, CLUSTER_CELL_PX: 56, CLUSTER_MIN_K: 1.1,   // clusters are off: plain pins, prices appear as space allows
    SEARCH_AREA_MOVE_FRACTION: 0.25, FLY_MS: 380,
    WHEEL_SCROLL_RATE: 0.0032,       // trackpad two-finger scroll: zoom factor = exp(-deltaY * rate)
    WHEEL_PINCH_RATE: 0.012,         // trackpad pinch arrives as a wheel event with ctrlKey
    WHEEL_STEP: 1.4,                 // notched mouse wheels zoom by this per notch
  },
  STORAGE_KEY: 'hfl:edits:v1',
  SHORTLIST_KEY: 'hfl:shortlist:v1',
  PREFS_KEY: 'hfl:prefs:v1',
  SPACE_TYPES: { incubator_bench: 'Incubator bench', lab_coworking: 'Lab coworking', community_lab: 'Community lab', private_lab_suite: 'Lab suite', university_core: 'University core', lab_building: 'Lab building' },
  EQUIPMENT: { fume_hood: 'Fume hood', biosafety_cabinet: 'Biosafety cabinet', autoclave: 'Autoclave', cold_room: 'Cold room', minus80: '-80 freezer', tissue_culture: 'Tissue culture', vivarium: 'Vivarium', shared_core: 'Shared core equipment', wet_lab: 'Wet lab', dry_lab: 'Dry lab', bsl2_suite: 'BSL-2 suite' },
};
