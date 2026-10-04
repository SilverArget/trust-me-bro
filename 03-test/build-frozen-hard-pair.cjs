const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, ".."), campaign = path.join(root, "js", "a12-campaign.js");
const dockBuilder = fs.readFileSync(path.join(__dirname, "build-dock18.cjs"), "utf8");
// Keep compose()'s transported source move_id. The Dock builder normally
// rewrites it to a synthetic mix id after selecting coins; hard routes need
// the real movement identity for the CJ/CC/CS contract.
const prefix = dockBuilder.slice(0, dockBuilder.indexOf("const parsed=readObjects(src)"))
  .replace('c.move_id=`${id.toLowerCase()}-mix-${String(n+1).padStart(2,\'0\')}`','c.move_id=c.move_id');
const context = { require, __dirname, console, structuredClone };
vm.createContext(context);
vm.runInContext(prefix + "\nthis.api={readObjects,compose,objectRange,round,sourceTransitions,renameDeep};", context);
const { readObjects, compose, objectRange, round, sourceTransitions, renameDeep } = context.api;
let src = fs.readFileSync(campaign, "utf8");
const parsed = readObjects(src);
for (const [dockId, worldId] of Object.entries({D07:"F01",D08:"F02",D13:"M03",D14:"M04"})) {
  sourceTransitions[dockId] = renameDeep(sourceTransitions[worldId], worldId, dockId);
}

const plans = {
  F01: [{id:"D07",side:"left",fraction:.5},{id:"D13",side:"right",fraction:.5}],
  F02: [{id:"D08",side:"left",fraction:.5},{id:"D14",side:"right",fraction:.5}],
};
const names = {F01:"NIGHT SHIFT",F02:"COLD STORAGE"};
const built = {}, coins = {}, generated = {}, meta = {};

