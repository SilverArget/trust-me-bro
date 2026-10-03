const {test,expect}=require('playwright/test');
const fs=require('fs'),http=require('http'),path=require('path');

const root=path.resolve(__dirname,'..');
const evidence='E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02/turc/c1a';
let server,base;

test.beforeAll(async()=>{
  fs.mkdirSync(evidence,{recursive:true});
  server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '')||'index.html';fs.readFile(path.join(root,rel),(error,body)=>{if(error){res.statusCode=404;return res.end('missing')}res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(body)})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async()=>new Promise(resolve=>server.close(resolve)));

async function sampleUntil(page,predicate,timeout=12000){const started=Date.now();while(Date.now()-started<timeout){const s=await page.evaluate(()=>__TMB_A12__.getState());if(predicate(s))return s;await page.waitForTimeout(6)}throw new Error(`sample timeout after ${timeout}ms`)}

async function bootD01(page){
  await page.setViewportSize({width:1280,height:720});
  await page.goto(base+'#debug');
  await page.waitForFunction(()=>window.__TMB_A12__);
  const choice=page.locator('.characterChoice:visible').first();if(await choice.count())await choice.click();
  await page.evaluate(()=>{__TMB_A12__.renderWorldOnRoute('dock31','D01');__TMB_A12__.startRoute('D01')});
  await sampleUntil(page,s=>s.route?.id==='D01'||s.routeId==='D01'||s.route?.catchableSurfaces?.length>=3);
}

function wallFor(route,surface){return route.groundSegments.find(o=>o.id===surface.id)}
async function placeBefore(page,route,wall,dir){await page.evaluate(({route,wall,dir})=>{const s=__TMB_A12__.getState(),cx=wall.x+(dir<0?wall.w+105:-105),g=route.groundSegments.find(v=>cx>=v.x&&cx<=v.x+v.w);if(!g)throw new Error(`no ground below ${wall.id}`);__TMB_A12__.placePlayer(cx-s.hitbox.w/2,g.y-s.hitbox.h)}, {route,wall,dir})}

async function touch(page,hold){
  const cdp=await page.context().newCDPSession(page),joy={x:155,y:650,id:1,radiusX:2,radiusY:2,force:1},jump={x:1125,y:625,id:2,radiusX:2,radiusY:2,force:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joy,jump]});
  if(!hold){await page.waitForTimeout(80);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[joy]})}
  return async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()};
}

async function pixels(page,s){return page.evaluate(s=>{const c=document.querySelector('#game'),g=c.getContext('2d');__tmbCampaignDraw();const tr=g.getTransform(),cam=Math.max(0,s.player.x-s.viewport.w*.3),x=Math.round(tr.a*(s.player.x-cam)+tr.e),y=Math.round(tr.d*(s.player.y+s.cameraWorldY)+tr.f),w=Math.max(1,Math.round(tr.a*s.hitbox.w)),h=Math.max(1,Math.round(tr.d*s.hitbox.h)),data=g.getImageData(Math.max(0,x),Math.max(0,y),Math.min(w,c.width-Math.max(0,x)),Math.min(h,c.height-Math.max(0,y))).data;let n=0,sum=0,sum2=0;for(let i=0;i<data.length;i+=4)for(let k=0;k<3;k++){const v=data[i+k];n++;sum+=v;sum2+=v*v}return{std:Math.sqrt(sum2/n-(sum/n)**2),hash:Array.from(data).reduce((h,v)=>((h*33)^v)>>>0,5381).toString(16)}},s)}
async function alphaBox(page,pose){return page.evaluate(async pose=>{const s=__TMB_A12__.getState(),runner=s.runnerId||'male',outfit=JSON.parse(localStorage.getItem('trust_me_bro_last_delivery_v2_save')||'{}')?.v36?.equippedOutfitByRunner?.[runner]||'default',contract=await fetch('sprites/a5/atlas-contract.json').then(r=>r.json()),img=new Image();img.src=`sprites/a5/${runner}-${outfit}-full.png`;await img.decode();const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.drawImage(img,pose.frame*64,contract.motions[pose.motion].row*64,64,64,0,0,64,64);const d=g.getImageData(0,0,64,64).data;let min=64,max=-1;for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(d[(y*64+x)*4+3]){min=Math.min(min,x);max=Math.max(max,x)}return{min:min-32,max:max-32}},pose)}

