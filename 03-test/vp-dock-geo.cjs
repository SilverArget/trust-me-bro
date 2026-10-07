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
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mojibakePattern = /Ã|Å|Ä|â€|Â·|Ð[\x80-\xBF]/g;
const mojibakeMatches = text => text.match(mojibakePattern) || [];
report("UTF8-a12", `${mojibakeMatches(currentSource).length} mojibake`, "0 mojibake", mojibakeMatches(currentSource).length === 0);
report("UTF8-index", `${mojibakeMatches(indexSource).length} mojibake`, "0 mojibake", mojibakeMatches(indexSource).length === 0);
report("UTF8-negative", `${mojibakeMatches("BUY â€” 10").length} detected`, ">0 detected", mojibakeMatches("BUY â€” 10").length > 0);
const baseSource = cp.execFileSync("git", ["show", "67224ac:js/a12-campaign.js"], { cwd: root, encoding: "utf8" });
const routes = loadRoutes(currentSource), base = loadRoutes(baseSource);
const d01Expected = irSegments("story_01-backbone.json", 905, -4329.375, "d01");
const d02Ir = irSegments("story_02-backbone.json", -10, -2820, "d02");
const d02Steps = [
  ["d02-roof1-1",60,-263.8,480,39.6], ["d02-roof1-2",140,-303.4,320,39.6], ["d02-roof1-3",220,-343,160,39.6],
  ["d02-roof2-1",598.56,-263.8,480,39.6], ["d02-roof2-2",678.56,-303.4,320,39.6], ["d02-roof2-3",758.56,-343,160,39.6],
  ["d02-slope-1",1412.4,-65.5,85.8,43.5], ["d02-slope-2",1498.2,-22,85.8,43.5],
  ["d02-slope-3",1584,21.5,85.8,43.5], ["d02-slope-4",1669.8,65,85.8,43.5],
].map(([id,x,y,w,h]) => ({ id,x,y,w,h,kind:"ground" }));
const d03Expected = irSegments("story_03-backbone.json", 0, -1065, "d03");
const d04Expected = irSegments("story_04-backbone.json", 0, -3765, "d04");
const d05Expected = irSegments("story_05-backbone.json", 0, -4820, "d05");
const d06Expected = irSegments("story_06-backbone.json", 0, -1100, "d06");
const f01Expected = irSegments("story_07-backbone.json", 0, -1925, "f01");
const f02Expected = irSegments("story_08-backbone.json", 0, -3700, "f02");
const f03Expected = irSegments("story_09-backbone.json", 0, -1263, "f03");
const f04Expected = irSegments("story_10-backbone.json", 0, -2275, "f04");
const m01Expected = irSegments("story_11-backbone.json", 0, -5671, "m01");
const m02Expected = irSegments("bonus_01-backbone.json", 0, -2715, "m02");
const m03Expected = irSegments("bonus_02-backbone.json", 0, -2720, "m03");
const m04Expected = irSegments("bonus_03-backbone.json", 0, -1112, "m04");
const extraSteps = {
  D03: [["d03-slope-1",4946.53,323.8,117.76,41.6],["d03-slope-2",5064.29,365.4,117.76,41.6],["d03-slope-3",5182.04,407,117.76,41.6]],
  D04: [...Array.from({length:7},(_,i)=>[`d04-slope-${i+1}`,round2(1374+i*40.285714),round2(-448.6+(i+1)*45.257143),round2(40.285714),round2(45.257143)])],
  D05: [...Array.from({length:3},(_,i)=>[`d05-up-${i+1}`,round2(195.6+i*80),round2(-701.8-(i+1)*39.2),80,39.2]),...Array.from({length:5},(_,i)=>[`d05-down1-${i+1}`,round2(4934.82+i*46.52),round2(-192.76+(i+1)*39.888),46.52,39.888]),...Array.from({length:4},(_,i)=>[`d05-down2-${i+1}`,round2(5796.48+i*58.5),round2(23+(i+1)*45),58.5,45]),...Array.from({length:6},(_,i)=>[`d05-down3-${i+1}`,round2(6091.68+i*38.8),round2(203+(i+1)*42),38.8,42])],
  D06: [],
  F01: [],
  F02: Array.from({length:5},(_,i)=>[`f02-slope-${i+1}`,round2(7347.6+i*70.56),round2(Math.round((32.625+(i+1)*41.275)*8)/8),70.56,41.275]),
  F03: [...Array.from({length:3},(_,i)=>[`f03-up-${i+1}`,round2(420.24+i*33.12),round2(Math.round((455-(i+1)*(118.75/3))*8)/8),33.12,118.75/3]),...Array.from({length:6},(_,i)=>[`f03-down-${i+1}`,round2(5829.84+i*75),round2(Math.round((186.25+(i+1)*(268.75/6))*8)/8),75,268.75/6])],
  F04: [],
  M01: [...Array.from({length:2},(_,i)=>[`m01-slope1-${i+1}`,round2(4605.6+i*138.24),round2(Math.round((71.96-(i+1)*45.6)*8)/8),138.24,45.6]),...Array.from({length:2},(_,i)=>[`m01-slope2-${i+1}`,round2(6831.12+i*104.4),round2(Math.round((47-(i+1)*38.4)*8)/8),104.4,38.4])],
  M02: Array.from({length:5},(_,i)=>[`m02-slope-${i+1}`,round2(1455.6+i*66.48),round2(Math.round((-461.8+(i+1)*40.08)*8)/8),66.48,40.08]),
  M03: [...Array.from({length:3},(_,i)=>[`m03-slope1-${i+1}`,round2(375.6+i*74.8),round2(Math.round((-197.75-(i+1)*39.625)*8)/8),74.8,39.625]),...Array.from({length:5},(_,i)=>[`m03-slope2-${i+1}`,round2(1803.6+i*46.32),round2(Math.round((-218.25+(i+1)*40.8)*8)/8),46.32,40.8]),...Array.from({length:3},(_,i)=>[`m03-slope3-${i+1}`,round2(7387.2+i*53.2),round2(Math.round((337.375+(i+1)*35.625)*8)/8),53.2,35.625]),...Array.from({length:2},(_,i)=>[`m03-slope4-${i+1}`,round2(7779.6+i*74.4),round2(Math.round((444.25-(i+1)*47.1875)*8)/8),74.4,47.1875])],
  M04: [...Array.from({length:3},(_,i)=>[`m04-slope1-${i+1}`,round2(1736.4+i*67.2),round2(Math.round((303.375-(i+1)*(118.625/3))*8)/8),67.2,118.625/3]),...Array.from({length:4},(_,i)=>[`m04-slope2-${i+1}`,round2(5570.4+i*60.9),round2(Math.round((162.25+(i+1)*45.875)*8)/8),60.9,45.875])],
};
const extracted = {
  D01: new Set(["d01-v-12","d01-v-13","d01-v-18"]),
  D02: new Set(["d02-v-07","d02-v-12","d02-v-13"]),
  D03: new Set(["d03-v-10","d03-v-15","d03-v-22"]),
  D04: new Set(["d04-v-04","d04-v-11","d04-v-12"]),
  D05: new Set(["d05-v-16"]),
  D06: new Set(["d06-v-12","d06-v-20"]),
  F01: new Set(["f01-v-05","f01-v-09","f01-v-10","f01-v-14","f01-v-17","f01-v-20","f01-v-21"]),
  F02: new Set(["f02-v-19","f02-v-22","f02-v-27","f02-v-33","f02-v-34","f02-v-35","f02-v-36","f02-v-38"]),
};
segmentCheck(routes.D01, d01Expected.filter(s => !extracted.D01.has(s.id)), 1, "B-1 D01 IR");
segmentCheck({groundSegments: routes.D02.groundSegments.filter(s => /^d02-[vu]-/.test(s.id))}, d02Ir.filter(s => !extracted.D02.has(s.id)), 1, "B-1 D02 IR");
for (const [id, expected] of [["D01",d01Expected],["D02",d02Ir]]) {
  const route=routes[id], wanted=expected.filter(s=>extracted[id].has(s.id));
  const found=wanted.filter(s=>route.obstacles.some(o=>Math.abs(o.x-s.x)<=1&&Math.abs(o.w-s.w)<=1&&Math.abs(o.h-s.h)<=1&&(o.type==="slide"||o.type==="vault")));
  report(`B-1 ${id} çıkarılan engel`, `${found.length}/${wanted.length}`, `${wanted.length}/${wanted.length}; IR ±1px`, found.length===wanted.length);
}
const hardMetaPath=path.join(root,"03-test/frozen-hard-meta.json");
const hardMeta=fs.existsSync(hardMetaPath)?JSON.parse(fs.readFileSync(hardMetaPath,"utf8")):{};
// F01 is immutable in this phase; its pre-existing overlap is reserved for
// the final review pass. Apply the new construction gates to mutable routes.
const hardCompositeIds=["F02","F03","F04"].filter(id=>routes[id]?.mode==="hard");
const hardPartOrder=[],hardObstacleOverlap=[],hardTransitionOverlap=[];
for(const id of hardCompositeIds){
  const bounds=hardMeta[id]?.partBounds||[];
  for(let i=1;i<bounds.length;i++)if(bounds[i].minX+0.011<bounds[i-1].maxX)hardPartOrder.push({route:id,previous:bounds[i-1],current:bounds[i]});
  const obstacles=(routes[id].obstacles||[]).slice().sort((a,b)=>a.x-b.x);
  for(let i=0;i<obstacles.length;i++)for(let j=i+1;j<obstacles.length&&obstacles[j].x<obstacles[i].x+obstacles[i].w;j++)hardObstacleOverlap.push({route:id,a:obstacles[i].id,b:obstacles[j].id});
  const tf=path.join(root,"03-test/frozen-hard-generated",`transitions-${id}.json`);
  const transitions=fs.existsSync(tf)?JSON.parse(fs.readFileSync(tf,"utf8")):[];
  for(const o of obstacles)for(const t of transitions){
    const window=t.mech==="dive"?[t.x1,t.x2]:t.mech==="tutunma"?[t.A.x1,t.B.x0]:null;
    if(window&&o.x<Math.max(...window)&&o.x+o.w>Math.min(...window))hardTransitionOverlap.push({route:id,obstacle:o.id,transition:t.i,mech:t.mech,window});
  }
}
report("HARD parca sirasi",JSON.stringify(hardPartOrder),"[]",hardPartOrder.length===0);
report("HARD engel ortusmesi",JSON.stringify(hardObstacleOverlap),"[]",hardObstacleOverlap.length===0);
report("HARD engel/gecis ortusmesi",JSON.stringify(hardTransitionOverlap),"[]",hardTransitionOverlap.length===0);
if(hardPartOrder.length||hardObstacleOverlap.length||hardTransitionOverlap.length)process.exitCode=1;
for (const id of ["F01","F02","F03","F04"]) {
  if(routes[id].mode!=="hard") {
    const expected=id==="F01"?f01Expected:f02Expected;
    segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-[vu]-`).test(s.id))},expected.filter(s=>!extracted[id].has(s.id)),1,`B-1 ${id} IR`);
    segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-slope-`).test(s.id))},extraSteps[id].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:"ground"})),.063,`B-1 ${id} basamak`);
    continue;
  }
  const parts=hardMeta[id]?.parts||[];
  for(const [pi,spec] of parts.entries()){
    const prefix=`${id.toLowerCase()}-p${pi+1}-`, source=new Map(routes[spec.id].groundSegments.map(s=>[s.id,s]));
    const actual=routes[id].groundSegments.filter(s=>s.id.startsWith(prefix));
    let dx=null,dy=null,maxShape=0,ok=actual.length>0;
    for(const a of actual){const s=source.get(a.id.slice(prefix.length));if(!s){ok=false;continue;}maxShape=Math.max(maxShape,Math.abs(a.w-s.w),Math.abs(a.h-s.h));const qx=a.x-s.x,qy=a.y-s.y;if(dx===null){dx=qx;dy=qy}else if(Math.abs(qx-dx)>.011||Math.abs(qy-dy)>.071)ok=false;}
    ok=ok&&maxShape<=.011;
    report(`B-1 ${id} parca ${pi+1}`,`${actual.length} segments; dx=${round2(dx)} dy=${round2(dy)} shape=${maxShape.toFixed(3)}`,`${spec.id} ${spec.side} uniform transform`,ok);
  }
}
for (const [id, expected] of [["F03",f03Expected],["F04",f04Expected]]) {
  if(routes[id].mode==="hard") continue;
  const actual=routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-v-`).test(s.id));
  segmentCheck({groundSegments:actual},expected.filter(s=>actual.some(a=>a.id===s.id)),1,`B-1 ${id} IR`);
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-(up|down)-`).test(s.id))},extraSteps[id].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:"ground"})),.063,`B-1 ${id} basamak`);
}
for (const [id, expected] of [["M01",m01Expected],["M02",m02Expected],["M03",m03Expected],["M04",m04Expected]]) {
  const actual=routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-v-`).test(s.id));
  segmentCheck({groundSegments:actual},expected.filter(s=>actual.some(a=>a.id===s.id)),1,`B-1 ${id} IR`);
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-slope`).test(s.id))},extraSteps[id].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:"ground"})),.063,`B-1 ${id} basamak`);
}
for(const id of ["A01","A02"]){
  const generated=JSON.parse(fs.readFileSync(`E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/aftermath-a01a02/generated-${id}.json`,`utf8`));
  segmentCheck({groundSegments:routes[id].groundSegments},generated.groundSegments,.001,`B-1 ${id} IR+S`);
}
segmentCheck({groundSegments: routes.D02.groundSegments.filter(s => /^d02-(roof|slope)/.test(s.id))}, d02Steps, .01, "B-1 D02 basamak");
for (const [id, expected] of [["D03",d03Expected],["D04",d04Expected]]) {
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-[vu]-`).test(s.id))},expected.filter(s=>!extracted[id].has(s.id)),1,`B-1 ${id} IR`);
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-(slope|long)-`).test(s.id))},extraSteps[id].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:"ground"})),.02,`B-1 ${id} basamak`);
}
for (const [id, expected] of [["D05",d05Expected],["D06",d06Expected]]) {
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-[vu]-`).test(s.id))},expected.filter(s=>!extracted[id].has(s.id)),1,`B-1 ${id} IR`);
  segmentCheck({groundSegments:routes[id].groundSegments.filter(s=>/^d05-(up|down)/.test(s.id))},extraSteps[id].map(([id,x,y,w,h])=>({id,x,y,w,h,kind:"ground"})),id==="D05"?.063:.02,`B-1 ${id} basamak`);
}

for (const id of ["D01", "D02", "D03", "D04", "D05", "D06", "F01", "F02", "F03", "F04", "M01", "M02", "M03", "M04", "A01", "A02"]) {
  const ramps = (routes[id].obstacles || []).filter(o => o.type === "ramp").length;
  report(`B-2 ${id} ramp`, ramps, 0, ramps === 0);
}
const rampIds = rs => Object.fromEntries(Object.entries(rs).map(([id,r]) => [id,(r.obstacles||[]).filter(o=>o.type==="ramp").map(o=>o.id)]));
const currentRamps = rampIds(routes), baseRamps = rampIds(base);
const vectorIds = ["D01","D02","D03","D04","D05","D06","F01","F02","F03","F04","M01","M02","M03","M04","A01","A02"];
const totalRamps = vectorIds.flatMap(id => currentRamps[id]).length;
report("B-2 toplam ramp", totalRamps, 0, totalRamps === 0);

const metadata = {
  D01: { length:8375, finishX:8235, checkpoints:[70,4214], chief:4214 },
  D02: { length:6400, finishX:6260, checkpoints:[70,1211,3433,5200], chief:1211 },
  D03: { length:7139, finishX:6999, checkpoints:[70,2125,4449], chief:2125 },
  D04: { length:8169, finishX:8029, checkpoints:[70,3919], chief:3919 },
  D05: { length:7610, finishX:7470, checkpoints:[70,3019.91,6394.48], chief:3019.91 },
};
for (const [id,e] of Object.entries(metadata)) {
  const r = routes[id];
  const ok = r.length===e.length && r.finishX===e.finishX && JSON.stringify(r.checkpoints)===JSON.stringify(e.checkpoints) && r.chief.startX===e.chief;
  report(`B-3 ${id} metadata`, `${r.length}/${r.finishX}/${r.checkpoints.join(",")}/${r.chief.startX}`, `${e.length}/${e.finishX}/${e.checkpoints.join(",")}/${e.chief}`, ok);
  const road = r.groundSegments.filter(s => new RegExp(`^${id.toLowerCase()}-v-`).test(s.id));
  const covered = r.checkpoints.filter(x => road.some(s => s.x <= x && x <= s.x + s.w));
  report(`B-3 ${id} checkpoint yol`, covered.join(","), r.checkpoints.join(","), covered.length === r.checkpoints.length);
}
const d06=routes.D06, d06Meta=d06.length===5130&&d06.finishX===4990&&JSON.stringify(d06.checkpoints)===JSON.stringify([70,1560.4,2281.61,3913])&&!Object.hasOwn(d06,"chief");
report("B-3 D06 metadata",`${d06.length}/${d06.finishX}/${d06.checkpoints.join(",")}/chief=${Object.hasOwn(d06,"chief")}`,"5130/4990/70,1560.4,2281.61,3913/chief=false",d06Meta);
report("B-3 D02 profile", routes.D02.movementProfile, "vector-v1", routes.D02.movementProfile === "vector-v1");
for(const [id,length,finishX,checkpoints] of [["M03",9043.52,8903.52,[70,1683.6,3950.64,5508]],["M04",9084.32,8944.32,[70,396.24,3008.88,6332.16]]]){
  const r=routes[id],ok=r.length===length&&r.finishX===finishX&&JSON.stringify(r.checkpoints)===JSON.stringify(checkpoints)&&!Object.hasOwn(r,"chief")&&r.movementProfile==="vector-v1";
  report(`B-3 ${id} metadata`,`${r.length}/${r.finishX}/${r.checkpoints.join(",")}/chief=${Object.hasOwn(r,"chief")}`,`${length}/${finishX}/${checkpoints.join(",")}/chief=false`,ok);
}
for(const [id,length,finishX,checkpoints] of [["A01",8646.08,8506.08,[70,746.16,3210.96,5365.44]],["A02",8009.12,7869.12,[70,3149.04,4585.44,6433.68]]]){
  const r=routes[id],ok=r.length===length&&r.finishX===finishX&&JSON.stringify(r.checkpoints)===JSON.stringify(checkpoints)&&!Object.hasOwn(r,"chief")&&r.movementProfile==="vector-v1";
  report(`B-3 ${id} metadata`,`${r.length}/${r.finishX}/${r.checkpoints.join(",")}/chief=${Object.hasOwn(r,"chief")}`,`${length}/${finishX}/${checkpoints.join(",")}/chief=false`,ok);
}
for (const [id, route] of Object.entries(routes)) {
  const byId = new Map((route.groundSegments || []).map(s => [s.id, s]));
  const bad = (route.catchableSurfaces || []).map(c => byId.get(c.id)).filter(s => s && ((s.y - 48) + 48) !== s.y).map(s => s.id);
  if (["D05","D06","F01","F02","F03","F04","M01","M02","M03","M04","A01","A02"].includes(id)) report(`FP ${id} catchable y`, bad.join(",") || "none", "none", bad.length === 0);
  else if (/^D0[1-4]$/.test(id)) console.log(`FP ${id} catchable y | ${bad.join(",") || "none"} | INFO (data unchanged)`);
}
const otherIds = Object.keys(base).filter(id => !["D01","D02","D03","D04","D05","D06","F01","F02","F03","F04","M01","M02","M03","M04","A01","A02"].includes(id));
const unchanged = otherIds.filter(id => JSON.stringify(routes[id]) === JSON.stringify(base[id]));
report("NEG diğer rotalar", `${unchanged.length}/${otherIds.length}`, `${otherIds.length}/${otherIds.length}`, unchanged.length === otherIds.length);
console.log(`${pass} PASS / ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
