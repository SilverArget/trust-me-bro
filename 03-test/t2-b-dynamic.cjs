const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('playwright');const {runBot:runDockFrozen}=require('./lib/bot-s-drive.cjs');const {runMagma}=require('./lib/bot-magma.cjs');const runBot=(page,id,options)=>id[0]==='M'?runMagma(page,id,options):runDockFrozen(page,id,options);
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.T2_OUT||path.resolve(root,'../01-tasarim/coin-T2'));
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';fs.readFile(path.join(root,rel),(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(e?'missing':b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}); let page=await browser.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{let seed=0x1a2b3c4d,now=0;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;Date.now=()=>Math.floor(now);Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;localStorage.setItem('trust_me_bro_campaign_profile_v1',JSON.stringify({ownedWorldIds:['dock31','frozen','magma'],progressByRoute:{M01:{completed:true},M02:{completed:true},M03:{completed:true},F01:{completed:true},F02:{completed:true},F03:{completed:true}}}));});
 try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#debug');await page.waitForFunction(()=>window.__TMB_A12__&&window.__tmbParkour);await page.locator('.characterChoice:visible').first().click();

 async function freshPage(){await page.close();page=await browser.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.addInitScript(()=>{let seed=0x1a2b3c4d,now=0;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;Date.now=()=>Math.floor(now);Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;localStorage.setItem('trust_me_bro_campaign_profile_v1',JSON.stringify({ownedWorldIds:['dock31','frozen','magma'],progressByRoute:{M01:{completed:true},M02:{completed:true},M03:{completed:true},F01:{completed:true},F02:{completed:true},F03:{completed:true}}}));});
 await page.goto('http://127.0.0.1:'+server.address().port+'/index.html#debug');await page.waitForFunction(()=>window.__TMB_A12__&&window.__tmbParkour);await page.locator('.characterChoice:visible').first().click();

 }
 const fsSave=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
 const mode=process.env.T2_MODE||'g4';
 if(mode==='g7'){
  const rows=await page.evaluate(()=>{
   const a=__TMB_A12__,rows=[],snap=label=>{const s=a.getState();rows.push({label,routeId:s.routeId,length:s.route.length,finishX:s.route.finishX,coins:s.route.coins.length,runCoins:s.economy.runCoins,result:!!s.result});};
   a.renderWorldOnRoute('dock31','D06');a.startRoute('D06');snap('normal-start');a.retry(false);snap('checkpoint-retry');a.finish();document.querySelector('#a12Actions [data-act="retry"]').click();snap('result-retry');
   a.startRoute('D05');a.finish();document.querySelector('#a12Actions [data-act="next"]').click();snap('D05-next-D06');return rows;
  });fsSave('g7-dynamic.json',rows);if(rows.some(r=>r.routeId!=='D06'||r.coins!==13||r.finishX<=1500||r.result))throw Error('G7 dynamic failure');console.log(JSON.stringify(rows));
 } else {
  const rows=[];
  const full=process.env.T2_G4_FULL==='1';
  const positive=JSON.parse(fs.readFileSync(process.env.T2_G2_EVIDENCE||path.join(out,'t2-coins-smoke.json'),'utf8'));
  for(const id of (process.env.T2_ROUTE?[process.env.T2_ROUTE]:(full?['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04']:['D01','F02']))){
   const coins=await page.evaluate(id=>{__TMB_A12__.renderWorldOnRoute(id[0]==='M'?'magma':id[0]==='F'?'frozen':'dock31',id);return __TMB_A12__.getState().route.coins;},id);
   if(id[0]==='M'&&!process.env.T2_OUT)throw Error('M G4 requires a separate T2_OUT evidence directory');
   const targets=full&&['D01','F02'].includes(id)?coins:['CJ','CC','CS'].map(kind=>coins.find(c=>c.kind===kind));
   if(id[0]==='M'&&targets.some(c=>!c))throw Error('M G4 requires distinct CJ/CC/CS targets');
   if(id[0]!=='M')for(let i=targets.length-1;i>=0;i--)if(!targets[i])targets.splice(i,1);
   if(full&&targets.length<3)for(const c of coins)if(targets.length<3&&!targets.includes(c))targets.push(c);
   // Removed F02-c07 leaves 49 original targets; add one distinct D02 control to retain 50.
   if(full&&id==='D02')targets.push(coins.find(c=>!targets.includes(c)));
   for(const target of targets.filter(c=>!process.env.T2_TARGET||c.id===process.env.T2_TARGET)){
    const kind=target.kind,segments=[],union=new Set();
    await freshPage();const began=Date.now();
    await page.evaluate(target=>{window.__TMB_SKIP_MOVE_ID__=target.move_id;window.__targetCoin=target;window.__sminusOriginal=window.__sminusOriginal||window.__tmbCampaignStep;window.__probe=null;
     window.__tmbCampaignStep=function(dt){const before=__TMB_A12__.getState();const v=window.__sminusOriginal(dt),s=__TMB_A12__.getState(),q=window.__probe;if(!q)return v;
      if(q.steps===0){q.startX=before.player.x;q.maxX=before.player.x;}q.steps++;
      // Per-physics-step samples only: no swept line across segment teleports.
      const c=window.__targetCoin,p=s.player,dx=c.x-Math.max(p.x,Math.min(c.x,p.x+s.hitbox.w)),dy=c.y-Math.max(p.y,Math.min(c.y,p.y+s.hitbox.h));
      const intersects=__TMB_A12__.coinContact({x:p.x,y:p.y,w:s.hitbox.w,h:s.hitbox.h},c);
      q.trace.push({step:q.steps,x:p.x,y:p.y,w:s.hitbox.w,h:s.hitbox.h,intersects});
      if(intersects)q.intersections++;
      q.maxX=Math.max(q.maxX,s.player.x);for(const c of s.economy.collectedCoinIds)q.coins.add(c);
      q.stall=Math.abs(s.player.x-before.player.x)<.05?q.stall+1:0;q.last=s;
      if(s.deaths>before.deaths||s.dead){q.reason='death';q.stop=before;throw Error('T2_SEGMENT_STOP');}
      if(q.stall>=60&&s.player.onGround){q.reason='blocked';q.stop=s;throw Error('T2_SEGMENT_STOP');}return v;};
    },target);
    let resume=false,finished=false;
    for(let index=0;index<30;index++){
     await page.evaluate(()=>{const s=__TMB_A12__.getState();window.__probe={startX:s.player.x,steps:0,stall:0,trace:[],intersections:0,maxX:s.player.x,coins:new Set(),last:s,stop:null,reason:null};});
     let result=null;try{result=await runBot(page,id,{resume});}catch(e){if(!String(e).includes('T2_SEGMENT_STOP'))throw e;}
     const segment=await page.evaluate(()=>{const q=window.__probe,s=q.stop||q.last,p=s.player;let b=s.route.obstacles.filter(o=>o.x+o.w>=p.x-2&&o.x<=p.x+s.hitbox.w+100).sort((a,b)=>Math.abs(a.x-(p.x+s.hitbox.w))-Math.abs(b.x-(p.x+s.hitbox.w)))[0];if(q.reason==='death'||!q.reason){const m=s.route.obstacles.find(o=>o.minX!==undefined&&p.x+s.hitbox.w>=o.minX&&p.x<=o.maxX+o.w);if(m)b=m;}return{startX:q.startX,endX:p.x,maxX:q.maxX,steps:q.steps,trace:q.trace,intersections:q.intersections,reason:q.reason||'step-limit',coins:[...q.coins],player:p,blocker:b?.id,nextX:b?(b.maxX??b.x)+b.w+4:null};});
     if(index===0)segment.startX=70;if(result?.finished){finished=true;segment.reason='finish';}segments.push(segment);segment.coins.forEach(c=>union.add(c));
     if(finished)break;if(!segment.nextX||segment.nextX<=segment.startX){segment.unresolved=true;break;}
     segment.teleportSkipsTarget=segment.endX<target.x+9&&segment.nextX>target.x-9;
     await page.evaluate(x=>{window.__probe=null;document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));__tmbSegmentStart(x);},segment.nextX);resume=true;
    }
    const skippedRegion=segments.some(s=>s.teleportSkipsTarget),row={id,kind,target,skipMoveId:target.move_id,seed:'0x1a2b3c4d',dt:'1/60',input:'03-test/route-inputs/'+id+'.json',inputSha256:require('crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'route-inputs',id+'.json'))).digest('hex'),segments,coinUnion:[...union],finished,targetMissed:!union.has(target.id),teleportSkipsTarget:skippedRegion,otherMissing:coins.filter(c=>c.id!==target.id&&!union.has(c.id)).map(c=>c.id),wallMs:Date.now()-began};row.positiveControl=positive.find(p=>p.id===id)?.runs.every(r=>r.finished&&r.observed.economy.collectedCoinIds.includes(target.id))===true;row.preTargetStop=segments.some(s=>s.reason!=='finish'&&s.endX<target.x-9);row.intersections=segments.reduce((n,s)=>n+s.intersections,0);row.traceSamples=segments.reduce((n,s)=>n+s.trace.length,0);row.status=!row.targetMissed||row.intersections>0?'FAIL':row.positiveControl&&row.traceSamples>0&&finished?'PASS':'UNMEASURED';rows.push(row);fsSave(full?'g4-full.json':'g4-pilot.json',rows);console.log(JSON.stringify({id,kind,target:target.id,status:row.status,missed:row.targetMissed,segments:segments.length,otherMissing:row.otherMissing,wallMs:row.wallMs}));
    await page.evaluate(()=>{window.__probe=null;window.__TMB_SKIP_MOVE_ID__=undefined;});
   }
  }
  if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
