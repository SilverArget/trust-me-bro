#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "js", "a12-campaign.js");
const GROUND = 455;
const PLAYER_W = 32;
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

function loadRoutes() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const coins = vm.runInNewContext(`(${objectLiteral(source, "const COINS = Object.freeze(")})`);
  const makeCoins = (id, list) => (list || coins[id] || []).map((c, i) => ({
    ...c,
    id: c.id || `${id}-c${String((c.n ?? i) + 1).padStart(2, "0")}`,
  }));
  const routes = vm.runInNewContext(`(${objectLiteral(source, "const ROUTES = Object.freeze(")})`, { COINS: coins, makeCoins });
  applyRuntimeRouteFixes(routes);
  return routes;
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
  const zones = actionWindows(route);
  const onPath = solids.some(s => coin.x >= s.x - 8 && coin.x <= s.x + s.w + 8 && coin.y >= s.y - 70 && coin.y <= s.y + 10) ||
    zones.some(z => (coin.x >= z.x1 - 40 && coin.x <= z.x2 + 160) || (Number.isFinite(z.landX) && Math.abs(coin.x - z.landX) < 100));
  return onPath ? null : "coin off bot path";
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

  for (const s of surfaces.filter(s => s.parkour === "slide")) {
    const hasAttachment = !!s.suspended || !!(route.visualAttachments || []).some(a => a.targetId === s.id && a.type === "suspend");
    rows.push({ id: s.id, route: id, issue: "slide obstacle has overhead attachment", decision: hasAttachment ? "ok" : "fix: add crane/gantry cable visual" });
  }

  for (const s of solids.filter(s => !s.parkour)) {
    if ((route.visualSupports || []).some(v => v.id === s.id && v.type === "stack-to-ground")) {
      rows.push({ id: s.id, route: id, issue: "solid surface has visual support to ground", decision: "ok" });
      continue;
    }
    if (isSupported(s, solids)) continue;
    const touched = surfaceTouchedByBot(s, route);
    rows.push({ id: s.id, route: id, issue: "solid surface unsupported to ground", decision: touched ? "fix: extend visual body to ground" : "fix: remove unused floating plate" });
  }

  if (id === "D09") {
    const catchableIds = new Set((route.catchableSurfaces || []).map(c => typeof c === "string" ? c : c.id));
    for (const s of solids.filter(s => !s.parkour && catchableIds.has(s.id) && !(route.visualSupports || []).some(v => v.id === s.id && v.type === "stack-to-ground"))) {
      if (!touchesSupportBelow(s, solids)) {
        rows.push({ id: s.id, route: id, issue: "D09 catchable solid has vertical air gap", decision: "fix: extend to real support or remove" });
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

  for (const s of solids.filter(s => !s.parkour && !isSupported(s, solids) && !surfaceTouchedByBot(s, route) && !(route.visualSupports || []).some(v => v.id === s.id))) {
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
  const selected = ids.length ? ids : Object.keys(routes).filter(id => /^(?:D(?:0[1-9]|1[0-8])|F0[1-4])$/.test(id)).sort();
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
