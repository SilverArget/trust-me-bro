#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const cp = require("child_process");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "js/a12-campaign.js");
const irRoot = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/ir";
let pass = 0, fail = 0;

function report(id, measured, expected, ok) {
  console.log(`${id} | ${measured} | ${expected} | ${ok ? "PASS" : "FAIL"}`);
  ok ? pass++ : fail++;
}
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
function loadRoutes(source) {
  const marker = "const ROUTES = Object.freeze(", start = source.indexOf(marker);
  if (start < 0) throw new Error("ROUTES declaration not found");
  const open = source.indexOf("(", start), close = balancedEnd(source, open);
  const program = `"use strict"; const GROUND=455; const collapsing=[];
    const COINS=new Proxy({}, {get:()=>[]}); const makeCoins=()=>[];
    ${source.slice(start, close + 1)};
    globalThis.result=ROUTES;`;
  const sandbox = Object.create(null);
  vm.createContext(sandbox);
  new vm.Script(program).runInContext(sandbox, { timeout: 5000 });
  return JSON.parse(JSON.stringify(sandbox.result));
}
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
function irSegments(file, start, topMin, prefix) {
  const ir = JSON.parse(fs.readFileSync(path.join(irRoot, file), "utf8"));
  const byId = new Map(ir.surfaces.map(s => [s.row_id, s]));
  return [["v", ir.path_surface_ids], ["u", ir.under_surface_ids]].flatMap(([group, ids]) => ids.map((id, i) => {
    const s = byId.get(id), x = round2((s.vx - start) * .24), right = round2((s.vx + s.vw - start) * .24);
    return { id: `${prefix}-${group}-${group === "v" ? String(i + 1).padStart(2, "0") : i + 1}`,
      x, w: round2(right - x), y: round2(455 - (s.vy - topMin) * .24), h: round2(s.vh * .24), kind: "ground" };
  }));
}
function segmentCheck(route, expected, tolerance, id) {
  const actual = new Map(route.groundSegments.map(s => [s.id, s]));
  let maxDiff = 0, ok = actual.size === expected.length;
  for (const e of expected) {
    const a = actual.get(e.id);
    if (!a) { ok = false; continue; }
    for (const key of ["x", "w", "y", "h"]) maxDiff = Math.max(maxDiff, Math.abs(a[key] - e[key]));
    ok = ok && a.kind === "ground";
  }
  ok = ok && maxDiff <= tolerance;
  report(id, `${actual.size} segments; max |fark|=${maxDiff.toFixed(2)}px`, `${expected.length}; <=${tolerance}px`, ok);
}

const currentSource = fs.readFileSync(sourcePath, "utf8");
const baseSource = cp.execFileSync("git", ["show", "d18af30:js/a12-campaign.js"], { cwd: root, encoding: "utf8" });
const routes = loadRoutes(currentSource), base = loadRoutes(baseSource);
const d01Expected = irSegments("story_01-backbone.json", 905, -4329.375, "d01");
const d02Ir = irSegments("story_02-backbone.json", -10, -2820, "d02");
const d02Steps = [
  ["d02-roof1-1",60,-263.8,480,39.6], ["d02-roof1-2",140,-303.4,320,39.6], ["d02-roof1-3",220,-343,160,39.6],
  ["d02-roof2-1",598.56,-263.8,480,39.6], ["d02-roof2-2",678.56,-303.4,320,39.6], ["d02-roof2-3",758.56,-343,160,39.6],
  ["d02-slope-1",1412.4,-65.5,85.8,43.5], ["d02-slope-2",1498.2,-22,85.8,43.5],
  ["d02-slope-3",1584,21.5,85.8,43.5], ["d02-slope-4",1669.8,65,85.8,43.5],
].map(([id,x,y,w,h]) => ({ id,x,y,w,h,kind:"ground" }));
segmentCheck(routes.D01, d01Expected, 1, "B-1 D01 IR");
segmentCheck({groundSegments: routes.D02.groundSegments.filter(s => /^d02-[vu]-/.test(s.id))}, d02Ir, 1, "B-1 D02 IR");
segmentCheck({groundSegments: routes.D02.groundSegments.filter(s => /^d02-(roof|slope)/.test(s.id))}, d02Steps, .01, "B-1 D02 basamak");

for (const id of ["D01", "D02"]) {
  const ramps = (routes[id].obstacles || []).filter(o => o.type === "ramp").length;
  report(`B-2 ${id} ramp`, ramps, 0, ramps === 0);
}
const rampIds = rs => Object.fromEntries(Object.entries(rs).map(([id,r]) => [id,(r.obstacles||[]).filter(o=>o.type==="ramp").map(o=>o.id)]));
const currentRamps = rampIds(routes), baseRamps = rampIds(base);
const vectorIds = ["D01","D02","D03","D04","D05","D06","F01","F02","F03","F04"];
const totalRamps = vectorIds.flatMap(id => currentRamps[id]).length;
report("B-2 toplam ramp", totalRamps, 14, totalRamps === 14);
const stableIds = ["D03","D04","D05","D06","F01","F02","F03","F04"];
const stableRamps = stableIds.every(id => JSON.stringify(currentRamps[id]) === JSON.stringify(baseRamps[id]));
report("B-2 sabit rota ramp id", stableRamps ? "aynı" : "farklı", "d18af30 ile aynı", stableRamps);

const metadata = {
  D01: { length:8375, finishX:8235, checkpoints:[70,4214], chief:4214 },
  D02: { length:6400, finishX:6260, checkpoints:[70,1211,3433,5200], chief:1211 },
};
for (const [id,e] of Object.entries(metadata)) {
  const r = routes[id];
  const ok = r.length===e.length && r.finishX===e.finishX && JSON.stringify(r.checkpoints)===JSON.stringify(e.checkpoints) && r.chief.startX===e.chief;
  report(`B-3 ${id} metadata`, `${r.length}/${r.finishX}/${r.checkpoints.join(",")}/${r.chief.startX}`, `${e.length}/${e.finishX}/${e.checkpoints.join(",")}/${e.chief}`, ok);
  const road = r.groundSegments.filter(s => new RegExp(`^${id.toLowerCase()}-v-`).test(s.id));
  const covered = r.checkpoints.filter(x => road.some(s => s.x <= x && x <= s.x + s.w));
  report(`B-3 ${id} checkpoint yol`, covered.join(","), r.checkpoints.join(","), covered.length === r.checkpoints.length);
}
report("B-3 D02 profile", routes.D02.movementProfile, "vector-v1", routes.D02.movementProfile === "vector-v1");
const otherIds = Object.keys(base).filter(id => id !== "D01" && id !== "D02");
const unchanged = otherIds.filter(id => JSON.stringify(routes[id]) === JSON.stringify(base[id]));
report("NEG diğer rotalar", `${unchanged.length}/${otherIds.length}`, `${otherIds.length}/${otherIds.length}`, unchanged.length === otherIds.length);
console.log(`${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