function surfaceFor(route, x) {
  return route.groundSegments.filter(s => s.x <= x && s.x + s.w >= x).sort((a,b)=>a.y-b.y)[0];
}
function measuredCoins(id, route, transitions) {
  const traceFile=path.join(__dirname,"frozen-hard-generated",`${id}-60hz-trace.json`);
  if(!fs.existsSync(traceFile)) return null;
  const samples=JSON.parse(fs.readFileSync(traceFile,"utf8"));
  const candidates=[];
  const add=(kind,move_id,filter)=>{
    const hits=samples.filter(filter);
    for(let i=0;i+2<hits.length;i++){
      const q=hits.slice(i,i+3);
      if(q[2].t-q[0].t>.09)continue;
      const x=round(q[1].x+q[1].w/2),y=round(q[1].y+q[1].h/2);
      const frames=samples.filter(s=>{const nx=Math.max(s.x,Math.min(x,s.x+s.w)),ny=Math.max(s.y,Math.min(y,s.y+s.h));return (x-nx)**2+(y-ny)**2<=8**2}).length;
      if(frames>=3){candidates.push({kind,move_id,x,y,frames});return;}
    }
  };
  // Prefer obstacle jumps for CJ. Dive candidates remain available only as a
  // shortage fallback, where the independent three-launch gate still applies.
  for(const o of (route.obstacles||[]).filter(o=>o.type!=="slide")) add("CJ",o.id,s=>s.x+s.w>=o.x-70&&s.x<=o.x+o.w+100&&!s.onGround);
  // No measured hard-route dive currently passes the independent three-launch
  // proof, so shortages shift to another proven movement type instead.
  for(const o of (route.obstacles||[]).filter(o=>o.type==="slide")) add("CS",o.id,s=>s.x+s.w>=o.x-70&&s.x<=o.x+o.w+100&&s.state==="slide");
  for(const t of transitions.filter(t=>t.mech==="tutunma")) add("CC",t.B.id,s=>s.x+s.w>=t.B.x0-80&&s.x<=t.B.x0+80&&["catch","climb"].includes(s.state));
  const unique=[...new Map(candidates.map(c=>[c.move_id,c])).values()];
  const selected=[],take=(kind,n)=>{for(const c of unique.filter(c=>c.kind===kind))if(selected.length<n&&!selected.some(x=>x.move_id===c.move_id))selected.push(c)};
  take("CJ",8); const cjEnd=selected.length; take("CC",cjEnd+4); const ccEnd=selected.length; take("CS",ccEnd+2);
  for(const kind of ["CJ","CC","CS"])for(const c of unique.filter(c=>c.kind===kind))if(selected.length<14&&!selected.some(x=>x.move_id===c.move_id))selected.push(c);
  if(selected.length<14)throw Error(`${id}: measured distinct movement shortage ${selected.length}; pool ${JSON.stringify(Object.fromEntries(["CJ","CC","CS"].map(k=>[k,unique.filter(c=>c.kind===k).length])))}`);
  return selected.slice(0,14).map((c,n)=>({id:`${id}-c${String(n+1).padStart(2,"0")}`,kind:c.kind,move_id:c.move_id,x:c.x,y:c.y,n,skill:c.kind!=="CJ",traceFrames:c.frames}));
}
function harden(id, product) {
  const r = product.route;
  Object.assign(r, {worldId:"frozen", version:2, name:names[id], mode:"hard"});
  delete r.chief;
  // Exact hard-mode dive window. The n-part tool has already transported peakY.
  for (const z of r.diveZones || []) z.x2 = round(z.x1 + 40);
  for (const t of product.transitions) if(t.mech==="dive") t.x2=round(t.x1+40);
  const requiredCatch=new Set(product.transitions.filter(t=>t.mech==="tutunma"||(-t.D>52&&t.gap<=96)).map(t=>t.B.id));
  const existingCatch=new Set((r.catchableSurfaces||[]).map(c=>c.id));
  for(const cid of requiredCatch) if(!existingCatch.has(cid)){r.catchableSurfaces.push({id:cid});existingCatch.add(cid);}
  // Catchable coordinates must be exactly stable under the engine's
  // subtract/add-48 operation. Snap every referenced surface to the 1/8 grid
  // when the transport error is at most 0.07 px, and carry the same delta to
  // transition endpoints/zones that name that surface.
  const catchIds = new Set((r.catchableSurfaces || []).map(c=>c.id));
  const yDelta = new Map();
  for (const s of r.groundSegments) if (catchIds.has(s.id)) {
    const snapped=Math.round(s.y*8)/8, delta=snapped-s.y;
    if (Math.abs(delta)>.07) throw Error(`${id}: catchable ${s.id} needs ${delta}px y snap`);
    if (delta) { s.y=snapped; yDelta.set(s.id,delta); }
  }
  for (const t of product.transitions) {
    for (const side of ["A","B"]) if (t[side] && yDelta.has(t[side].id)) t[side].y=round(t[side].y+yDelta.get(t[side].id));
    if (t.B && yDelta.has(t.B.id)) { const d=yDelta.get(t.B.id); if(Number.isFinite(t.landY))t.landY=round(t.landY+d); }
  }
  for (const z of r.diveZones || []) {
    const t=product.transitions.find(q=>Number.isFinite(q.landX)&&Math.abs(q.landX-z.landX)<.02);
    if(t) z.landY=t.landY;
  }
  // Alternate vault/slide on long profile runs. Keep R2 >=128 and R3 >=96.
  let seq = 0, added = 0;
  const transitionLaunches=product.transitions.map(t=>Number.isFinite(t.x1)?t.x1:t.A?.x1).filter(Number.isFinite);
  const landings=product.transitions.map(t=>Number.isFinite(t.landX)?t.landX:t.B?.x0).filter(Number.isFinite);
  const occupied=(r.obstacles||[]).map(o=>({x:o.x,end:o.x+o.w}));
  for (const s of r.groundSegments) {
    if (s.w <= 320) continue;
    for (let x=s.x+260; x+72<=s.x+s.w-128; x+=290) {
      const place=()=>{
        const r3=landings.filter(v=>v<=x).reduce((a,v)=>Math.max(a,v),-Infinity);
        const r2=transitionLaunches.filter(v=>v>=x).reduce((a,v)=>Math.min(a,v),Infinity);
        const previous=occupied.filter(o=>o.end<=x).reduce((a,o)=>Math.max(a,o.end),-Infinity);
        const next=occupied.filter(o=>o.x>=x+72).reduce((a,o)=>Math.min(a,o.x),Infinity);
        // The engine's slide/vault pose can outlive the obstacle rectangle.
        // Keep a conservative recovery runway between consecutive obstacles;
        // R2/R3 remain the lower bounds for transitions/landings.
        return x-r3>=96&&r2>=x+72&&r2-(x+72)>=128&&x-previous>=220&&next-(x+72)>=220;
      };
      while(x+72<=s.x+s.w-128&&!place()) x=round(x+8);
      if(x+72>s.x+s.w-128) continue;
      const obstacle={id:`${id.toLowerCase()}-hard-${++added}`,type:seq++%2?"slide":"vault",x:round(x),w:72,h:48,baseY:s.y};
      r.obstacles.push(obstacle); occupied.push({x:obstacle.x,end:obstacle.x+obstacle.w});
    }
  }
  // Rebuild the 14 collectibles from real, distinct movement ids. Dive coins use
  // the transported scripted arc; the transition gate validates all 3 launches.
  // compose() already transports proven 60 Hz coin positions and preserves
  // the Dock CJ/CC/CS distribution. Bind those positions to distinct real
  // movements of the same type instead of inventing obstacle-centre coins.
  const selected=measuredCoins(id,r,product.transitions)||product.coins.map((coin,n)=>({...coin,id:`${id}-c${String(n+1).padStart(2,"0")}`,n,skill:coin.kind!=="CJ",x:round(coin.x),y:round(coin.y)}));
  if (!process.env.TMB_MEASURE_HARD_TRACE && new Set(selected.map(c=>c.move_id)).size !== 14) throw Error(`${id}: movement reuse ${JSON.stringify(selected.map(c=>[c.kind,c.move_id,c.x,c.y]))}`);
  const byId = new Map(r.groundSegments.map(s=>[s.id,s]));
  r.catchableSurfaces = (r.catchableSurfaces||[]).filter(c=>byId.has(c.id));
  return {route:r, coins:selected, added};
}

