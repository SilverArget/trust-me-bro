const {test,expect}=require('playwright/test');
const fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');let server,origin;
test.use({viewport:{width:390,height:844},hasTouch:true});
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://x').pathname.slice(1)||'index.html';try{const b=fs.readFileSync(path.join(root,rel));res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':rel.endsWith('.png')?'image/png':'application/octet-stream');res.end(b)}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`});
test.afterAll(async()=>new Promise(r=>server.close(r)));
async function open(page){await page.goto(`${origin}/index.html#debug`);await page.waitForFunction(()=>window.__TMB_A12__,null,{timeout:10000})}

test('runner selection is stable from first paint and restored on every opening',async({page})=>{
  const samples=[];
  await page.addInitScript(()=>{window.__choiceSamples=[];requestAnimationFrame(()=>{const sample=()=>{const visible=[...document.querySelectorAll('.characterChoice')].filter(e=>{const s=getComputedStyle(e);return !e.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&e.getClientRects().length});window.__choiceSamples.push({visible:visible.length,legacy:visible.filter(e=>/COURIER|FORKLIFT OPERATOR|WAREHOUSE PICKER|NIGHT SECURITY/i.test(e.textContent)).length});};sample();const id=setInterval(sample,50);setTimeout(()=>clearInterval(id),1000)})});
  await open(page);await page.waitForTimeout(1100);samples.push(...await page.evaluate(()=>window.__choiceSamples));
  expect(samples.every(s=>s.visible===0||s.visible===2)).toBeTruthy();expect(samples.reduce((n,s)=>n+s.legacy,0)).toBe(0);
  await page.locator('.characterChoice:visible').nth(1).click();await page.reload();await page.waitForFunction(()=>window.__TMB_A12__);await expect(page.locator('.characterChoice:visible')).toHaveCount(2);const state=await page.locator('.characterChoice:visible').evaluateAll(es=>es.map(e=>({id:e.dataset.character,pressed:e.getAttribute('aria-pressed'),checked:e.getAttribute('aria-checked')})));console.log('UI_SELECTION',JSON.stringify({samples,state}));
  expect(state).toHaveLength(2);expect(state.filter(v=>v.pressed==='true'||v.checked==='true')).toHaveLength(1);expect(state.find(v=>v.pressed==='true'||v.checked==='true').id).toBe('1');
});

test('shop exists only on menu/result and real clicks open it',async({page})=>{
  await open(page);const menuShop=page.locator('#characterSelect [data-character-shop]:visible');expect(await menuShop.count()).toBe(1);await menuShop.click();expect(await page.locator('#a12Shop').evaluate(e=>e.classList.contains('show'))).toBeTruthy();await page.locator('#a12Shop [data-close]').click();await expect(page.locator('#characterSelect')).toHaveClass(/show/);
  await page.locator('.characterChoice:visible').first().click();expect(await page.locator('[data-act="shop"]:visible,#characterSelect [data-character-shop]:visible').count()).toBe(0);
  await page.evaluate(()=>__TMB_A12__.finish());const resultShop=page.locator('#a12Actions [data-act="shop"]:visible');expect(await resultShop.count()).toBe(1);await resultShop.click();expect(await page.locator('#a12Shop').evaluate(e=>e.classList.contains('show'))).toBeTruthy();
});

for(const viewport of [{width:390,height:844},{width:1280,height:720}])test(`audio controls avoid HUD, gameplay and toggles at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await open(page);await page.locator('.characterChoice:visible').first().click();await page.waitForTimeout(800);
  const m=await page.evaluate(()=>{const box=r=>({x:r.x,y:r.y,left:r.x,top:r.y,width:r.width,height:r.height,right:r.right??r.x+r.width,bottom:r.bottom??r.y+r.height}),overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));const a=box(document.querySelector('#a5-audio-controls').getBoundingClientRect()),c=document.querySelector('#game').getBoundingClientRect(),l=__tmb.layout,p=__TMB_A12__.getState().player,hit=__TMB_A12__.getState().hitbox,h=box({x:c.x+14*l.viewScale,y:c.y+14*l.viewScale,width:360*l.viewScale,height:54*l.viewScale}),player=box({x:c.x+(p.x-__tmb.cam)*l.viewScale,y:c.y+(p.y+l.worldY)*l.viewScale,width:hit.w*l.viewScale,height:hit.h*l.viewScale}),toggles=[...document.querySelectorAll('#a12GhostToggle,#a12EffectsToggle')].map(e=>box(e.getBoundingClientRect()));return{audio:a,hud:h,player,toggles,hudArea:overlap(a,h),playerArea:overlap(a,player),toggleArea:toggles.reduce((n,b)=>n+overlap(a,b),0),bandLimit:c.y+c.height*.4,viewport:{width:innerWidth,height:innerHeight}}});console.log('UI_LAYOUT',JSON.stringify({viewport,...m}));expect(m.hudArea).toBe(0);expect(m.playerArea).toBe(0);expect(m.toggleArea).toBe(0);expect(m.audio.bottom).toBeLessThanOrEqual(m.bandLimit);expect(m.audio.width).toBeLessThanOrEqual(230);expect(m.audio.x).toBeGreaterThanOrEqual(0);expect(m.audio.y).toBeGreaterThanOrEqual(0);expect(m.audio.right).toBeLessThanOrEqual(m.viewport.width);expect(m.audio.bottom).toBeLessThanOrEqual(m.viewport.height);
});
