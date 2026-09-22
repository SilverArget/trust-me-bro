// Real game update(), no copied warning curve and no synthetic safe window.
// Passive violations stay visible. Reassess before opening part 3+.
// Usage: node 03-test/runtime-window.cjs [HEAD|WORKTREE] [--quick]
const {load,source}=require('./phase3-verify.cjs');
const ref=process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:'WORKTREE';
const probe=load(source(ref));
const full=!process.argv.includes('--quick');
probe(String.raw`
 globalThis.windowTrial=function(level,part,deathTier,upgrade,delayMs,hz,mode){
  currentLevel=level;currentPart=part;partDeaths=deathTier;speedLevel=upgrade&1;jumpLevel=upgrade>>1;
  dead=won=upgradePending=characterSelectOpen=livesPending=adPending=false;resetScene();spawnGrace=0;
  const g=buildScene(level,part),t=g.anchors.trap.trigger,h=g.anchors.hazard;
  const support=solidSurfaces(g.surfaces).filter(s=>t+player.w>s.x&&t<s.x+s.w).sort((a,b)=>a.y-b.y)[0];
  if(!support)return {status:'UNMEASURABLE',reason:'No support at trigger'};
  player.x=sceneStart()+t+.01;player.y=support.y-player.h;player.vx=player.vy=0;player.onGround=true;
  keys.right=keys.left=keys.jump=false;
  if(mode==='cancel'&&typeof parkourCancel==='function')parkourCancel();
  if(mode==='pad'){
   const pad=rt.launchPads.find(p=>p.box.x<sceneStart()+t);
   if(!pad)return{status:'UNMEASURABLE',reason:'No launch pad before warning on this route'};
   player.x=pad.box.x;player.y=pad.box.y-player.h;player.onGround=true;updateLaunchPads(0);
   if(!pad.used)return{status:'UNMEASURABLE',reason:'Pad did not activate by contact'};
   keys.right=true;for(let i=0;i<600&&!dead&&!rt.armed;i++)update(1/240);
   keys.right=false;if(dead||!rt.armed)return{status:'UNMEASURABLE',reason:'Pad path did not reach warning alive',pad:pad.id};
  }else updateTrap(0);
  // This adapter requires an actual overhead warning and falling body.
  // Early-sector mind traps and other families require their own escape objectives.
  if(!rt.armed||!['signDrop','ceiling','jumpBait','crateRain','checkpointBetrayal','finale'].includes(scene().trap))return{status:'UNMEASURABLE',reason:'No overhead warning event; analytic top-block proxy is not runtime evidence'};
  const warningMs=rt.warning*1000,dt=Math.min(.033,1/hz),delay=delayMs/1000;
  let elapsed=0,clear=false,firstInput=null;
  while(elapsed<4&&!dead){
   keys.right=elapsed+1e-10>=delay;
   if(keys.right&&firstInput===null)firstInput=elapsed*1000;
   const step=elapsed<delay-1e-10?Math.min(dt,delay-elapsed):dt;
   update(step);elapsed+=step;
   if(hurtbox().x>=sceneStart()+h+104){clear=true;break}
   if(upgradePending||characterSelectOpen||livesPending||adPending)return{status:'UNMEASURABLE',reason:'Modal interrupted escape'};
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
 if(first.status!=='SAFE'){rows.push({...row,status:'FAIL',windowMs:null,reason:first.reason||'Immediate tested escape failed',sample:first});continue}
 let last=0,failed=null;
 for(let ms=25;ms<=1500;ms+=25){const r=trial(c,deaths,upgrade,ms,hz,mode);if(r.status!=='SAFE'){failed=ms;break}last=ms}
 if(failed===null){rows.push({...row,status:'UNMEASURABLE',windowMs:null,reason:'No unsafe boundary within 1500 ms; no finite window claimed'});continue}
 for(let ms=last+1;ms<failed;ms++){if(trial(c,deaths,upgrade,ms,hz,mode).status!=='SAFE'){failed=ms;break}last=ms}
 // Lower/upper bounds are runtime sampling resolution, never rounded into a PASS.
 const result={...row,status:last>=250?'PASS':'FAIL',windowMs:last,firstUnsafeMs:failed,warningMs:first.warningMs};rows.push(result);
 if(c.active&&last<250){stopped=true;break outer}
}
const measured=rows.filter(r=>r.windowMs!==null).sort((a,b)=>a.windowMs-b.windowMs);
const report={ref,scope:'62 active pairs + 24 passive overhead pairs',method:'stationary at warning, delayed right input, first unsafe boundary; 1 ms delay grid',full,requestedPairs:cases.length,coveredPairs:new Set(rows.map(r=>r.level+'.'+r.part)).size,stopped,activeFailures:rows.filter(r=>r.active&&r.status!=='PASS').length,passiveFailures:rows.filter(r=>!r.active&&r.status!=='PASS').length,debugFailures:2,unmeasuredDebugModes:['vault/slide/wall-run: no production tags; fixture has no trap warning','roll/stun: isolated fixture has no trap warning'],worst:measured.slice(0,3),rows};
console.log(JSON.stringify(report));
if(report.activeFailures||report.debugFailures||report.coveredPairs!==cases.length)process.exitCode=1;
