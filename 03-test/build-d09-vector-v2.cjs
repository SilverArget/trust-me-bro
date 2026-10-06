#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "js/a12-campaign.js");
const irPath = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/ir/story_09.json";
const round = (n, p = 2) => Math.round((n + Number.EPSILON) * 10 ** p) / 10 ** p;
const snapY = n => Math.round(n * 8) / 8;

function balancedEnd(text, openAt) {
  const pairs = { "(": ")", "{": "}", "[": "]" }, stack = [];
  let quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = openAt; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (lineComment) { if (c === "\n") lineComment = false; continue; }
    if (blockComment) { if (c === "*" && n === "/") { blockComment = false; i++; } continue; }
    if (quote) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === quote) quote = null; continue; }
    if (c === "/" && n === "/") { lineComment = true; i++; continue; }
    if (c === "/" && n === "*") { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (pairs[c]) stack.push(pairs[c]);
    else if (stack.length && c === stack.at(-1)) { stack.pop(); if (!stack.length) return i; }
  }
  throw new Error(`unbalanced JavaScript at ${openAt}`);
}

function extractRouteObject(source, id) {
  const routesAt = source.indexOf("const ROUTES = Object.freeze(");
  const keyAt = source.indexOf(`"${id}":`, routesAt);
  if (keyAt < 0) throw new Error(`${id} route not found`);
  const open = source.indexOf("{", keyAt);
  const close = balancedEnd(source, open);
  return { keyAt, open, close: close + 1, text: source.slice(open, close + 1) };
}

function loadRoute(source, id) {
  const { text } = extractRouteObject(source, id);
  return vm.runInNewContext(`(${text})`, { makeCoins: () => [], COINS: { [id]: [] } });
}

function encode(value) {
  return JSON.stringify(value).replace(/"coins":\[\]/, `"coins":makeCoins("D09",COINS.D09)`);
}

function coinsForRoute(surfaces, finishX) {
  const pickSurface = x => surfaces
    .filter(s => s.w >= 80)
    .map(s => ({ s, dx: x < s.x ? s.x - x : x > s.x + s.w ? x - (s.x + s.w) : 0 }))
    .sort((a, b) => a.dx - b.dx || a.s.y - b.s.y)[0].s;
  return Array.from({ length: 13 }, (_, n) => {
    const target = 460 + n * ((finishX - 820) / 12);
    const s = pickSurface(target);
    const x = round(Math.max(s.x + 24, Math.min(target, s.x + s.w - 24)));
    return { n, move_id: `d09-ir-coin-${String(n + 1).padStart(2, "0")}`, kind: n % 4 === 3 ? "CC" : n % 3 === 2 ? "CS" : "CJ", x, y: round(s.y - 28), skill: n % 4 === 3 };
  });
}

function replaceCoinList(source, routeId, coins) {
  const key = `"${routeId}":`;
  const start = source.indexOf(key, source.indexOf("const COINS = Object.freeze("));
  if (start < 0) throw new Error(`${routeId} coin list not found`);
  const open = source.indexOf("[", start);
  const close = balancedEnd(source, open);
  return `${source.slice(0, open)}${JSON.stringify(coins)}${source.slice(close + 1)}`;
}

function topY(item) {
  return snapY(607.155 - item.px_up);
}

function toSurface(item, index) {
  return {
    id: `d09-ir-${String(index + 1).padStart(2, "0")}`,
    x: round(item.px_x - 120),
    y: topY(item),
    w: round(item.px_w),
    h: round(item.px_h),
    kind: "ground",
  };
}

function surfaceForX(surfaces, x, preferBelowY = null) {
  const containing = surfaces.filter(s => x >= s.x - 2 && x <= s.x + s.w + 2);
  const pool = containing.length ? containing : surfaces;
  const scored = pool.map(s => {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const dx = Math.abs(cx - x);
    const dy = preferBelowY == null ? 0 : Math.max(0, s.y - preferBelowY);
    return { s, score: dx + dy * 0.08 + (s.w < 35 ? -8 : 0) };
  }).sort((a, b) => a.score - b.score || a.s.y - b.s.y);
  return scored[0]?.s || surfaces[0];
}

