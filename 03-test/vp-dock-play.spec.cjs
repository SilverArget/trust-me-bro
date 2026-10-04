const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

// KABUL TARIFI: 60 Hz gercek zamanli gercek girdi. normal A.x1-[25,2], dive merkez +-15,
// tutunma B.x0-[58,2], vault x-[55,18], slide gap [2,36]. O-4 esikleri 0.8 s ve 1.0 s,
// M-1 viewportlari 390x844 / 844x390; esikler ilk kosumdan once sabittir.
const root = path.join(__dirname, '..');
const dataRoots = {D01:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02',D02:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02',D03:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d03d04',D04:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d03d04',D05:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06',D06:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06',F01:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f01f02',F02:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f01f02',F03:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f03f04',F04:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/frozen-f03f04',M01:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m01m02',M02:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m01m02',M03:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m03m04',M04:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/magma-m03m04',A01:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/aftermath-a01a02',A02:'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/aftermath-a01a02'};
for(let n=7;n<=18;n++)dataRoots[`D${String(n).padStart(2,'0')}`]=path.join(__dirname,'dock18-generated');
const transitions = Object.fromEntries(Object.keys(dataRoots).map(id => [id, JSON.parse(fs.readFileSync(`${dataRoots[id]}/transitions-${id}.json`, 'utf8'))]));
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page, id, viewport = {width:1280,height:720}) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
  await page.evaluate(async id => {
    if(id[0]==='F'){
      await __TMB_A12__.setWallet(500); await __TMB_A12__.purchaseWorld('frozen');
      __TMB_A12__.renderWorldOnRoute('frozen','F01');
      if(['F02','F03','F04'].includes(id)){ __TMB_A12__.startRoute('F01'); __TMB_A12__.finish(); }
      if(['F03','F04'].includes(id)){ __TMB_A12__.startRoute('F02'); __TMB_A12__.finish(); }
      if(id==='F04'){ __TMB_A12__.startRoute('F03'); __TMB_A12__.finish(); }
    } else if(id[0]==='M'){
      await __TMB_A12__.setWallet(1000); await __TMB_A12__.purchaseWorld('magma'); await __TMB_A12__.purchaseWorld('magma');
      __TMB_A12__.renderWorldOnRoute('magma','M01');
      for(const prior of ['M01','M02','M03'].slice(0,['M01','M02','M03','M04'].indexOf(id))){ __TMB_A12__.startRoute(prior); __TMB_A12__.finish(); }
    } else if(id[0]==='A'){
      await __TMB_A12__.setWallet(1000); await __TMB_A12__.purchaseWorld('aftermath'); await __TMB_A12__.purchaseWorld('aftermath');
      __TMB_A12__.renderWorldOnRoute('aftermath','A01');
      if(id==='A02'){ __TMB_A12__.startRoute('A01'); __TMB_A12__.finish(); }
    } else __TMB_A12__.renderWorldOnRoute('dock31',id);
    __TMB_A12__.startRoute(id);
  }, id);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
  expect((await page.evaluate(() => __TMB_A12__.getState())).route.id).toBe(id);
  await page.keyboard.down('ArrowRight');
}

async function jump(page, touch) {
  if (touch) {
    const button = page.locator('#jumpWrap button');
    const box = await button.boundingBox();
    expect(box).toBeTruthy();
    await button.dispatchEvent('pointerdown', {pointerType:'touch', isPrimary:true, button:0, buttons:1});
    await page.waitForTimeout(45);
    await button.dispatchEvent('pointerup', {pointerType:'touch', isPrimary:true, button:0, buttons:0});
  } else {
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(45); await page.keyboard.up('ArrowUp');
  }
}

