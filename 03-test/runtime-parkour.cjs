// Real production route replays. Delays start on the actual warning transition.
const fs=require('node:fs'),path=require('node:path');
const {load,source}=require('./phase3-verify.cjs');
function run(ref='WORKTREE'){
 const p=load(source(ref));
 if(!p("typeof parkourLayout==='function'"))return{rows:[],stopped:false,reason:'No production parkour layer in this revision'};
 let bot=fs.readFileSync(path.join(__dirname,'parkour-bot.spec.cjs'),'utf8').match(/const bot=String.raw`([\s\S]*?)`;/)[1];
 bot=bot.replace('move=rt.parkourLayer.move;', "move=globalThis.windowMode==='stun'?'stun':rt.parkourLayer.move;")
  .replace('s.parkour===move)', "s.parkour===(move==='stun'?rt.parkourLayer.move:move))");
 bot=bot.replaceAll('won||currentLevel!==level||currentPart!==part', "won||currentLevel!==level||currentPart!==part||(globalThis.windowPlanning&&(rt.armed||rt.mind.stage===1))");
 p(bot);
 p(String.raw`
  globalThis.windowMode='correct';
  const routeUpdate=update;
  let routeProbe=null;
  update=function(dt){
   const test=routeProbe;if(test?.done)return;
   const layer=rt.parkourLayer;
   if(globalThis.windowMode==='stun'&&!rt._stunSeen){
    if(layer?.move==='roll'&&!player.onGround)keys.jump=false;
    if(layer?.move==='slide'){const beam=layer.rects.find(s=>s.parkour==='slide');if(player.x>=sceneStart()+beam.x-90)keys.jump=false;}
   }
   const heldRight=keys.right,heldLeft=keys.left;routeUpdate(dt);
   if(parkour.state==='stun')rt._stunSeen=true;
   if(globalThis.windowMode==='cancel'&&!rt._cancelSeen&&['vault','slide','roll','wallRun'].includes(parkour.state)){rt._cancelSeen=parkourCancel();}
   if(!test)return;
   test.elapsed+=dt;
   if(dead){test.done=true;test.safe=false;test.reason=rt.chief?.caught?'Chief catch (not death)':lastDebugDeath?.msg||deathToast;return;}
   const mind=test.level===2||test.level===4;
   const clear=()=>hurtbox().x>sceneStart()+rt.a.hazard+(test.level===2?138:test.level===4?122:104);
   if(!test.warned&&(mind?rt.mind.stage===1:rt.armed)){
    test.warned=true;test.warningMs=(mind?rt.mind.timer:rt.warning)*1000;test.warningAt=test.elapsed;
    test.cancelSeen=!!rt._cancelSeen;test.stunSeen=!!rt._stunSeen;
    const brake=test.policy%3===0,dir=test.policy%3===2?-1:1,jumpMode=Math.floor(test.policy/3),delay=test.delay/1000;
    let waited=0,safe=false;keys.jump=false;
    while(waited<4&&!dead){
     keys.right=waited<delay?heldRight:!brake&&dir>0;keys.left=waited<delay?heldLeft:!brake&&dir<0;keys.jump=false;if(waited>=delay&&jumpMode){const foot=solidRects().find(s=>Math.abs(s.y-player.y-player.h)<2&&player.x+player.w>s.x&&player.x<s.x+s.w);if(!test.pressed&&(jumpMode===1||player.onGround&&(jumpMode===2||foot&&(dir>0?foot.x+foot.w-player.x-player.w:player.x-foot.x)<50))){keys.jump=true;test.pressed=true;}else if(!player.onGround)test.pressed=false;}
     const step=waited<delay?Math.min(1/60,delay-waited):1/60;
     routeUpdate(step);waited+=step;
     const body=hurtbox(),obstacle=mind?(test.level===2?rt.mind.memoryBeam:rt.mind.uiBlock):null;
     if(!brake&&clear()){safe=true;break;}
     // S4 ends when its falling block is spent, not after an unrelated fixed two-second idle.
     if(mind&&(test.level===4?rt.mind.stage===3:waited>=2)&&player.onGround&&(body.x+body.w<obstacle.x||body.x>obstacle.x+obstacle.w)){safe=true;break;}
    }
    test.done=true;test.safe=safe&&!dead;if(!test.safe)test.reason=dead?(rt.chief?.caught?'Chief catch (not death)':lastDebugDeath?.msg||deathToast):'Delayed escape did not clear hazard';return;
   }
   if(test.warned&&clear()){test.done=true;test.safe=true;}
  };
  globalThis.routeTrial=(row,mode,delay,policy=0)=>{
   windowMode=mode;location.hash='#debug';routeProbe={level:row.level,part:row.part,delay,policy,elapsed:0,warned:false,done:false,safe:false};
   parkourBot(row.level,row.part,60,false,48,row.plan);
   const result={...routeProbe,deaths,catches:chiefCatches,chiefGap:player.x-rt.chief.x};routeProbe=null;
   if(!result.warned)result.reason=result.reason||'Route did not reach its timed warning';
   if(mode==='cancel'&&!result.cancelSeen){result.safe=false;result.reason='Cancellation not observed before warning';}
   if(mode==='stun'&&!result.stunSeen){result.safe=false;result.reason='Stun not observed before warning';}
   return result;
  };
  globalThis.planVariant=(row,mode,width)=>{routeProbe=null;windowMode=mode;globalThis.windowPlanning=true;const result=parkourBot(row.level,row.part,60,false,width);globalThis.windowPlanning=false;return result;};
 `);
 const plans=JSON.parse(fs.readFileSync(path.join(__dirname,'parkour-plans.json'),'utf8'));
 const variantsFile=path.join(__dirname,'parkour-window-plans.json');
 const variants=fs.existsSync(variantsFile)?JSON.parse(fs.readFileSync(variantsFile,'utf8')):[];
 const rows=[];
 const trial=(row,mode,delay)=>{let result;for(let policy=0;policy<12;policy++){result=JSON.parse(p(`JSON.stringify(routeTrial(${JSON.stringify(row)},${JSON.stringify(mode)},${delay},${policy}))`));if(result.safe)return result;if(!result.warned)break;}return result;};
 for(const base of plans)for(const mode of ['correct','cancel','stun']){
  const info=JSON.parse(p(`JSON.stringify({trap:SCENES[${base.level-1}].trap,move:parkourLayout(${base.level},${base.part}).move})`));
  process.stderr.write('window '+base.level+'.'+base.part+' '+mode+'\n');const row={level:base.level,part:base.part,mode,active:true};
  if(!['signDrop','ceiling','jumpBait','crateRain','checkpointBetrayal','finale'].includes(info.trap)){rows.push({...row,status:'N/A',reason:'No timed overhead/memory trap in this scene'});continue;}
  if(mode==='stun'&&!['roll','slide'].includes(info.move)){rows.push({...row,status:'N/A',reason:'This movement has no stun penalty'});continue;}
  let plan=variants.find(r=>r.level===base.level&&r.part===base.part&&r.mode===mode)||base;
  let first=trial(plan,mode,0);
  if(!first.safe){
   for(const width of [48,160,320]){const result=JSON.parse(p(`JSON.stringify(planVariant(${JSON.stringify(base)},${JSON.stringify(mode)},${width}))`));if(result.clear&&!result.dead&&result.plan){plan={level:base.level,part:base.part,mode,plan:result.plan};first=trial(plan,mode,0);if(first.safe){variants.push(plan);if(process.env.TMB_RECORD_WINDOW_PLANS)fs.writeFileSync(variantsFile,JSON.stringify(variants));break;}}}
  }
  if(!first.safe){rows.push({...row,status:'FAIL-UNMEASURED',windowMs:null,sample:first});continue;}
  let last=0,failed=null;
  for(let delay=25;delay<=1500;delay+=25){if(!trial(plan,mode,delay).safe){failed=delay;break;}last=delay;}
  if(failed!==null)for(let delay=last+1;delay<failed;delay++){if(!trial(plan,mode,delay).safe){failed=delay;break;}last=delay;}
  rows.push({...row,status:last>=250?'PASS':'FAIL-WINDOW',windowMs:last,firstUnsafeMs:failed,lowerBound:failed===null,warningMs:first.warningMs});
  if(last<250)return{rows,stopped:true};
 }
 return{rows,stopped:false};
}
module.exports={run};
if(require.main===module){const report=run(process.argv[2]||'WORKTREE');report.counts=Object.fromEntries([...new Set(report.rows.map(r=>r.status))].map(s=>[s,report.rows.filter(r=>r.status===s).length]));console.log(JSON.stringify(report));if(report.rows.some(r=>r.status.startsWith('FAIL-')))process.exitCode=1;}
