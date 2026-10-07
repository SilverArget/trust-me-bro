"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
process.env.TMB_MEASURE_HARD_TRACE = "1";

const root = path.join(__dirname, "..");
const campaign = path.join(root, "js", "a12-campaign.js");
const dockBuilder = fs.readFileSync(path.join(__dirname, "build-dock18.cjs"), "utf8");
const prefix = dockBuilder.slice(0, dockBuilder.indexOf("const parsed=readObjects(src)"))
  .replace("c.move_id=`${id.toLowerCase()}-mix-${String(n+1).padStart(2,'0')}`", "c.move_id=c.move_id");
const pair = fs.readFileSync(path.join(__dirname, "build-frozen-hard-pair.cjs"), "utf8");
const helpers = pair.slice(pair.indexOf("function surfaceFor"), pair.indexOf("for (const [id, parts]"));
const names = {
  M05: "SLAG BRIDGE",
  A03: "LAST COURIER",
  A05: "COLLAPSED PIER",
  A06: "FINAL ESCAPE",
};
const context = { require, __dirname, console, structuredClone, process, fs, path, names };
vm.createContext(context);
vm.runInContext(prefix + "\nconst parsed=readObjects(src);\n" + helpers + "\nthis.api={readObjects,compose,harden,objectRange,sourceTransitions,renameDeep};", context);
const { readObjects, compose, harden, objectRange, sourceTransitions, renameDeep } = context.api;

for (const [dockId, worldId] of Object.entries({D07:"F01",D08:"F02",D09:"F03",D10:"F04",D11:"M01",D12:"M02",D13:"M03",D14:"M04",D15:"A01",D16:"A02"})) {
  sourceTransitions[dockId] = renameDeep(sourceTransitions[worldId], worldId, dockId);
}
for (const [dir, ids] of [["dock-d01d02",["D01","D02"]],["dock-d03d04",["D03","D04"]],["dock-d05d06",["D05","D06"]]]) {
  for (const id of ids) sourceTransitions[id] = JSON.parse(fs.readFileSync(path.join("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur", dir, `transitions-${id}.json`), "utf8"));
}
for (const id of ["D17", "D18"]) sourceTransitions[id] = JSON.parse(fs.readFileSync(path.join(__dirname, "dock18-generated", `transitions-${id}.json`), "utf8"));

let src = fs.readFileSync(campaign, "utf8");
const parsed = readObjects(src);
const search = JSON.parse(fs.readFileSync(path.join(__dirname, "hard-composition-search.json"), "utf8"));
const currentMeta = JSON.parse(fs.readFileSync(path.join(__dirname, "world-hard-meta.json"), "utf8"));

function key(p) { return `${p.id}${p.side[0].toUpperCase()}@${p.cut}`; }
function worldFor(id) { return id[0] === "M" ? "magma" : "aftermath"; }
function disjoint(a, used) { return a.parts.every(p => !used.has(key(p))); }
function noSource(a, sources) { return a.parts.every(p => !sources.has(p.id)); }
function chooseOne(used, minDensity, sources = new Set()) {
  return search.passing
    .filter(c => c.pass && c.per1000 >= minDensity && disjoint(c, used) && noSource(c, sources))
    .sort((a, b) => b.per1000 - a.per1000)[0];
}

function findByKeys(keys) {
  const wanted = keys.join("|");
  const found = search.passing.find(c => c.parts.map(key).join("|") === wanted);
  if (!found) throw new Error(`missing candidate ${wanted}`);
  return found;
}
const plans = {
  M05: findByKeys(["D10L@4440.48", "D05L@735.6", "D12L@2169.6"]),
  A03: findByKeys(["D10L@3677.28", "D12L@2169.6", "D13L@956.4"]),
  A05: findByKeys(["D10L@4440.48", "D05L@1150.08", "D12L@2169.6"]),
  A06: findByKeys(["D10L@4440.48", "D12L@2169.6", "D13L@956.4"]),
};

