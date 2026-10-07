#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = process.env.TMB_ROOT || path.join(__dirname, "..");
const sourcePath = path.join(root, "js", "a12-campaign.js");
const GROUND = 455;
const PLAYER_W = 32;
const PLAYER_H = 48;
const MIN_MEANINGFUL_GAP = PLAYER_W + 8;

function balancedEnd(text, openAt) {
  const pairs = { "(": ")", "{": "}", "[": "]" };
  const stack = [];
  let quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = openAt; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && n === "/") { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "/" && n === "/") { lineComment = true; i++; continue; }
    if (c === "/" && n === "*") { blockComment = true; i++; continue; }
    if (c === "\"" || c === "'" || c === "`") { quote = c; continue; }
    if (pairs[c]) stack.push(pairs[c]);
    else if (stack.length && c === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i;
    }
  }
  throw new Error(`unbalanced JavaScript at ${openAt}`);
}

function objectLiteral(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`missing ${marker}`);
  const open = source.indexOf("{", at);
  const close = balancedEnd(source, open);
  return source.slice(open, close + 1);
}

function functionLiteral(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`missing ${marker}`);
  const open = source.indexOf("{", at);
  const close = balancedEnd(source, open);
  return source.slice(at, close + 1);
}

function loadRoutes() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const coins = vm.runInNewContext(`(${objectLiteral(source, "const COINS = Object.freeze(")})`);
  const makeCoins = (id, list) => (list || coins[id] || []).map((c, i) => ({
    ...c,
    id: c.id || `${id}-c${String((c.n ?? i) + 1).padStart(2, "0")}`,
  }));
  const routes = vm.runInNewContext(`(${objectLiteral(source, "const ROUTES = Object.freeze(")})`, { COINS: coins, makeCoins });
  applyProductRuntimeRules(source, routes);
  return routes;
}

function applyProductRuntimeRules(source, routes) {
  const fn = functionLiteral(source, "function applyD09LogicRulesToRoutes()");
  vm.runInNewContext(
    `const GROUND = ${GROUND}; const ROUTES = routes; ${fn}; applyD09LogicRulesToRoutes();`,
    { routes }
  );
}

function applyRuntimeRouteFixes(routes) {
  const d09 = routes.D09;
  if (!d09) return;
  d09.highJumpZones = (d09.highJumpZones || []).filter(z => z.id !== "d09-highjump500-01" && z.id !== "d09-highjump500-03");
  d09.diveZones = (d09.diveZones || []).filter(z => z.id !== "d09-divingkong-02");
  d09.scriptedMoveZones = (d09.scriptedMoveZones || []).filter(z => !["d09-highjump500-01", "d09-divingkong-02", "d09-highjump500-03"].includes(z.id));
  d09.hermesLaunchZones = [
    { id: "d09-hermes-opening-gap", x1: 280, x2: 324, landX: 403.44, landY: 151.875, peakY: 58 },
    { id: "d09-hermes-highjump500-06", x1: 950.64, x2: 1010.64, landX: 1281.84, landY: 233.5, peakY: 111.5 },
  ];
  const openingPost = d09.groundSegments?.find(s => s.id === "d09-ir-03");
  if (openingPost) openingPost.w = 132.96;
  const g2Block = d09.groundSegments?.find(s => s.id === "d09-ir-40");
  if (g2Block) g2Block.w = 320;
  const sarkanStep = d09.groundSegments?.find(s => s.id === "d09-ir-23");
  if (sarkanStep) sarkanStep.h = 303.675;
  if (!d09.catchableSurfaces?.some(s => (typeof s === "string" ? s : s.id) === "d09-ir-23")) d09.catchableSurfaces.push({ id: "d09-ir-23" });
  const sarkanSlides = [
    ["d09-ir-slide-01", 3820, 277.375],
    ["d09-ir-slide-02", 3932, 277.375],
    ["d09-ir-slide-03", 4044, 277.375],
  ];
  for (const [id, x, baseY] of sarkanSlides) {
    const obstacle = d09.obstacles?.find(o => o.id === id);
    if (obstacle) { obstacle.x = x; obstacle.baseY = baseY; }
    const scripted = d09.scriptedMoveZones?.find(z => z.id === `${id}-scripted`);
    if (scripted) { scripted.x = x; scripted.x1 = x - 60; scripted.x2 = x - 16; }
  }
}