async function runVariant(page,surfaceIndex,kind,hold){
  await bootD01(page);const route=await page.evaluate(()=>__TMB_A12__.routeDefinition('D01')),surface=route.catchableSurfaces[surfaceIndex],wall=wallFor(route,surface),dir=surface.dir||1;if(!wall)throw new Error(`wall ${surface.id} missing`);await placeBefore(page,route,wall,dir);
  let releaseTouch=null;const moveKey=dir<0?'ArrowLeft':'ArrowRight';if(kind==='keyboard'){await page.keyboard.down(moveKey);await page.keyboard.down('ArrowUp');if(!hold){await page.waitForTimeout(80);await page.keyboard.up('ArrowUp')}}else releaseTouch=await touch(page,hold);
  const trace=[],proof={};let endClock=null;
  for(let i=0;i<900;i++){
    const s=await page.evaluate(()=>__TMB_A12__.getState()),phase=s.edgeClimb?.phase||null,row={i,gameClock:s.gameClock,parkour:s.parkour.state,edgeClimb:s.edgeClimb,player:{...s.player,w:s.hitbox.w,h:s.hitbox.h},wallTop:wall.y,keys:{jump:!!s.input?.jump},vectorJumpPending:s.vectorJumpPending,pose:s.pose};trace.push(row);
    if(s.edgeClimb&&!proof.catch){proof.catch={i,state:s.parkour.state,pixel:await pixels(page,s)};await page.screenshot({path:path.join(evidence,`${surfaceIndex+1}-${kind}-${hold?'hold':'tap'}-catch.png`)});await page.waitForTimeout(20);proof.catch.neighbor=await pixels(page,await page.evaluate(()=>__TMB_A12__.getState()))}
    if(s.edgeClimb&&s.edgeClimb.elapsed>=s.edgeClimb.duration*.45&&!proof.mid){proof.mid={i,state:s.parkour.state,pixel:await pixels(page,s)};await page.screenshot({path:path.join(evidence,`${surfaceIndex+1}-${kind}-${hold?'hold':'tap'}-mid.png`)});await page.waitForTimeout(20);proof.mid.neighbor=await pixels(page,await page.evaluate(()=>__TMB_A12__.getState()))}
    if(!s.edgeClimb&&proof.mid&&endClock===null){endClock=s.gameClock;proof.end={i,state:s.parkour.state,pixel:await pixels(page,s),keysJump:!!s.input?.jump,pending:s.vectorJumpPending};await page.screenshot({path:path.join(evidence,`${surfaceIndex+1}-${kind}-${hold?'hold':'tap'}-end.png`)});await page.waitForTimeout(20);proof.end.neighbor=await pixels(page,await page.evaluate(()=>__TMB_A12__.getState()))}
    if(hold&&endClock!==null&&s.gameClock-endClock>=.3){await page.keyboard.up('ArrowUp');if(releaseTouch){await releaseTouch();releaseTouch=null}}
    if(endClock!==null&&s.gameClock-endClock>=.6)break;await page.waitForTimeout(6)
  }
  await page.keyboard.up('ArrowUp');await page.keyboard.up(moveKey);if(releaseTouch)await releaseTouch();
  const active=trace.filter(r=>r.edgeClimb),t1bad=active.filter(r=>r.pose?.motion!=='wallRun'||r.pose.frame!==Math.floor(Math.min(.999,r.edgeClimb.elapsed/r.edgeClimb.duration)*8));let maxPen=0;for(const r of active){const b=await alphaBox(page,r.pose),center=r.player.x+r.player.w/2,facing=r.player.vx<0?-1:1,left=center+(facing<0?-b.max:b.min),right=center+(facing<0?-b.min:b.max);maxPen=Math.max(maxPen,dir>0?right-wall.x:wall.x+wall.w-left)}
  const after=endClock===null?[]:trace.filter(r=>r.gameClock>=endClock&&r.gameClock-endClock<=.6),minFeet=after.length?Math.min(...after.map(r=>r.player.y+r.player.h)):null,firstVy=after.find(r=>r.player.vy<0),points=Object.values(proof),t4=points.length===3&&points.every(p=>p.state&&p.pixel.std>0&&p.pixel.hash!==p.neighbor.hash);
  return{surface:surface.id,variant:`${kind}-${hold?'hold':'tap'}`,wallTop:wall.y,T1:{bad:t1bad.length,active:active.length,pass:active.length>0&&t1bad.length===0},T2:{maxPen:+maxPen.toFixed(3),pass:maxPen<=4},T3:{minFeet:minFeet===null?null:+minFeet.toFixed(3),floor:+(wall.y-8).toFixed(3),pass:minFeet!==null&&minFeet>=wall.y-8},T4:{proof,pass:t4},hypothesis:{endKeysJump:proof.end?.keysJump??null,endPending:proof.end?.pending??null,firstNegativeVy:firstVy?{i:firstVy.i,gameClock:firstVy.gameClock,vy:firstVy.player.vy}:null},trace};
}

test('D01 first three catchable surfaces x four input variants',async({page})=>{test.setTimeout(295000);const results=[];for(let surface=0;surface<3;surface++)for(const [kind,hold] of [['keyboard',false],['keyboard',true],['touch',false],['touch',true]]){const result=await runVariant(page,surface,kind,hold);results.push(result);fs.writeFileSync(path.join(evidence,`${surface+1}-${kind}-${hold?'hold':'tap'}.json`),JSON.stringify(result,null,2));console.log('TURC',JSON.stringify({...result,trace:undefined}));expect.soft(result.T1.pass,`${result.surface} ${result.variant} T1`).toBeTruthy();expect.soft(result.T2.pass,`${result.surface} ${result.variant} T2`).toBeTruthy();expect.soft(result.T3.pass,`${result.surface} ${result.variant} T3`).toBeTruthy();expect.soft(result.T4.pass,`${result.surface} ${result.variant} T4`).toBeTruthy()}fs.writeFileSync(path.join(evidence,'summary.json'),JSON.stringify(results.map(r=>({...r,trace:undefined})),null,2))});
