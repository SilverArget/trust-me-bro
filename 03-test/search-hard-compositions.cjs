"use strict";
// Systematic hard-route search. It executes the production compose() and
// harden() functions in measurement mode, so scoring includes transported
// moves, corridor filtering, R2/R3, 220 px recovery, and overlap gates.
const fs=require("fs"),path=require("path"),vm=require("vm");
process.env.TMB_MEASURE_HARD_TRACE="1";
const dock=fs.readFileSync(path.join(__dirname,"build-dock18.cjs"),"utf8");
const prefix=dock.slice(0,dock.indexOf("const parsed=readObjects(src)"))
  .replace('c.move_id=`${id.toLowerCase()}-mix-${String(n+1).padStart(2,\'0\')}`','c.move_id=c.move_id');
const pair=fs.readFileSync(path.join(__dirname,"build-frozen-hard-pair.cjs"),"utf8");
const helpers=pair.slice(pair.indexOf("function surfaceFor"),pair.indexOf("for (const [id, parts]"));
const campaign=path.join(__dirname,"..","js","a12-campaign.js");
const context={require,__dirname,console:{log(){}},structuredClone,process,fs,path};
vm.createContext(context);
vm.runInContext(prefix+"\nconst parsed=readObjects(src);const meta={};\n"+helpers+"\nthis.api={parsed,compose,harden,sourceTransitions,renameDeep,surfaceAt};",context);
const {parsed,compose,harden,sourceTransitions,renameDeep,surfaceAt}=context.api;
const map={D07:"F01",D08:"F02",D09:"F03",D10:"F04",D11:"M01",D12:"M02",D13:"M03",D14:"M04",D15:"A01",D16:"A02"};
for(const [d,s] of Object.entries(map))sourceTransitions[d]=renameDeep(sourceTransitions[s],s,d);
for(const [dir,ids] of [["dock-d01d02",["D01","D02"]],["dock-d03d04",["D03","D04"]],["dock-d05d06",["D05","D06"]]])for(const id of ids)sourceTransitions[id]=JSON.parse(fs.readFileSync(path.join("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur",dir,`transitions-${id}.json`),"utf8"));
for(const d of ["D17","D18"])sourceTransitions[d]=JSON.parse(fs.readFileSync(path.join(__dirname,"dock18-generated",`transitions-${d}.json`),"utf8"));
const density=Object.fromEntries(Array.from({length:18},(_,i)=>{const id=`D${String(i+1).padStart(2,"0")}`,r=parsed.routes[id],t=sourceTransitions[id]||[];return[id,(r.obstacles.length+r.diveZones.length+t.filter(x=>["tutunma","betikli"].includes(x.mech)).length)*1000/r.length]}));
const reserved=[{id:"D07",lo:0,hi:.5},{id:"D13",lo:.5,hi:1},{id:"D08",lo:0,hi:.5},{id:"D14",lo:.5,hi:1}];
const fractions=[.1,.2,.3,.4,.5,.6,.7,.8,.9];
const pieces=[];
for(let n=1;n<=18;n++)for(const side of ["left","right"])for(const fraction of fractions){
  const id=`D${String(n).padStart(2,"0")}`,lo=side==="left"?0:fraction,hi=side==="left"?fraction:1;
  // A route must mix distinct Vector levels and may carry at most 50% of
  // any one source. Cuts are legal only between complete source movements.
  if(hi-lo>.5+1e-9)continue;
  if(reserved.some(x=>x.id===id&&lo<x.hi&&hi>x.lo))continue;
  try{const r=parsed.routes[id],target=r.length*fraction,bounds=(sourceTransitions[id]||[]).flatMap(t=>t.A&&t.B?[t.A.x0,t.A.x1,t.B.x0,t.B.x1]:[]).filter(x=>x>80&&x<r.finishX-80),cut=bounds.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target))[0];if(!Number.isFinite(cut))continue;const share=side==="left"?cut/r.length:(r.length-cut)/r.length;if(share>.5+1e-9)continue;const spec={id,side,fraction:Number((cut/r.length).toFixed(6)),cut};const product=compose(parsed.routes,parsed.coins,"F03",[spec]);product.transitions=product.transitions.filter(t=>t.vectorTrigger!=="composite-seam"||((t.gap??0)>=0&&Math.abs(t.D??0)<=193));const hard=harden("F03",product),scripted=product.transitions.filter(t=>["tutunma","betikli"].includes(t.mech)).length,moves=hard.route.diveZones.length+hard.route.obstacles.length+scripted;pieces.push({id,side,fraction:spec.fraction,lo:side==="left"?0:spec.fraction,hi:side==="left"?spec.fraction:1,cut,length:hard.route.length,moves,density:moves*1000/hard.route.length});}catch{}
}
// Retain the densest 35 pieces. This is still an exhaustive 2/3-part
// Cartesian search over the viable high-density pool (7,140 combinations)
// while keeping the exact hardening evaluation bounded.
const uniquePieces=[...new Map(pieces.map(p=>[`${p.id}:${p.side}:${p.cut}`,p])).values()];
// Keep a broad high-density pool after exact boundary deduplication. Dynamic
// acceptance still decides product eligibility.
const pool=uniquePieces.sort((a,b)=>b.density-a.density).slice(0,70),results=[];
function bounds(a){return Number.isFinite(a.lo)?a:(a.side==="left"?{...a,lo:0,hi:a.fraction}:{...a,lo:a.fraction,hi:1})}
function overlap(a,b){a=bounds(a);b=bounds(b);return a.id===b.id&&a.lo<b.hi&&a.hi>b.lo}
function score(parts){
  try{const specs=parts.map(({id,side,fraction,cut})=>({id,side,fraction,cut})),product=compose(parsed.routes,parsed.coins,"F03",specs);product.transitions=product.transitions.filter(t=>t.vectorTrigger!=="composite-seam"||((t.gap??0)>=0&&Math.abs(t.D??0)<=193));const hard=harden("F03",product),r=hard.route,scripted=product.transitions.filter(t=>["tutunma","betikli"].includes(t.mech)).length,moves=r.diveZones.length+r.obstacles.length+scripted,per1000=moves*1000/r.length,threshold=Math.max(...parts.map(p=>density[p.id]))*1.10;if(r.length>=8000&&r.length<=10000)results.push({parts:specs,length:r.length,moves,per1000,threshold,pass:per1000>=threshold,added:hard.added});}catch{}
}
for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
  if(pool[i].id===pool[j].id||overlap(pool[i],pool[j]))continue;
  score([pool[i],pool[j]]);
  for(let k=j+1;k<pool.length;k++)if(pool[k].id!==pool[i].id&&pool[k].id!==pool[j].id&&!overlap(pool[i],pool[k])&&!overlap(pool[j],pool[k]))score([pool[i],pool[j],pool[k]])
}
results.sort((a,b)=>(b.pass-a.pass)||(b.per1000-a.per1000)||((b.per1000-b.threshold)-(a.per1000-a.threshold)));
const passing=results.filter(x=>x.pass),disjoint=(a,b)=>a.parts.every(x=>b.parts.every(y=>!overlap(x,y)));
let selected=[];
function choose(start,cur){
  if(cur.length>selected.length||(cur.length===selected.length&&cur.reduce((n,x)=>n+x.per1000,0)>selected.reduce((n,x)=>n+x.per1000,0)))selected=cur.slice();
  if(cur.length===4)return;
  for(let i=start;i<passing.length;i++)if(cur.every(x=>disjoint(x,passing[i])))choose(i+1,[...cur,passing[i]]);
}
choose(0,[]);selected.sort((a,b)=>b.per1000-a.per1000);
const d10Winner={parts:[{id:"D10",side:"left",fraction:.4},{id:"D10",side:"right",fraction:.6}]};
const report={pieceCount:uniquePieces.length,poolCount:pool.length,compositionCount:results.length,selected,topFive:results.slice(0,5),passing,alternatesForD10:passing.filter(x=>disjoint(x,d10Winner)).slice(0,20)};
fs.writeFileSync(path.join(__dirname,"hard-composition-search.json"),JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify(report,null,2));
if(selected.length<4)process.exitCode=2;
