#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const irRoot = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/ir";
const outRoot = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d03d04";
const sourcePath = path.join(root, "js/a12-campaign.js");
const round = (n, p = 2) => Math.round((n + Number.EPSILON) * 10 ** p) / 10 ** p;

// Same ROUTES vm loader used by vp-dock-geo.cjs.
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
    ${source.slice(start, close + 1)}; globalThis.result=ROUTES;`;
  const sandbox = Object.create(null);
  vm.createContext(sandbox);
  new vm.Script(program).runInContext(sandbox, { timeout: 5000 });
  return JSON.parse(JSON.stringify(sandbox.result));
}

const routeData = loadRoutes(fs.readFileSync(sourcePath, "utf8"));
const configs = {
  D03: { story: "03", start: 0, topMin: -1065 },
  D04: { story: "04", start: 0, topMin: -3765 },
};
const vaultNames = new Set(["TriggerSpeedVault", "TriggerHurdleJump", "TriggerThiefVault"]);

function transformedRoad(id, cfg, backbone) {
  const byId = new Map(backbone.surfaces.map(s => [s.row_id, s]));
  return backbone.path_surface_ids.map((rowId, i) => {
    const s = byId.get(rowId);
    if (!s || !Number.isFinite(s.vx) || !Number.isFinite(s.vy) || !Number.isFinite(s.vw) || !Number.isFinite(s.vh)) {
      throw new Error(`${id}: eksik IR yüzey alanı ${rowId}`);
    }
    const x = round((s.vx - cfg.start) * .24), right = round((s.vx + s.vw - cfg.start) * .24);
    return { id: `${id.toLowerCase()}-v-${String(i + 1).padStart(2, "0")}`, x, y: round(455 - (s.vy - cfg.topMin) * .24), w: round(right - x), h: round(s.vh * .24) };
  });
}
function classify(road) {
  return road.map(s => {
    const below = road.filter(b => b.id !== s.id && b.x < s.x + s.w - .01 && b.x + b.w > s.x + .01 && b.y > s.y)
      .sort((a, b) => a.y - b.y)[0] || null;
    const clearance = below ? below.y - (s.y + s.h) : null;
    const role = !below || clearance <= 4 ? "zemin" : clearance < 48 ? "slide" : "ust-gecit";
    return { ...s, below, clearance, role };
  });
}
function makeProfile(segments) {
  const edges = [...new Set(segments.flatMap(s => [s.x, round(s.x + s.w)]))].sort((a,b) => a-b);
  const parts = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const x0 = edges[i], x1 = edges[i + 1], mid = (x0 + x1) / 2;
    const top = segments.filter(s => s.x <= mid && mid < s.x + s.w).sort((a,b) => a.y-b.y)[0];
    if (!top) continue;
    const last = parts.at(-1);
    if (last && Math.abs(last.x1-x0) <= .01 && last.y === top.y) last.x1=x1;
    else parts.push({x0,x1,y:top.y,id:top.id});
  }
  return parts;
}
function transition(A, B, moves, groundByY, i) {
  const gap = round(B.x0 - A.x1), D = round(B.y - A.y), H = -D;
  let mech;
  if (gap <= .01 && D >= 0) mech = "kosu";
  else {
    const disc = 390 ** 2 + 2900 * D;
    const reach = disc >= 0 ? 255 * (390 + Math.sqrt(disc)) / 1450 : -Infinity;
    if (gap > .01 && reach >= gap + 32) mech = "normal";
    else if (H > 0 && H <= 100 && gap <= 96) mech = "tutunma";
    else if (H <= 193) mech = "dive";
    else mech = "UYMAYAN";
  }
  const row = {i:i+1,A:{...A},B:{...B},gap,D,mech,
    vectorTrigger:(moves.find(m => m.x >= A.x1-200 && m.x <= B.x0+40)||{}).move_name||null};
  if (mech === "dive") {
    const top=Math.min(A.y,B.y)-93;
    row.Tb=round(Math.sqrt(2*(A.y-top)/1450)+Math.sqrt(2*(B.y-top)/1450),3);
    row.landX=round(B.x0+40); row.landY=B.y;
    row.x2=round(Math.min(A.x1,row.landX-255*row.Tb));
    if(row.x2<A.x0){row.x1=A.x0;row.x2=A.x1;}
    else row.x1=round(Math.max(A.x0,row.x2-120));
  }
  return row;
}
function analyze(id, cfg) {
  const backbone=JSON.parse(fs.readFileSync(path.join(irRoot,`story_${cfg.story}-backbone.json`),"utf8"));
  const story=JSON.parse(fs.readFileSync(path.join(irRoot,`story_${cfg.story}.json`),"utf8"));
  const roles=classify(transformedRoad(id,cfg,backbone));
  const moves=story.items.filter(x=>x.category==="move_trigger").map(x=>({...x,x:round((x.vx-cfg.start)*.24)})).sort((a,b)=>a.source_order-b.source_order);
  const obstacles=[];
  for(const s of roles.filter(s=>s.role==="slide")) obstacles.push({id:`${id.toLowerCase()}-slide-${String(obstacles.length+1).padStart(2,"0")}`,type:"slide",x:s.x,w:s.w,h:s.h,baseY:s.below.y,sourceId:s.id});
  const removed=new Set(roles.filter(s=>s.role==="slide").map(s=>s.id)), unplaced=[];
  let vaultN=0;
  for(const t of moves.filter(t=>vaultNames.has(t.move_name)&&t.duplicate_of==null)){
    const floor=roles.filter(s=>s.role==="zemin"&&s.x<=t.x&&t.x<=s.x+s.w).sort((a,b)=>a.y-b.y)[0];
    if(!floor){unplaced.push({move:t.move_name,x:t.x});continue;}
    const box=roles.filter(s=>s.role==="zemin"&&s.id!==floor.id&&s.w<=72&&s.below&&s.below.y-s.y<=48&&Math.abs(s.x-t.x)<=60).sort((a,b)=>Math.abs(a.x-t.x)-Math.abs(b.x-t.x))[0];
    vaultN++;
    if(box){removed.add(box.id);obstacles.push({id:`${id.toLowerCase()}-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:box.x,w:box.w,h:round(box.below.y-box.y),baseY:box.below.y,sourceId:box.id});}
    else obstacles.push({id:`${id.toLowerCase()}-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:t.x,w:24,h:48,baseY:floor.y,sourceId:null});
  }
  if(id==="D04") {
    const box=roles.find(s=>s.id==="d04-v-12");
    removed.add(box.id); vaultN++;
    obstacles.push({id:`d04-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:box.x,w:72,h:48,baseY:box.below.y,sourceId:box.id});
  }
  const extras=routeData[id].groundSegments.filter(s=>new RegExp(`^${id.toLowerCase()}-(slope|long)-`).test(s.id));
  const profileInputs=[...roles.filter(s=>s.role==="zemin"&&!removed.has(s.id)),...extras];
  const profile=makeProfile(profileInputs), groundByY=new Map();
  for(const s of profileInputs){if(!groundByY.has(s.y))groundByY.set(s.y,[]);groundByY.get(s.y).push(s);}
  const transitions=profile.slice(0,-1).map((a,i)=>transition(a,profile[i+1],moves,groundByY,i));
  fs.mkdirSync(outRoot,{recursive:true});
  fs.writeFileSync(path.join(outRoot,`transitions-${id}.json`),JSON.stringify(transitions,null,2)+"\n");
  return {id,roles,obstacles,unplaced,profile,transitions};
}