async function drive(page, id, {touch=false, stopAfter, omitDives=[]} = {}) {
  const fired = new Set(), pending = new Map(), lastPress = new Map(), trace = [], tr = transitions[id], started = Date.now();
  const d05d06 = ['D05','D06','F01','F02','F03','F04','M01','M02','M03','M04','A01','A02'].includes(id)||/^D(0[7-9]|1\d)$/.test(id);
  let diveSeen = false, catchSeen = false, deaths = 0, retries = 0, end, stuckSince = null, c07Y = null, previousSample = null, lastGroundAt = -Infinity, chainClimbSeconds = 0;
  while (Date.now() - started < 115000) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    end = s; deaths = Math.max(deaths, s.deaths || 0);
    const p = s.player, right = p.x + s.hitbox.w, center = p.x + s.hitbox.w / 2;
    const centerY = p.y + s.hitbox.h / 2;
    if (p.onGround) lastGroundAt = s.gameClock;
    const coyote = p.onGround || s.gameClock - lastGroundAt <= .12;
    if (previousSample && ['catch','climb'].includes(previousSample.parkour) && previousSample.playerX >= 6500) chainClimbSeconds += Math.max(0,s.gameClock-previousSample.clock);
    if (previousSample && previousSample.playerX - p.x > 150) {
      retries++;
      trace.push(`[DBG-B2] ${s.gameClock.toFixed(2)} retry player=${previousSample.playerX.toFixed(2)} chief=${previousSample.chiefX?.toFixed(2) ?? 'n/a'} chainClimb=${chainClimbSeconds.toFixed(2)}s`);
      if (/^F0[1-4]$/.test(id)||/^M0[34]$/.test(id)) {
        const checkpointX = p.x;
        for (const key of [...fired]) {
          const ti = /^(?:normal|dive|tutunma)-(\d+)$/.exec(key);
          const oi = /^(?:vault|slide)-(.+)$/.exec(key);
          const x = ti ? (tr.find(t => t.i === Number(ti[1]))?.B.x0 ?? -Infinity)
            : oi ? (s.route.obstacles.find(o => o.id === oi[1])?.x ?? -Infinity) : -Infinity;
          if (x > checkpointX) fired.delete(key);
        }
        for (const [key,q] of [...pending]) {
          const ti = /^(?:normal|dive|tutunma)-(\d+)$/.exec(key);
          const oi = /^(?:vault|slide)-(.+)$/.exec(key);
          const x = ti ? (tr.find(t => t.i === Number(ti[1]))?.B.x0 ?? -Infinity)
            : oi ? (s.route.obstacles.find(o => o.id === oi[1])?.x ?? -Infinity) : -Infinity;
          if (x > checkpointX) { pending.delete(key); lastPress.delete(key); }
        }
      }
      await page.keyboard.up('ArrowRight'); await page.waitForTimeout(60); await page.keyboard.down('ArrowRight');
      if (/^F0[1-4]$/.test(id)||/^M0[34]$/.test(id)) await jump(page, touch);
    }
    if (id === 'D01' && c07Y === null && previousSample && previousSample.x <= 1267.6 && center >= 1267.6) {
      const ratio = (1267.6 - previousSample.x) / (center - previousSample.x);
      c07Y = previousSample.y + (centerY - previousSample.y) * ratio;
      trace.push(`[DBG-B2] ${s.gameClock.toFixed(2)} 1267.60 ${s.parkour.state} c07-center-y ${c07Y.toFixed(2)}`);
    }
    if (previousSample?.parkour === 'slide' && s.parkour.state === 'normal') trace.push(`[SLIDE-EXIT] ${id} center=${center.toFixed(2)} player=${p.x.toFixed(2)}`);
    previousSample = {x:center, y:centerY, playerX:p.x,chiefX:s.chief?.x,parkour:s.parkour.state,clock:s.gameClock};
    for (const [key, q] of pending) {
      const happened = q.mech === 'dive' ? (!!s.diveRun || s.parkour.state === 'dive')
        : q.mech === 'tutunma' ? (s.parkour.state === 'catch' || s.parkour.state === 'climb')
        : q.mech === 'slide' ? s.parkour.state === 'slide'
        : q.mech === 'vault' ? (s.parkour.state === 'vault' || (q.wasOnGround && !p.onGround))
        : q.wasOnGround && !p.onGround;
      if (happened) { fired.add(key); pending.delete(key); }
      else if (s.gameClock - q.at >= .6) pending.delete(key);
    }
    diveSeen ||= !!s.diveRun || s.parkour.state === 'dive';
    catchSeen ||= s.parkour.state === 'catch' || s.parkour.state === 'climb';
    if (stopAfter && stopAfter({s, diveSeen, catchSeen})) break;
    if (s.result || right >= s.route.finishX) break;
    if (deaths) {
      trace.push(`[DBG-B2] ${s.gameClock.toFixed(2)} ${p.x.toFixed(2)} ${s.parkour.state} fail death`);
      throw new Error(`${id} death before finish\n${trace.slice(-15).join('\n')}`);
    }
    let target = null;
    for (const t of d05d06 ? tr : []) {
      const fallbackCatch = (/^F0[1-4]$/.test(id) && -t.D > 52 && t.gap <= 96)
        || (/^M0[12]$/.test(id) && -t.D > 0 && -t.D <= 100 && t.gap <= 96)
        || (/^M0[34]$/.test(id) && -t.D > 52 && t.gap <= 96);
      if (t.mech !== 'tutunma' && !fallbackCatch) continue;
      const key = `${t.mech}-${t.i}`;
      const braced = p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0;
      if (braced && !pending.has(key) && (!lastPress.has(key) || s.gameClock-lastPress.get(key)>=.1)) { target=[key,{...t,mech:'tutunma'}]; break; }
    }
    if (!target) for (const t of tr) {
      const key = `${t.mech}-${t.i}`;
      if (fired.has(key)) continue;
      const normalLead = /^F0[1-4]$/.test(id) ? 12 : 25;
      if (t.mech === 'normal' && !pending.has(key) && coyote && right >= t.A.x1 - normalLead && right <= t.A.x1 - 2) target = [key, t];
      const d03d04 = id === 'D03' || id === 'D04';
      if (t.mech === 'dive' && !omitDives.includes(t.i) && (id[0]==='A'?p.onGround:(d03d04 || d05d06 ? !s.edgeClimb : p.onGround)) && center >= t.x1 + (id==='D06'?0:4) && center <= t.x2 - (id==='D06'?0:4) && (!lastPress.has(key) || s.gameClock-lastPress.get(key)>=(id[0]==='A'?.3:(d03d04 || d05d06)?.1:.2))) target=[key,t];
      const d03LowStep = t.mech === 'tutunma' && id === 'D03' && t.B.id === 'd03-v-16';
      const d05LowStep = t.mech === 'tutunma' && id === 'D05' && ['d05-v-15','d05-v-20','d05-v-21','d05-v-22'].includes(t.B.id);
      const lowStep = d03LowStep || d05LowStep;
      if (d03LowStep && !pending.has(key) && right >= t.B.x0 - 125 && right <= t.B.x0 - 105) target = [key, {...t,mech:'normal',neutralJump:true}];
      if (d05LowStep && !pending.has(key) && right >= t.B.x0 - 85 && right <= t.B.x0 - 60) target = [key, {...t,mech:'normal'}];
      const catchWindow = right >= t.B.x0 - 58 && right <= t.B.x0 + 4;
      const braced = d05d06
        ? p.onGround && !s.edgeClimb && s.parkour.state !== 'climb' && right >= t.B.x0 - 8 && right <= t.B.x0
        : p.onGround && p.vx <= 1 && right >= t.B.x0 - 4 && right <= t.B.x0 + 4;
      if (t.mech === 'tutunma' && !lowStep && !pending.has(key) && (catchWindow || braced) && (!lastPress.has(key) || s.gameClock-lastPress.get(key)>=.1)) target = [key, t];
      if (target) break;
    }
    if (!target) {
      const key=`a02-s-wall-${Math.floor(s.gameClock*3)}`;
      if((id==='A02'||id==='D16')&&p.x>=5200&&p.x<5320&&!pending.has(key)) target=[key,{mech:'tutunma'}];
    }
    if (!target) {
      const key = `normal-d05-v15-retry-${Math.floor(s.gameClock * 2)}`;
      if (id === 'D05' && p.onGround && p.x >= 5100 && p.x < 5299 && !pending.has(key)) target = [key, {mech:'normal'}];
    }
    if (!target) {
      const longStep = Math.floor((p.x - 5530) / 82.65);
      const key = `normal-d04-long-${longStep}-${Math.floor(s.gameClock * 2)}`;
      if (id === 'D04' && p.onGround && p.x >= 5530 && p.x < 6190 && !pending.has(key)) {
        target = [key, {mech:'normal'}];
      }
    }
    if (!target) {
      for (const o of s.route.obstacles.filter(o => o.type === 'vault')) {
        const key=`vault-${o.id}`, inWindow=right >= o.x-55 && right <= o.x-18, braced=p.onGround && p.vx<=1 && right>=o.x-4 && right<=o.x+4;
        if (!fired.has(key) && (!d05d06 || p.onGround) && (inWindow || braced) && (!lastPress.has(key) || s.gameClock-lastPress.get(key)>=.1)) { target=[key,{...o,mech:'vault'}]; break; }
      }
    }
    if (!target) {
      for (const o of s.route.obstacles.filter(o => o.type === 'slide')) {
        const key=`slide-${o.id}`, gap=o.x-right;
        if (!fired.has(key) && !pending.has(key) && p.onGround && gap>=2 && gap<=36) { target=[key,{...o,mech:'slide'}]; break; }
      }
    }
    if (target) {
      trace.push(`[DBG-B2] ${s.gameClock.toFixed(2)} ${p.x.toFixed(2)},${p.y.toFixed(2)} ${s.parkour.state} press ${target[0]}`);
      if (!pending.has(target[0])) pending.set(target[0], {mech:target[1].mech, at:s.gameClock, wasOnGround:p.onGround || !!target[1].neutralJump});
      lastPress.set(target[0], s.gameClock);
      if (target[1].neutralJump) { await page.keyboard.up('ArrowRight'); await page.waitForTimeout(25); }
      await jump(page, touch);
      if (id === 'D06' && target[1].mech === 'vault') fired.add(target[0]);
      if (target[1].neutralJump) await page.keyboard.down('ArrowRight');
    }
    if (!target && p.onGround && p.vx <= 1) {
      stuckSince ??= s.gameClock;
      if (s.gameClock - stuckSince >= 1.5) {
        trace.push(`[DBG-B2] ${s.gameClock.toFixed(2)} ${p.x.toFixed(2)} ${s.parkour.state} fail stuck-no-target`);
        throw new Error(`${id} stuck without target at x=${p.x.toFixed(2)}\n${trace.slice(-15).join('\n')}`);
      }
    } else stuckSince = null;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  return {end, deaths, retries, elapsed:(Date.now()-started)/1000, diveSeen, catchSeen, trace, c07Y};
}

