const {test,expect}=require('playwright/test');
const fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');let server,origin;
test.use({viewport:{width:390,height:844},hasTouch:true});
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://x').pathname.slice(1)||'index.html';try{const b=fs.readFileSync(path.join(root,rel));res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':rel.endsWith('.png')?'image/png':'application/octet-stream');res.end(b)}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`});
test.afterAll(async()=>new Promise(r=>server.close(r)));
async function open(page){await page.goto(`${origin}/index.html#debug`);await page.waitForFunction(()=>window.__TMB_A12__,null,{timeout:10000})}

test('runner selection stays hidden at boot and is restored on every ID opening',async({page})=>{
  const samples=[];
  await page.addInitScript(()=>{window.__choiceSamples=[];requestAnimationFrame(()=>{const sample=()=>{const visible=[...document.querySelectorAll('.characterChoice')].filter(e=>{const s=getComputedStyle(e);return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length});window.__choiceSamples.push({visible:visible.length,legacy:visible.filter(e=>/COURIER|FORKLIFT OPERATOR|WAREHOUSE PICKER|NIGHT SECURITY/i.test(e.textContent)).length});};sample();const id=setInterval(sample,50);setTimeout(()=>clearInterval(id),1000)})});
  await open(page);await page.waitForTimeout(1100);samples.push(...await page.evaluate(()=>window.__choiceSamples));
  expect(samples.every(s=>s.visible===0)).toBeTruthy();expect(samples.reduce((n,s)=>n+s.legacy,0)).toBe(0);expect(await page.evaluate(()=>__TMB_A12__.profile().runnerId)).toBe('male');
  await page.locator('#characterChange').click();await page.locator('.characterChoice:visible').nth(1).click();await page.reload();await page.waitForFunction(()=>window.__TMB_A12__);await expect(page.locator('.characterChoice:visible')).toHaveCount(0);await page.locator('#characterChange').click();await expect(page.locator('.characterChoice:visible')).toHaveCount(2);const state=await page.locator('.characterChoice:visible').evaluateAll(es=>es.map(e=>({id:e.dataset.character,pressed:e.getAttribute('aria-pressed'),checked:e.getAttribute('aria-checked')})));console.log('UI_SELECTION',JSON.stringify({samples,state}));
  expect(state).toHaveLength(2);expect(state.filter(v=>v.pressed==='true'||v.checked==='true')).toHaveLength(1);expect(state.find(v=>v.pressed==='true'||v.checked==='true').id).toBe('1');
});

test('shop exists only on result and real clicks open it',async({page})=>{
  await open(page);expect(await page.locator('#characterSelect [data-character-shop]:visible,#characterSelect #a12Language:visible').count()).toBe(0);
  expect(await page.locator('[data-act="shop"]:visible,#characterSelect [data-character-shop]:visible').count()).toBe(0);
  await page.evaluate(()=>__TMB_A12__.finish());const resultShop=page.locator('#a12Actions [data-act="shop"]:visible');expect(await resultShop.count()).toBe(1);await resultShop.click();expect(await page.locator('#a12Shop').evaluate(e=>e.classList.contains('show'))).toBeTruthy();
});

for(const viewport of [{width:390,height:844},{width:1280,height:720}])test(`removed controls, symbol entry and mute at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.addInitScript(()=>{window.__ghostStorageGets=0;const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(/ghost/i.test(String(k)))window.__ghostStorageGets++;return get.call(this,k)}});
  await page.setViewportSize(viewport);await open(page);await page.reload();await page.waitForFunction(()=>window.__TMB_A12__);
  expect(await page.locator('#a5-audio-controls,#a12GhostToggle,#a12EffectsToggle').count()).toBe(0);expect(await page.evaluate(()=>window.__ghostStorageGets)).toBe(0);
  await page.locator('#characterChange').click();
  const layout=await page.evaluate(()=>{const entries=[...document.querySelectorAll('.characterChoice')].map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent.trim(),label:e.getAttribute('aria-label'),w:r.width,h:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,color:getComputedStyle(e).backgroundColor}});return{entries,hidden:[...document.querySelectorAll('#characterCard img,#characterCard .eyebrow,#characterCard h2,#characterCard p,#characterShop,#a12LanguageWrap')].filter(e=>getComputedStyle(e).display!=='none'&&e.getClientRects().length).length,viewport:{w:innerWidth,h:innerHeight}}});
  expect(layout.entries.map(e=>e.text.charCodeAt(0))).toEqual([9794,9792]);expect(layout.hidden).toBe(1);await expect(page.locator('#a12Language option')).toHaveText(['English','Türkçe','Русский']);for(const e of layout.entries){expect(e.w).toBeGreaterThanOrEqual(120);expect(e.h).toBeGreaterThanOrEqual(120);expect(e.left).toBeGreaterThanOrEqual(0);expect(e.top).toBeGreaterThanOrEqual(0);expect(e.right).toBeLessThanOrEqual(layout.viewport.w);expect(e.bottom).toBeLessThanOrEqual(layout.viewport.h)}
  await page.locator('.characterChoice:visible').first().click();if(await page.evaluate(()=>__tmbAudio.state().userMuted)){await page.locator('#muteBtn').click();await page.waitForFunction(()=>!__tmbAudio.state().userMuted)}await page.locator('#muteBtn').click();await page.waitForFunction(()=>__tmbAudio.state().userMuted);let muted=await page.evaluate(()=>({legacy:__tmbLifecycle.state().bgmGain,a5:__tmbAudio.state()}));expect(muted.legacy??0).toBe(0);expect(muted.a5.musicBusGain).toBe(0);expect(muted.a5.sfxBusGain).toBe(0);await expect(page.locator('#muteBtn')).toHaveAttribute('aria-label',/off|kapal/i);
  await page.locator('#muteBtn').click();await page.waitForFunction(()=>!__tmbAudio.state().userMuted);const restored=await page.evaluate(()=>({legacy:__tmbLifecycle.state().bgmGain,a5:__tmbAudio.state()}));expect(restored.a5.musicBusGain).toBeGreaterThan(0);expect(restored.a5.sfxBusGain).toBeGreaterThan(0);console.log('T1B_UI',JSON.stringify({viewport,layout,muted,restored}));
});
