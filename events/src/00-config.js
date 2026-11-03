// Haus Fund Housing Network: configuration. Every tunable number lives here, not in UI code.
const HFI = (window.HFI = {});
HFI.CONFIG = {
  APP_NAME: 'Haus Fund Venue Finder',
  DEFAULT_MARKET: 'sf',
  TARGET_PRICE_PER_BED: 200,         // planning target per hour (USD); a placeholder, editable in the price chip
  WALK_FULL_MIN: 10,                 // full distance points at or under this walk
  WALK_ZERO_MIN: 45,                 // zero distance points at or over this walk
  PRICE_ZERO_MULTIPLIER: 2.2,        // zero price points at target x this
  WEIGHTS: { price: 25, distance: 25, kitchen: 10, capacity: 25, safety: 15, timing: 0 },   // kitchen = food allowed, safety = AV
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
  STORAGE_KEY: 'hfv:edits:v1',
  SHORTLIST_KEY: 'hfv:shortlist:v1',
  PREFS_KEY: 'hfv:prefs:v1',
  VENUE_TYPES: { auditorium: 'Auditorium', workshop_room: 'Workshop room', event_hall: 'Event hall', gallery_loft: 'Gallery or loft', rooftop_outdoor: 'Rooftop or outdoor', restaurant_bar: 'Restaurant or bar', coworking_event: 'Coworking event space', community_space: 'Community space' },
  AMENITIES: { projector: 'Projector', screen: 'Screen', pa_mics: 'PA and mics', stage: 'Stage', livestream: 'Livestream', wifi: 'Wi-Fi', whiteboards: 'Whiteboards', kitchen: 'Kitchen', catering_allowed: 'Outside catering', in_house_catering: 'In-house catering', alcohol_allowed: 'Alcohol allowed', bar: 'Bar', outdoor: 'Outdoor space', wheelchair_accessible: 'Wheelchair accessible', tables_chairs: 'Tables and chairs', breakout_rooms: 'Breakout rooms', parking: 'Parking', late_night: 'Late night' },
};
