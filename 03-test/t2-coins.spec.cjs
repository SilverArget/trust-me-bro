const {test,expect}=require('playwright/test'),fs=require('fs'),path=require('path'),vm=require('vm');
const src=fs.readFileSync(path.resolve(__dirname,'../js/a12-campaign.js'),'utf8');
const routes=vm.runInNewContext(src.slice(src.indexOf('  function range('),src.indexOf('  function drawCoin('))+src.slice(src.indexOf('  const COINS ='),src.indexOf('  const CHIEF_SPRITE'))+'\nROUTES');
test('G3 G5 G7 static movement-bound coins',()=>{
 const expected={D01:12,D02:10,D03:13,D04:12,D05:13,D06:13,F01:14,F02:13,F03:13,F04:12};let total=0;
 for(const r of Object.values(routes).filter(r=>/^[DF]/.test(r.routeId))){
  const list=[...r.coins].sort((a,b)=>a.x-b.x),ids=new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'route-inputs',r.routeId+'.json'),'utf8')).map(v=>v.move_id)),ramp=r.obstacles.find(o=>o.type==='ramp');
  expect(list.length,r.routeId).toBe(expected[r.routeId]);expect(new Set(list.map(c=>c.move_id)).size).toBe(list.length);expect(new Set(list.map(c=>c.n)).size).toBe(list.length);
  for(const [i,c] of list.entries()){
   const o=r.obstacles.find(o=>o.id===c.move_id);expect(!!o,c.id).toBe(true);expect(ids.has(c.move_id),c.id).toBe(true);expect(c.id).toBe(`${r.routeId}-c${String(c.n+1).padStart(2,'0')}`);expect(c.skill).toBe(c.kind==='CC'||c.kind==='CS');
   if(c.kind==='CJ'){expect(['vault','wallRun','rollDrop'].includes(o.type)).toBe(true);expect(c.y).toBeGreaterThanOrEqual(300);expect(c.y).toBeLessThanOrEqual(385);}
   else if(c.kind==='CS'){expect(o.type).toBe('slide');expect(c.x).toBeGreaterThanOrEqual(o.x+8);expect(c.x).toBeLessThanOrEqual(o.x+o.w-8);expect(c.y).toBeGreaterThanOrEqual(435);expect(c.y).toBeLessThanOrEqual(445);}
   else {expect(c.kind).toBe('CC');expect(['platform','pallet','crane','overpass'].includes(o.type)).toBe(true);expect(c.y).toBe(o.y-20);expect(c.x).toBeGreaterThanOrEqual(o.minX??o.x);expect(c.x).toBeLessThanOrEqual((o.maxX??o.x)+o.w);}
   expect(c.x).toBeGreaterThanOrEqual(1200);if(i)expect(c.x-list[i-1].x).toBeGreaterThanOrEqual(400-1e-6);if(ramp)expect(c.x<ramp.x||c.x>ramp.x+ramp.w+500,c.id+' R0').toBe(true);
   for(const h of r.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))expect(c.x<=h.x-60||c.x>=h.x+h.w+60,c.id+' R4').toBe(true);
  }
  expect(r.obstacles.some(o=>['vault','slide','platform','pallet'].includes(o.type)&&!list.some(c=>c.move_id===o.id))).toBe(true);total+=list.length;
 }
 expect(total).toBe(125);
});

