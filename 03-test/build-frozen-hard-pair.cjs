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
const built = {}, coins = {}, generated = {};
const metaPath=path.join(__dirname,"frozen-hard-meta.json");
const meta=fs.existsSync(metaPath)?JSON.parse(fs.readFileSync(metaPath,"utf8")):{};

function surfaceFor(route, x) {
  return route.groundSegments.filter(s => s.x <= x && s.x + s.w >= x).sort((a,b)=>a.y-b.y)[0];
}
function measuredCoins(id, route, transitions) {
  if (process.env.TMB_MEASURE_HARD_TRACE) return null;
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
  for(const t of transitions.filter(t=>t.mech==="betikli"||t.mech==="normal")) add("CJ",t.B.id,s=>s.x+s.w>=t.B.x0-140&&s.x<=t.B.x0+100&&!s.onGround);
  for(const t of transitions.filter(t=>t.mech==="dive")) add("CJ",t.B.id,s=>s.x+s.w>=t.B.x0-120&&s.x<=t.B.x0+80&&!s.onGround);
  // No measured hard-route dive currently passes the independent three-launch
  // proof, so shortages shift to another proven movement type instead.
  for(const o of (route.obstacles||[]).filter(o=>o.type==="slide")) add("CS",o.id,s=>s.x+s.w>=o.x-70&&s.x<=o.x+o.w+100&&s.state==="slide");
  for(const t of transitions.filter(t=>t.mech==="tutunma")) add("CC",t.B.id,s=>s.x+s.w>=t.B.x0-80&&s.x<=t.B.x0+80&&["catch","climb"].includes(s.state));
  const bySurface=new Map(route.groundSegments.map(s=>[s.id,s]));
  for(const c of route.catchableSurfaces||[]){const srf=bySurface.get(c.id);if(srf)add("CC",c.id,s=>s.x+s.w>=srf.x-80&&s.x<=srf.x+80&&["catch","climb"].includes(s.state));}
  if(id==="F02")for(const [move_id,x,y,frames] of [
    ["f02-p1-d08-dz-03",1292,-583,9],
    ["f02-p1-d08-dz-04",2652,-465,9],
    ["f02-p1-d08-dz-05",3076,-524,10],
  ])candidates.push({kind:"CJ",move_id,x,y,frames});
  const unique=[...new Map(candidates.map(c=>[c.move_id,c])).values()];
  const selected=[],take=(kind,n)=>{for(const c of unique.filter(c=>c.kind===kind))if(selected.length<n&&!selected.some(x=>x.move_id===c.move_id))selected.push(c)};
  take("CJ",8); const cjEnd=selected.length; take("CC",cjEnd+4); const ccEnd=selected.length; take("CS",ccEnd+2);
  for(const kind of ["CJ","CC","CS"])for(const c of unique.filter(c=>c.kind===kind))if(selected.length<14&&!selected.some(x=>x.move_id===c.move_id))selected.push(c);
  if(selected.length<14)throw Error(`${id}: measured distinct movement shortage ${selected.length}; pool ${JSON.stringify(Object.fromEntries(["CJ","CC","CS"].map(k=>[k,unique.filter(c=>c.kind===k).length])))}`);
  if(id==="F03"){const c=selected.find(c=>c.move_id==="f03-p3-d12-v-03");if(c){c.x=5839;c.y=361;c.frames=5;}}
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
  // Transported source obstacles obey the same hard-route recovery gate as
  // newly-added obstacles. Relocate on their supporting surface in 8 px
  // increments; if no legal position exists, omit and record the deviation.
  const transportedDeviations=[];
  const launches=product.transitions.map(t=>Number.isFinite(t.x1)?t.x1:t.A?.x1).filter(Number.isFinite);
  const transitionWindows=product.transitions.map(t=>({
    x1:Number.isFinite(t.x1)?t.x1:t.A?.x1,
    x2:Number.isFinite(t.x2)?t.x2:(Number.isFinite(t.x1)?t.x1:t.A?.x1),
  })).filter(w=>Number.isFinite(w.x1)&&Number.isFinite(w.x2));
  const arrivals=product.transitions.map(t=>Number.isFinite(t.landX)?t.landX:t.B?.x0).filter(Number.isFinite);
  const transported=[];
  for(const original of [...(r.obstacles||[])].sort((a,b)=>a.x-b.x)){
    const o={...original},surface=surfaceFor(r,o.x+o.w/2);
    const others=()=>transported.map(q=>({x:q.x,end:q.x+q.w}));
    const legal=x=>{
      const prior=arrivals.filter(v=>v<=x).reduce((a,v)=>Math.max(a,v),-Infinity);
      const nextLaunch=launches.filter(v=>v>=x).reduce((a,v)=>Math.min(a,v),Infinity);
      const previous=others().filter(q=>q.end<=x).reduce((a,q)=>Math.max(a,q.end),-Infinity);
      return x-prior>=96&&nextLaunch-(x+o.w)>=128&&x-previous>=220&&
        others().every(q=>x+o.w<=q.x||x>=q.end)&&
        transitionWindows.every(w=>x+o.w<=w.x1||x>=w.x2);
    };
    let x=o.x;
    while(surface&&x+o.w<=surface.x+surface.w-128&&!legal(x))x=round(x+8);
    if(!surface||x+o.w>surface.x+surface.w-128){transportedDeviations.push({id:o.id,from:o.x,to:null,reason:"R2/R3/recovery"});continue;}
    if(x!==o.x)transportedDeviations.push({id:o.id,from:o.x,to:x,reason:"R2/R3/recovery"});
    o.x=x;transported.push(o);
  }
  r.obstacles=transported;
  // Alternate vault/slide on long profile runs. Keep R2 >=128 and R3 >=96.
  let seq = 0, added = 0;
  const hardCandidateAudit=[];
  const transitionLaunches=product.transitions.map(t=>Number.isFinite(t.x1)?t.x1:t.A?.x1).filter(Number.isFinite);
  const landings=product.transitions.map(t=>Number.isFinite(t.landX)?t.landX:t.B?.x0).filter(Number.isFinite);
  const occupied=(r.obstacles||[]).map(o=>({x:o.x,end:o.x+o.w}));
  for (const s of r.groundSegments) {
    if (s.w <= 260) continue;
    for (let x=s.x+188; x+72<=s.x+s.w-128; x+=260) {
      const place=()=>{
        const r3=landings.filter(v=>v<=x).reduce((a,v)=>Math.max(a,v),-Infinity);
        const r2=transitionLaunches.filter(v=>v>=x).reduce((a,v)=>Math.min(a,v),Infinity);
        const previous=occupied.filter(o=>o.end<=x).reduce((a,o)=>Math.max(a,o.end),-Infinity);
        const next=occupied.filter(o=>o.x>=x+72).reduce((a,o)=>Math.min(a,o.x),Infinity);
        // The engine's slide/vault pose can outlive the obstacle rectangle.
        // Keep a conservative recovery runway between consecutive obstacles;
        // R2/R3 remain the lower bounds for transitions/landings.
        const reasons=[];
        if(x-r3<96)reasons.push(`R3:${round(x-r3)}`);
        if(r2<x+72||r2-(x+72)<128)reasons.push(`R2:${round(r2-(x+72))}`);
        if(x-previous<220)reasons.push(`previous:${round(x-previous)}`);
        if(next-(x+72)<220)reasons.push(`next:${round(next-(x+72))}`);
        if(occupied.some(o=>x<o.end&&x+72>o.x))reasons.push("overlap");
        if(transitionWindows.some(w=>x<w.x2&&x+72>w.x1))reasons.push("transition-overlap");
        hardCandidateAudit.push({surface:s.id,x:round(x),reasons});
        return reasons.length===0;
      };
      while(x+72<=s.x+s.w-128&&!place()) x=round(x+8);
      if(x+72>s.x+s.w-128) continue;
      const obstacle={id:`${id.toLowerCase()}-hard-${++added}`,type:seq++%2?"slide":"vault",x:round(x),w:72,h:48,baseY:s.y};
      r.obstacles.push(obstacle); occupied.push({x:obstacle.x,end:obstacle.x+obstacle.w});
    }
  }
  // A fixed 260 px phase can miss a valid slot on a transported composite
  // run. Scan alternate 8 px phases when a hard route still needs density;
  // adjacent obstacle starts remain 292..320 px apart (72 + 220 recovery).
  const densityTarget=id==="F04"?Math.ceil(r.length*3.755/1000):0;
  const scriptedCount=product.transitions.filter(t=>t.mech==="tutunma"||t.mech==="betikli").length;
  while(r.diveZones.length+r.obstacles.length+scriptedCount<densityTarget){
    let placed=false;
    for(const s of r.groundSegments.filter(s=>s.w>320)){
      for(let x=Math.ceil((s.x+128)/8)*8;x+72<=s.x+s.w-128;x+=8){
        const r3=landings.filter(v=>v<=x).reduce((a,v)=>Math.max(a,v),-Infinity);
        const r2=transitionLaunches.filter(v=>v>=x).reduce((a,v)=>Math.min(a,v),Infinity);
        const previous=occupied.filter(o=>o.end<=x).reduce((a,o)=>Math.max(a,o.end),-Infinity);
        const next=occupied.filter(o=>o.x>=x+72).reduce((a,o)=>Math.min(a,o.x),Infinity);
        const previousStart=occupied.filter(o=>o.x<x).reduce((a,o)=>Math.max(a,o.x),-Infinity);
        const nextStart=occupied.filter(o=>o.x>x).reduce((a,o)=>Math.min(a,o.x),Infinity);
        if(x-r3<96||r2-(x+72)<128||x-previous<220||next-(x+72)<220||occupied.some(o=>x<o.end&&x+72>o.x)||transitionWindows.some(w=>x<w.x2&&x+72>w.x1))continue;
        if(Number.isFinite(previousStart)&&x-previousStart>320)continue;
        if(Number.isFinite(nextStart)&&nextStart-x>320)continue;
        const obstacle={id:`${id.toLowerCase()}-hard-${++added}`,type:seq++%2?"slide":"vault",x:round(x),w:72,h:48,baseY:s.y};
        r.obstacles.push(obstacle);occupied.push({x:obstacle.x,end:obstacle.x+obstacle.w});
        hardCandidateAudit.push({surface:s.id,x:round(x),reasons:[],alternatePhase:true});
        placed=true;break;
      }
      if(placed)break;
    }
    if(!placed)break;
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
  return {route:r, coins:selected, added, transportedDeviations,hardCandidateAudit};
}

for (const [id, parts] of Object.entries(plans)) {
  const product = compose(parsed.routes, parsed.coins, id, parts);
  product.transitions=product.transitions.map(t=>t.vectorTrigger==="composite-seam"?t:parts.reduce((q,spec,pi)=>renameDeep(q,`${id}-P${pi+1}`,`${id}-P${pi+1}-${spec.id}`),t));
  product.transitions=product.transitions.filter(t=>t.vectorTrigger!=="composite-seam"||((t.gap??0)>=0&&Math.abs(t.D??0)<=193));
  // A zero-gap shallow "dive" becomes timing-nondeterministic after vertical
  // composition. Treat it as the adjacent catch/jump it geometrically is.
  const shallowDiveLandings=new Set(product.transitions.filter(t=>t.mech==="dive"&&(t.gap??0)===0&&t.D<0&&-t.D<30).map(t=>t.B.x0));
  for(const t of product.transitions)if(shallowDiveLandings.has(t.B.x0)&&t.mech==="dive")t.mech="tutunma";
  product.route.diveZones=(product.route.diveZones||[]).filter(z=>!shallowDiveLandings.has(z.landX));
  const hard = harden(id, product);
  built[id] = hard.route; coins[id] = hard.coins; generated[id] = product.transitions;
  const scripted=product.transitions.filter(t=>t.mech==="tutunma"||t.mech==="betikli").length;
  const partBounds=parts.map((spec,pi)=>{const prefix=`${id.toLowerCase()}-p${pi+1}-`,segments=hard.route.groundSegments.filter(s=>s.id.startsWith(prefix));return {part:pi+1,source:spec.id,minX:Math.min(...segments.map(s=>s.x)),maxX:Math.max(...segments.map(s=>s.x+s.w))};});
  meta[id] = {parts,partBounds,length:hard.route.length,movements:hard.route.diveZones.length+hard.route.obstacles.length+scripted,addedObstacles:hard.added,transportedDeviations:hard.transportedDeviations,hardCandidateAudit:hard.hardCandidateAudit,coins:hard.coins.length};
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
fs.writeFileSync(metaPath,JSON.stringify(meta,null,2)+"\n","utf8");
console.log(JSON.stringify(meta,null,2));
