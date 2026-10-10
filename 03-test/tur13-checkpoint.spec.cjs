const {test,expect}=require('playwright/test');
const fs=require('fs'),Module=require('module'),path=require('path');
const sourceFile=path.join(__dirname,'vp-dock-play.spec.cjs');
let source=fs.readFileSync(sourceFile,'utf8');
source=source.slice(0,source.indexOf('\nfor (const id of routeIds) test('));
source=source.replace('const transitions = Object.fromEntries', "for(const id of ['D01','D02','D03','D04','D05','D06'])delete dataRoots[id];\nconst transitions = Object.fromEntries");
source=source.replace(
  'async function drive(page, id, {touch=false, stopAfter, omitDives=[], omitTransitions=[]} = {}) {',
  'async function drive(page, id, {touch=false, stopAfter, omitDives=[], omitTransitions=[], omitOnce=[], allowDeath=false} = {}) {'
);
source=source.replaceAll('omitTransitions.includes(t.i)', '(omitTransitions.includes(t.i)||(deaths===0&&omitOnce.includes(t.i)))');
source=source.replace('    if (deaths) {','    if (deaths && !allowDeath) {');
source=source.replace(
  '  let diveSeen = false, catchSeen = false, deaths = 0, retries = 0, end, stuckSince = null,',
  '  let diveSeen = false, catchSeen = false, deaths = 0, retries = 0, end, stuckSince = null, tur13FirstDeathAt=null, tur13RespawnX=null, tur13NextShot=null, tur13Shots=0,'
);
source=source.replace(
  '    end = s; deaths = Math.max(deaths, s.deaths || 0);',
  `    end = s; deaths = Math.max(deaths, s.deaths || 0);
    if(s.deaths>0&&tur13FirstDeathAt===null){tur13FirstDeathAt=s.gameClock;tur13RespawnX=s.checkpointRespawn?.x??null}
    if(process.env.TUR13_EVIDENCE_DIR&&omitOnce.length&&s.checkpointX===Number(process.env.TUR13_CHECKPOINT_X)){
      if(tur13NextShot===null)tur13NextShot=s.gameClock;
      if(s.gameClock>=tur13NextShot&&(tur13FirstDeathAt===null||s.gameClock<=tur13FirstDeathAt+2.001)){
        fs.mkdirSync(process.env.TUR13_EVIDENCE_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.TUR13_EVIDENCE_DIR,String(tur13Shots++).padStart(3,'0')+'.png')});
        tur13NextShot+=.125;
      }
    }`
);
source=source.replace('return {end, deaths, retries, elapsed:','return {end, deaths, retries, tur13Shots, tur13RespawnX, elapsed:');
source+='\nmodule.exports={boot,drive,transitions};\n';
const driver=new Module(sourceFile,module);driver.filename=sourceFile;driver.paths=module.paths;driver._compile(source,sourceFile);
const {boot,drive}=driver.exports;

const evidenceRoot=path.join(__dirname,'manager-preview','tur13');
const targets={A02:[20,5601.6],A04:[24,2256.88],A05:[12,1847.31],A06:[12,1847.31],D16:[20,5601.6],F04:[18,1755.8],F06:[11,2136],M05:[12,1847.31],M06:[12,1847.31]};
const view=process.env.TUR13_VIEW||'desktop';

test('36 routes x all checkpoints stand on drawn solid ground',async({page})=>{
  await boot(page,'D01',{width:915,height:412});await page.keyboard.up('ArrowRight');
  const audit=await page.evaluate(()=>{const ids=[];for(const p of ['D','F','M','A'])for(let i=1;i<=(p==='D'?18:6);i++)ids.push(`${p}${String(i).padStart(2,'0')}`);return ids.flatMap(id=>{const r=__TMB_A12__.routeDefinition(id);return r.checkpoints.map(x=>({id,x,ok:r.groundSegments.some(s=>s.kind==='ground'&&s.solid!==false&&x>=s.x&&x<=s.x+s.w)}))})});
  expect(audit).toHaveLength(134);expect(audit.filter(x=>!x.ok)).toEqual([]);
  for(const [id,[,x]] of Object.entries(targets))expect(audit.find(v=>v.id===id&&v.x===x)?.ok).toBe(true);
});

for(const [id,[omit,checkpointX]] of Object.entries(targets))test(`${id} intentional miss respawns once and finishes`,async({page})=>{
  test.setTimeout(140000);await boot(page,id,{width:915,height:412});
  process.env.TUR13_CHECKPOINT_X=String(checkpointX);process.env.TUR13_EVIDENCE_DIR=path.join(evidenceRoot,id,view);fs.rmSync(process.env.TUR13_EVIDENCE_DIR,{recursive:true,force:true});
  const r=await drive(page,id,{omitOnce:[omit],allowDeath:true});
  delete process.env.TUR13_EVIDENCE_DIR;delete process.env.TUR13_CHECKPOINT_X;
  const pass=!!r.end.result||r.end.player.x+r.end.hitbox.w>=r.end.route.finishX;
  console.log(`TUR13 ${id} ${view} finish=${pass} deaths=${r.deaths} retries=${r.retries} frames=${r.tur13Shots} seconds=${r.elapsed.toFixed(2)}`);
  expect(pass).toBeTruthy();expect(r.deaths).toBe(1);expect(r.retries).toBe(1);expect(r.tur13Shots).toBeGreaterThanOrEqual(13);expect(r.tur13RespawnX).toBe(checkpointX);
});

for(const id of ['F01','M01'])test(`${id} ideal control finishes clean`,async({page})=>{
  test.setTimeout(130000);await boot(page,id,{width:915,height:412});const r=await drive(page,id);const pass=!!r.end.result||r.end.player.x+r.end.hitbox.w>=r.end.route.finishX;
  console.log(`TUR13 CONTROL ${id} ${view} finish=${pass} deaths=${r.deaths} seconds=${r.elapsed.toFixed(2)}`);expect(pass).toBeTruthy();expect(r.deaths).toBe(0);
});