const results=Object.entries(configs).map(([id,cfg])=>analyze(id,cfg));
for(const r of results){
  console.log(`\n${r.id} geçişleri`); console.table(r.transitions.map(t=>({i:t.i,A:t.A.id,B:t.B.id,gap:t.gap,D:t.D,mech:t.mech,x1:t.x1,x2:t.x2,landX:t.landX,landY:t.landY,Tb:t.Tb,trigger:t.vectorTrigger})));
  console.log(`${r.id} roller:`,r.roles.filter(s=>s.role!=="zemin").map(s=>`${s.id}=${s.role}(c=${round(s.clearance)})`).join(", ")||"tümü zemin");
  console.log(`${r.id} engeller:`,JSON.stringify(r.obstacles));
  console.log(`${r.id} konmayan tetikler:`,JSON.stringify(r.unplaced));
}
const roleActual=results.flatMap(r=>r.roles.filter(s=>s.role!=="zemin").map(s=>`${r.id}:${s.id}:${s.role}`)).sort();
const roleExpected=["D03:d03-v-10:slide","D03:d03-v-13:ust-gecit","D03:d03-v-15:slide","D03:d03-v-32:ust-gecit","D04:d04-v-04:slide","D04:d04-v-14:ust-gecit","D04:d04-v-24:ust-gecit","D04:d04-v-27:ust-gecit"].sort();
const firstDive=results.find(r=>r.id==="D03").transitions.find(t=>t.mech==="dive");
const spot=firstDive&&Math.abs(firstDive.x1-2442)<=.5&&Math.abs(firstDive.x2-2562)<=.5&&Math.abs(firstDive.landX-3029.08)<=.5&&Math.abs(firstDive.landY-301.4)<=.5&&Math.abs(firstDive.Tb-.989)<=.005;
const unmatched=results.flatMap(r=>r.transitions.filter(t=>t.mech==="UYMAYAN").map(t=>({...t,route:r.id})));
const reversedDives=Object.entries(routeData).flatMap(([route, data])=>(data.diveZones||[]).filter(z=>!(z.x1<z.x2)).map(z=>({route,...z})));
let codeParity=true;
for(const r of results){
  const route=routeData[r.id];
  const catches=[...new Set(r.transitions.filter(t=>t.mech==="tutunma").map(t=>t.B.id))].map(id=>({id}));
  const dives=r.transitions.filter(t=>t.mech==="dive").map((t,i)=>({id:`${r.id.toLowerCase()}-dz-${String(i+1).padStart(2,"0")}`,x1:t.x1,x2:t.x2,landX:t.landX,landY:t.landY}));
  const obstacles=r.obstacles.map(({sourceId,...o})=>o);
  const same=JSON.stringify(route.catchableSurfaces)===JSON.stringify(catches)&&JSON.stringify(route.diveZones)===JSON.stringify(dives)&&JSON.stringify(route.obstacles)===JSON.stringify(obstacles);
  console.log(`${r.id} kod eşliği | catch/dive/engel | JSON ile birebir | ${same?"PASS":"FAIL"}`); codeParity=codeParity&&same;
}
console.log("\nZORUNLU KONTROLLER");
console.log(`Roller | ${JSON.stringify(roleActual)} | ${JSON.stringify(roleExpected)} | ${JSON.stringify(roleActual)===JSON.stringify(roleExpected)?"PASS":"FAIL"}`);
console.log(`Spot | ${firstDive?`x1=${firstDive.x1} x2=${firstDive.x2} landX=${firstDive.landX} landY=${firstDive.landY} Tb=${firstDive.Tb}`:"yok"} | ±0.5px/±0.005sn | ${spot?"PASS":"FAIL"}`);
console.log(`UYMAYAN | ${unmatched.length} | 0 | ${unmatched.length===0?"PASS":"FAIL"}`);
console.log(`Dive aralıkları | ${reversedDives.length} ters | 0 | ${reversedDives.length===0?"PASS":"FAIL"}`);
if(JSON.stringify(roleActual)!==JSON.stringify(roleExpected)||!spot||unmatched.length||reversedDives.length||!codeParity) process.exitCode=1;