for (const id of ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18','F01','F02','F03','F04','M01','M02','M03','M04','A01','A02']) test(`O-1 B-5 ${id} ideal keyboard route`, async ({page}) => {
  test.setTimeout(120000); await boot(page,id); const r=await drive(page,id);
  const collected=r.end.economy.collectedCoinIds.length, expected=r.end.route.coins.length;
  const pass=!!r.end.result || r.end.player.x+r.end.hitbox.w>=r.end.route.finishX;
  if (!(pass && r.deaths === 0 && r.retries === 0 && collected === expected)) {
    const got = new Set(r.end.economy.collectedCoinIds);
    console.log(r.trace.join('\n'));
    console.log(`[DBG-B2] missing ${r.end.route.coins.filter(c => !got.has(c.id)).map(c => c.id).join(',')}`);
  }
  console.log(`O-1-${id} | ${r.elapsed.toFixed(2)}s, x=${r.end.player.x.toFixed(2)}, deaths=${r.deaths}, retries=${r.retries}, coin=${collected}/${expected} | finish, deaths=0, retries=0, coin=${expected}/${expected} | ${pass&&r.deaths===0&&r.retries===0&&collected===expected?'PASS':'FAIL'}`);
  console.log(`B-5-${id} | ${collected}/${expected} coin | ${expected}/${expected} coin | ${collected===expected?'PASS':'FAIL'}`);
  if (id === 'D01') console.log(`D01-c07-y | measured=${r.c07Y?.toFixed(2)} | coin center y | ${r.c07Y!==null?'PASS':'FAIL'}`);
  expect(pass).toBeTruthy(); expect(r.deaths).toBe(0); expect(r.retries).toBe(0); expect(collected).toBe(expected);
});