function applyGlobalLogicRules(routes) {
  const selected = Object.keys(routes).filter(id => /^(?:D(?:0[1-9]|1[0-8])|[FMA]0[1-6])$/.test(id) && id !== "D09").sort();
  for (const id of selected) {
    const route = routes[id];
    if (!route) continue;
    route.visualAttachments = route.visualAttachments || [];
    for (const o of route.obstacles || []) {
      if (o.type === "slide" && !route.visualAttachments.some(a => a.targetId === o.id && a.type === "suspend")) {
        route.visualAttachments.push({ targetId: o.id, type: "suspend" });
      }
    }

    const slideStats = relocateSlidesOffTransitions(route);
    const closedGaps = closeNarrowGaps(route);
    route.logicRuleStats = { ...(route.logicRuleStats || {}), slideMoved: slideStats.moved, slideRemoved: slideStats.removed, slideBlocked: slideStats.blocked, physicalGapClosed: closedGaps };
    route.logicRuleDetails = { ...(route.logicRuleDetails || {}), slideMoved: slideStats.movedIds, slideRemoved: slideStats.removedIds, slideBlocked: slideStats.blockedIds };
    applyCoinPathOverrides(id, route);
    moveProblemCoins(route);

    route.visualSupports = route.visualSupports || [];
    const solids = routeSurfaces(route).filter(s => s.kind === "ground" || s.kind === "platform" || s.kind === "movingPlatform");
    const catchableIds = new Set((route.catchableSurfaces || []).map(c => typeof c === "string" ? c : c.id));
    let skippedSupports = 0;
    for (const s of solids) {
      if ((!isSupported(s, solids) || (catchableIds.has(s.id) && !touchesSupportBelow(s, solids))) && !route.visualSupports.some(v => v.id === s.id && v.type === "stack-to-ground")) {
        if (visualSupportCutsRunPath(s, solids, route)) {
          skippedSupports++;
          continue;
        }
        route.visualSupports.push({ id: s.id, type: "stack-to-ground" });
      }
    }
    route.logicRuleStats.visualSupportSkipped = skippedSupports;
  }
}

function visualSupportCutsRunPath(surface, solids, route) {
  const top = surface.y + surface.h;
  if (top >= GROUND - 1) return false;
  return solids.some(other => other.id !== surface.id &&
    other.y >= top - 1 &&
    other.y < GROUND - 1 &&
    overlaps(surface.x, surface.x + surface.w, other.x, other.x + other.w) &&
    surfaceTouchedByBot(other, route));
}

function closeNarrowGaps(route) {
  let closed = 0;
  for (let guard = 0; guard < 24; guard++) {
    const solids = routeSurfaces(route).filter(s => s.kind === "ground" || s.kind === "platform" || s.kind === "movingPlatform");
    const gap = narrowGaps(solids.filter(s => !s.parkour))[0];
    if (!gap) break;
    const left = (route.groundSegments || []).find(s => s.id === gap.left.id);
    const right = (route.groundSegments || []).find(s => s.id === gap.right.id);
    if (!left || !right) break;
    left.w = Number((right.x - left.x).toFixed(3));
    closed++;
  }
  return closed;
}

function applyCoinPathOverrides(id, route) {
  const fixes = {
    D03: {
      "D03-c04": [4138.22, 291.03],
      "D03-c08": [2506.16, 78.73],
    },
    F03: {
      "F03-c06": [441.62, 83.47],
      "F03-c07": [1492.53, 216.83],
      "F03-c08": [2679.66, 287.95],
      "F03-c10": [6385.24, 165.69],
    },
    F04: {
      "F04-c07": [2272.69, 314.36],
      "F04-c08": [7118.66, 456.2],
      "F04-c12": [660.22, -369.92],
    },
  }[id];
  if (!fixes || !route.coins) return;
  for (const coin of route.coins) {
    const xy = fixes[coin.id];
    if (xy) {
      coin.x = xy[0];
      coin.y = xy[1];
    }
  }
}