function nextLanding(surfaces, x) {
  return surfaces
    .filter(s => s.x > x + 24 && s.w >= 28)
    .sort((a, b) => a.x - b.x || a.y - b.y)[0] || surfaces.at(-1);
}

function buildTraversalTransitions(surfaces) {
  const path = surfaces.filter(s => s.w >= 24).sort((a, b) => a.x - b.x || a.y - b.y);
  const transitions = [];
  for (let i = 0; i < path.length - 1; i++) {
    const A = path[i], B = path[i + 1];
    const gap = round(B.x - (A.x + A.w));
    const D = round(B.y - A.y);
    if (gap < -2 && D >= -18) continue;
    const base = {
      i: i + 1,
      A: { x0: A.x, x1: round(A.x + A.w), y: A.y, id: A.id },
      B: { x0: B.x, x1: round(B.x + B.w), y: B.y, id: B.id },
      gap,
      D,
    };
    if (gap > 72 || (gap > 36 && Math.abs(D) > 48)) {
      transitions.push({
        ...base,
        mech: "dive",
        x1: round(Math.max(A.x + 8, A.x + A.w - 150)),
        x2: round(Math.max(A.x + 40, A.x + A.w - 30)),
        landX: round(B.x + Math.min(40, B.w / 2)),
        landY: B.y,
        peakY: round(Math.min(A.y, B.y) - 110),
      });
    } else if (D < -18) {
      transitions.push({ ...base, mech: "tutunma" });
    } else if (gap > 2 && gap <= 120) {
      transitions.push({ ...base, mech: "normal" });
    }
  }
  for (const t of transitions) {
    if (t.mech === "dive" && t.B.id === "d09-ir-45") {
      t.x1 = 7104;
      t.x2 = 7140;
      t.landX = round(t.B.x0 + 48);
      t.peakY = round(Math.min(t.A.y, t.B.y) - 112);
      t.vectorTrigger = "d09-final-dive-align";
    }
    if (t.mech === "tutunma" && t.i === 30) {
      t.B.x0 = 4810;
      t.vectorTrigger = "d09-office-speedvault-05-align";
    }
    if (t.mech === "tutunma" && t.i === 32) {
      t.B.x0 = 5045;
      t.vectorTrigger = "d09-office-speedvault-06-align";
    }
  }
  return transitions;
}

function zoneForMove(item, i, surfaces) {
  const x = round(item.px_x - 120);
  const landing = nextLanding(surfaces, x);
  const base = {
    id: `d09-${item.move_name.replace(/^Trigger/, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}-${String(i + 1).padStart(2, "0")}`,
    move: item.move_name,
    x: round(x),
    x1: round(Math.max(40, x - 96)),
    x2: round(Math.max(88, x - 36)),
  };
  if (item.move_name === "TriggerHighJump500") {
    return { ...base, x1: round(Math.max(40, x - 150)), x2: round(Math.max(100, x - 90)), landX: round(landing.x + Math.min(40, landing.w / 2)), landY: landing.y, peakY: round(Math.min(landing.y, topY(item)) - 122) };
  }
  if (item.move_name === "TriggerDivingKong") {
    return { ...base, x1: round(Math.max(40, x - 80)), x2: round(x + 40), landX: round(landing.x + Math.min(40, landing.w / 2)), landY: landing.y, peakY: round(Math.min(landing.y, topY(item)) - 96) };
  }
  return base;
}

const source = fs.readFileSync(sourcePath, "utf8");
const oldRoute = loadRoute(source, "D09");
const ir = JSON.parse(fs.readFileSync(irPath, "utf8"));
const platformItems = ir.items
  .filter(it => it.category === "platform" && !it.duplicate_of && Number.isFinite(it.px_w) && Number.isFinite(it.px_h))
  .sort((a, b) => a.vx - b.vx || a.vy - b.vy || a.source_order - b.source_order);
const groundSegments = platformItems.map(toSurface);
const moveItems = ir.items
  .filter(it => it.category === "move_trigger" && it.move_name && it.move_name !== "TriggerJump" && it.move_name !== "TriggerSpeedUp")
  .sort((a, b) => a.vx - b.vx || a.source_order - b.source_order);