test.describe('T3 economy and stars',()=>{
 let server,base;
 test.beforeAll(async()=>{
  server=require('http').createServer((req,res)=>{
   const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';
   fs.readFile(path.resolve(__dirname,'..',rel),(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(e?'missing':b);});
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/index.html#debug`;
 });
 test.afterAll(async()=>new Promise(r=>server.close(r)));
 test.beforeEach(async({page})=>{
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto(base);await page.waitForFunction(()=>window.__TMB_A12__);await page.locator('.characterChoice:visible').first().click();
 });
 test('approved constants, localized shop prices and exact purchase deductions',async({page})=>{
  const defs=vm.runInNewContext(src.slice(src.indexOf('  const OUTFITS'),src.indexOf('  const I18N'))+'\n({OUTFITS,WORLD_REGISTRY})');
  expect(defs.OUTFITS.dockCrew.price).toBe(40);expect(defs.WORLD_REGISTRY.frozen.price).toBe(160);expect(defs.WORLD_REGISTRY.magma.price).toBe(200);
  await page.evaluate(async()=>{await __TMB_A12__.setWallet(1000);__TMB_A12__.openShop();});
  for(const lang of ['en','tr','ru']){
   await page.evaluate(async l=>{await __TMB_A12__.setLanguage(l);__TMB_A12__.setShopTab('outfits');},lang);
   await expect(page.locator('[data-item="dockCrew"] [data-action]')).toHaveText(/40$/);
   await page.evaluate(()=>__TMB_A12__.setShopTab('worlds'));
   await expect(page.locator('[data-item="frozen"] [data-action]')).toHaveText(/160$/);
   await expect(page.locator('[data-item="magma"] [data-action]')).toHaveText(/200$/);
  }
  const balances=await page.evaluate(async()=>{const a=__TMB_A12__,b=[];await a.purchase('dockCrew');b.push(a.profile().walletBalance);await a.purchaseWorld('frozen');b.push(a.profile().walletBalance);await a.purchaseWorld('magma');b.push(a.profile().walletBalance);await a.purchaseWorld('magma');b.push(a.profile().walletBalance);return b;});
  expect(balances).toEqual([960,800,600,600]);
 });
 test('completion stars at zero, half, all and odd-count boundary persist best',async({page})=>{
  const rows=await page.evaluate(()=>{
   const a=__TMB_A12__,rows=[];
   for(const id of ['D01','D03']){
    const n=a.routeDefinition(id).coins.length;
    for(const count of [0,Math.ceil(n/2)-1,Math.ceil(n/2),n,0]){
     a.startRoute(id);const before=a.getState().result;for(const c of a.routeCoins().slice(0,count))a.collectCoin(c);
     const result=a.finish();rows.push({id,n,count,before,stars:result.stars,best:a.profile().progressByRoute[id].stars});
    }
   }return rows;
  });
  for(const r of rows){expect(r.before).toBeFalsy();expect(r.stars).toBe(r.count===r.n?3:r.count>=Math.ceil(r.n/2)?2:1);}
  expect(rows.filter(r=>r.best===3)).toHaveLength(4);
  await page.reload();await page.waitForFunction(()=>window.__TMB_A12__);
  expect(await page.evaluate(()=>__TMB_A12__.profile().progressByRoute.D03.stars)).toBe(3);
 });
});

for(const id of ['M01','M02'])test('magma-'+id+' G3 G5 G7 static manifest coins',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../01-tasarim/coin-T2/m-manifest.json'),'utf8')).routes[id],r=routes[id],coins=structuredClone(r.coins),inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'route-inputs',id+'.json'),'utf8'));
 if(process.env.M_RED)coins[0].x=0;
 const checks=[],check=(name,pass)=>checks.push({name,pass});check('manifest-count',coins.length===manifest.N&&manifest.N===Math.min(14,manifest.C)&&manifest.N>=12&&manifest.N<=14);
 check('types', ['CJ','CC','CS'].every(k=>coins.filter(c=>c.kind===k).length===manifest.counts[k]&&manifest.counts[k]>=1));
 check('unique-moves',new Set(coins.map(c=>c.move_id)).size===coins.length);check('coinless',r.obstacles.some(o=>inputs.some(i=>i.move_id===o.id)&&!coins.some(c=>c.move_id===o.id)));
 for(const [i,c] of coins.entries()){
 const o=r.obstacles.find(o=>o.id===c.move_id);check(c.id+' dictionary',!!o&&c.move_id.includes('-m-')&&inputs.some(v=>v.move_id===c.move_id));
 check(c.id+' skill',c.skill===(c.kind==='CC'||c.kind==='CS'));check(c.id+' identity',c.id===`${id}-c${String(c.n+1).padStart(2,'0')}`);
 check(c.id+' band',c.kind==='CJ'?o.type==='vault'&&c.y>=300&&c.y<=385:c.kind==='CS'?o.type==='slide'&&c.y>=435&&c.y<=445&&c.x>=o.x+8&&c.x<=o.x+o.w-8:['platform','pallet','crane','overpass'].includes(o.type)&&c.y===o.y-20&&c.x>=(o.minX??o.x)&&c.x<=(o.maxX??o.x)+o.w);
 check(c.id+' R3',c.x>=1200);check(c.id+' R2',!i||c.x-coins[i-1].x>=400);
 for(const h of r.obstacles.filter(o=>o.type==='ramp'))check(c.id+' R0 '+h.id,c.x<h.x||c.x>h.x+h.w+500);
 for(const h of r.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))check(c.id+' R4 '+h.id,c.x<=h.x-60||c.x>=h.x+h.w+60);
 }
 expect(checks.filter(c=>!c.pass)).toEqual([]);
});