function transitionBands(route) {
  return actionWindows(route).flatMap(z => {
    const out = [{ x0: z.x1 - 16, x1: z.x2 + 16, id: z.id }];
    if (Number.isFinite(z.landX)) out.push({ x0: z.landX - 40, x1: z.landX + 40, id: z.id });
    return out;
  });
}

function slideBar(o) {
  return { x0: o.x - 16, x1: o.x + o.w + 16 };
}

function bandOverlap(bar, bands) {
  return bands.reduce((n, b) => n + Math.max(0, Math.min(bar.x1, b.x1) - Math.max(bar.x0, b.x0)), 0);
}

function relocateSlidesOffTransitions(route) {
  const removeByRoute = {
    D07: ["d07-slide-01"],
    D08: ["d08-slide-01", "d08-slide-03"],
    D10: ["d10-slide-01", "d10-slide-02"],
    D11: ["d11-slide-02"],
    D12: ["d12-slide-01"],
    D13: ["d13-slide-01", "d13-slide-02", "d13-slide-03", "d13-slide-05", "d13-slide-06"],
    D15: ["d15-slide-01"],
    D17: ["d17-p2-m03-slide-06"],
    D18: ["d18-p1-a01-slide-01", "d18-p2-f03-slide-04", "d18-p2-f03-slide-05"],
    F01: ["f01-p2-d13-slide-06"],
  };
  const stats = { moved: 0, removed: 0, blocked: 0, movedIds: [], removedIds: [], blockedIds: [] };
  const removals = new Set(removeByRoute[route.routeId] || []);
  if (removals.size) {
    const before = (route.obstacles || []).length;
    route.obstacles = (route.obstacles || []).filter(o => !(o.type === "slide" && removals.has(o.id)));
    route.scriptedMoveZones = (route.scriptedMoveZones || []).filter(z => !removals.has(z.obstacleId) && !removals.has(String(z.id || "").replace(/-scripted$/, "")));
    stats.removed = before - route.obstacles.length;
    stats.removedIds = [...removals];
  }
  const bands = transitionBands(route);
  for (const o of [...(route.obstacles || [])]) {
    if (o.type !== "slide") continue;
    const ownId = `${o.id}-scripted`;
    const relevant = bands.filter(b => b.id !== ownId);
    if (!bandOverlap(slideBar(o), relevant)) continue;
    stats.blocked++;
    stats.blockedIds.push(o.id);
  }
  return stats;
}

function moveProblemCoins(route) {
  if (!route.coins?.length) return;
  for (let guard = 0; guard < 24; guard++) {
    const solids = routeSurfaces(route).filter(s => s.kind === "ground" || s.kind === "platform" || s.kind === "movingPlatform" || s.parkour);
    const problem = route.coins.find(c => coinIssue(c, route, solids));
    if (!problem) return;
    if (!placeCoinOnPath(problem, route, solids)) return;
  }
}

function placeCoinOnPath(coin, route, solids) {
  const candidates = solids.filter(s => !s.parkour && s.w >= 72 && surfaceTouchedByBot(s, route));
  if (!candidates.length) return null;
  candidates.sort((a, b) => Math.abs((a.x + a.w / 2) - coin.x) - Math.abs((b.x + b.w / 2) - coin.x));
  const original = { x: coin.x, y: coin.y };
  for (const target of candidates) {
    coin.x = Number(Math.min(Math.max(original.x, target.x + 24), target.x + target.w - 24).toFixed(2));
    coin.y = Number((target.y - 36).toFixed(2));
    if (!coinIssue(coin, route, solids)) return true;
  }
  coin.x = original.x;
  coin.y = original.y;
  return false;
}

