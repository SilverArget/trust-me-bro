// Real game update(), no copied warning curve and no synthetic safe window.
// Passive violations stay visible. Reassess before opening part 3+.
// Usage: node 03-test/runtime-window.cjs [HEAD|WORKTREE] [--quick]
const {load,source}=require('./phase3-verify.cjs');
const ref=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:'WORKTREE';
const inputSource=source(ref),sourceHash=require('node:crypto').createHash('sha256').update(inputSource).digest('hex'),probe=load(inputSource);
const full=!process.argv.includes('--quick');
probe(String.raw`
 globalThis.windowTrial=function(level,part,deathTier,upgrade,delayMs,hz,mode){
  currentLevel=level;currentPart=part;partDeaths=deathTier;speedLevel=upgrade&1;jumpLevel=upgrade>>1;
  dead=won=upgradePending=characterSelectOpen=livesPending=adPending=false;resetScene();spawnGrace=0;
  const family=['signDrop','ceiling','jumpBait','crateRain','checkpointBetrayal','finale'];
  if(!family.includes(scene().trap))return{status:'N/A',reason:'No overhead or memory trap in this scene'};
  const g=buildScene(level,part),t=g.anchors.trap.trigger-(level===2?70:level===4?80:0),h=g.anchors.hazard;
  const mindLevel=level===2||level===4;
  const support=solidSurfaces(g.surfaces).filter(s=>mindLevel?s.x<t:t+player.w>s.x&&t<s.x+s.w).sort((a,b)=>mindLevel?Math.min(t,b.x+b.w)-Math.min(t,a.x+a.w)||a.y-b.y:a.y-b.y)[0];
  if(!support)return {status:'FAIL-UNMEASURED',reason:'No approach support at trigger'};
  player.x=sceneStart()+(mindLevel?Math.min(t-40,support.x+support.w-player.w):t+.01);player.y=support.y-player.h;player.vx=mindLevel?255:0;player.vy=0;player.onGround=true;
  keys.right=keys.left=keys.jump=false;
  if(mode==='cancel'&&typeof parkourCancel==='function')parkourCancel();
  if(mode==='pad'){
   const pad=rt.launchPads.find(p=>p.box.x<sceneStart()+t);
   if(!pad)return{status:'N/A',reason:'No launch pad before warning on this route'};
   player.x=pad.box.x+pad.box.w/2-player.w/2;player.y=pad.box.y-player.h-12;player.vy=100;player.onGround=false;
   for(let i=0;i<120&&!pad.used&&!dead;i++)update(1/240);
   if(dead)return{status:'FAIL-DEATH',reason:'Death during natural pad contact',cause:deathToast};
   if(!pad.used)return{status:'FAIL-UNMEASURED',reason:'Pad did not activate by contact'};
   keys.right=false;while(rt.boostT>0&&!dead&&!rt.armed&&!(mindLevel&&rt.mind.stage===1))update(1/240);
   if(dead)return{status:'FAIL-DEATH',reason:'Death during pad boost',cause:deathToast};
   if(!rt.armed&&!(mindLevel&&rt.mind.stage===1)){keys.right=false;for(let i=0;i<480&&!dead&&!player.onGround;i++)update(1/240);
   keys.right=true;for(let i=0;i<1200&&!dead&&!rt.armed&&rt.mind.stage!==1;i++){if(player.onGround){const foot=solidSurfaces(g.surfaces).concat(rt.parkourLayer?.rects||[]).filter(s=>Math.abs(s.y-player.y-player.h)<2&&player.x+player.w>sceneStart()+s.x&&player.x<sceneStart()+s.x+s.w).sort((a,b)=>a.y-b.y)[0];if(foot&&sceneStart()+foot.x+foot.w-player.x-player.w<45)keys.jump=true;}update(1/240);}
   keys.right=false;if(dead||!rt.armed&&rt.mind.stage!==1)return{status:'FAIL-UNMEASURED',reason:'Post-boost navigation did not reach warning',cause:dead?deathToast:null,pad:pad.id};}
  }else if(mindLevel){keys.right=true;keys.jump=true;for(let i=0;i<720&&!dead&&rt.mind.stage===0;i++)update(1/240);keys.right=false;if(dead)return{status:'FAIL-UNMEASURED',reason:'Natural mind-trap approach died',cause:deathToast}}else update(0);
  const mindWarning=(level===2||level===4)&&rt.mind.stage===1;
  // This adapter requires an actual overhead warning and falling body.
  // Early-sector mind traps and other families require their own escape objectives.
  if(!rt.armed&&!mindWarning)return{status:'FAIL-UNMEASURED',reason:'No overhead warning event; analytic top-block proxy is not runtime evidence'};
  const warningMs=(mindWarning?rt.mind.timer:rt.warning)*1000,dt=Math.min(.033,1/hz),delay=delayMs/1000;
  let elapsed=0,clear=false,firstInput=null;const brake=mindLevel&&mode!=='pad';
  while(elapsed<4&&!dead){
   keys.right=brake?elapsed+1e-10<delay:elapsed+1e-10>=delay;keys.left=false;
   if((brake?elapsed+1e-10>=delay:keys.right)&&firstInput===null)firstInput=elapsed*1000;
   const step=elapsed<delay-1e-10?Math.min(dt,delay-elapsed):dt;
   update(step);elapsed+=step;
   if(!brake&&hurtbox().x>=(level===2?rt.mind.memoryBeam.x+rt.mind.memoryBeam.w:level===4?rt.mind.uiBlock.x+rt.mind.uiBlock.w:sceneStart()+h+104)){clear=true;break}
   if(brake&&elapsed>=2&&!dead&&player.onGround&&(hurtbox().x+hurtbox().w<(level===2?rt.mind.memoryBeam.x:rt.mind.uiBlock.x)||hurtbox().x>(level===2?rt.mind.memoryBeam.x+rt.mind.memoryBeam.w:rt.mind.uiBlock.x+rt.mind.uiBlock.w))){clear=true;break}
   if(upgradePending||characterSelectOpen||livesPending||adPending)return{status:'FAIL-UNMEASURED',reason:'Modal interrupted escape'};
  }
  return{status:clear&&!dead?'SAFE':'UNSAFE',dead,clear,warningMs,firstInput,x:player.x-sceneStart(),y:player.y,cause:dead?deathToast:null};
 };
`);
const cases=JSON.parse(probe(`JSON.stringify((()=>{const out=[],family=new Set(['signDrop','ceiling','jumpBait','crateRain','checkpointBetrayal','finale']);for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++)if(p<=activePartCount(l)||family.has(sceneFor(l).trap))out.push({level:l,part:p,active:p<=activePartCount(l)});return out})())`.replace('sceneFor(l).trap','SCENES[l-1].trap')));
function trial(c,d,u,ms,hz,mode){return JSON.parse(probe(`JSON.stringify(windowTrial(${c.level},${c.part},${d},${u},${ms},${hz},${JSON.stringify(mode)}))`))}
const rows=[];
let stopped=false;
outer:for(const c of cases)for(const deaths of (full?[0,2,4]:[0,4]))for(const upgrade of (full?[0,1,2,3]:[0]))for(const hz of (full?[30,60,120]:[120]))for(const mode of (full?['normal','cancel','pad']:['normal'])){
 const row={...c,route:c.active?'AKTIF ROTA':'PASIF ROTA',deaths,upgrade,hz,mode};
 const first=trial(c,deaths,upgrade,0,hz,mode);
 if(first.status!=='SAFE'){rows.push({...row,status:first.status==='UNSAFE'?'FAIL-UNMEASURED':first.status,windowMs:null,reason:first.reason||'Immediate tested escape failed',sample:first});continue}
 let last=0,failed=null;
 for(let ms=25;ms<=1500;ms+=25){const r=trial(c,deaths,upgrade,ms,hz,mode);if(r.status!=='SAFE'){failed=ms;break}last=ms}
 if(failed===null){rows.push({...row,status:'PASS',windowMs:1500,lowerBound:true,firstUnsafeMs:null,warningMs:first.warningMs});continue}
 for(let ms=last+1;ms<failed;ms++){if(trial(c,deaths,upgrade,ms,hz,mode).status!=='SAFE'){failed=ms;break}last=ms}
 // Lower/upper bounds are runtime sampling resolution, never rounded into a PASS.
 const result={...row,status:last>=250?'PASS':'FAIL-WINDOW',windowMs:last,firstUnsafeMs:failed,warningMs:first.warningMs};rows.push(result);
 if(c.active&&last<250){stopped=true;break outer}
}
const measured=rows.filter(r=>r.windowMs!==null).sort((a,b)=>a.windowMs-b.windowMs);
const movement=require('./runtime-parkour.cjs').run(ref);
const report={ref,sourceHash,movement,scope:'62 active pairs + 24 passive overhead pairs',method:'overhead: delayed right input; mind: natural approach then delayed braking; pad: natural contact, landing and platform approach; 1 ms delay grid',full,requestedPairs:cases.length,coveredPairs:new Set(rows.map(r=>r.level+'.'+r.part)).size,stopped,activeFailures:rows.filter(r=>r.active&&r.status.startsWith('FAIL-')).length,passiveFailures:rows.filter(r=>!r.active&&r.status.startsWith('FAIL-')).length,debugFailures:movement.rows.filter(r=>r.status.startsWith('FAIL-')).length,worst:measured.filter(r=>r.active).slice(0,3),rows};
report.counts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(s=>[s,rows.filter(r=>r.status===s).length]));
report.movementCounts=Object.fromEntries([...new Set(movement.rows.map(r=>r.status))].map(s=>[s,movement.rows.filter(r=>r.status===s).length]));
console.log(JSON.stringify(report));
if(report.activeFailures||report.debugFailures||report.coveredPairs!==cases.length)process.exitCode=1;