for(const id of ['M03','M04'])test('magma-'+id+' G3 G5 G7 static manifest coins',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../01-tasarim/coin-T2/m-manifest.json'),'utf8')).routes[id],r=routes[id],coins=structuredClone(r.coins),inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'route-inputs',id+'.json'),'utf8'));
 if(process.env.M_RED)coins[0].x=0;
 const checks=[],check=(name,pass)=>checks.push({name,pass});check('manifest-count',coins.length===manifest.N&&manifest.N===Math.min(14,manifest.C)&&manifest.N>=12&&manifest.N<=14);
 check('types', ['CJ','CC','CS'].every(k=>coins.filter(c=>c.kind===k).length===manifest.counts[k]&&manifest.counts[k]>=1));
 check('unique-moves',new Set(coins.map(c=>c.move_id)).size===coins.length);check('coinless',r.obstacles.some(o=>inputs.some(i=>i.move_id===o.id)&&!coins.some(c=>c.move_id===o.id)));
 for(const [i,c] of coins.entries()){
 const o=r.obstacles.find(o=>o.id===c.move_id);check(c.id+' dictionary',!!o&&c.move_id.includes('-m-')&&inputs.some(v=>v.move_id===c.move_id));
 check(c.id+' skill',c.skill===(c.kind==='CC'||c.kind==='CS'));check(c.id+' identity',c.id===`${id}-c${String(c.n+1).padStart(2,'0')}`);
 check(c.id+' band',c.kind==='CJ'?o.type==='vault'&&c.y>=300&&c.y<=385:c.kind==='CS'?o.type==='slide'&&c.y>=435&&c.y<=445&&c.x>=o.x+8&&c.x<=o.x+o.w-8:['platform','pallet','crane','overpass'].includes(o.type)&&c.y===o.y-20&&c.x>=(o.minX??o.x)&&c.x<=(o.maxX??o.x)+o.w);
 check(c.id+' R3',c.x>=1200);check(c.id+' R2',!i||c.x-coins[i-1].x>=400);
 for(const h of r.obstacles.filter(o=>o.type==='ramp'))check(c.id+' R0 '+h.id,c.x<h.x||c.x>h.x+h.w+500);
 for(const h of r.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))check(c.id+' R4 '+h.id,c.x<=h.x-60||c.x>=h.x+h.w+60);
 }
 expect(checks.filter(c=>!c.pass)).toEqual([]);
});

