const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');const {runBot}=require('./lib/bot-s-drive.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../01-tasarim/coin-T2');
(async()=>{
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';fs.readFile(path.join(root,rel),(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(e?'missing':b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{let seed=0x1a2b3c4d,now=0;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;Date.now=()=>Math.floor(now);Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;localStorage.setItem('trust_me_bro_campaign_profile_v1',JSON.stringify({ownedWorldIds:['dock31','frozen'],progressByRoute:{F01:{completed:true},F02:{completed:true},F03:{completed:true}}}));});
 try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#debug');await page.waitForFunction(()=>window.__TMB_A12__&&window.__tmbParkour);await page.locator('.characterChoice:visible').first().click();
 await page.evaluate(()=>{const original=window.__tmbCampaignStep;window.__c2usage={};window.__coinTrace=[];window.__tmbCampaignStep=function(dt){const result=original(dt),s=__TMB_A12__.getState(),p=s.player,park=__tmbParkour.read();window.__coinTrace.push({x:p.x,y:p.y,w:s.hitbox.w,h:s.hitbox.h,state:park.state});for(const o of s.route.obstacles){if(!o.id.includes('-t2c-'))continue;const live=s.movingPlatforms.find(v=>v.id===o.id)||o,kind=o.parkour||o.type;const overlap=p.x+s.hitbox.w>=live.x&&p.x<=live.x+live.w;const used=(kind==='vault'||kind==='slide')? overlap&&park.state===kind:overlap&&p.onGround&&Math.abs(p.y+s.hitbox.h-live.y)<=2;if(used&&!window.__c2usage[o.id])window.__c2usage[o.id]={id:o.id,kind,x:p.x,y:p.y,state:park.state,clock:s.gameClock};}return result;};});
 const rows=[];for(const id of (process.env.C2_ROUTE?[process.env.C2_ROUTE]:['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04'])){
 const runs=[];for(let repeat=0;repeat<1;repeat++){await page.evaluate(()=>{window.__c2usage={};window.__coinTrace=[];});const a=await runBot(page,id);const observed=await page.evaluate(()=>({trace:window.__coinTrace,usage:window.__c2usage,economy:__TMB_A12__.getState().economy}));const expected=a.route.obstacles.filter(o=>o.id.includes('-t2c-')).map(o=>o.id);runs.push({...a,route:id,observed,missing:expected.filter(k=>!observed.usage[k])});}
 const row={id,runs,deterministic:null};rows.push(row);fs.writeFileSync(path.join(out,'t2-coins-smoke'+(process.env.C2_ROUTE?'-'+id:'')+'.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({id,finished:runs.map(r=>r.finished),deaths:runs.map(r=>r.deaths),hash:runs.map(r=>r.hash),missing:runs[0].missing,oldUsage:runs[0].usage.length}));
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
