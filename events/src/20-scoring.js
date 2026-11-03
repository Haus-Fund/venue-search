// VENUE FIT: transparent 0 to 100 score (kitchen part = food allowed, safety part = AV). Parts carry points, max and a plain-words note.
// ctx: { weights, targetPrice, kitchenHard, needBeds: [min, max] | null, from: date | null, haus: node | null }
(function () {
  const C = HFI.CONFIG;
  const lerp = (v, full, zero, max) => v <= full ? max : v >= zero ? 0 : +(max * (1 - (v - full) / (zero - full))).toFixed(1);
  HFI.hausFit = (r, ctx) => {
    const W = ctx.weights || C.WEIGHTS, target = ctx.targetPrice || C.TARGET_PRICE_PER_BED;
    const parts = {}; const reasons = []; let excluded = false;
    // price per bed against the target
    if (r.price_per_bed == null) parts.price = { pts: +(W.price * 0.2).toFixed(1), max: W.price, note: r.price_day != null ? `no hourly price (${HFI.fmtMoney(r.price_day)}/day)` : 'no price yet' };
    else parts.price = { pts: lerp(r.price_per_bed, target, target * C.PRICE_ZERO_MULTIPLIER, W.price), max: W.price, note: `${HFI.fmtMoney(r.price_per_bed)}/hr (${r.price_kind})` };
    // walking time to the market anchor
    if (r.east_bay) parts.distance = { pts: 0, max: W.distance, note: 'East Bay, ranked to the bottom by rule' };
    else if (r.walk == null) parts.distance = { pts: 0, max: W.distance, note: 'no walk time available' };
    else parts.distance = { pts: lerp(r.walk, C.WALK_FULL_MIN, C.WALK_ZERO_MIN, W.distance), max: W.distance, note: `${r.walk} min ${r.walk_is_estimate ? '(est.)' : 'walk'}` };
    // kitchen
    if (r.kitchen_ok) parts.kitchen = { pts: W.kitchen, max: W.kitchen, note: 'food allowed' };
    else if (r.kitchen_status === 'none') { parts.kitchen = { pts: 0, max: W.kitchen, note: 'no outside food' }; if (ctx.kitchenHard) { excluded = true; reasons.push('no food'); } }
    else parts.kitchen = { pts: +(W.kitchen * 0.4).toFixed(1), max: W.kitchen, note: 'food rules unknown' };
    // capacity against what is needed (a bed range from the house profile or the search)
    const b = r.beds, need = ctx.needBeds;
    if (b == null) parts.capacity = { pts: +(W.capacity * 0.25).toFixed(1), max: W.capacity, note: 'capacity unknown' };
    else if (!need) parts.capacity = { pts: b >= 20 ? W.capacity : +(W.capacity * 0.5).toFixed(1), max: W.capacity, note: `${b} people` };
    else if (b >= need[0] && b <= need[1]) parts.capacity = { pts: W.capacity, max: W.capacity, note: `holds ${b}, fits the ${need[0]} to ${need[1]} expected` };
    else if (b > need[1]) parts.capacity = { pts: +(W.capacity * 0.8).toFixed(1), max: W.capacity, note: `holds ${b}, roomier than needed` };
    else if (b >= need[0] / 2) parts.capacity = { pts: +(W.capacity * 0.67).toFixed(1), max: W.capacity, note: `holds ${b}, too small` };
    else parts.capacity = { pts: +(W.capacity * 0.3).toFixed(1), max: W.capacity, note: `holds ${b}, far too small` };
    // safety signal
    let s = r.safety_flag === 'ok' ? W.safety : r.safety_flag === 'mixed' ? W.safety * 0.6 : r.safety_flag === 'rough-block' ? W.safety * 0.2 : W.safety * 0.5;
    if (r.safety_reviews === 'bad') s = Math.max(0, s - W.safety * 0.3); else if (r.safety_reviews === 'concerns') s = Math.max(0, s - W.safety * 0.1);
    parts.safety = { pts: +s.toFixed(1), max: W.safety, note: r.safety_flag === 'ok' ? 'AV on site' : 'AV unknown' };
    // timing: only scored when the search names a move-in date
    if (ctx.from) {
      if (r.available_from) parts.timing = r.available_from <= ctx.from ? { pts: W.timing, max: W.timing, note: `available from ${HFI.fmtDate(r.available_from)}` } : { pts: 0, max: W.timing, note: `not until ${HFI.fmtDate(r.available_from)}` };
      else if (false) parts.timing = { pts: W.timing, max: W.timing, note: 'ready by mid September (tracker)' };
      else if (false) parts.timing = { pts: 0, max: W.timing, note: 'not ready by mid September (tracker)' };
      else parts.timing = { pts: +(W.timing * 0.4).toFixed(1), max: W.timing, note: 'move-in date unknown' };
    }
    const maxTotal = Object.values(parts).reduce((a, p) => a + p.max, 0);
    let score = Object.values(parts).reduce((a, p) => a + p.pts, 0) / maxTotal * 100;
    if (ctx.haus && (r.haus_node_ids || []).includes(ctx.haus.id)) { score = Math.min(100, score + C.HAUS_TAG_BONUS); reasons.push(`already tagged for ${ctx.haus.name}`); }
    if (r.dead) { score = 0; reasons.push(HFI.statusMeta(r.deal_status).label.toLowerCase()); }
    return { score: Math.round(score), parts, excluded, reasons };
  };
})();