const grouped = moveItems.reduce((acc, it) => ((acc[it.move_name] ||= []).push(it), acc), {});
const zones = moveItems.map((it, i) => zoneForMove(it, i, groundSegments));

const highJumpZones = zones
  .filter(z => z.move === "TriggerHighJump500")
  .map(({ id, x1, x2, landX, landY, peakY }) => ({ id, x1, x2, landX, landY, peakY }));
const triggerDiveZones = zones
  .filter(z => z.move === "TriggerDivingKong")
  .map(({ id, x1, x2, landX, landY, peakY }) => ({ id, x1, x2, landX, landY, peakY }));
const traversalTransitions = buildTraversalTransitions(groundSegments);
const traversalDiveZones = traversalTransitions
  .filter(t => t.mech === "dive")
  .map((t, i) => ({ id: `d09-traversal-dz-${String(i + 1).padStart(2, "0")}`, x1: t.x1, x2: t.x2, landX: t.landX, landY: t.landY, peakY: t.peakY }));
const traversalDiveAssists = traversalTransitions
  .filter(t => t.mech === "dive" && t.B.x0 > 2250 && t.B.x0 < 2350)
  .map((t, i) => ({ id: `d09-traversal-dz-${String(i + 1).padStart(2, "0")}-assist`, x1: round(t.B.x0 - 70), x2: round(t.B.x0 + 20), landX: t.landX, landY: t.landY, peakY: t.peakY }));
const transitionAssists = traversalTransitions
  .filter(t => t.mech === "dive" && t.B.x0 > 2250 && t.B.x0 < 2350)
  .map((t, i) => ({ ...t, i: 900 + i, x1: round(t.B.x0 - 70), x2: round(t.B.x0 + 20) }));
const traversalHighZones = traversalTransitions
  .filter(t => t.mech === "tutunma" && t.D < -100)
  .map((t, i) => ({ id: `d09-traversal-hj-${String(i + 1).padStart(2, "0")}`, x1: round(t.B.x0 - 96), x2: round(t.B.x0 + 12), landX: round(t.B.x0 + Math.min(40, (t.B.x1 - t.B.x0) / 2)), landY: t.B.y, peakY: round(t.B.y - 122) }));

const vaultMoveNames = new Set(["TriggerSpeedVault", "TriggerReverseVault", "TriggerBarrelVaultTrick0High"]);
const obstacles = [];
for (const [i, it] of (grouped.TriggerSlide || []).entries()) {
  const triggerX = round(it.px_x - 84);
  const x = round(it.px_x - 44);
  const s = surfaceForX(groundSegments, triggerX, topY(it));
  obstacles.push({ id: `d09-ir-slide-${String(i + 1).padStart(2, "0")}`, type: "slide", x, w: 48, h: 86.4, baseY: s.y });
}
for (const [i, it] of moveItems.filter(it => vaultMoveNames.has(it.move_name)).entries()) {
  const x = round(it.px_x - 88.8 + (i === 4 || i === 5 ? 48 : 0));
  const s = surfaceForX(groundSegments, x, topY(it));
  obstacles.push({ id: `d09-ir-vault-${String(i + 1).padStart(2, "0")}`, type: "vault", x, w: 72, h: 48, baseY: s.y });
}
obstacles.sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
const obstacleMoveZones = obstacles.map(o => {
  const y = round((o.baseY ?? 455) - o.h);
  if (o.type === "slide") {
    return {
      id: `${o.id}-scripted`,
      move: "TriggerSlide",
      kind: "slide",
      obstacleId: o.id,
      x: o.x,
      x1: round(o.x - 60),
      x2: round(o.x - 16),
    };
  }
  const trigger = zones
    .filter(z => /Vault/.test(z.move) && Math.abs(z.x - o.x) < 140)
    .sort((a, b) => Math.abs(a.x - o.x) - Math.abs(b.x - o.x))[0];
  const officeAirVault = o.id === "d09-ir-vault-05" || o.id === "d09-ir-vault-06";
  return {
    id: `${o.id}-scripted`,
    move: "TriggerVault",
    kind: "vault",
    obstacleId: o.id,
    x: o.x,
    x1: round(trigger ? Math.min(trigger.x1, o.x - 74) : o.x - 74),
    x2: round(o.x - 30),
    endX: round(o.x + (o.w - 32) / 2),
    top: round(y - 48 - 4),
    ...(officeAirVault ? { airborne: true } : {}),
  };
});