for (const i of [14,17]) test(`F01 i${i} missed-dive fallback catch`, async ({page}) => {
  test.setTimeout(120000); await boot(page,'F01'); const t=transitions.F01.find(x=>x.i===i);
  const r=await drive(page,'F01',{omitDives:[i],stopAfter:({s})=>s.player.x+s.hitbox.w>=t.B.x0+24&&s.player.y+s.hitbox.h<=t.B.y+4});
  const crossed=r.end.player.x+r.end.hitbox.w>=t.B.x0+24&&r.end.player.y+r.end.hitbox.h<=t.B.y+4;
  console.log(`F01-i${i}-fallback | x=${r.end.player.x.toFixed(2)}, feet=${(r.end.player.y+r.end.hitbox.h).toFixed(2)} | no dive, keyboard catch onto ${t.B.id} | ${crossed?'PASS':'FAIL'}`);
  expect(crossed).toBeTruthy(); expect(r.deaths).toBe(0);
});
test('F03 missed-dive fallback catch', async ({page}) => {
  test.setTimeout(120000); await boot(page,'F03'); const t=transitions.F03.find(x=>x.mech==='dive'&&-x.D>52&&x.gap<=96);
  const r=await drive(page,'F03',{omitDives:[t.i],stopAfter:({s})=>s.player.x+s.hitbox.w>=t.B.x0+24&&s.player.y+s.hitbox.h<=t.B.y+4});
  expect(r.end.player.x+r.end.hitbox.w).toBeGreaterThanOrEqual(t.B.x0+24); expect(r.deaths).toBe(0);
});
test('O-4a D01 first dive omission retries', async ({page}) => {
  test.setTimeout(120000); await boot(page,'D01');
  const started=Date.now(); let edgeAt=null,retryMs=null,previousX=null;
  while(Date.now()-started<10000){
    const s=await page.evaluate(()=>__TMB_A12__.getState()),x=s.player.x;
    if(edgeAt===null&&x>441.6&&!s.player.onGround) edgeAt=Date.now();
    if(edgeAt!==null&&previousX!==null&&previousX-x>150){retryMs=Date.now()-edgeAt;break;}
    previousX=x;await page.waitForTimeout(16);
  }
  const pass=retryMs!==null&&retryMs<=800;
  await page.keyboard.up('ArrowRight'); console.log(`O-4a | retry=${retryMs}ms | edge exit + <=800ms | ${pass?'PASS':'FAIL'}`);
  expect(pass).toBeTruthy();
});

