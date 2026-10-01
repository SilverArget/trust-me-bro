const {test,expect}=require('playwright/test');
const fs=require('fs'),http=require('http'),path=require('path');
const root=path.join(__dirname,'..'), evidence=path.join(root,'..','01-tasarim','vector-parkur','2a-i-fixture'), descentEvidence=path.join(root,'..','01-tasarim','vector-parkur','2a-iii');
let server,base;
test.beforeAll(async()=>{fs.mkdirSync(evidence,{recursive:true});fs.mkdirSync(descentEvidence,{recursive:true});server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';fs.readFile(path.join(root,rel),(e,b)=>{if(e){res.statusCode=404;return res.end('missing')}if(rel==='js/a12-campaign.js'){const descent=/fixture=descent/.test(req.headers.referer||'');let s=b.toString('utf8'),segments=descent?'[{x:0,y:335,w:700,h:100,kind:"ground"},{x:700,y:455,w:9400,h:100,kind:"ground"}]':'[{x:0,y:335,w:700,h:100,kind:"ground"},{x:1300,y:335,w:9100,h:100,kind:"ground"}]';s=s.replace(/groundSegments:\s*\[[\s\S]*?\n\s*\],\n\s*obstacles:/,`groundSegments: ${segments},\n      obstacles:`);s=s.replace('{ id: "d01-vault-dock", type: "vault", x: 230, w: 24, h: 48, baseY: 455 }','{ id: "d01-vault-dock", type: "vault", x: 230, w: 24, h: 48, baseY: 335 }');b=Buffer.from(s)}res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}/index.html`});
test.afterAll(async()=>new Promise(r=>server.close(r)));

test('raised vault, void fall and checkpoint-height reset use real input',async({page})=>{
  await page.goto(base+'#debug');await page.waitForFunction(()=>window.__TMB_A12__);await page.locator('.characterChoice:visible').first().click();
  expect((await page.evaluate(()=>__TMB_A12__.getState().player.y))).toBe(287);
  await page.keyboard.down('ArrowRight');let vaulted=false;
  for(let i=0;i<120;i++){const s=await page.evaluate(()=>__TMB_A12__.getState());if(s.player.x>165&&s.player.x<255)await page.keyboard.press('Space');if(s.player.state==='vault')vaulted=true;if(s.player.x>715)break;await page.waitForTimeout(25)}
  expect(vaulted).toBe(true);
  await expect.poll(()=>page.evaluate(()=>__TMB_A12__.getState().player.y),{timeout:4000,intervals:[16]}).toBeGreaterThan(420);
  await page.screenshot({path:path.join(evidence,'void-fall.png')});
  await page.keyboard.up('ArrowRight');
  await expect.poll(()=>page.evaluate(()=>Math.round(__TMB_A12__.getState().player.y)),{timeout:3000}).toBe(287);
  await page.screenshot({path:path.join(evidence,'checkpoint-return.png')});
});

test('rightward transition from raised ground to lower ground stays continuous',async({page})=>{
  await page.goto(base+'?fixture=descent#debug');await page.waitForFunction(()=>window.__TMB_A12__);await page.locator('.characterChoice:visible').first().click();
  expect(await page.evaluate(()=>__TMB_A12__.getState().player.y)).toBe(287);
  const samples=[];await page.keyboard.down('ArrowRight');
  for(let i=0;i<360;i++){const s=await page.evaluate(()=>__TMB_A12__.getState()),p=s.player,feet=p.y+s.hitbox.h;samples.push({x:p.x,y:p.y,feet,onGround:p.onGround,parkour:p.state});if(p.x>165&&p.x<255)await page.keyboard.press('Space');if(p.x>760&&p.onGround&&Math.abs(feet-455)<=1)break;await page.waitForTimeout(20)}
  await page.keyboard.up('ArrowRight');fs.writeFileSync(path.join(descentEvidence,'right-adjacent.json'),JSON.stringify(samples,null,2));
  for(let i=1;i<samples.length;i++)expect(samples[i].x).toBeGreaterThanOrEqual(samples[i-1].x-0.001);
  for(let i=0;i+60<samples.length;i++)expect(samples[i+60].x-samples[i].x).toBeGreaterThan(0);
  expect(samples.some(s=>!s.onGround)).toBe(true);
  expect(samples.some(s=>s.onGround&&Math.abs(s.feet-455)<=1)).toBe(true);
  expect(samples.at(-1).x).toBeGreaterThan(760);
});