function routeSurfaces(route) {
  const out = route.groundSegments ? route.groundSegments.map(s => ({ ...s })) : [{ x: 0, y: GROUND, w: route.length, h: 100, kind: "ground" }];
  for (const o of route.obstacles || []) {
    const baseY = o.baseY ?? GROUND;
    if (o.type === "vault") out.push({ id: o.id, x: o.x, y: baseY - o.h, w: o.w, h: o.h, parkour: "vault" });
    if (o.type === "slide") out.push({ id: o.id, x: o.x, y: baseY - o.h - 32, w: o.w, h: o.h, parkour: "slide" });
    if (o.type === "platform") out.push({ id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, kind: "platform" });
    if (o.type === "overpass") out.push({ id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, kind: "movingPlatform" });
  }
  return out;
}

function overlaps(a0, a1, b0, b1, pad = 0) {
  return a0 < b1 + pad && a1 > b0 - pad;
}

function isSupported(surface, solids) {
  if ((surface.y + surface.h) >= GROUND - 1) return true;
  const below = solids.filter(s => s.id !== surface.id && s.y >= surface.y + surface.h - 1 && overlaps(surface.x, surface.x + surface.w, s.x, s.x + s.w, 4));
  return below.some(s => isSupported(s, solids));
}

function touchesSupportBelow(surface, solids) {
  const bottom = surface.y + surface.h;
  if (bottom >= GROUND - 1) return true;
  return solids.some(s => s.id !== surface.id &&
    Math.abs(s.y - bottom) <= 1.5 &&
    overlaps(surface.x, surface.x + surface.w, s.x, s.x + s.w, 4));
}

function actionWindows(route) {
  return [
    ...(route.highJumpZones || []).map(z => ({ id: z.id, x1: z.x1, x2: z.x2, landX: z.landX, landY: z.landY, type: "high" })),
    ...(route.diveZones || []).map(z => ({ id: z.id, x1: z.x1, x2: z.x2, landX: z.landX, landY: z.landY, type: "dive" })),
    ...(route.scriptedMoveZones || []).map(z => ({ id: z.id, x1: z.x1, x2: z.x2, landX: z.endX, type: z.kind || z.move })),
  ].filter(z => Number.isFinite(z.x1) && Number.isFinite(z.x2));
}

function supportUnderSlide(slide, route) {
  const baseY = slide.baseY ?? GROUND;
  const span = [slide.x, slide.x + slide.w];
  return (route.groundSegments || []).filter(s =>
    Math.abs(s.y - baseY) <= 1.5 &&
    overlaps(span[0], span[1], s.x, s.x + s.w, 0)
  );
}

function slideSupportIssue(slide, route) {
  const supports = supportUnderSlide(slide, route);
  if (!supports.length) return "slide over pit/lower segment instead of flat top";
  const cover = supports.reduce((n, s) => n + Math.max(0, Math.min(slide.x + slide.w, s.x + s.w) - Math.max(slide.x, s.x)), 0);
  if (cover < slide.w - 1) return "slide not fully over one flat supported surface";
  const nearestEdge = Math.min(...supports.map(s => Math.min(Math.abs(slide.x - s.x), Math.abs((s.x + s.w) - (slide.x + slide.w)))));
  if (nearestEdge < 24) return `slide too close to step edge (${nearestEdge.toFixed(1)}px)`;
  return null;
}

function jumpLandingBands(route) {
  if (route.routeId !== "D18") return [];
  const solids = (route.groundSegments || [])
    .filter(s => s.kind === "ground" || s.kind === "platform" || s.kind === "movingPlatform")
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const bands = [];
  for (const left of solids) for (const right of solids) {
    if (right.x <= left.x + left.w) continue;
    const gap = right.x - (left.x + left.w);
    if (gap < 24 || gap > 180) continue;
    if (right.y > left.y + 96) continue;
    bands.push({ id: `${left.id}->${right.id}`, x0: right.x, x1: right.x + 244 });
  }
  return bands;
}

function vaultLandingBands(route) {
  return (route.obstacles || [])
    .filter(o => o.type === "vault")
    .map(o => ({ id: o.id, x0: o.x + o.w, x1: o.x + o.w + 160 }));
}