test('O-4a D17 first dive omission retries', async ({page}) => {
  test.setTimeout(30000); await boot(page,'D17');const first=transitions.D17.find(t=>t.mech==='dive'&&t.i>0);let previousX=null,dropped=false;
  const r=await drive(page,'D17',{omitDives:[first.i],stopAfter:({s})=>{const x=s.player.x;dropped=previousX!==null&&previousX-x>100;previousX=x;return dropped}});
  console.log(`O-4a-D17 | retry=${dropped}, attempts=${r.retries} | missed required dive retries | ${dropped?'PASS':'FAIL'}`);expect(dropped).toBeTruthy();
});

for(const viewport of [{width:390,height:844},{width:844,height:390}])test(`Dock 18 result menu does not overlap actions ${viewport.width}x${viewport.height}`, async ({page}) => {
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;await boot(page,'D01',viewport);await page.keyboard.up('ArrowRight');await page.evaluate(()=>__TMB_A12__.finish());const nav=page.locator('#a12DockRoutes');await expect(nav).toBeVisible();await page.waitForTimeout(50);const layout=await page.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}};return {nav:rect(document.querySelector('#a12DockRoutes')),actions:[...document.querySelectorAll('#a12Actions button:not([hidden])')].map(rect)}});expect(layout.nav.left).toBeGreaterThanOrEqual(0);expect(layout.nav.top).toBeGreaterThanOrEqual(0);expect(layout.nav.right).toBeLessThanOrEqual(viewport.width);expect(layout.nav.bottom).toBeLessThanOrEqual(viewport.height);for(const action of layout.actions)expect(intersects(layout.nav,action)).toBe(false);expect(await nav.locator('button').count()).toBe(18);await page.screenshot({path:path.join(__dirname,`dock18-menu-${viewport.width}x${viewport.height}.png`)})
});

