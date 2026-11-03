// Filters, the plain-language prompt parser, sorting, and URL state.
(function () {
  const C = HFI.CONFIG;
  HFI.defaultFilters = () => ({
    market: C.DEFAULT_MARKET, from: null, nights: null, needBeds: null, minBeds: null, maxBed: null, maxWalk: null,
    kitchen: false, safety: false, room: 'shared', statuses: [], classes: ['candidate', 'contracted_partner'],
    verifiedOnly: false, attention: false, shortlist: false, haus: '', area: null, q: '', amen: [], types: [], sort: 'fit', targetPrice: C.TARGET_PRICE_PER_BED,
  });
  HFI.filters = HFI.defaultFilters();
  HFI.SORTS = [['fit', 'Best fit'], ['price', 'Lowest $/hr'], ['walk', 'Closest'], ['beds', 'Largest'], ['verified', 'Recently verified'], ['status', 'Deal status']];
  // nothing is drawn until the person asks for something
  HFI.hasIntent = (f) => !!(f.q || f.needBeds != null || f.minBeds != null || f.maxBed != null || f.maxWalk != null || f.kitchen || f.safety || f.room === 'private' || f.statuses.length || f.haus || f.verifiedOnly || f.attention || f.shortlist || f.area || f.from || f.amen.length || f.types.length);

  const inArea = (r, a) => a && r.lat != null && r.lat >= a.s && r.lat <= a.n && r.lng >= a.w && r.lng <= a.e;
  const text = (r) => [r.property_name, r.name_detail, r.address, r.neighborhood, r.contact_name, r.contact_org, r.operator_name, C.VENUE_TYPES[r.property_type] || r.property_type, r.notes, (r.amenities || []).map((e) => C.AMENITIES[e] || e).join(' '), (r.haus_node_ids || []).join(' ')].join(' ').toLowerCase();
  HFI.priceFor = (r) => r.price_per_bed;

  HFI.matches = (r, f) => {
    if (r.market !== f.market) return false;
    if (!f.classes.includes(r.inventory_class)) return false;
    if (f.statuses.length && !f.statuses.includes(r.deal_status)) return false;
    if (f.haus) { const n = HFI.nodes.get(f.haus); const p = n?.profile; if (p) { if (p.kitchen === 'required' && r.kitchen_status === 'none') return false; if (r.beds != null && r.beds < p.beds_min / 2 && !(r.haus_node_ids || []).includes(f.haus)) return false; if (f.maxWalk == null && p.max_walk != null && r.walk != null && r.walk > p.max_walk && !(r.haus_node_ids || []).includes(f.haus)) return false; } }
    if (f.shortlist && !HFI.shortlist.has(r.id)) return false;
    if (f.attention && !r.attention.length) return false;
    if (f.kitchen && r.kitchen_status === 'none') return false;
    if (f.safety && (r.safety_flag === 'rough-block' || r.safety_reviews === 'bad')) return false;
    const minBeds = f.minBeds ?? f.needBeds;   // a venue has to hold everyone
    if (minBeds != null && r.beds != null && r.beds < minBeds) return false;
    const price = HFI.priceFor(r, f.room);
    if (f.maxBed != null && price != null && price > f.maxBed) return false;
    if (f.verifiedOnly && r.price_kind !== 'verified' && r.price_kind !== 'negotiated') return false;
    if (f.room === 'private' && r.exclusive_use === false) return false;
    if (f.amen.length && !f.amen.every((e) => (r.amenities || []).includes(e))) return false;
    if (f.types.length && !f.types.includes(r.property_type)) return false;
    if (f.maxWalk != null && r.walk != null && r.walk > f.maxWalk) return false;
    if (r.minimum_stay_days != null && f.nights != null && r.minimum_stay_days > f.nights) return false;
    if (r.available_from && f.from && r.available_from > f.from) return false;
    if (f.area && !inArea(r, f.area)) return false;
    if (f.q) { const t = text(r); if (!f.q.toLowerCase().split(/\s+/).every((w) => t.includes(w))) return false; }
    return true;
  };
  HFI.sortFn = (sort, room) => (a, b) => {
    switch (sort) {
      case 'price': return (HFI.priceFor(a, room) ?? 1e9) - (HFI.priceFor(b, room) ?? 1e9);
      case 'walk': return (a.walk ?? 999) - (b.walk ?? 999);
      case 'beds': return (b.beds ?? 0) - (a.beds ?? 0);
      case 'verified': return (b.last_price_verified_at || '').localeCompare(a.last_price_verified_at || '');
      case 'status': return HFI.DEAL_STATUSES.findIndex((s) => s.id === b.deal_status) - HFI.DEAL_STATUSES.findIndex((s) => s.id === a.deal_status) || (b.fit?.score ?? 0) - (a.fit?.score ?? 0);
      default: return (b.fit?.score ?? 0) - (a.fit?.score ?? 0);
    }
  };
  // what the search currently means, as removable chips
  HFI.activeChips = (f) => {
    const out = [];
    if (f.haus) out.push({ k: 'haus', label: HFI.nodes.get(f.haus)?.name || f.haus });
    if (f.needBeds != null) out.push({ k: 'needBeds', label: `${f.needBeds} people` });
    if (f.minBeds != null) out.push({ k: 'minBeds', label: `holds ${f.minBeds}+` });
    if (f.maxBed != null) out.push({ k: 'maxBed', label: `up to ${HFI.fmtMoney(f.maxBed, { short: true })}/hr` });
    if (f.maxWalk != null) out.push({ k: 'maxWalk', label: `${f.maxWalk} min walk or less` });
    if (f.kitchen) out.push({ k: 'kitchen', label: 'Food allowed (unknown ok)' });
    if (f.safety) out.push({ k: 'safety', label: 'AV on site' });
    if (f.room === 'private') out.push({ k: 'room', label: 'Exclusive use' });
    if (f.amen.length) out.push({ k: 'amen', label: f.amen.map((e) => C.AMENITIES[e]).join(', ') });
    if (f.types.length) out.push({ k: 'types', label: f.types.map((t) => C.VENUE_TYPES[t]).join(', ') });
    if (f.from) out.push({ k: 'from', label: `From ${HFI.fmtDate(f.from)}${f.nights ? `, ${f.nights} nights` : ''}` });
    if (f.statuses.length) out.push({ k: 'statuses', label: f.statuses.map((s) => HFI.statusMeta(s).label).join(', ') });
    if (f.verifiedOnly) out.push({ k: 'verifiedOnly', label: 'Verified prices only' });
    if (f.attention) out.push({ k: 'attention', label: 'Needs attention' });
    if (f.shortlist) out.push({ k: 'shortlist', label: 'Shortlist' });
    if (f.area) out.push({ k: 'area', label: 'This map area' });
    if (f.q) out.push({ k: 'q', label: `"${f.q}"` });
    return out;
  };
  HFI.relaxFilter = (f, k) => { switch (k) {
    case 'maxWalk': f.maxWalk = null; break; case 'maxBed': f.maxBed = null; break; case 'kitchen': f.kitchen = false; break; case 'minBeds': f.minBeds = null; break; case 'needBeds': f.needBeds = null; break;
    case 'safety': f.safety = false; break; case 'room': f.room = 'shared'; break; case 'statuses': f.statuses = []; break; case 'haus': f.haus = ''; break; case 'verifiedOnly': f.verifiedOnly = false; break;
    case 'attention': f.attention = false; break; case 'shortlist': f.shortlist = false; break; case 'area': f.area = null; break; case 'q': f.q = ''; break; case 'amen': f.amen = []; break; case 'types': f.types = []; break; case 'from': f.from = null; f.nights = null; break; } };

  // ---- plain-language prompt -> filters ----
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  const STOP = new Set('kbic minatojima venue venues event events space spaces room rooms hall halls host hosting party talk talks meetup meetups workshop workshops dinner dinners demo day hackathon salon guests attendees people seated standing capacity hour hours hourly day night evening afternoon morning startup founders i we need want looking for a an the with and or of to in at near close by around under below over above up max min beds bed people person persons founders residents rooms room kitchen private shared safe safety calm quiet cheap budget month monthly per walk walking minutes minute min mins from starting move nights night housing house building place somewhere something anything please find show me give us that is are be can could should would about roughly approx approximately least most only just also verified confirmed frontier tower kobe japan san francisco sf block blocks building buildings area areas location locations spot spots space spaces option options list any some all with within'.split(' '));
  let corpus = null;
  const corpusWords = () => { if (corpus) return corpus; corpus = new Set(); for (const r of HFI.records()) for (const w of text(r).split(/[^a-z0-9']+/)) if (w.length >= 3) corpus.add(w); return corpus; };
  HFI.parsePrompt = (input, base) => {
    const f = { ...base }; const read = []; let s = ' ' + input.toLowerCase().replace(/,(?=\d{3}\b)/g, '').replace(/[,;:]/g, ' ') + ' '; const eat = (re) => { const m = s.match(re); if (m) s = s.replace(re, ' '); return m; };
    let m;
    if (/\b(kbic|minatojima)\b/.test(s) | !!eat(/\b(kobe|japan|port island)\b/)) { f.market = 'kobe'; read.push('Kobe'); }
    else if (eat(/\b(san francisco|sf)\b/)) { f.market = 'sf'; }
    for (const n of HFI.nodes.values()) { const key = n.name.toLowerCase(); const re = new RegExp(`\\b(${key}|${key.replace('haus', ' haus')}|${key.replace('haus', '')} house)\\b`); if (eat(re)) { f.haus = n.id; if (n.market && HFI.markets.get(n.market)?.has_map) f.market = n.market; read.push(n.name); } }
    if (!f.haus && eat(/\b(women|women's|female|femme)\b/)) { f.haus = 'fem-haus'; read.push('Femhaus'); }
    if (!f.haus && eat(/\b(alumni|alums?)\b/)) { f.haus = 'alum-haus'; read.push('Alumhaus'); }
    if ((m = eat(/\$\s?(\d[\d,]*\.?\d*)\s*(k)?\s*(?:\/|per|a|each)?\s*(?:hour|hr|h|day|person|head|night)?/))) { let v = +m[1].replace(/,/g, ''); if (m[2]) v *= 1000; f.maxBed = Math.round(v); read.push(`up to ${HFI.fmtMoney(f.maxBed)} per hour`); }
    else if ((m = eat(/\b(?:under|below|max|maximum|up to|less than|budget(?: of)?|cheaper than)\s+(\d[\d,]*)\b/))) { f.maxBed = +m[1].replace(/,/g, ''); read.push(`up to ${HFI.fmtMoney(f.maxBed)} per hour`); }
    if ((m = eat(/\b(\d+)\s*(?:\+\s*)?(?:people|persons?|guests?|attendees|founders|seats?|seated|standing|heads?|pax)\b/))) { f.needBeds = +m[1]; read.push(`${f.needBeds} people`); }
    else if ((m = eat(/\b(?:for|of|about|around)\s+(\d{2,4})\b(?!\s*(?:min|mins|minutes?|hours?|hrs?|h\b|k\b|dollars?))/))) { f.needBeds = +m[1]; read.push(`${f.needBeds} people`); }
    if ((m = eat(/\b(\d+)\s*(?:min|mins|minutes?)\b(?:\s*walk(?:ing)?)?/))) { f.maxWalk = +m[1]; read.push(`${f.maxWalk} min walk or less`); }
    else if (eat(/\b(walking distance|walkable|near frontier|close to frontier|near the tower|nearby|near kbic|close by)\b/)) { f.maxWalk = 20; read.push('20 min walk or less'); }
    if ((m = eat(/\b(\d+)\s*nights?\b/))) f.nights = +m[1];
    else if ((m = eat(/\b(\d+)\s*months?\b/))) f.nights = +m[1] * 30;
    if ((m = eat(/\b(?:from|starting|start|move[- ]?in|arriving|arrive)\s+(?:on\s+)?([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/))) { const mo = MONTHS[m[1].slice(0, 4)] ?? MONTHS[m[1].slice(0, 3)]; if (mo != null) { const now = new Date(); let y = m[3] ? +m[3] : now.getFullYear(); const d = new Date(y, mo, +m[2]); if (!m[3] && d < now) y++; f.from = `${y}-${String(mo + 1).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`; read.push(`from ${HFI.fmtDate(f.from)}`); } }
    if (eat(/\b(food|catering|catered|dinner|lunch|breakfast|snacks)\b/)) { f.kitchen = true; read.push('food allowed'); }
    if (eat(/\b(av|a\/v|projector|presentation|slides|screen)\b/)) { f.safety = true; read.push('AV on site'); }
    if (eat(/\b(private|exclusive|buyout|buy-out|whole venue)\b/)) { f.room = 'private'; read.push('exclusive use'); }
    const AM = [['pa_mics', /\b(mics?|microphones?|pa|sound system)\b/], ['stage', /\bstage\b/], ['livestream', /\b(livestream|live stream|streaming|recording)\b/], ['alcohol_allowed', /\b(alcohol|drinks|wine|beer|cocktails?)\b/], ['bar', /\bbar\b/], ['outdoor', /\b(outdoor|outside|rooftop|patio|garden|terrace)\b/], ['wheelchair_accessible', /\b(accessible|wheelchair|ada)\b/], ['breakout_rooms', /\bbreakout\b/], ['whiteboards', /\bwhiteboards?\b/], ['kitchen', /\bkitchen\b/], ['late_night', /\b(late night|late|after 10)\b/], ['parking', /\bparking\b/]];
    for (const [k, re] of AM) if (eat(re)) { f.amen = [...f.amen, k]; read.push(C.AMENITIES[k]); }
    const TY = [['auditorium', /\b(auditorium|theater|theatre|lecture hall)\b/], ['workshop_room', /\b(classroom|workshop room|training room|meeting room)\b/], ['gallery_loft', /\b(gallery|loft|warehouse)\b/], ['restaurant_bar', /\b(restaurant|private dining)\b/], ['coworking_event', /\b(coworking|co-working|startup space)\b/], ['community_space', /\b(community|nonprofit)\b/], ['event_hall', /\b(ballroom|banquet|event hall)\b/]];
    for (const [k, re] of TY) if (eat(re)) { f.types = [...f.types, k]; read.push(C.VENUE_TYPES[k]); }
    if (eat(/\b(verified|confirmed) (?:price|prices|pricing|rate|rates)\b/)) { f.verifiedOnly = true; read.push('verified prices only'); }
    if (eat(/\b(not contacted|uncontacted|never contacted)\b/)) { f.statuses = ['not_contacted']; read.push('not contacted yet'); }
    else if (eat(/\bcontacted\b/)) { f.statuses = ['contacted', 'awaiting_reply', 'negotiating', 'verbal_yes', 'contracting']; read.push('already contacted'); }
    if (eat(/\b(signed|secured)\b/)) { f.statuses = ['signed', 'active']; read.push('signed'); }
    if (eat(/\b(shortlist|shortlisted|starred)\b/)) { f.shortlist = true; read.push('shortlist'); }
    if (eat(/\b(needs? attention|overdue|follow[- ]?ups?)\b/)) { f.attention = true; read.push('needs attention'); }
    // leftover words that actually appear in the data (neighborhoods, building names, streets) become a text filter
    const words = s.split(/[^a-z0-9']+/).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)); const cw = corpusWords();
    const kept = words.filter((w) => cw.has(w)); f.q = kept.join(' '); if (kept.length) read.push(`"${kept.join(' ')}"`);
    return { filters: f, read };
  };

  // ---- URL state (no contact info ever goes into the URL) ----
  HFI.toParams = (f, extra = {}) => {
    const p = new URLSearchParams(); const d = HFI.defaultFilters();
    p.set('market', f.market);
    for (const k of ['from', 'nights', 'needBeds', 'minBeds', 'maxBed', 'maxWalk', 'room', 'sort', 'targetPrice', 'q', 'haus']) if (f[k] != null && f[k] !== '' && String(f[k]) !== String(d[k])) p.set(k, f[k]);
    for (const k of ['kitchen', 'safety', 'verifiedOnly', 'attention', 'shortlist']) if (f[k] !== d[k]) p.set(k, f[k] ? '1' : '0');
    if (f.amen.length) p.set('amen', f.amen.join(','));
    if (f.types.length) p.set('types', f.types.join(','));
    if (f.statuses.length) p.set('status', f.statuses.join(','));
    if (JSON.stringify(f.classes) !== JSON.stringify(d.classes)) p.set('class', f.classes.join(','));
    if (f.area) p.set('area', [f.area.s, f.area.w, f.area.n, f.area.e].map((v) => v.toFixed(4)).join(','));
    for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') p.set(k, v);
    return p;
  };
  HFI.fromParams = (sp) => {
    const f = HFI.defaultFilters();
    if (sp.get('market') && HFI.markets.has(sp.get('market'))) f.market = sp.get('market');
    for (const k of ['from', 'room', 'sort', 'q', 'haus']) if (sp.has(k)) f[k] = sp.get(k);
    for (const k of ['nights', 'needBeds', 'minBeds', 'maxBed', 'maxWalk', 'targetPrice']) if (sp.has(k)) f[k] = sp.get(k) === '' ? null : +sp.get(k);
    for (const k of ['kitchen', 'safety', 'verifiedOnly', 'attention', 'shortlist']) if (sp.has(k)) f[k] = sp.get(k) === '1';
    if (sp.has('amen')) f.amen = sp.get('amen').split(',').filter((e) => C.AMENITIES[e]);
    if (sp.has('types')) f.types = sp.get('types').split(',').filter((t) => C.VENUE_TYPES[t]);
    if (sp.has('status')) f.statuses = sp.get('status').split(',').filter(Boolean);
    if (sp.has('class')) f.classes = sp.get('class').split(',').filter(Boolean);
    if (sp.has('area')) { const [s, w, n, e] = sp.get('area').split(',').map(Number); if ([s, w, n, e].every(Number.isFinite)) f.area = { s, w, n, e }; }
    return f;
  };
})();