function slideLandingIssue(slide, route) {
  const bar = slideBar(slide);
  const jump = jumpLandingBands(route).find(b => overlaps(bar.x0, bar.x1, b.x0, b.x1, 0));
  if (jump) return `slide inside jump landing arc ${jump.id}`;
  const vault = vaultLandingBands(route).find(b => overlaps(bar.x0, bar.x1, b.x0, b.x1, 0));
  if (vault) return `slide inside vault landing arc ${vault.id}`;
  return null;
}

function surfaceTouchedByBot(surface, route) {
  const zones = actionWindows(route);
  if (zones.some(z => overlaps(surface.x, surface.x + surface.w, z.x1 - 80, z.x2 + 120))) return true;
  if (zones.some(z => Number.isFinite(z.landX) && z.landX >= surface.x - 16 && z.landX <= surface.x + surface.w + 16)) return true;
  if ((route.catchableSurfaces || []).some(c => (typeof c === "string" ? c : c.id) === surface.id)) return true;
  if ((route.coins || []).some(c => c.x >= surface.x - 4 && c.x <= surface.x + surface.w + 4 && c.y <= surface.y + 8)) return true;
  return surface.w >= 160 && surface.x < (route.finishX ?? route.length);
}

function coinIssue(coin, route, solids) {
  const inside = solids.find(s => coin.x >= s.x && coin.x <= s.x + s.w && coin.y >= s.y && coin.y <= s.y + s.h);
  if (inside) return `coin in solid ${inside.id}`;
  const narrowGap = narrowGaps(solids).find(g => coin.x > g.left.x + g.left.w && coin.x < g.right.x);
  if (narrowGap) return `coin in narrow gap ${narrowGap.left.id}/${narrowGap.right.id}`;
  return null;
}

