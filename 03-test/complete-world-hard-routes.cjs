"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const cp = require("child_process");
const campaignPath = path.join(root, "js", "a12-campaign.js");
const dockBuilder = fs.readFileSync(path.join(__dirname, "build-dock18.cjs"), "utf8");
const prefix = dockBuilder.slice(0, dockBuilder.indexOf("const parsed=readObjects(src)"));
const ctx = { require, __dirname, console, structuredClone };
vm.createContext(ctx);
vm.runInContext(prefix + "\nthis.api={readObjects,objectRange};", ctx);
const { readObjects, objectRange } = ctx.api;

// Always start from HEAD so a failed generation cannot compound into the next
// run. The product write itself still goes through Node fs utf8 as required.
let src = cp.execFileSync("git", ["show", "HEAD:js/a12-campaign.js"], { cwd: root, encoding: "utf8" });
const parsed = readObjects(src);

const routeNames = {
  F01: "NIGHT SHIFT", F02: "COLD STORAGE", F03: "BLACK ICE", F04: "ZERO VISIBILITY",
  F05: "WHITEOUT RUN", F06: "GLACIER GATE",
  M01: "FOUNDRY WALK", M02: "CASTING CRANE", M03: "FURNACE AISLE", M04: "MAGMA LIFT",
  M05: "SLAG BRIDGE", M06: "CORE MELT",
  A01: "BROKEN RECEIVING", A02: "EMERGENCY CARGO", A03: "LAST COURIER", A04: "FINAL DISPATCH",
  A05: "COLLAPSED PIER", A06: "FINAL ESCAPE",
};
const worldFor = id => id[0] === "F" ? "frozen" : id[0] === "M" ? "magma" : "aftermath";
const templateFor = {
  F05: "F03", F06: "F04",
  M01: "F01", M02: "F02", M03: "F03", M04: "F04", M05: "F03", M06: "F04",
  A01: "F01", A02: "F03", A03: "F03", A04: "F03", A05: "F03", A06: "F03",
};
const transitionTemplates = templateFor;

function renameDeep(value, from, to) {
  if (typeof value === "string") return value.replaceAll(from.toLowerCase(), to.toLowerCase()).replaceAll(from, to);
  if (Array.isArray(value)) return value.map(v => renameDeep(v, from, to));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renameDeep(v, from, to)]));
  }
  return value;
}

const routeUpdates = {};
const coinUpdates = {};
for (const [id, from] of Object.entries(templateFor)) {
  const route = renameDeep(structuredClone(parsed.routes[from]), from, id);
  Object.assign(route, { routeId: id, worldId: worldFor(id), version: 2, name: routeNames[id], mode: "hard" });
  delete route.chief;
  delete route.voidEdges;
  route.coins = `__COINS_${id}__`;
  routeUpdates[id] = route;
  coinUpdates[id] = renameDeep(structuredClone(parsed.coins[from]), from, id).map((c, n) => ({
    ...c,
    n,
    kind: c.kind || c.type,
    skill: (c.kind || c.type) !== "CJ",
  }));
}

function replaceFrozenMagmaAftermathRegistry(text) {
  return text
    .replace('frozen: { id: "frozen", themeId: "frozen", price: 160, enabled: true, routes: ["F01", "F02", "F03", "F04"] }',
      'frozen: { id: "frozen", themeId: "frozen", price: 160, enabled: true, routes: ["F01", "F02", "F03", "F04", "F05", "F06"] }')
    .replace('magma: { id: "magma", themeId: "magma", price: 200, enabled: true, routes: ["M01", "M02", "M03", "M04"] }',
      'magma: { id: "magma", themeId: "magma", price: 200, enabled: true, routes: ["M01", "M02", "M03", "M04", "M05", "M06"] }')
    .replace('aftermath: { id: "aftermath", themeId: "aftermath", price: 500, enabled: true, routes: ["A01", "A02", "A03", "A04"] }',
      'aftermath: { id: "aftermath", themeId: "aftermath", price: 500, enabled: true, routes: ["A01", "A02", "A03", "A04", "A05", "A06"] }');
}

function replaceWholeObject(text, marker, entries, routeMode = false) {
  const range = objectRange(text, marker);
  const lines = Object.entries(entries).map(([id, value]) => {
    const key = routeMode ? id : JSON.stringify(id);
    let json = JSON.stringify(value);
    if (routeMode) json = json.replace(new RegExp(`"__COINS_${id}__"`), `makeCoins("${id}", COINS.${id})`);
    return `    ${key}: ${json}`;
  });
  return text.slice(0, range.open + 1) + "\n" + lines.join(",\n") + "\n  " + text.slice(range.close);
}

