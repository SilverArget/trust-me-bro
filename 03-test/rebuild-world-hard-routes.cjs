"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const cp = require("child_process");

process.env.TMB_MEASURE_HARD_TRACE = "1";
const root = path.join(__dirname, "..");
const campaignPath = path.join(root, "js", "a12-campaign.js");
const dockBuilder = fs.readFileSync(path.join(__dirname, "build-dock18.cjs"), "utf8");
const prefix = dockBuilder.slice(0, dockBuilder.indexOf("const parsed=readObjects(src)"))
  .replace("c.move_id=`${id.toLowerCase()}-mix-${String(n+1).padStart(2,'0')}`", "c.move_id=c.move_id");
const pair = fs.readFileSync(path.join(__dirname, "build-frozen-hard-pair.cjs"), "utf8");
const helpers = pair.slice(pair.indexOf("function surfaceFor"), pair.indexOf("for (const [id, parts]"));
const context = { require, __dirname, console: { log() {} }, structuredClone, process, fs, path };
vm.createContext(context);
vm.runInContext(prefix + "\nconst parsed=readObjects(src);const meta={};\n" + helpers + "\nthis.api={readObjects,objectRange,compose,harden,sourceTransitions,renameDeep};", context);
const { readObjects, objectRange, compose, harden, sourceTransitions, renameDeep } = context.api;

let src = fs.readFileSync(campaignPath, "utf8");
const current = readObjects(src);
const oldSrc = cp.execFileSync("git", ["show", "83be2fc:js/a12-campaign.js"], { cwd: root, encoding: "utf8" });
const old = readObjects(oldSrc);

const design = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur";
const dataRoots = {
  D01: "dock-d01d02", D02: "dock-d01d02", D03: "dock-d03d04", D04: "dock-d03d04",
  D05: "dock-d05d06", D06: "dock-d05d06",
};
for (const [id, dir] of Object.entries(dataRoots)) {
  sourceTransitions[id] = JSON.parse(fs.readFileSync(path.join(design, dir, `transitions-${id}.json`), "utf8"));
}
for (const [dockId, worldId] of Object.entries({
  D07: "F01", D08: "F02", D09: "F03", D10: "F04",
  D11: "M01", D12: "M02", D13: "M03", D14: "M04",
  D15: "A01", D16: "A02",
})) {
  sourceTransitions[dockId] = renameDeep(sourceTransitions[worldId], worldId, dockId);
}
for (const id of ["D17", "D18"]) {
  sourceTransitions[id] = JSON.parse(fs.readFileSync(path.join(__dirname, "dock18-generated", `transitions-${id}.json`), "utf8"));
}

const routeNames = {
  F05: "WHITEOUT RUN", F06: "GLACIER GATE",
  M05: "SLAG BRIDGE", M06: "CORE MELT",
  A03: "LAST COURIER", A04: "FINAL DISPATCH", A05: "COLLAPSED PIER", A06: "FINAL ESCAPE",
};
const worldFor = id => id[0] === "F" ? "frozen" : id[0] === "M" ? "magma" : "aftermath";
const plans = {
  F05: [{ id: "D02", side: "left", fraction: 0.487247, cut: 3118.38 }, { id: "D01", side: "right", fraction: 0.501149, cut: 4197.12 }],
  F06: [{ id: "D12", side: "left", fraction: 0.203808, cut: 1455.6 }, { id: "D17", side: "left", fraction: 0.395547, cut: 3819.28 }, { id: "D02", side: "left", fraction: 0.487247, cut: 3118.38 }],
  M05: [{ id: "D12", side: "left", fraction: 0.203808, cut: 1455.6 }, { id: "D05", side: "left", fraction: 0.377819, cut: 2875.2 }, { id: "D04", side: "left", fraction: 0.415718, cut: 3396 }],
  M06: [{ id: "D17", side: "left", fraction: 0.395547, cut: 3819.28 }, { id: "D13", side: "left", fraction: 0.105755, cut: 956.4 }, { id: "D11", side: "left", fraction: 0.291048, cut: 2887.2 }],
  A03: [{ id: "D09", side: "left", fraction: 0.106269, cut: 814.8 }, { id: "D10", side: "left", fraction: 0.488962, cut: 4440.48 }, { id: "D17", side: "left", fraction: 0.395547, cut: 3819.28 }],
  A04: [{ id: "D10", side: "left", fraction: 0.488962, cut: 4440.48 }, { id: "D17", side: "left", fraction: 0.395547, cut: 3819.28 }, { id: "D06", side: "left", fraction: 0.10386, cut: 532.8 }],
  A05: [{ id: "D12", side: "left", fraction: 0.203808, cut: 1455.6 }, { id: "D10", side: "left", fraction: 0.488962, cut: 4440.48 }, { id: "D02", side: "left", fraction: 0.487247, cut: 3118.38 }],
  A06: [{ id: "D12", side: "left", fraction: 0.203808, cut: 1455.6 }, { id: "D17", side: "left", fraction: 0.395547, cut: 3819.28 }, { id: "D03", side: "left", fraction: 0.418697, cut: 2989.08 }],
};