test('O-4b D01 ground below continues', async ({page}) => {
  test.setTimeout(120000); await boot(page,'D01'); const before=await page.evaluate(()=>__TMB_A12__.getState().economy.attemptId);
  await page.keyboard.up('ArrowRight'); await page.evaluate(()=>{const r=__TMB_A12__.routeDefinition('D01'),v=r.groundSegments.find(x=>x.id==='d01-v-23');__TMB_A12__.placePlayer(v.x+v.w/2,v.y-248);});
  await page.waitForTimeout(1000); const s=await page.evaluate(()=>__TMB_A12__.getState()); const pass=s.economy.attemptId===before && s.player.y+s.hitbox.h<=145.43+2;
  console.log(`O-4b | attemptSame=${s.economy.attemptId===before}, feet=${(s.player.y+s.hitbox.h).toFixed(2)} | no retry, v-23 landing | ${pass?'PASS':'FAIL'}`); expect(pass).toBeTruthy();
});

for (const pitId of ['d06-v-07','d06-v-09']) test(`O-4c D06 ${pitId} keyboard pit escape`, async ({page}) => {
  test.setTimeout(20000); await boot(page,'D06'); await page.keyboard.up('ArrowRight');
  const setup=await page.evaluate(pitId=>{const s=__TMB_A12__.getState(),r=__TMB_A12__.routeDefinition('D06'),v=r.groundSegments.find(x=>x.id===pitId),b=r.groundSegments.find(x=>x.id===pitId.replace('07','08').replace('09','10'));__TMB_A12__.placePlayer(v.x+20,v.y-48);return {attempt:s.economy.attemptId,bx:b.x,by:b.y}},pitId);
  await page.keyboard.down('ArrowRight'); const started=Date.now(); let lastJump=0,s;
  while(Date.now()-started<8000){s=await page.evaluate(()=>__TMB_A12__.getState());if(s.player.x+s.hitbox.w>=setup.bx&&s.player.y+s.hitbox.h<=setup.by+4)break;if(Date.now()-lastJump>=320){await jump(page,false);lastJump=Date.now()}await page.waitForTimeout(16)}
  await page.keyboard.up('ArrowRight'); s=await page.evaluate(()=>__TMB_A12__.getState());
  const escaped=s.economy.attemptId===setup.attempt&&s.player.x+s.hitbox.w>=setup.bx&&s.player.y+s.hitbox.h<=setup.by+4;
  console.log(`O-4c ${pitId} | attemptSame=${s.economy.attemptId===setup.attempt}, x=${s.player.x.toFixed(2)}, feet=${(s.player.y+s.hitbox.h).toFixed(2)} | keyboard escape to B x>=${setup.bx}, feet<=${setup.by+4} | ${escaped?'PASS':'FAIL'}`); expect(escaped).toBeTruthy();
});

for (const id of ['D01','D03','D04','D05','D06','D17','D18','F01','F02','F03','F04','M01','M02','M03','M04','A01','A02']) for (const viewport of [{width:390,height:844},{width:844,height:390}]) test(`M-1 ${id} touch ${viewport.width}x${viewport.height}`, async ({browser}) => {
  test.setTimeout(120000);
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage();
  try {
    await boot(page,id,viewport); const r=await drive(page,id,{touch:true,stopAfter:id==='D01'?(v=>v.diveSeen&&v.catchSeen):undefined});
    const pass=r.diveSeen&&r.catchSeen;
    if(!pass) console.log(r.trace.slice(-15).join('\n'));
    console.log(`M-1-${viewport.width}x${viewport.height} | dive=${r.diveSeen}, catch=${r.catchSeen} | dive=true, catch=true | ${pass?'PASS':'FAIL'}`); expect(pass).toBeTruthy();
  } finally { await context.close(); }
});
