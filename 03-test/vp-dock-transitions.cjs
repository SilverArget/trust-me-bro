#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const irRoot = "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/ir";
const outRoots = {D05:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06",D06:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06",F01:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f01f02",F02:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f01f02",F03:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f03f04",F04:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f03f04",M01:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m01m02",M02:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m01m02",M03:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m03m04",M04:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m03m04",A01:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/aftermath-a01a02",A02:"E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/aftermath-a01a02"};
const sourcePath = path.join(root, "js/a12-campaign.js");
const round = (n, p = 2) => Math.round((n + Number.EPSILON) * 10 ** p) / 10 ** p;
const snapY = n => Math.round(n * 8) / 8;

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

function loadCoins(source) {
  const marker = "const COINS = Object.freeze(", start = source.indexOf(marker);
  if (start < 0) throw new Error("COINS declaration not found");
  const open = source.indexOf("(", start), close = balancedEnd(source, open);
  const sandbox = Object.create(null);
  vm.createContext(sandbox);
  new vm.Script(`"use strict"; ${source.slice(start, close + 1)}; globalThis.result=COINS;`).runInContext(sandbox, { timeout: 5000 });
  return JSON.parse(JSON.stringify(sandbox.result));
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const routeData = loadRoutes(sourceText);
const coinData = loadCoins(sourceText);
const configs = {
  D05: { story: "05", start: 0, topMin: -4820 },
  D06: { story: "06", start: 0, topMin: -1100 },
  F01: { story: "07", start: 0, topMin: -1925 },
  F02: { story: "08", start: 0, topMin: -3700 },
  F03: { story: "09", start: 0, topMin: -1263 },
  F04: { story: "10", start: 0, topMin: -2275 },
  M01: { story: "11", start: 0, topMin: -5671 },
  M02: { story: "bonus_01", start: 0, topMin: -2715 },
  M03: { story: "bonus_02", start: 0, topMin: -2720 },
  M04: { story: "bonus_03", start: 0, topMin: -1112 },
  A01: { story: "bonus_04", start: 0, topMin: -195 },
  A02: { story: "bonus_07", start: 0, topMin: -7620 },
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
    const rawY = 455 - (s.vy - cfg.topMin) * .24;
    return { id: `${id.toLowerCase()}-v-${String(i + 1).padStart(2, "0")}`, x, y: snapY(rawY), rawY, w: round(right - x), h: round(s.vh * .24) };
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
function transition(A, B, moves, groundByY, i, runStart=A.x0, robust=false, tunnel=null) {
  const gap = round(B.x0 - A.x1), D = round(B.y - A.y), H = -D;
  let mech;
  if (gap <= .01 && D >= 0) mech = "kosu";
  else {
    const disc = 390 ** 2 + 2900 * D;
    const reach = disc >= 0 ? 255 * (390 + Math.sqrt(disc)) / 1450 : -Infinity;
    const robustReach = disc >= 0 ? 200 * (390 + Math.sqrt(disc)) / 1450 : -Infinity;
    if (gap > .01 && reach >= gap + 32 && robust && robustReach < gap + 44) mech = "dive";
    else if (gap > .01 && reach >= gap + 32) mech = "normal";
    else if (H > 0 && H <= 100 && gap <= 96) mech = "tutunma";
    else if (H <= 193) mech = "dive";
    else mech = "UYMAYAN";
  }
  const row = {i:i+1,A:{...A},B:{...B},gap,D,mech,
    vectorTrigger:(moves.find(m => m.x >= A.x1-200 && m.x <= B.x0+40)||{}).move_name||null};
  if (mech === "dive") {
    row.landX=round(B.x0+40); row.landY=B.y;
    const unclippedTop=Math.min(A.y,B.y)-93;
    const crossesTunnel=tunnel&&row.landX>=tunnel.x0&&A.x1<=tunnel.x1;
    const top=crossesTunnel?Math.max(unclippedTop,tunnel.ceilingBottom+50):unclippedTop;
    if(crossesTunnel&&top!==unclippedTop) row.tunnelPeakClip={from:round(unclippedTop),to:round(top)};
    row.Tb=round(Math.sqrt(2*(A.y-top)/1450)+Math.sqrt(2*(B.y-top)/1450),3);
    row.x2=round(Math.min(A.x1,row.landX-255*row.Tb));
    if(row.x2<runStart){row.x1=runStart;row.x2=A.x1;}
    else row.x1=round(Math.max(runStart,row.x2-120));
  }
  return row;
}
function forceDive(row, runStart, afterX=-Infinity, tunnel=null) {
  row.mech="dive";
  const A=row.A,B=row.B,unclippedTop=Math.min(A.y,B.y)-93;
  row.landX=round(B.x0+40); row.landY=B.y;
  const crossesTunnel=tunnel&&row.landX>=tunnel.x0&&A.x1<=tunnel.x1;
  const top=crossesTunnel?Math.max(unclippedTop,tunnel.ceilingBottom+50):unclippedTop;
  if(crossesTunnel&&top!==unclippedTop) row.tunnelPeakClip={from:round(unclippedTop),to:round(top)};
  row.Tb=round(Math.sqrt(2*(A.y-top)/1450)+Math.sqrt(2*(B.y-top)/1450),3);
  row.x2=round(Math.min(A.x1,row.landX-255*row.Tb));
  if(row.x2<runStart){row.x1=runStart;row.x2=A.x1;}
  else row.x1=round(Math.max(runStart,row.x2-120));
  row.x1=round(Math.max(row.x1,afterX));
  return row;
}
const d05Steps = [
  ...Array.from({length:3},(_,i)=>({id:`d05-up-${i+1}`,x:round(195.6+i*80),w:80,y:snapY(-701.8-(i+1)*39.2),h:39.2,kind:"ground",role:"zemin"})),
  ...Array.from({length:5},(_,i)=>({id:`d05-down1-${i+1}`,x:round(4934.82+i*46.52),w:46.52,y:snapY(-192.76+(i+1)*39.888),h:39.888,kind:"ground",role:"zemin"})),
  ...Array.from({length:4},(_,i)=>({id:`d05-down2-${i+1}`,x:round(5796.48+i*58.5),w:58.5,y:round(23+(i+1)*45),h:45,kind:"ground",role:"zemin"})),
  ...Array.from({length:6},(_,i)=>({id:`d05-down3-${i+1}`,x:round(6091.68+i*38.8),w:38.8,y:round(203+(i+1)*42),h:42,kind:"ground",role:"zemin"})),
];
function analyze(id, cfg) {
  const level=cfg.story.startsWith("bonus_")?cfg.story:`story_${cfg.story}`;
  const backbone=JSON.parse(fs.readFileSync(path.join(irRoot,`${level}-backbone.json`),"utf8"));
  const story=JSON.parse(fs.readFileSync(path.join(irRoot,`${level}.json`),"utf8"));
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
    if(box){
      removed.add(box.id);
      const wide=["D05","D06","F01","F02","F03","F04","M01","M02","M03","M04","A01","A02"].includes(id), w=wide?72:box.w, h=wide?48:round(box.below.rawY-box.rawY);
      obstacles.push({id:`${id.toLowerCase()}-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:round(box.x+(box.w-w)/2),w,h,baseY:box.below.y,sourceId:box.id});
    }
    else obstacles.push({id:`${id.toLowerCase()}-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:t.x,w:24,h:48,baseY:floor.y,sourceId:null});
  }
  // K: small IR platforms standing on a walkable surface are vaults even when
  // Vector did not place a vault trigger close enough to identify the box.
  if(/^(M0[1-4]|A0[12])$/.test(id)) for(const box of roles.filter(s=>s.role==="zemin"&&s.below&&s.w<=72&&s.h<=24&&!removed.has(s.id))){
    const template=obstacles.find(o=>o.type==="vault"&&o.sourceId==null&&Math.abs((o.x+o.w/2)-(box.x+box.w/2))<=60);
    if(template) obstacles.splice(obstacles.indexOf(template),1);
    removed.add(box.id); vaultN++;
    obstacles.push({id:`${id.toLowerCase()}-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:round(box.x+(box.w-72)/2),w:72,h:48,baseY:box.below.y,sourceId:box.id});
  }
  if(id==="D04") {
    const box=roles.find(s=>s.id==="d04-v-12");
    removed.add(box.id); vaultN++;
    obstacles.push({id:`d04-vault-${String(vaultN).padStart(2,"0")}`,type:"vault",x:box.x,w:72,h:48,baseY:box.below.y,sourceId:box.id});
  }
  const f02Steps=Array.from({length:5},(_,i)=>({id:`f02-slope-${i+1}`,x:round(7347.6+i*70.56),w:70.56,y:snapY(32.625+(i+1)*41.275),h:41.275,kind:"ground",role:"zemin"}));
  const f03Steps=[
    ...Array.from({length:3},(_,i)=>({id:`f03-up-${i+1}`,x:round(420.24+i*33.12),w:33.12,y:snapY(455-(i+1)*(118.75/3)),h:118.75/3,kind:"ground",role:"zemin"})),
    ...Array.from({length:6},(_,i)=>({id:`f03-down-${i+1}`,x:round(5829.84+i*75),w:75,y:snapY(186.25+(i+1)*(268.75/6)),h:268.75/6,kind:"ground",role:"zemin"})),
  ];
  const m01Steps=[
    ...Array.from({length:2},(_,i)=>({id:`m01-slope1-${i+1}`,x:round(4605.6+i*138.24),w:138.24,y:snapY(71.96-(i+1)*45.6),h:45.6,kind:"ground",role:"zemin"})),
    ...Array.from({length:2},(_,i)=>({id:`m01-slope2-${i+1}`,x:round(6831.12+i*104.4),w:104.4,y:snapY(47-(i+1)*38.4),h:38.4,kind:"ground",role:"zemin"})),
    // D: missed i11 lands on m01-v-11; these wall-adjacent steps provide a
    // <=96 px catch chain to m01-v-13 instead of a permanent 211 px dead end.
    ...Array.from({length:3},(_,i)=>({id:`m01-deadend-i11-step-${i+1}`,x:round(2356.8+i*36),w:36,y:snapY(-1075.25-(i+1)*(211.25/3)),h:211.25/3,kind:"ground",role:"zemin"})),
  ];
  const m02Steps=Array.from({length:5},(_,i)=>({id:`m02-slope-${i+1}`,x:round(1455.6+i*66.48),w:66.48,y:snapY(-461.8+(i+1)*40.08),h:40.08,kind:"ground",role:"zemin"}));
  const m03Steps=[
    ...Array.from({length:3},(_,i)=>({id:`m03-slope1-${i+1}`,x:round(375.6+i*74.8),w:74.8,y:snapY(-197.75-(i+1)*39.625),h:39.625,kind:"ground",role:"zemin"})),
    ...Array.from({length:5},(_,i)=>({id:`m03-slope2-${i+1}`,x:round(1803.6+i*46.32),w:46.32,y:snapY(-218.25+(i+1)*40.8),h:40.8,kind:"ground",role:"zemin"})),
    ...Array.from({length:3},(_,i)=>({id:`m03-slope3-${i+1}`,x:round(7387.2+i*53.2),w:53.2,y:snapY(337.375+(i+1)*35.625),h:35.625,kind:"ground",role:"zemin"})),
    ...Array.from({length:2},(_,i)=>({id:`m03-slope4-${i+1}`,x:round(7779.6+i*74.4),w:74.4,y:snapY(444.25-(i+1)*47.1875),h:47.1875,kind:"ground",role:"zemin"})),
  ];
  const m04Steps=[
    ...Array.from({length:3},(_,i)=>({id:`m04-slope1-${i+1}`,x:round(1736.4+i*67.2),w:67.2,y:snapY(303.375-(i+1)*(118.625/3)),h:118.625/3,kind:"ground",role:"zemin"})),
    ...Array.from({length:4},(_,i)=>({id:`m04-slope2-${i+1}`,x:round(5570.4+i*60.9),w:60.9,y:snapY(162.25+(i+1)*45.875),h:45.875,kind:"ground",role:"zemin"})),
  ];
  // S: bonus_07's wall-run/reversed section has no TMB mechanic. Three
  // wall-adjacent, equal-rise catch ledges retain 96 px of run-up on v-20.
  const a02Steps=id==="A02"?Array.from({length:3},(_,i)=>({id:`a02-s-wall-${i+1}`,x:5278.8,w:36,y:snapY(-734.25-(i+1)*(231.625/3)),h:231.625/3,kind:"ground",role:"zemin",sDeviation:true})):[];
  const extras=id==="D05"?d05Steps:id==="F02"?f02Steps:id==="F03"?f03Steps:id==="M01"?m01Steps:id==="M02"?m02Steps:id==="M03"?m03Steps:id==="M04"?m04Steps:a02Steps;
  let tunnel=null, tunnelFloor=null, tunnelExcluded=new Set();
  if(id==="M01"){
    const rawFloor=backbone.surfaces.find(s=>s.vx===12030&&s.vy===-325);
    const ceiling=roles.find(s=>Math.abs(s.x-2880)<.02&&Math.abs(s.w-804)<.02);
    if(!rawFloor||!ceiling) throw new Error("M01 T1 tunnel anchors missing");
    tunnelFloor={id:"m01-tunnel-floor",x:round(rawFloor.vx*.24),y:snapY(455-(rawFloor.vy-cfg.topMin)*.24),w:round(rawFloor.vw*.24),h:round(rawFloor.vh*.24),kind:"ground",role:"zemin",tunnelFloor:true};
    tunnel={x0:tunnelFloor.x,x1:round(tunnelFloor.x+tunnelFloor.w),ceilingBottom:round(ceiling.y+ceiling.h),ceilingId:ceiling.id,floorId:tunnelFloor.id};
    const anchored=moves.filter(m=>m.x>=tunnel.x0&&m.x<=tunnel.x1&&[-125,-35].includes(m.vy));
    if(!anchored.length) throw new Error("M01 T1 tunnel trigger anchors missing");
    for(const s of roles) if(s.id===ceiling.id||(s.x<tunnel.x1&&s.x+s.w>tunnel.x0&&s.y<tunnelFloor.y)) tunnelExcluded.add(s.id);
  }
  const solidInputs=[...roles.filter(s=>s.role==="zemin"&&!removed.has(s.id)),...(tunnelFloor?[tunnelFloor]:[]),...extras];
  const profileInputs=solidInputs.filter(s=>!tunnelExcluded.has(s.id)&&!s.sDeviation);
  const profile=makeProfile(profileInputs), groundByY=new Map();
  for(const s of profileInputs){if(!groundByY.has(s.y))groundByY.set(s.y,[]);groundByY.get(s.y).push(s);}
  const transitions=[];
  const runStartAt=i=>{
    let start=profile[i].x0;
    for(let j=i-1;j>=0;j--){
      const left=profile[j],right=profile[j+1];
      if(right.x0-left.x1>.01||Math.abs(right.y-left.y)>24) break;
      start=left.x0;
    }
    return start;
  };
  for(let i=0;i<profile.length-1;i++){
    const A=profile[i],P=profile[i+1],direct=transition(A,P,moves,groundByY,transitions.length,runStartAt(i),id[0]==="F"||id[0]==="M",tunnel);
    if(direct.mech==="kosu"&&i+2<profile.length){
      const B=profile[i+2],up=transition(P,B,moves,groundByY,transitions.length+1,undefined,false,tunnel);
      if(up.mech==="UYMAYAN"){
        const jump=transition(A,B,moves,groundByY,transitions.length,runStartAt(i),false,tunnel); jump.pit=P.id; transitions.push(jump); i++; continue;
      }
    }
    transitions.push(direct);
  }
  if(id==="A02"){
    const wall=transitions.find(t=>t.A.id==="a02-v-20"&&t.B.id==="a02-v-21"&&t.mech==="UYMAYAN");
    if(!wall) throw new Error("A02 S wall transition missing");
    wall.mech="sapma-basamak"; wall.steps=a02Steps.map(s=>s.id); wall.vectorDeviation=true;
  }
  const r2=[];
  const r3=[];
  const fallbackCatchable=new Set();
  const r2TransitionDone=new Set();
  if(id[0]==="F"||id[0]==="M"||id[0]==="A") for(const o of [...obstacles].sort((a,b)=>(b.x+b.w)-(a.x+a.w))){
    const end=round(o.x+o.w);
    const t=transitions.find(q=>{
      if(q.mech!=="tutunma"&&q.mech!=="dive") return false;
      const entry=q.mech==="tutunma"?q.B.x0-96:q.x1;
      return entry>=end-128&&entry-end<128&&q.B.x0>=end-.01;
    });
    if(!t||r2TransitionDone.has(t.i)) continue;
    r2TransitionDone.add(t.i);
    const old={mech:t.mech,x1:t.x1,x2:t.x2,x:o.x};
    if(t.mech==="tutunma") fallbackCatchable.add(t.B.id);
    const pi=profile.findIndex(p=>p.id===t.A.id&&Math.abs(p.x1-t.A.x1)<.02), runStart=pi>=0?runStartAt(pi):t.A.x0;
    const exitX=end+(o.type==="slide"?31:0);
    forceDive(t,runStart,exitX,tunnel);
    if(t.x2-t.x1>=40){r2.push({obstacle:o.id,transition:t.i,action:"betikli",old,now:{mech:t.mech,x1:t.x1,x2:t.x2}});continue;}
    const previousLanding=Math.max(runStart,...transitions.filter(q=>q.landX!=null&&q.landX<=o.x).map(q=>q.landX));
    const newX=round(Math.min(o.x,t.x2-40-o.w-(o.type==="slide"?31:0)));
    if(newX-previousLanding>=64){o.x=newX;forceDive(t,runStart,newX+o.w+(o.type==="slide"?31:0),tunnel);r2.push({obstacle:o.id,transition:t.i,action:"sola-kaydir",old,now:{x:o.x,mech:t.mech,x1:t.x1,x2:t.x2}});continue;}
    obstacles.splice(obstacles.indexOf(o),1);forceDive(t,runStart,-Infinity,tunnel);r2.push({obstacle:o.id,transition:t.i,action:"kaldir",old,now:{mech:t.mech,x1:t.x1,x2:t.x2},vectorDeviation:true});
  }
  if(["F03","F04","M01","M02","M03","M04","A01","A02"].includes(id)) for(const o of [...obstacles]){
    const landingAnchors=transitions.filter(t=>t.landX!=null&&t.landX<=o.x).map(t=>t.landX);
    const shortSurfaceEnds=profileInputs.filter(s=>s.w<=160&&s.x+s.w<=o.x&&s.x+s.w>=Math.max(0,...landingAnchors)).map(s=>s.x+s.w);
    const priorObstacleEnds=obstacles.filter(p=>p!==o&&p.x+p.w<=o.x).map(p=>p.x+p.w);
    const previousLanding=Math.max(-Infinity,...landingAnchors,...shortSurfaceEnds,...priorObstacleEnds);
    if(!Number.isFinite(previousLanding)||o.x-previousLanding>=96) continue;
    const oldX=o.x,newX=round(previousLanding+96),floor=roles.filter(s=>s.role==="zemin"&&Math.abs(s.y-o.baseY)<1&&s.x<=o.x&&o.x+o.w<=s.x+s.w).sort((a,b)=>b.w-a.w)[0];
    const maxX=floor?round(floor.x+floor.w-o.w):-Infinity;
    const next=transitions.find(t=>t.B.x0>=o.x&&t.mech==="dive"&&t.x2>=o.x);
    const exitX=round(newX+o.w+(o.type==="slide"?31:0));
    if(newX<=maxX&&(!next||next.x2-exitX>=40)){
      o.x=newX;
       if(next){const pi=profile.findIndex(p=>p.id===next.A.id&&Math.abs(p.x1-next.A.x1)<.02);forceDive(next,pi>=0?runStartAt(pi):next.A.x0,exitX,tunnel);}
      r3.push({obstacle:o.id,action:"saga-kaydir",previousLanding,oldX,newX});
    } else {
      obstacles.splice(obstacles.indexOf(o),1);r3.push({obstacle:o.id,action:"kaldir",previousLanding,oldX,vectorDeviation:true});
    }
  }
  if(["F03","F04","M01","M02","M03","M04","A01","A02"].includes(id)) for(const t of transitions) if(t.mech==="dive"&&t.x2-t.x1<40) t.x1=round(t.x2-40);
  if((id==="M03"||id==="M04")&&transitions.some(t=>t.mech==="UYMAYAN")) return {id,roles,obstacles,unplaced,profile,transitions,r2,r3,tunnel,fallbackCatchable};
  fs.mkdirSync(outRoots[id],{recursive:true});
  fs.writeFileSync(path.join(outRoots[id],`transitions-${id}.json`),JSON.stringify(transitions,null,2)+"\n");
  if(id[0]==="F"||id[0]==="M"||id[0]==="A") fs.writeFileSync(path.join(outRoots[id],`generated-${id}.json`),JSON.stringify({
    groundSegments:solidInputs.filter(s=>!removed.has(s.id)).map(s=>({id:s.id,x:s.x,y:s.y,w:s.w,h:round(s.h),kind:"ground"})),
    catchableSurfaces:[...new Set([...transitions.filter(t=>t.mech==="tutunma"||(-t.D>52&&t.gap<=96)).map(t=>t.B.id),...fallbackCatchable,...a02Steps.map(s=>s.id)])].map(id=>({id})),
    diveZones:transitions.filter(t=>t.mech==="dive").map((t,i)=>({id:`${id.toLowerCase()}-dz-${String(i+1).padStart(2,"0")}`,x1:t.x1,x2:t.x2,landX:t.landX,landY:t.landY,...(t.tunnelPeakClip?{peakY:round(t.tunnelPeakClip.to-48)}:{})})),
    obstacles:obstacles.map(({sourceId,...o})=>o),r2,r3
  },null,2)+"\n");
  return {id,roles,obstacles,unplaced,profile,transitions,r2,r3,tunnel,fallbackCatchable};
}

const results=Object.entries(configs).map(([id,cfg])=>analyze(id,cfg));
for(const r of results){
  console.log(`\n${r.id} geçişleri`); console.table(r.transitions.map(t=>({i:t.i,A:t.A.id,B:t.B.id,gap:t.gap,D:t.D,mech:t.mech,x1:t.x1,x2:t.x2,landX:t.landX,landY:t.landY,Tb:t.Tb,trigger:t.vectorTrigger})));
  console.log(`${r.id} roller:`,r.roles.filter(s=>s.role!=="zemin").map(s=>`${s.id}=${s.role}(c=${round(s.clearance)})`).join(", ")||"tümü zemin");
  console.log(`${r.id} engeller:`,JSON.stringify(r.obstacles));
  console.log(`${r.id} konmayan tetikler:`,JSON.stringify(r.unplaced));
  console.log(`${r.id} R2:`,JSON.stringify(r.r2));
  if(["F03","F04","M01","M02","M03","M04","A01","A02"].includes(r.id)) console.log(`${r.id} R3:`,JSON.stringify(r.r3));
}
const roleActual=results.filter(r=>['D05','D06','F01','F02'].includes(r.id)).flatMap(r=>r.roles.filter(s=>s.role!=="zemin").map(s=>`${r.id}:${s.id}:${s.role}`)).sort();
const roleExpected=["D05:d05-v-08:ust-gecit","D05:d05-v-24:ust-gecit","D06:d06-v-26:ust-gecit","F01:f01-v-12:ust-gecit","F01:f01-v-17:slide","F01:f01-v-20:slide","F01:f01-v-21:slide","F01:f01-v-24:ust-gecit","F02:f02-v-19:slide","F02:f02-v-22:slide","F02:f02-v-27:slide","F02:f02-v-31:ust-gecit","F02:f02-v-41:ust-gecit"].sort();
const firstDive=results.find(r=>r.id==="D06").transitions.find(t=>t.pit==="d06-v-07");
const spot=firstDive&&Math.abs(firstDive.gap-109.2)<=.01&&Math.abs(-firstDive.D-73.25)<=.01;
const unmatched=results.flatMap(r=>r.transitions.filter(t=>t.mech==="UYMAYAN").map(t=>({...t,route:r.id})));
const reversedDives=Object.entries(routeData).flatMap(([route, data])=>(data.diveZones||[]).filter(z=>!(z.x1<z.x2)).map(z=>({route,...z})));
const shortNewDives=results.flatMap(r=>r.transitions.filter(t=>t.mech==="dive"&&t.x2-t.x1<39.999).map(t=>({route:r.id,i:t.i,width:round(t.x2-t.x1)})));
const shortLegacyDives=Object.entries(routeData).filter(([id])=>/^D0[1-4]$/.test(id)).flatMap(([route,data])=>(data.diveZones||[]).filter(z=>z.x2-z.x1<40).map(z=>({route,id:z.id,width:round(z.x2-z.x1)})));
const badCatchableY=Object.entries(routeData).flatMap(([route,data])=>{const byId=new Map((data.groundSegments||[]).map(s=>[s.id,s]));return (data.catchableSurfaces||[]).map(c=>byId.get(c.id)).filter(s=>s&&((s.y-48)+48)!==s.y).map(s=>({route,id:s.id,y:s.y}));});
const badNewCatchableY=badCatchableY.filter(x=>["D05","D06","F01","F02","F03","F04","M01","M02","M03","M04"].includes(x.route));
const badLegacyCatchableY=badCatchableY.filter(x=>/^D0[1-4]$/.test(x.route));
function diveCoinFrames(t, coin, launchCenter) {
  const startX=launchCenter-16,startY=t.A.y-48,endX=t.landX,endY=t.landY-48,dx=endX-startX;
  const top=t.peakY??(t.tunnelPeakClip?t.tunnelPeakClip.to-48:Math.min(startY,endY)-93),Tb=Math.sqrt(2*(startY-top)/1450)+Math.sqrt(2*(endY-top)/1450);
  const vx=Math.max(dx/Tb,255),duration=dx/vx,vy0=(endY-startY-725*duration*duration)/duration;
  let frames=0;
  for(let k=0;k<=Math.ceil(duration*60);k++){
    const time=Math.min(k/60,duration),px=startX+vx*time,py=startY+vy0*time+725*time*time;
    const nearX=Math.max(px,Math.min(coin.x,px+32)),nearY=Math.max(py,Math.min(coin.y,py+48));
    if((coin.x-nearX)**2+(coin.y-nearY)**2<=9**2) frames++;
  }
  return frames;
}
function bestDiveCoinPosition(t) {
  const launches=[t.x1,(t.x1+t.x2)/2,t.x2], paths=launches.map(launchCenter=>{
    const startX=launchCenter-16,startY=t.A.y-48,endX=t.landX,endY=t.landY-48,dx=endX-startX;
    const top=t.peakY??(t.tunnelPeakClip?t.tunnelPeakClip.to-48:Math.min(startY,endY)-93),Tb=Math.sqrt(2*(startY-top)/1450)+Math.sqrt(2*(endY-top)/1450);
    const vx=Math.max(dx/Tb,255),duration=dx/vx,vy0=(endY-startY-725*duration*duration)/duration;
    return Array.from({length:Math.ceil(duration*60)+1},(_,k)=>{const time=Math.min(k/60,duration);return {x:startX+vx*time,y:startY+vy0*time+725*time*time};});
  });
  const minX=Math.floor(Math.max(...paths.map(p=>Math.min(...p.map(q=>q.x)))))-9;
  const maxX=Math.ceil(Math.min(...paths.map(p=>Math.max(...p.map(q=>q.x+32)))))+9;
  const minY=Math.floor(Math.min(...paths.flat().map(q=>q.y)))-9,maxY=Math.ceil(Math.max(...paths.flat().map(q=>q.y+48)))+9;
  let best=null;
  for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
    const frames=launches.map(launch=>diveCoinFrames(t,{x,y},launch)), score=Math.min(...frames), total=frames.reduce((a,b)=>a+b,0);
    if(!best||score>best.score||(score===best.score&&total>best.total)) best={x,y,frames,score,total};
  }
  return best;
}
const diveCoinChecks=results.flatMap(r=>{
  const dives=r.transitions.filter(t=>t.mech==="dive");
  return (coinData[r.id]||[]).filter(c=>/^.+-dz-\d+$/.test(c.move_id)).map(c=>{
    const index=Number(c.move_id.match(/(\d+)$/)[1])-1,t=dives[index];
    const frames=t?[t.x1,(t.x1+t.x2)/2,t.x2].map(x=>diveCoinFrames(t,c,x)):[];
    return {route:r.id,coin:c.id,move:c.move_id,x:c.x,y:c.y,frames,pass:frames.length===3&&frames.every(n=>n>=3),suggested:t?bestDiveCoinPosition(t):null};
  });
});
const badGateDiveCoins=diveCoinChecks.filter(x=>["F03","F04","M01","M02","M03","M04","A01","A02"].includes(x.route)&&!x.pass);
const badInfoDiveCoins=diveCoinChecks.filter(x=>!["F03","F04","M01","M02","M03","M04","A01","A02"].includes(x.route)&&!x.pass);
const legacyPeakY=Object.entries(routeData).filter(([id])=>!/^M0[1-4]$/.test(id)).flatMap(([route,data])=>(data.diveZones||[]).filter(z=>Object.hasOwn(z,"peakY")).map(z=>({route,id:z.id,peakY:z.peakY})));
const kLegacyInfo=results.filter(r=>!/^M0[1-4]$/.test(r.id)).flatMap(r=>r.roles.filter(s=>s.role==="zemin"&&s.below&&s.w<=72&&s.h<=24).map(s=>({route:r.id,id:s.id,w:s.w,h:s.h})));
const m01EscapeIds=[1,2,3].map(n=>`m01-deadend-i11-step-${n}`);
const m01Route=routeData.M01,m02Route=routeData.M02;
const dGate=m01EscapeIds.every(id=>m01Route.groundSegments.some(s=>s.id===id)&&m01Route.catchableSurfaces.some(c=>c.id===id));
const kGate=!m02Route.groundSegments.some(s=>s.id==="m02-v-26")&&m02Route.obstacles.some(o=>o.type==="vault"&&o.w===72&&o.h===48&&Math.abs(o.x-5668.92)<.01&&Math.abs(o.baseY-294.25)<.01);
const dLegacyInfo=results.filter(r=>!/^M0[1-4]$/.test(r.id)).flatMap(r=>r.transitions.filter(t=>(t.mech==="dive"||t.mech==="normal")&&t.pit).map(t=>({route:r.id,i:t.i,pit:t.pit,B:t.B.id})));
let codeParity=true;
for(const r of results){
  const route=routeData[r.id];
  const catchIds=[...new Set([...r.transitions.filter(t=>t.mech==="tutunma"||(-t.D>52&&t.gap<=96)).map(t=>t.B.id),...r.fallbackCatchable,...(r.id==="A02"?["a02-s-wall-1","a02-s-wall-2","a02-s-wall-3"]:[])])];
  if(r.id==="D06") catchIds.splice(catchIds.indexOf("d06-v-05")+1,0,"d06-pit1-step-1","d06-pit1-step-2","d06-pit2-step-1","d06-pit2-step-2");
  const catches=catchIds.map(id=>({id}));
  const dives=r.transitions.filter(t=>t.mech==="dive").map((t,i)=>({id:`${r.id.toLowerCase()}-dz-${String(i+1).padStart(2,"0")}`,x1:t.x1,x2:t.x2,landX:t.landX,landY:t.landY,...(t.tunnelPeakClip?{peakY:round(t.tunnelPeakClip.to-48)}:{})}));
  const obstacles=r.obstacles.map(({sourceId,...o})=>o);
  const same=JSON.stringify(route.catchableSurfaces)===JSON.stringify(catches)&&JSON.stringify(route.diveZones)===JSON.stringify(dives)&&JSON.stringify(route.obstacles)===JSON.stringify(obstacles);
  console.log(`${r.id} kod eşliği | catch/dive/engel | JSON ile birebir | ${same?"PASS":"FAIL"}`); codeParity=codeParity&&same;
}
const missingFallbackCatch=results.filter(r=>r.id[0]==="F"||r.id[0]==="M"||r.id[0]==="A").flatMap(r=>{
  const ids=new Set((routeData[r.id].catchableSurfaces||[]).map(x=>x.id));
  return r.transitions.filter(t=>-t.D>52&&t.gap<=96&&!ids.has(t.B.id)).map(t=>({route:r.id,i:t.i,B:t.B.id,H:-t.D,gap:t.gap}));
});
console.log("\nZORUNLU KONTROLLER");
console.log(`Roller | ${JSON.stringify(roleActual)} | ${JSON.stringify(roleExpected)} | ${JSON.stringify(roleActual)===JSON.stringify(roleExpected)?"PASS":"FAIL"}`);
console.log(`Spot | ${firstDive?`x1=${firstDive.x1} x2=${firstDive.x2} landX=${firstDive.landX} landY=${firstDive.landY} Tb=${firstDive.Tb}`:"yok"} | ±0.5px/±0.005sn | ${spot?"PASS":"FAIL"}`);
console.log(`UYMAYAN | ${unmatched.length} | 0 | ${unmatched.length===0?"PASS":"FAIL"}`);
console.log(`Dive aralıkları | ${reversedDives.length} ters | 0 | ${reversedDives.length===0?"PASS":"FAIL"}`);
console.log(`D05/D06 dive width | ${JSON.stringify(shortNewDives)} | every window >=40 px | ${shortNewDives.length===0?"PASS":"FAIL"}`);
console.log(`D01-D04 short dive report | ${JSON.stringify(shortLegacyDives)} | data unchanged | INFO`);
console.log(`D05/D06 catchable FP guard | ${JSON.stringify(badNewCatchableY)} | exact | ${badNewCatchableY.length===0?"PASS":"FAIL"}`);
console.log(`D01-D04 catchable FP report | ${JSON.stringify(badLegacyCatchableY)} | data unchanged | INFO`);
console.log(`F01/F02 fallback catchable | ${JSON.stringify(missingFallbackCatch)} | H>52 gap<=96 all catchable | ${missingFallbackCatch.length===0?"PASS":"FAIL"}`);
console.log(`F03-A02 dive coin 60Hz guard | ${JSON.stringify(badGateDiveCoins)} | 3 launches x >=3 frames | ${badGateDiveCoins.length===0?"PASS":"FAIL"}`);
console.log(`D05-F02 dive coin 60Hz report | ${JSON.stringify(badInfoDiveCoins)} | unchanged | INFO`);
console.log(`Legacy peakY absence | ${JSON.stringify(legacyPeakY)} | expected [] | ${legacyPeakY.length===0?"PASS":"FAIL"}`);
console.log(`M01 D dead-end escape | ${JSON.stringify(m01EscapeIds)} | ground+catchable | ${dGate?"PASS":"FAIL"}`);
console.log(`M02 K small platform | m02-v-26 removed; 72x48 vault @5668.92/294.25 | converted | ${kGate?"PASS":"FAIL"}`);
console.log(`D01-F04 D miss-path report | ${JSON.stringify(dLegacyInfo)} | unchanged | INFO`);
console.log(`D01-F04 K small-platform report | ${JSON.stringify(kLegacyInfo)} | unchanged | INFO`);
if(JSON.stringify(roleActual)!==JSON.stringify(roleExpected)||!spot||unmatched.length||reversedDives.length||shortNewDives.length||badNewCatchableY.length||missingFallbackCatch.length||badGateDiveCoins.length||legacyPeakY.length||!dGate||!kGate||!codeParity) process.exitCode=1;