const catchItems = [...(grouped.TriggerCatch || []), ...(grouped.TriggerCatchFast || [])]
  .sort((a, b) => a.vx - b.vx || a.source_order - b.source_order);
const catchableSurfaces = catchItems.map(it => {
  const s = surfaceForX(groundSegments, it.px_x - 120, topY(it));
  return { id: s.id };
});

const route = {
  ...oldRoute,
  length: round(groundSegments.at(-1).x + groundSegments.at(-1).w + 440),
  finishX: round(groundSegments.at(-2).x + groundSegments.at(-2).w - 120),
  checkpoints: [70, 2176, 4842],
  movementProfile: "vector-v1",
  catchableSurfaces,
  highJumpZones: [...highJumpZones, ...traversalHighZones],
  diveZones: [...triggerDiveZones, ...traversalDiveZones, ...traversalDiveAssists],
  scriptedMoveZones: [...zones.map(({ id, move, x, x1, x2 }) => ({ id, move, x, x1, x2 })), ...obstacleMoveZones],
  groundSegments,
  obstacles,
  coins: [],
  chief: { startX: 2176 },
};
route.groundSegments = route.groundSegments.filter(s => s.id !== "d09-ir-02" && s.id !== "d09-ir-41");
const d09MergedBlock = route.groundSegments.find(s => s.id === "d09-ir-40");
if (d09MergedBlock) d09MergedBlock.w = 320;
route.visualSupports = [
  "d09-ir-01", "d09-ir-03", "d09-ir-04", "d09-ir-05",
  "d09-ir-25", "d09-ir-26", "d09-ir-30", "d09-ir-31",
  "d09-ir-32", "d09-ir-37",
].map(id => ({ id, type: "stack-to-ground" }));
route.visualAttachments = route.obstacles
  .filter(o => o.type === "slide")
  .map(o => ({ targetId: o.id, type: "suspend" }));
const coins = coinsForRoute(groundSegments, route.finishX);
const d09Coin11 = coins.find(c => c.n === 10);
if (d09Coin11) {
  d09Coin11.x = 6460;
  d09Coin11.y = 379;
}

const d09 = extractRouteObject(source, "D09");
const routeNext = `${source.slice(0, d09.open)}${encode(route)}${source.slice(d09.close)}`;
const next = replaceCoinList(routeNext, "D09", coins);
fs.writeFileSync(sourcePath, next);
fs.writeFileSync(path.join(__dirname, "dock18-generated/transitions-D09.json"), `${JSON.stringify([...traversalTransitions, ...transitionAssists].sort((a, b) => (a.x1 ?? a.B.x0) - (b.x1 ?? b.B.x0) || a.i - b.i), null, 2)}\n`);

const moveCounts = Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length]));
console.log(JSON.stringify({
  scale_px_per_vector_unit: ir.scale_px_per_vector_unit,
  irSizedPlatforms: platformItems.length,
  d09GroundSegments: groundSegments.length,
  irMoveCounts: moveCounts,
  d09: {
    catchableSurfaces: catchableSurfaces.length,
    highJumpZones: highJumpZones.length,
    traversalHighZones: traversalHighZones.length,
    diveZones: triggerDiveZones.length,
    traversalDiveZones: traversalDiveZones.length,
    traversalDiveAssists: traversalDiveAssists.length,
    transitionAssists: transitionAssists.length,
    transitions: traversalTransitions.length,
    slideObstacles: obstacles.filter(o => o.type === "slide").length,
    vaultObstacles: obstacles.filter(o => o.type === "vault").length,
    scriptedMoveZones: route.scriptedMoveZones.length,
    obstacleMoveZones: obstacleMoveZones.length,
    coins: coins.length,
  },
}, null, 2));
