const { test, expect } = require('playwright/test');

test('diagnostic', async ({ page }) => {
  await page.goto('http://127.0.0.1:8765/index.html#debug');
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  const before=await page.evaluate(()=>__tmb.audio); await page.mouse.click(640,320); await page.waitForTimeout(500);
  const after=await page.evaluate(()=>__tmb.audio); await page.locator('#muteBtn').evaluate(e=>e.click()); const muted=await page.evaluate(()=>__tmb.audio); await page.locator('#muteBtn').evaluate(e=>e.click()); const unmuted=await page.evaluate(()=>__tmb.audio);
  const out={before,after,muted,unmuted}; expect(after.acState).toBe('running');expect(after.bgmStarted).toBe(true);expect(after.sourceConnected).toBe(true);expect(muted.outputMuted).toBe(true);expect(unmuted.outputMuted).toBe(false);
  console.log('DIAGNOSTIC '+JSON.stringify(out));
});

function solverRoute(scene) {
  const PW=32,VY0=560,G=1450,VX=255,nodes=scene.geometry.surfaces.filter(s=>s.solid!==false).slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  const can=(a,b)=>{const rise=a.y-b.y,disc=VY0*VY0-2*G*rise;if(disc<0)return false;const flight=(VY0+Math.sqrt(disc))/G,physical=VX*flight,gap=Math.max(0,b.x-(a.x+a.w)-PW),cap=rise>35?120:rise<-5?200:(a.beat===3?175:150);return gap<=Math.min(cap,physical)};
  const edges=nodes.map(()=>[]);for(let i=0;i<nodes.length;i++)for(let j=0;j<nodes.length;j++)if(i!==j&&nodes[j].x>=nodes[i].x&&can(nodes[i],nodes[j]))edges[i].push(j);
  const overlap=(n,x,w=32)=>x+w>n.x&&x<n.x+n.w,start=nodes.findIndex(n=>overlap(n,66)&&Math.abs(n.y-455)<2),coinBottom=scene.coin.y+scene.coin.h,coin=nodes.findIndex(n=>overlap(n,scene.coin.x,scene.coin.w)&&n.y>=coinBottom&&n.y-coinBottom<=12),dock=nodes.findIndex(n=>2200>n.x&&2160<n.x+n.w&&n.y>=455);
  const path=(from,to)=>{const q=[from],seen=new Set(q),prev=new Map;while(q.length){const u=q.shift();if(u===to){const p=[];for(let x=u;x!==undefined;x=prev.get(x))p.unshift(x);return p}for(const v of edges[u])if(!seen.has(v)){seen.add(v);prev.set(v,u);q.push(v)}}throw Error(`no solver path ${from}->${to}`)};
  return [...path(start,coin),...path(coin,dock).slice(1)].map(i=>nodes[i]);
}

async function bootPart3(page){await page.goto('http://127.0.0.1:8765/index.html#debug');await page.waitForFunction(()=>window.__tmb?.platform.initialized);if(await page.locator('#characterSelect').evaluate(e=>e.classList.contains('show'))){await page.locator('.characterChoice').first().click();await page.waitForFunction(()=>!__tmb.characterSelectOpen)}await page.evaluate(()=>__tmbSetProgress(1,3,3,9))}

test('part 3 solver route 5/5', async ({ page }) => {
  test.setTimeout(150000);const runs=[];
  for(let run=1;run<=5;run++){
    await bootPart3(page);const scene=await page.evaluate(()=>__tmb.debugScene),route=solverRoute(scene),deaths0=await page.evaluate(()=>__tmb.deaths);let leg=0,jumps=0,maxX=0,lastDeath=null;const deadline=Date.now()+24000;
    while(Date.now()<deadline){const s=await page.evaluate(()=>({part:__tmb.currentPart,dead:__tmb.dead,player:__tmb.player,death:__tmb.debugDeath}));maxX=Math.max(maxX,s.player.x);if(s.part===4)break;if(s.dead){lastDeath=s.death;break}const bottom=s.player.y+s.player.h;while(leg<route.length-1&&Math.abs(bottom-route[leg+1].y)<2&&s.player.x+s.player.w>route[leg+1].x&&s.player.x<route[leg+1].x+route[leg+1].w)leg++;const a=route[leg],b=route[Math.min(leg+1,route.length-1)],target=b.x+Math.min(b.w-20,Math.max(20,b.w*.5)),takeoff=Math.max(a.x+8,Math.min(a.x+a.w-36,target-150));if(!s.player.onGround){if(s.player.x+s.player.w/2>target+12){await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft')}else{await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight')}}else{await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');if(leg<route.length-1&&s.player.x>=takeoff){await page.keyboard.press('Space');jumps++}}await page.waitForTimeout(16)}
    await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');const end=await page.evaluate(()=>({part:__tmb.currentPart,deaths:__tmb.deaths,x:__tmb.player.x}));runs.push({run,...end,extraDeaths:end.deaths-deaths0,jumps,maxX,leg,route:route.map(s=>({x:s.x,y:s.y,w:s.w,kind:s.kind})),lastDeath});
  }
  console.log('PART3_5X '+JSON.stringify(runs));expect(runs.every(r=>r.part===4&&r.extraDeaths===0)).toBe(true);
});

test('L2 P4 reported trap identity', async ({ page }) => {
  await bootPart3(page);
  await page.evaluate(()=>__tmbSetProgress(2,4,0,0));
  await page.waitForTimeout(1200);
  await page.keyboard.press('k');
  const state=await page.evaluate(()=>({level:__tmb.currentLevel,part:__tmb.currentPart,death:__tmb.debugDeath,scene:__tmb.debugScene}));
  console.log('L2P4_IDENTITY '+JSON.stringify(state));
  expect(state.death.trap).toBe('crumble');
});
