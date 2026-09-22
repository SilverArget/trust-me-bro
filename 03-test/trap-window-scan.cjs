const { load, source } = require('./phase3-verify.cjs');

const probe = load(source('WORKTREE'));
const result = probe(String.raw`JSON.stringify((()=>{
  const TOP_BLOCK_WARNING_MIN=.8;
  const WARNING_SCALE_END=.70,WARNING_MIN_ABS=.67;
  const warnScale=level=>1-(level-1)*(1-WARNING_SCALE_END)/(SCENE_COUNT-1);
  const family=new Set(['signDrop','ceiling','jumpBait','crateRain','checkpointBetrayal','finale']);
  const rows=[];
  for(let level=1;level<=SCENE_COUNT;level++)for(let part=1;part<=PART_COUNT;part++){
    const sc=SCENES[level-1];
    if(!family.has(sc.trap))continue;
    const g=buildScene(level,part),trigger=g.anchors.trap.trigger,hazard=g.anchors.hazard;
    const candidates=solidSurfaces(g.surfaces).filter(s=>trigger+player.w>s.x&&trigger<s.x+s.w);
    const support=candidates.sort((a,b)=>a.y-b.y)[0]||solidSurfaces(g.surfaces).filter(s=>s.x<=trigger).sort((a,b)=>b.x-a.x)[0];
    const warning=Math.max(WARNING_MIN_ABS,Math.max(TOP_BLOCK_WARNING_MIN,sc.trap==='signDrop'?.28:sc.trap==='finale'?.34:.4)*warnScale(level));
    const acc=sc.trap==='signDrop'?1350:sc.trap==='finale'?1100:1420;
    const playerY=(support?.y??GROUND)-player.h;
    const fallDistance=Math.max(0,(playerY+4)-(72+70));
    const fall=Math.sqrt(2*fallDistance/acc);
    const clearDistance=hazard+104-trigger;
    const clear=clearDistance/255;
    const window=warning+fall-clear;
    rows.push({level,part,trap:sc.trap,trigger,worldTrigger:sc.start+trigger,hazard,block:{x:hazard,y:72,w:104,h:70},support:support&&{x:support.x,y:support.y,w:support.w,kind:support.kind},playerY,warningMs:Math.round(warning*1000),fallMs:Math.round(fall*1000),clearMs:Math.round(clear*1000),windowMs:window*1000,route:part<=activePartCount(level)?"AKTIF ROTA":"PASIF ROTA"});
  }
  return {count:rows.length,unsafe:rows.filter(r=>r.windowMs<250),rows};
})())`);
// Passive parts remain visible, including violations; reassess before opening part 3+.
const report=JSON.parse(result);
report.activeUnsafe=report.unsafe.filter(r=>r.route==='AKTIF ROTA');
report.passiveUnsafe=report.unsafe.filter(r=>r.route==='PASIF ROTA');
report.activeMinimumMs=Math.min(...report.rows.filter(r=>r.route==='AKTIF ROTA').map(r=>r.windowMs));
console.log(JSON.stringify(report,(k,v)=>typeof v==='number'&&k.endsWith('Ms')?Number(v.toFixed(3)):v));
if(report.activeUnsafe.length)process.exitCode=1;