src = replaceFrozenMagmaAftermathRegistry(src);
src = src
  .replace('M01: "FOUNDRY WALK", M02: "CASTING CRANE", M03: "FURNACE AISLE", M04: "MAGMA LIFT",',
    'M01: "FOUNDRY WALK", M02: "CASTING CRANE", M03: "FURNACE AISLE", M04: "MAGMA LIFT", M05: "SLAG BRIDGE", M06: "CORE MELT",')
  .replace('A01: "BROKEN RECEIVING", A02: "EMERGENCY CARGO", A03: "LAST COURIER", A04: "FINAL DISPATCH",',
    'A01: "BROKEN RECEIVING", A02: "EMERGENCY CARGO", A03: "LAST COURIER", A04: "FINAL DISPATCH", A05: "COLLAPSED PIER", A06: "FINAL ESCAPE",')
  .replace('M01: "DÖKÜMHANE YOLU", M02: "DÖKÜM VİNCİ", M03: "FIRIN KORİDORU", M04: "MAGMA ASANSÖRÜ",',
    'M01: "DÖKÜMHANE YOLU", M02: "DÖKÜM VİNCİ", M03: "FIRIN KORİDORU", M04: "MAGMA ASANSÖRÜ", M05: "CÜRUF KÖPRÜSÜ", M06: "ÇEKİRDEK ERİMESİ",')
  .replace('A01: "HASARLI KABUL", A02: "ACİL DURUM YÜKÜ", A03: "SON KURYE", A04: "SON SEVKİYAT",',
    'A01: "HASARLI KABUL", A02: "ACİL DURUM YÜKÜ", A03: "SON KURYE", A04: "SON SEVKİYAT", A05: "ÇÖKMÜŞ İSKELE", A06: "SON KAÇIŞ",')
  .replace('M01: "ЛИТЕЙНЫЙ ПУТЬ", M02: "ЛИТЕЙНЫЙ КРАН", M03: "ПЕЧНОЙ ПРОХОД", M04: "МАГМОВЫЙ ЛИФТ",',
    'M01: "ЛИТЕЙНЫЙ ПУТЬ", M02: "ЛИТЕЙНЫЙ КРАН", M03: "ПЕЧНОЙ ПРОХОД", M04: "МАГМОВЫЙ ЛИФТ", M05: "ШЛАКОВЫЙ МОСТ", M06: "РАСПЛАВ ЯДРА",')
  .replace('A01: "ПОВРЕЖДЁННАЯ ПРИЁМКА", A02: "АВАРИЙНЫЙ ГРУЗ", A03: "ПОСЛЕДНИЙ КУРЬЕР", A04: "ФИНАЛЬНАЯ ОТПРАВКА",',
    'A01: "ПОВРЕЖДЁННАЯ ПРИЁМКА", A02: "АВАРИЙНЫЙ ГРУЗ", A03: "ПОСЛЕДНИЙ КУРЬЕР", A04: "ФИНАЛЬНАЯ ОТПРАВКА", A05: "РУХНУВШИЙ ПИРС", A06: "ПОСЛЕДНИЙ ПОБЕГ",');

const allCoins = { ...parsed.coins, ...coinUpdates };
const allRoutes = { ...parsed.routes, ...routeUpdates };
for (const [id, route] of Object.entries(allRoutes)) if (allCoins[id]) route.coins = `__COINS_${id}__`;
src = replaceWholeObject(src, "const COINS = Object.freeze(", allCoins, false);
src = replaceWholeObject(src, "const ROUTES = Object.freeze(", allRoutes, true);

const allRouteIds = [
  ...Array.from({ length: 18 }, (_, i) => `D${String(i + 1).padStart(2, "0")}`),
  ...["F", "M", "A"].flatMap(p => Array.from({ length: 6 }, (_, i) => `${p}0${i + 1}`)),
];
src = src.replace(/const HERMES_ROUTE_IDS=new Set\(\[[^\]]+\]\);/,
  `const HERMES_ROUTE_IDS=new Set(${JSON.stringify(allRouteIds)});`);
src = src.replace('if (!/^F0[1-4]$/.test(id)) return true;', 'if (!/^F0[1-6]$/.test(id)) return true;');
src = src.replace('if (worldId==="magma") return ["M04","M03","M02","M01"].find(id=>routeUnlocked(id));',
  'if (worldId==="magma") return [...WORLD_REGISTRY.magma.routes].reverse().find(id=>routeUnlocked(id));');
src = src.replace('return ["F04","F03","F02","F01"].find(id=>ROUTES[id]&&routeUnlocked(id)) || "F01";',
  'return [...WORLD_REGISTRY.frozen.routes].reverse().find(id=>ROUTES[id]&&routeUnlocked(id)) || "F01";');
src = src.replace('if (worldId==="magma") return ["M01","M02","M03","M04"];', 'if (worldId==="magma") return WORLD_REGISTRY.magma.routes;');
src = src.replace('if (worldId==="frozen") return ["F01","F02","F03","F04"];', 'if (worldId==="frozen") return WORLD_REGISTRY.frozen.routes;');
src = src.replace('route.worldId==="aftermath"?["A01","A02","A03","A04"]:route.worldId==="magma"?["M01","M02","M03","M04"]:["F01","F02","F03","F04"]',
  'route.worldId==="aftermath"?WORLD_REGISTRY.aftermath.routes:route.worldId==="magma"?WORLD_REGISTRY.magma.routes:WORLD_REGISTRY.frozen.routes');
src = src.replace('profile.selectedWorldId==="aftermath"?["A04","A03","A02","A01"]:profile.selectedWorldId==="magma"?["M04","M03","M02","M01"]:profile.selectedWorldId==="frozen"?["F04","F03","F02","F01"]:[...WORLD_REGISTRY.dock31.routes].reverse()',
  '["aftermath","magma","frozen"].includes(profile.selectedWorldId)?[...WORLD_REGISTRY[profile.selectedWorldId].routes].reverse():[...WORLD_REGISTRY.dock31.routes].reverse()');

fs.writeFileSync(campaignPath, src, "utf8");
const generatedDir = path.join(__dirname, "frozen-hard-generated");
for (const [id, from] of Object.entries(transitionTemplates)) {
  const sourceFile = path.join(generatedDir, `transitions-${from}.json`);
  if (!fs.existsSync(sourceFile)) continue;
  const transitions = renameDeep(JSON.parse(fs.readFileSync(sourceFile, "utf8")), from, id);
  fs.writeFileSync(path.join(generatedDir, `transitions-${id}.json`), JSON.stringify(transitions, null, 2) + "\n", "utf8");
}
console.log(`updated ${Object.keys(routeUpdates).length} hard world routes`);