function narrowGaps(solids) {
  const gaps = [];
  const byX = [...solids].sort((a, b) => a.x - b.x || a.y - b.y);
  const seen = new Set();
  for (const left of byX) {
    for (const right of byX) {
      if (right === left || Math.abs(right.y - left.y) > 12) continue;
      const gap = right.x - (left.x + left.w);
      if (gap <= 0.5 || gap >= MIN_MEANINGFUL_GAP) continue;
      const key = `${left.id}/${right.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        gaps.push({ left, right, gap });
      }
    }
  }
  return gaps;
}

function auditRoute(id, route) {
  const surfaces = routeSurfaces(route);
  const solids = surfaces.filter(s => s.kind === "ground" || s.kind === "platform" || s.kind === "movingPlatform" || s.parkour);
  const rows = [];

  for (const flag of route.__auditFlags || []) {
    rows.push({ route: id, ...flag });
  }

  for (const s of surfaces.filter(s => s.parkour === "slide")) {
    const hasAttachment = !!s.suspended || !!(route.visualAttachments || []).some(a => a.targetId === s.id && a.type === "suspend");
    rows.push({ id: s.id, route: id, issue: "slide obstacle has overhead attachment", decision: hasAttachment ? "ok" : "fix: add crane/gantry cable visual" });
  }

  for (const slide of route.obstacles || []) {
    if (slide.type !== "slide") continue;
    const supportIssue = slideSupportIssue(slide, route);
    if (supportIssue) rows.push({ id: slide.id, route: id, issue: supportIssue, decision: "fix: move to flat surface or remove" });
    const landingIssue = slideLandingIssue(slide, route);
    if (landingIssue) rows.push({ id: slide.id, route: id, issue: landingIssue, decision: "fix: move out of landing arc or remove" });
  }

  for (const s of solids.filter(s => !s.parkour)) {
    if ((route.visualSupports || []).some(v => v.id === s.id && v.type === "stack-to-ground")) {
      rows.push({ id: s.id, route: id, issue: "solid surface has visual support to ground", decision: "ok" });
      continue;
    }
    if (visualSupportCutsRunPath(s, solids.filter(v => !v.parkour), route)) {
      rows.push({ id: s.id, route: id, issue: "visual support would cut player path", decision: "ok: not drawn" });
      continue;
    }
    if (isSupported(s, solids)) continue;
    const touched = surfaceTouchedByBot(s, route);
    rows.push({ id: s.id, route: id, issue: "solid surface unsupported to ground", decision: touched ? "fix: extend visual body to ground" : "fix: remove unused floating plate" });
  }

  {
    const catchableIds = new Set((route.catchableSurfaces || []).map(c => typeof c === "string" ? c : c.id));
    for (const s of solids.filter(s => !s.parkour && catchableIds.has(s.id) && !(route.visualSupports || []).some(v => v.id === s.id && v.type === "stack-to-ground"))) {
      if (visualSupportCutsRunPath(s, solids.filter(v => !v.parkour), route)) continue;
      if (!touchesSupportBelow(s, solids)) {
        rows.push({ id: s.id, route: id, issue: "catchable solid has vertical air gap", decision: "fix: extend to real support or remove" });
      }
    }
  }

  for (const g of narrowGaps(solids.filter(s => !s.parkour))) {
    rows.push({ id: `${g.left.id}/${g.right.id}`, route: id, issue: `same-height narrow gap ${g.gap.toFixed(2)}px`, decision: "fix: merge or widen; move trapped coin if present" });
  }

  for (const coin of route.coins || []) {
    const issue = coinIssue(coin, route, solids);
    if (issue) rows.push({ id: coin.id || coin.move_id || `coin@${coin.x}`, route: id, issue, decision: "fix: move coin to bot path" });
  }

  for (const s of solids.filter(s => !s.parkour && !isSupported(s, solids) && !surfaceTouchedByBot(s, route) && !(route.visualSupports || []).some(v => v.id === s.id) && !visualSupportCutsRunPath(s, solids.filter(v => !v.parkour), route))) {
    rows.push({ id: s.id, route: id, issue: "floating decorative step unused by bot", decision: "fix: remove or ground visually" });
  }

  const ladder = route.chief?.ladder || route.chiefEntry || null;
  if (ladder) {
    const ends = [ladder.x ?? ladder.x1, ladder.x2 ?? ladder.x];
    const ok = ends.every(x => solids.some(s => x >= s.x - 4 && x <= s.x + s.w + 4));
    rows.push({ id: `${id}-chief-ladder`, route: id, issue: "chief ladder endpoints rest on surfaces", decision: ok ? "ok" : "fix: align ladder endpoints" });
  } else {
    rows.push({ id: `${id}-chief-ladder`, route: id, issue: "chief 15% entry ladder inferred from recorded path", decision: "ok: no explicit ladder geometry to adjust" });
  }

  return rows;
}

function main() {
  const routes = loadRoutes();
  const json = process.argv.includes("--json");
  const dumpRoute = process.argv.includes("--dump-route");
  const ids = process.argv.slice(2).filter(arg => !arg.startsWith("--"));
  const selected = ids.length ? ids : Object.keys(routes).filter(id => /^(?:D(?:0[1-9]|1[0-8])|[FMA]0[1-6])$/.test(id)).sort();
  if (dumpRoute) {
    console.log(JSON.stringify(Object.fromEntries(selected.map(id => [id, routes[id]])), null, 2));
    return;
  }
  const results = {};
  for (const id of selected) results[id] = auditRoute(id, routes[id]);
  const summary = Object.fromEntries(Object.entries(results).map(([id, rows]) => [id, {
    issues: rows.filter(r => !r.decision.startsWith("ok")).length,
    g1: rows.filter(r => r.issue.includes("slide obstacle") && !r.decision.startsWith("ok")).map(r => r.id),
    g2: rows.filter(r => r.issue.includes("narrow gap")).map(r => r.id),
    stats: routes[id]?.logicRuleStats || {},
    details: routes[id]?.logicRuleDetails || {},
  }]));
  const payload = { generatedAt: new Date().toISOString(), summary, results };
  if (json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.table(Object.entries(summary).map(([route, s]) => ({ route, issues: s.issues, g1: s.g1.length, g2: s.g2.length })));
    for (const id of selected) {
      console.log(`\n${id}`);
      console.table(results[id].map(({ id, issue, decision }) => ({ id, issue, decision })));
    }
  }
}

main();
