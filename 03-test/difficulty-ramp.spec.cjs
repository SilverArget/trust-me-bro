const { test, expect } = require('playwright/test');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const { load, source } = require('./phase3-verify.cjs');
const root = path.resolve(__dirname, '..');
let server, base;

// pauseGame stops RAF; manually stepped update must run unpaused (guard added in v56).
const harness = String.raw`
window.__difficultyRun=(level,part,deathCount)=>{if(!systemPaused)pauseGame('difficulty-test');__tmbSetProgress(level,part,0,0);partDeaths=deathCount;rt=makeRuntime();rt.enemies=[];rt.fish=[];rt.fans=[];rt.launchPads=[];rt.rage.patterns=[];spawnGrace=0;lives=10;const g=buildScene(level,part),trigger=sceneStart()+g.anchors.trap.trigger,hazard=sceneStart()+g.anchors.hazard,solids=solidSurfaces(g.surfaces),probeX=g.anchors.trap.trigger,candidates=solids.filter(s=>probeX+player.w>s.x&&probeX<s.x+s.w),support=candidates.sort((a,b)=>a.y-b.y)[0]||solids.filter(s=>s.x<=probeX).sort((a,b)=>b.x-a.x)[0];player.x=trigger+.01;player.y=(support?.y??GROUND)-player.h;player.vx=255;player.vy=0;player.onGround=true;keys.right=true;keys.jump=true;const startDeaths=deaths;let clear=false;const trace=[];systemPaused=false;for(let frame=0;frame<180;frame++){update(1/60);if(frame%30===0)trace.push({frame,x:player.x,y:player.y,vy:player.vy,onGround:player.onGround,systemPaused,upgradePending,characterSelectOpen,livesPending,adPending});if(hurtbox().x>=hazard+104){clear=true;keys.right=false;keys.jump=false;player.x=sceneStart()+66;player.y=GROUND-player.h;player.vx=player.vy=0;player.onGround=true}}systemPaused=true;keys.right=keys.jump=false;return{clear,dead,trace,extraDeaths:deaths-startDeaths,warning:warningDelay(.8,level,deathCount),patterns:ragePatterns(level,part,deathCount)}};
window.__difficultySample=()=>{for(let l=1;l<=31;l++)for(let p=1;p<=6;p++)if(JSON.stringify(ragePatterns(l,p,0))!==JSON.stringify(ragePatterns(l,p,2)))return{l,p}};
window.__difficultyReset=(level,part)=>{__tmbSetProgress(level,part,0,0);partDeaths=4;resetScene(true);partDeaths=0;resetScene(false);return partDeaths};
`;

test.beforeAll(async () => {
  server = http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html',file=path.join(root,rel);fs.readFile(file,(err,body)=>{res.statusCode=err?404:200;if(err)return res.end('missing');if(rel==='index.html')body=Buffer.from(body.toString().replace(/\}\)\(\);\s*<\/script><\/body><\/html>\s*$/,`${harness}\n})();\n</script></body></html>`));res.end(body)})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async()=>{if(server)await new Promise(resolve=>server.close(resolve))});

test('rage density, collision, scaling and death variants', async () => {
  const probe=load(source('WORKTREE'));
  const result=JSON.parse(probe(String.raw`JSON.stringify((()=>{const rows=[],collisions=[];for(let level=1;level<=SCENE_COUNT;level++)for(let part=1;part<=PART_COUNT;part++){const patterns=ragePatterns(level,part,0),ranges=patterns.map(name=>({name,range:ragePatternRange(name,level,part)}));for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++)if(ranges[i].range[1]>ranges[j].range[0]&&ranges[j].range[1]>ranges[i].range[0])collisions.push({level,part,a:ranges[i],b:ranges[j]});rows.push({level,part,count:patterns.length,expected:ragePatternCount(level),patterns})}const scales=Array.from({length:SCENE_COUNT},(_,i)=>warnScale(i+1)),sample=rows.find(r=>JSON.stringify(ragePatterns(r.level,r.part,0))!==JSON.stringify(ragePatterns(r.level,r.part,2)));return{rows,collisions,scales,sample,fallbacks:[...RAGE_FALLBACKS.keys()],minimum:Math.min(...Array.from({length:SCENE_COUNT},(_,i)=>warningDelay(.1,i+1,4)))}})())`));
  expect(result.rows).toHaveLength(186);
  expect(result.rows.every(r=>r.count===r.expected)).toBe(true);
  expect(result.collisions).toEqual([]);
  expect(result.fallbacks).toEqual([]);
  expect(result.scales.every((v,i,a)=>i===0||v<a[i-1])).toBe(true);
  expect(result.scales[0]).toBeCloseTo(1);expect(result.scales.at(-1)).toBeCloseTo(.7);
  expect(result.minimum).toBeGreaterThanOrEqual(.67);expect(result.sample).toBeTruthy();
});

test('death tiers remain escapable 5/5 and reset changes runtime', async ({page}) => {
  await page.goto(base);await page.waitForFunction(()=>window.__tmb?.platform.initialized);await page.locator('#characterSelect.show').waitFor();await page.locator('.characterChoice').first().click();await page.waitForFunction(()=>!__tmb.characterSelectOpen);
  const sample=await page.evaluate(()=>__difficultySample());
  const rows=await page.evaluate(()=>{const out=[];for(const level of [1,3,8,14,30,31])for(let part=1;part<=6;part++)for(const deaths of [0,2,4])for(let run=1;run<=5;run++)out.push({level,part,deaths,run,...__difficultyRun(level,part,deaths)});return out});
  expect(rows).toHaveLength(36*3*5);
  expect(rows.every(r=>r.clear&&!r.dead&&r.extraDeaths===0),JSON.stringify(rows.filter(r=>!r.clear||r.dead||r.extraDeaths!==0).slice(0,20))).toBe(true);
  expect(JSON.stringify(rows.find(r=>r.level===sample.l&&r.part===sample.p&&r.deaths===0).patterns)).not.toBe(JSON.stringify(rows.find(r=>r.level===sample.l&&r.part===sample.p&&r.deaths===2).patterns));
  expect(rows.filter(r=>r.deaths===4).every(r=>r.warning>=.67)).toBe(true);
  expect(await page.evaluate(({l,p})=>__difficultyReset(l,p),sample)).toBe(0);
});
