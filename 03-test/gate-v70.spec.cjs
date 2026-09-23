const {test,expect}=require('playwright/test');
const fs=require('fs'),http=require('http'),path=require('path');
let server,base;
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://local').pathname.slice(1)||'index.html';fs.readFile(path.join(__dirname,'..',rel),(e,b)=>{res.statusCode=e?404:200;res.end(e?'missing':b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
test.afterAll(async()=>{await new Promise(r=>server.close(r))});
test.beforeEach(async({page})=>{await page.goto(base+'/#debug');await page.waitForFunction(()=>window.__tmb&&window.__tmbGateTestSetup)});

test('stamp yokken gate kapalı kalır ve part geçmez',async({page})=>{
 await page.evaluate(()=>{__tmbGateTestSetup(3,2,false);__tmbGateTestReach()});
 const s=await page.evaluate(()=>({level:__tmb.currentLevel,part:__tmb.currentPart,gate:__tmb.gate}));
 expect(s).toMatchObject({level:3,part:2,gate:{phase:'closed',playerAlpha:1}});
});

for(const [level,part] of [[1,1],[12,2],[27,1]])test(`gate animasyonu ve güvenli geçiş ${level}.${part}`,async({page})=>{
 await page.evaluate(({level,part})=>__tmbGateTestSetup(level,part,true),{level,part});
 expect((await page.evaluate(()=>__tmb.gate)).phase).toBe('opening');
 await page.evaluate(()=>{for(let i=0;i<5;i++)__tmbGateTestStep(.1)});
 expect((await page.evaluate(()=>__tmb.gate)).phase).toBe('open');
 const deaths=await page.evaluate(()=>__tmb.deaths);
 await page.evaluate(()=>{__tmbGateTestReach();window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'}));for(let i=0;i<4;i++)__tmbGateTestStep(.1)});
 const during=await page.evaluate(()=>({gate:__tmb.gate,keys:__tmb.keys,deaths:__tmb.deaths,level:__tmb.currentLevel,part:__tmb.currentPart}));
 expect(during.gate.phase).toBe('entering');expect(during.gate.playerAlpha).toBeLessThan(.55);expect(during.keys.left).toBe(false);expect(during.deaths).toBe(deaths);expect([during.level,during.part]).toEqual([level,part]);
 await page.evaluate(()=>{for(let i=0;i<4;i++)__tmbGateTestStep(.1)});
 const after=await page.evaluate(()=>({level:__tmb.currentLevel,part:__tmb.currentPart,deaths:__tmb.deaths,alpha:__tmb.gate.playerAlpha}));
 expect([after.level,after.part]).toEqual(part<2?[level,part+1]:[level+1,1]);expect(after.deaths).toBe(deaths);expect(after.alpha).toBe(1);
});

test('son part gate geçişi MVP tamamlanmasını açar',async({page})=>{
 await page.evaluate(()=>{__tmbGateTestSetup(31,2,true);for(let i=0;i<5;i++)__tmbGateTestStep(.1);__tmbGateTestReach();for(let i=0;i<8;i++)__tmbGateTestStep(.1)});
 expect(await page.evaluate(()=>({won:__tmb.won,shown:document.getElementById('mvpComplete').classList.contains('show'),gate:__tmb.gate.phase}))).toEqual({won:true,shown:true,gate:'complete'});
});