for(const id of ['A01','A02'])test('aftermath-'+id+' G3 G5 G7 static manifest coins',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../01-tasarim/coin-T2/a-manifest.json'),'utf8')).routes[id],r=routes[id],coins=structuredClone(r.coins),inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'route-inputs',id+'.json'),'utf8'));
 if(process.env.A_RED)coins[0].x=0;
 const checks=[],check=(name,pass)=>checks.push({name,pass});check('manifest-count',coins.length===manifest.N&&manifest.N===Math.min(14,manifest.C)&&manifest.N>=12&&manifest.N<=14);
 check('types', ['CJ','CC','CS'].every(k=>coins.filter(c=>c.kind===k).length===manifest.counts[k]&&manifest.counts[k]>=1));
 check('unique-moves',new Set(coins.map(c=>c.move_id)).size===coins.length);check('coinless',r.obstacles.some(o=>inputs.some(i=>i.move_id===o.id)&&!coins.some(c=>c.move_id===o.id)));
 for(const [i,c] of coins.entries()){
 const o=r.obstacles.find(o=>o.id===c.move_id);check(c.id+' dictionary',!!o&&c.move_id.includes('-m-')&&inputs.some(v=>v.move_id===c.move_id));
 check(c.id+' skill',c.skill===(c.kind==='CC'||c.kind==='CS'));check(c.id+' identity',c.id===`${id}-c${String(c.n+1).padStart(2,'0')}`);
 check(c.id+' band',c.kind==='CJ'?o.type==='vault'&&c.y>=300&&c.y<=385:c.kind==='CS'?o.type==='slide'&&c.y>=435&&c.y<=445&&c.x>=o.x+8&&c.x<=o.x+o.w-8:['platform','pallet','crane','overpass'].includes(o.type)&&c.y===o.y-20&&c.x>=(o.minX??o.x)&&c.x<=(o.maxX??o.x)+o.w);
 check(c.id+' R3',c.x>=1200);check(c.id+' R2',!i||c.x-coins[i-1].x>=400);
 for(const h of r.obstacles.filter(o=>o.type==='ramp'))check(c.id+' R0 '+h.id,c.x<h.x||c.x>h.x+h.w+500);
 for(const h of r.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))check(c.id+' R4 '+h.id,c.x<=h.x-60||c.x>=h.x+h.w+60);
 }
 expect(checks.filter(c=>!c.pass)).toEqual([]);
});


for(const id of ['A03','A04'])test('aftermath-'+id+' G3 G5 G7 static manifest coins',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../01-tasarim/coin-T2/a-manifest.json'),'utf8')).routes[id],r=routes[id],coins=structuredClone(r.coins),inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'route-inputs',id+'.json'),'utf8'));
 if(process.env.A_RED)coins[0].x=0;
 const checks=[],check=(name,pass)=>checks.push({name,pass});check('manifest-count',coins.length===manifest.N&&manifest.N===Math.min(14,manifest.C)&&manifest.N>=12&&manifest.N<=14);
 check('types', ['CJ','CC','CS'].every(k=>coins.filter(c=>c.kind===k).length===manifest.counts[k]&&manifest.counts[k]>=1));
 check('unique-moves',new Set(coins.map(c=>c.move_id)).size===coins.length);check('coinless',r.obstacles.some(o=>inputs.some(i=>i.move_id===o.id)&&!coins.some(c=>c.move_id===o.id)));
 for(const [i,c] of coins.entries()){
 const o=r.obstacles.find(o=>o.id===c.move_id);check(c.id+' dictionary',!!o&&c.move_id.includes('-m-')&&inputs.some(v=>v.move_id===c.move_id));
 check(c.id+' skill',c.skill===(c.kind==='CC'||c.kind==='CS'));check(c.id+' identity',c.id===`${id}-c${String(c.n+1).padStart(2,'0')}`);
 check(c.id+' band',c.kind==='CJ'?o.type==='vault'&&c.y>=300&&c.y<=385:c.kind==='CS'?o.type==='slide'&&c.y>=435&&c.y<=445&&c.x>=o.x+8&&c.x<=o.x+o.w-8:['platform','pallet','crane','overpass'].includes(o.type)&&c.y===o.y-20&&c.x>=(o.minX??o.x)&&c.x<=(o.maxX??o.x)+o.w);
 check(c.id+' R3',c.x>=1200);check(c.id+' R2',!i||c.x-coins[i-1].x>=400);
 for(const h of r.obstacles.filter(o=>o.type==='ramp'))check(c.id+' R0 '+h.id,c.x<h.x||c.x>h.x+h.w+500);
 for(const h of r.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))check(c.id+' R4 '+h.id,c.x<=h.x-60||c.x>=h.x+h.w+60);
 }
 expect(checks.filter(c=>!c.pass)).toEqual([]);
});

