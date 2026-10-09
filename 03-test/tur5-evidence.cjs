const fs=require("fs"),http=require("http"),path=require("path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,".."),out=path.join(__dirname,"manager-preview","video-1008-tur5");
const ids=[...Array.from({length:18},(_,i)=>`D${String(i+1).padStart(2,"0")}`),...["F","M","A"].flatMap(w=>Array.from({length:6},(_,i)=>`${w}0${i+1}`))];
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".png":"image/png",".mp3":"audio/mpeg",".mp4":"video/mp4"};
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,"http://x").pathname).replace(/^\/+/, "")||"index.html",file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end("missing")}res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream"});fs.createReadStream(file).pipe(res)});
async function boot(page,viewport){
  await page.setViewportSize(viewport);await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`);await page.waitForFunction(()=>window.__TMB_A12__);
  await page.locator(".characterChoice:visible").first().click();await page.evaluate(()=>__TMB_A12__.unlockAllRoutes());
}
async function start(page,id){await page.evaluate(id=>{const world=id[0]==="F"?"frozen":id[0]==="M"?"magma":id[0]==="A"?"aftermath":"dock31";__TMB_A12__.renderWorldOnRoute(world,id);__TMB_A12__.startRoute(id)},id);await page.waitForFunction(id=>__TMB_A12__.getState().route.id===id,id)}
function solids(r){
  const out=(r.groundSegments||[]).map(s=>({...s}));
  for(const o of r.obstacles||[]){const baseY=o.baseY??455;
    if(o.type==="vault")out.push({id:o.id,x:o.x,y:baseY-o.h,w:o.w,h:o.h,parkour:"vault"});
    if(o.type==="slide")out.push({id:o.id,x:o.x,y:baseY-o.h-32,w:o.w,h:o.h,parkour:"slide"});
    if(o.type==="platform")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"platform"});
    if(o.type==="overpass")out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:"movingPlatform"});
    if(o.type==="wallRun")out.push({id:o.id,x:o.x,y:baseY-130,w:o.w,h:130,parkour:"wallRun"});
    if(["collapse","containerDoor","crane","pallet"].includes(o.type))out.push({id:o.id,x:o.x,y:o.y,w:o.w,h:o.h,kind:["crane","pallet"].includes(o.type)?"movingPlatform":o.type});
  }return out.filter(s=>s.solid!==false&&(s.kind==="ground"||s.kind==="platform"||s.kind==="movingPlatform"||s.kind==="collapse"||s.kind==="containerDoor"||s.parkour));
}
function touches(c,s){const x=Math.max(s.x,Math.min(c.x,s.x+s.w)),y=Math.max(s.y,Math.min(c.y,s.y+s.h));return(x-c.x)**2+(y-c.y)**2<=100}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,"127.0.0.1",r));const browser=await chromium.launch(),audit={radius:9,routes:[],totalCoins:0,totalIssues:0};
  try{
    const page=await browser.newPage();await boot(page,{width:1280,height:720});
    for(const id of ids){const r=await page.evaluate(id=>__TMB_A12__.routeDefinition(id),id),issues=[];for(const c of r.coins||[]){const hit=solids(r).filter(s=>touches(c,s)).map(s=>s.id);if(c.x<24||c.x>(r.finishX??r.length)-60||hit.length)issues.push({coin:c.id,x:c.x,y:c.y,hit})}audit.routes.push({id,total:r.coins.length,solidInside:issues.length,issues});audit.totalCoins+=r.coins.length;audit.totalIssues+=issues.length}
    fs.writeFileSync(path.join(out,"coin-solid-audit.json"),JSON.stringify(audit,null,2)+"\n");
    for(const [id,t] of [["D07",7],["D13",12]]){await start(page,id);await page.evaluate(t=>{__TMB_A12__.placePlayerAtChiefTime(t);__TMB_A12__.forceChiefNear(-210)},t);await page.waitForTimeout(350);await page.screenshot({path:path.join(out,`${id}-midrun-915x412.png`)});}
    for(const viewport of [{width:915,height:412},{width:390,height:844},{width:1280,height:720}]){
      await page.setViewportSize(viewport);await start(page,"D04");
      await page.evaluate(()=>{const r=__TMB_A12__.routeDefinition("D04"),door=__TMB_A12__.finishDoorPlacement("D04"),x=door.x-220,s=(r.groundSegments||[]).filter(v=>v.solid!==false&&x>=v.x&&x<=v.x+v.w).sort((a,b)=>Math.abs(a.y-door.y)-Math.abs(b.y-door.y))[0];__TMB_A12__.placePlayer(x,(s?.y??455)-48);__TMB_A12__.forceChiefNear(-360)});
      await page.keyboard.down("ArrowRight");
      for(let i=0;i<16;i++){await page.screenshot({path:path.join(out,`finish-${viewport.width}x${viewport.height}-${String(i).padStart(2,"0")}.png`)});if(i===3)await page.evaluate(()=>__TMB_A12__.finishResult());await page.waitForTimeout(250)}
      await page.keyboard.up("ArrowRight");
      const state=await page.evaluate(()=>__TMB_A12__.getState());fs.writeFileSync(path.join(out,`finish-${viewport.width}x${viewport.height}.json`),JSON.stringify({result:!!state.result,chief:state.chief,coins:state.economy,route:state.route},null,2)+"\n");
    }
  }finally{await browser.close();await new Promise(r=>server.close(r))}
  console.log(JSON.stringify({audit:{routes:audit.routes.length,coins:audit.totalCoins,issues:audit.totalIssues},frames:48,midrun:2}));
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