const report = {};
const newRoutes = {};
const newCoins = {};
const generated = {};
for (const [id, parts] of Object.entries(plans)) {
  const product = compose(current.routes, current.coins, id, parts);
  product.transitions = product.transitions
    .map(t => t.vectorTrigger === "composite-seam" ? t : parts.reduce((q, spec, pi) => renameDeep(q, `${id}-P${pi + 1}`, `${id}-P${pi + 1}-${spec.id}`), t))
    .filter(t => t.vectorTrigger !== "composite-seam" || ((t.gap ?? 0) >= 0 && Math.abs(t.D ?? 0) <= 193));
  const shallow = new Set(product.transitions.filter(t => t.mech === "dive" && (t.gap ?? 0) === 0 && t.D < 0 && -t.D < 30).map(t => t.B.x0));
  for (const t of product.transitions) if (shallow.has(t.B.x0) && t.mech === "dive") t.mech = "tutunma";
  product.route.diveZones = (product.route.diveZones || []).filter(z => !shallow.has(z.landX));
  const hard = harden(id, product);
  hard.route.routeId = id;
  hard.route.worldId = worldFor(id);
  hard.route.name = routeNames[id];
  hard.route.mode = "hard";
  hard.route.version = 2;
  hard.route.coins = `__COINS_${id}__`;
  newRoutes[id] = hard.route;
  newCoins[id] = hard.coins.map((c, n) => ({ ...c, id: `${id}-c${String(n + 1).padStart(2, "0")}`, n, skill: c.kind !== "CJ" }));
  generated[id] = product.transitions;
  const scripted = product.transitions.filter(t => t.mech === "tutunma" || t.mech === "betikli").length;
  const partBounds = parts.map((spec, pi) => {
    const prefix = `${id.toLowerCase()}-p${pi + 1}-`;
    const segs = hard.route.groundSegments.filter(s => s.id.startsWith(prefix));
    return { part: pi + 1, source: spec.id, minX: Math.min(...segs.map(s => s.x)), maxX: Math.max(...segs.map(s => s.x + s.w)) };
  });
  const moves = hard.route.diveZones.length + hard.route.obstacles.length + scripted;
  report[id] = { parts, partBounds, length: hard.route.length, movements: moves, density: moves * 1000 / hard.route.length, coins: newCoins[id].length, addedObstacles: hard.added };
}

const allCoins = { ...current.coins };
const allRoutes = { ...current.routes };
for (const id of ["M01", "M02", "M03", "M04", "A01", "A02"]) {
  allCoins[id] = structuredClone(old.coins[id]);
  allRoutes[id] = structuredClone(old.routes[id]);
}
for (const [id, route] of Object.entries(newRoutes)) allRoutes[id] = route;
for (const [id, coins] of Object.entries(newCoins)) allCoins[id] = coins;
for (const [id, route] of Object.entries(allRoutes)) if (allCoins[id]) route.coins = `__COINS_${id}__`;

function replaceWholeObject(text, marker, entries, routeMode = false) {
  const range = objectRange(text, marker);
  const lines = Object.entries(entries).map(([id, value]) => {
    let json = JSON.stringify(value);
    if (routeMode) json = json.replace(new RegExp(`"__COINS_${id}__"`), `makeCoins("${id}", COINS.${id})`);
    return `    ${routeMode ? id : JSON.stringify(id)}: ${json}`;
  });
  return text.slice(0, range.open + 1) + "\n" + lines.join(",\n") + "\n  " + text.slice(range.close);
}

src = replaceWholeObject(src, "const COINS = Object.freeze(", allCoins, false);
src = replaceWholeObject(src, "const ROUTES = Object.freeze(", allRoutes, true);
fs.writeFileSync(campaignPath, src, "utf8");
const out = path.join(__dirname, "frozen-hard-generated");
fs.mkdirSync(out, { recursive: true });
for (const [id, dir] of Object.entries({
  M01: "magma-m01m02", M02: "magma-m01m02", M03: "magma-m03m04", M04: "magma-m03m04",
  A01: "aftermath-a01a02", A02: "aftermath-a01a02",
})) {
  const transitions = JSON.parse(fs.readFileSync(path.join(design, dir, `transitions-${id}.json`), "utf8"));
  fs.writeFileSync(path.join(out, `transitions-${id}.json`), JSON.stringify(transitions, null, 2) + "\n", "utf8");
}
for (const [id, transitions] of Object.entries(generated)) {
  fs.writeFileSync(path.join(out, `transitions-${id}.json`), JSON.stringify(transitions, null, 2) + "\n", "utf8");
}
fs.writeFileSync(path.join(__dirname, "world-hard-meta.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));