const built = {}, coins = {}, generated = {}, meta = currentMeta;
for (const [id, plan] of Object.entries(plans)) {
  const parts = plan.parts.map(({id, side, fraction, cut}) => ({id, side, fraction, cut}));
  const product = compose(parsed.routes, parsed.coins, id, parts);
  product.transitions = product.transitions.map(t => t.vectorTrigger === "composite-seam" ? t : parts.reduce((q, spec, pi) => renameDeep(q, `${id}-P${pi + 1}`, `${id}-P${pi + 1}-${spec.id}`), t));
  product.transitions = product.transitions.filter(t => t.vectorTrigger !== "composite-seam" || ((t.gap ?? 0) >= 0 && Math.abs(t.D ?? 0) <= 193));
  const shallow = new Set(product.transitions.filter(t => t.mech === "dive" && (t.gap ?? 0) === 0 && t.D < 0 && -t.D < 30).map(t => t.B.x0));
  for (const t of product.transitions) if (shallow.has(t.B.x0) && t.mech === "dive") t.mech = "tutunma";
  product.route.diveZones = (product.route.diveZones || []).filter(z => !shallow.has(z.landX));
  const hard = harden(id, product);
  Object.assign(hard.route, { routeId: id, worldId: worldFor(id), version: 2, name: names[id], mode: "hard" });
  built[id] = hard.route;
  coins[id] = hard.coins.map((c, n) => ({ ...c, id: `${id}-c${String(n + 1).padStart(2, "0")}`, n, skill: (c.kind || c.type) !== "CJ" }));
  generated[id] = product.transitions;
  const scripted = product.transitions.filter(t => t.mech === "tutunma" || t.mech === "betikli").length;
  const partBounds = parts.map((spec, pi) => {
    const prefix = `${id.toLowerCase()}-p${pi + 1}-`;
    const segments = hard.route.groundSegments.filter(s => s.id.startsWith(prefix));
    return { part: pi + 1, source: spec.id, minX: Math.min(...segments.map(s => s.x)), maxX: Math.max(...segments.map(s => s.x + s.w)) };
  });
  meta[id] = { parts, partBounds, length: hard.route.length, movements: hard.route.diveZones.length + hard.route.obstacles.length + scripted, per1000: plan.per1000, threshold: plan.threshold, addedObstacles: hard.added, transportedDeviations: hard.transportedDeviations, coins: hard.coins.length };
}

function replaceEntries(marker, entries, routeMode) {
  const range = objectRange(src, marker);
  let body = src.slice(range.open + 1, range.close);
  for (const [id, value] of Object.entries(entries)) {
    const indent = "    ";
    const keyText = routeMode ? id : `"${id}"`;
    let json = JSON.stringify(value);
    if (routeMode) json = json.replace("\"coins\":\"__COINS__\"", `"coins":makeCoins("${id}", COINS.${id})`);
    const line = `${indent}${keyText}: ${json}`;
    const pattern = new RegExp(`^\\s+${routeMode ? id : `"${id}"`}: .*?(?=,?\\r?$)`, "m");
    if (!pattern.test(body)) throw new Error(`target line missing: ${marker} ${id}`);
    body = body.replace(pattern, line);
  }
  src = src.slice(0, range.open + 1) + body + src.slice(range.close);
}

replaceEntries("const COINS = Object.freeze(", coins, false);
for (const r of Object.values(built)) r.coins = "__COINS__";
replaceEntries("const ROUTES = Object.freeze(", built, true);
fs.writeFileSync(campaign, src, "utf8");
const out = path.join(__dirname, "frozen-hard-generated");
for (const [id, t] of Object.entries(generated)) fs.writeFileSync(path.join(out, `transitions-${id}.json`), JSON.stringify(t, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(__dirname, "world-hard-meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
console.log(JSON.stringify(Object.fromEntries(Object.entries(plans).map(([id, p]) => [id, {parts:p.parts, length:p.length, moves:p.moves, per1000:p.per1000, threshold:p.threshold}])) , null, 2));
