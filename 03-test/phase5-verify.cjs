const assert=require('node:assert/strict');
const {load,source,projection}=require('./phase3-verify.cjs');
const ref=process.argv[2]||'WORKTREE',html=source(ref),game=load(html),base=load(source('4471b66'));
const calls=[];
// Balanced call scan, preserving strings and ternary expressions (no dependencies).
for(const m of html.matchAll(/\bkill\s*\(/g)){
 if(/function\s+$/.test(html.slice(Math.max(0,m.index-12),m.index)))continue;
 let i=m.index+m[0].length,start=i,depth=1,quote='',escape=false;
 for(;i<html.length;i++){const c=html[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue}if(c==='\''||c==='"'||c==='`'){quote=c;continue}if(c==='(')depth++;if(c===')'&&!--depth)break;else if(c!==')'){} }
 calls.push({line:html.slice(0,m.index).split('\n').length,args:html.slice(start,i)});
}
assert(calls.length>20);assert(calls.every(c=>c.args.trim()));
let cases=0;
for(const call of calls){
 const variants=call.args.includes('e.type')?["const e={type:'crate'};","const e={type:'walker'};"]:call.args.startsWith('msg,')?["const msg='Warehouse policy applied.';","const msg='Checkpoint checked you.';","const msg='Trust had overhead costs.';"]:[''];
 for(const prefix of variants){game(`(()=>{${prefix}dead=won=false;spawnGrace=0;lives=10;kill(${call.args});assert(dead);assert.equal(toast,deathToast);assert(toast.length>0);assert.equal(deathDeadline-performance.now(),1600);const expected=toast;toast='later same-frame warning';const texts=[];const orig=ctx.fillText;ctx.fillText=(t)=>texts.push(t);draw();ctx.fillText=orig;assert(texts.includes(expected));assert.equal(toast,expected);kill('second collision');assert.equal(deathToast,expected);})()`);cases++;}
}
const missingMessages=calls.filter(c=>!c.args.trim());
game(`dead=won=false;spawnGrace=0;kill();assert.equal(toast,'Delivery failed. Permanently.');dead=false;spawnGrace=1;kill('protected');assert(!dead);spawnGrace=0;`);
assert.equal(game(projection),base(projection),'Geometries/enemies changed');
const errors=JSON.parse(game('JSON.stringify(validateAllScenes().filter(r=>r.errors.length).map(r=>({scene:r.level+"."+r.part,errors:r.errors})))'));
assert.equal(errors.length,0);
const honest=['INCOMING','RUN','HEADS UP','WAIT','SAFE','NOPE','NO RETURNS'];
const deceptive=['FREE KEY. TOTALLY FREE.','CHECKPOINT APPROVED.','DELIVERY POINT RELOCATING.','SCENE 31. NO REFUNDS.','SPEED CHECK.','WEATHER ALERT.','OVERHEAD POLICY.','RED OBJECT HAS LOCKED ON.'];
for(const text of honest)assert(!new RegExp("['\\\"]"+text+"['\\\"]").test(html),'Honest telegraph remains: '+text);
for(const text of deceptive)assert(html.includes("'"+text+"'")||html.includes('"'+text+'"'),'Deceptive text missing: '+text);
console.log(JSON.stringify({ref,killCallSites:calls.length,messageCases:cases,missingMessages,deathToast:'draw mock: every message rendered despite later toast; 1600ms hold; first death wins',geometryEqual:186,validatorErrors:errors,calls},null,2));
if(html.includes('const RAGE_PARTS=')){
 const routing=JSON.parse(game(`(()=>{
 const unique=[],families=[],rows=[];let violations=0;
 assert.equal(Object.keys(RAGE_PARTS).length,15);assert.equal(RAGE_POOL.length,7);
 for(let l=1;l<=31;l++){
 const family=rageFamily(l),n=l===31?6:l>=26?5:l>=16?4:l>=6?3:2;
 assert.equal(family.length,n);assert.equal(new Set(family).size,n);const sets=new Set();
 for(let p=1;p<=6;p++){const a=ragePatterns(l,p),b=ragePatterns(l,p);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(family),JSON.stringify(rageFamily(l)));assert(a.every(t=>family.includes(t)));for(const t of a)if(!RAGE_PARTS[t].includes(p))violations++;sets.add(JSON.stringify([...a].sort()));rows.push({scene:l+'.'+p,traps:a});}
 assert(sets.size>=2,'No part variety at '+l);unique.push(sets.size);families.push({level:l,family,uniqueSets:sets.size});
 }
 assert.equal(violations,0);assert.equal(selectRageMembers(['floorPop','sweeper'],4).length,0);
 const saved=rageFamily;rageFamily=()=>['floorPop','sweeper'];const log=console.warn;console.warn=()=>{};assert.equal(ragePatterns(1,4)[0],'coinBite');assert(RAGE_FALLBACKS.has('1.4'));RAGE_FALLBACKS.clear();rageFamily=saved;console.warn=log;
 return JSON.stringify({deterministic:186,min:Math.min(...unique),max:Math.max(...unique),violations,fallbacks:[...RAGE_FALLBACKS.keys()],families,rows});
 })()`));
 console.log(JSON.stringify({routing},null,2));
 const trapGeometry=JSON.parse(game(`(()=>{
 const failures=[],counts=Object.fromEntries(RAGE_POOL.map(name=>[name,0]));
 const supported=(box,surfaces,st)=>box&&box.enabled&&surfaces.some(s=>(s.kind==='ground'||s.kind==='platform')&&box.x+box.w>st+s.x&&box.x<st+s.x+s.w&&Math.abs(box.y+box.h-s.y)<.001);
 for(let l=1;l<=31;l++)for(let p=1;p<=6;p++){
  currentLevel=l;currentPart=p;const sc=scene(),st=sc.start,g=buildScene(l,p);rt=makeRuntime();
  for(const name of rt.rage.patterns){counts[name]++;const R=rt.rage,box=name==='coinBite'?R.coin.box:name==='rearBite'?R.rear.box:name==='floorPop'?R.pop.box:name==='sweeper'?R.sweep:name==='exitDrop'?{...R.exit.block,y:R.exit.block.targetY}:name==='hunter'?R.hunter:R.last.box;if(!supported(box,solidSurfaces(g.surfaces),st))failures.push({scene:l+'.'+p,name,box});}
 }
  assert.equal(failures.length,0,JSON.stringify(failures));assert(Object.values(counts).every(Boolean));
 return JSON.stringify({scenes:186,failures,counts});
 })()`));
 console.log(JSON.stringify({trapGeometry,honestTelegraphsRemoved:honest,deceptiveTextsRetained:deceptive,deathDeadlineMs:1600},null,2));
}
