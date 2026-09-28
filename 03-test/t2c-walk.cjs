const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');const {runWalking}=require('./lib/bot-w.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../01-tasarim/coin-T2');
(async()=>{
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';fs.readFile(path.join(root,rel),(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(e?'missing':b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{let seed=0x1a2b3c4d,now=0;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;Date.now=()=>Math.floor(now);Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;localStorage.setItem('trust_me_bro_campaign_profile_v1',JSON.stringify({ownedWorldIds:['dock31','frozen'],progressByRoute:{F01:{completed:true},F02:{completed:true},F03:{completed:true}}}));});
 try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#debug');await page.waitForFunction(()=>window.__TMB_A12__&&window.__tmbParkour);await page.locator('.characterChoice:visible').first().click();
 const rows=[];for(const id of ['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04']){const row=await runWalking(page,id);rows.push(row);fs.writeFileSync(path.join(out,'segments-'+id+'.json'),JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify({id,coverage:row.coverage,coins:row.coinIds.length,complete:row.complete,segments:row.segments.length}));}fs.writeFileSync(path.join(out,'c2-bot-w.json'),JSON.stringify(rows,null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