for (const [id, parts] of Object.entries(plans)) {
  const product = compose(parsed.routes, parsed.coins, id, parts);
  product.transitions=product.transitions.map(t=>parts.reduce((q,spec,pi)=>renameDeep(q,`${id}-P${pi+1}`,`${id}-P${pi+1}-${spec.id}`),t));
  const hard = harden(id, product);
  built[id] = hard.route; coins[id] = hard.coins; generated[id] = product.transitions;
  meta[id] = {parts,length:hard.route.length,movements:hard.route.diveZones.length+hard.route.obstacles.length,addedObstacles:hard.added,coins:hard.coins.length};
}

function replaceEntries(marker, entries, routeMode) {
  const range = objectRange(src, marker);
  let body = src.slice(range.open+1, range.close);
  for (const [id,value] of Object.entries(entries)) {
    const indent=routeMode?"    ":"  ", key=routeMode?id:`\"${id}\"`;
    const json=JSON.stringify(value).replace(`\"coins\":\"__COINS__\"`,`\"coins\":makeCoins(\"${id}\", COINS.${id})`);
    const line=`${indent}${key}: ${json}`;
    const pattern=new RegExp(`^${indent}${routeMode?id:`\"${id}\"`}: .*?(?=,?\\r?$)`,`m`);
    if(!pattern.test(body)) throw Error(`target line missing: ${marker} ${id}`);
    body=body.replace(pattern,line);
  }
  src=src.slice(0,range.open+1)+body+src.slice(range.close);
}
replaceEntries("const COINS = Object.freeze(", coins, false);
for (const r of Object.values(built)) r.coins="__COINS__";
replaceEntries("const ROUTES = Object.freeze(", built, true);
fs.writeFileSync(campaign, src, "utf8");
const out=path.join(__dirname,"frozen-hard-generated"); fs.mkdirSync(out,{recursive:true});
for(const [id,t] of Object.entries(generated)) fs.writeFileSync(path.join(out,`transitions-${id}.json`),JSON.stringify(t,null,2)+"\n","utf8");
fs.writeFileSync(path.join(__dirname,"frozen-hard-meta.json"),JSON.stringify(meta,null,2)+"\n","utf8");
console.log(JSON.stringify(meta,null,2));
