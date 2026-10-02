const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

// KABUL TARIFI (P1-P6): 60 Hz gercek zamanli/gercek klavye; bitis sag-kenar>=10260 veya oyun bitis olayi; hareket penceresi jump->inis+0.5 s vectorRollStarts farki; sef ayagi rota verisi zeminine |fark|<=2 (havada degilken); yalniz 390x844 ilk basamak icin ikinci kosum; kare durum+gri std>8+3 kare onceki oyuncu bolgesi ortalamasi farkli; kaynak hunklari 1219-1290.

const root = path.join(__dirname, '..');
const outDir = 'E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/d01';
const catchIds = ['d01-container-1','d01-container-2','d01-container-3','d01-container-4','d01-crane-rail-a','d01-crane-rail-b','d01-crane-boom','d01-deck-2','d01-bridge-roof'];
const slideIds = new Set(['d01-slide-stack','d01-slide-roof','d01-slide-boom','d01-slide-rail','d01-slide-bridge']);
const rises = [
  ['d01-container-1',520,395],['d01-container-2',1050,335],['d01-container-3',1650,275],['d01-container-4',2200,215],
  ['d01-crane-rail-a',4100,275],['d01-crane-rail-b',4700,215],['d01-crane-boom',5300,155],['d01-high-entry',5900,75],
  ['d01-deck-2',8600,275],['d01-bridge-roof',9200,215],
];
const moves = [['d01-vault-dock',230],['d01-vault-stack',1180],['d01-slide-stack',1830],['d01-vault-top',2410],['d01-slide-roof',3050],['d01-vault-roof',3650],['d01-ramp-crane',4260],['d01-vault-crane',4880],['d01-slide-boom',5550],['d01-vault-load',6250],['d01-slide-rail',6900],['d01-vault-borda',7580],['d01-wall-deck',7976],['d01-vault-deck',8790],['d01-slide-bridge',9430]];
const grounds = [[0,520,455],[520,1050,395],[1050,1650,335],[1650,2200,275],[2200,2750,215],[2820,3400,275],[3460,4100,335],[4100,4700,275],[4700,5300,215],[5300,6000,155],[6060,6660,275],[6720,7320,335],[7380,8000,395],[8000,8600,335],[8600,9200,275],[9200,9800,215],[9880,10400,335],[5900,6110,75],[6150,6370,75],[6410,6630,75],[6670,6890,135],[6930,7150,195],[8260,8332,313]];
let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req,res) => {
    const rel = decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root,rel),(error,body) => {
      if(error){res.statusCode=404;return res.end('missing');}
      res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':'application/octet-stream');res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(base+'#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator('.characterChoice:visible').first().click();
  await page.evaluate(() => { __TMB_A12__.renderWorldOnRoute('dock31','D01'); __TMB_A12__.startRoute('D01'); });
  await page.keyboard.down('ArrowRight');
}
async function pixels(page, full=false) {
  return page.evaluate(full => {
    const c=document.querySelector('canvas'),x=c.getContext('2d');
    let n=0,sum=0,sq=0; if(full){const d=x.getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=16){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];sum+=g;sq+=g*g;n++;}}
    const s=__TMB_A12__.getState(), scaleX=c.width/s.viewport.w,scaleY=c.height/s.viewport.h;
    const px=Math.max(0,Math.floor((s.player.x-(s.player.x-s.viewport.w*.3))*scaleX)),py=Math.max(0,Math.floor(s.player.y*scaleY));
    const w=Math.max(1,Math.floor(s.hitbox.w*scaleX)),h=Math.max(1,Math.floor(s.hitbox.h*scaleY));
    const q=x.getImageData(Math.min(c.width-w,px),Math.min(c.height-h,py),w,h).data;let ps=0;for(let i=0;i<q.length;i+=4)ps+=(q[i]+q[i+1]+q[i+2])/3;
    return {std:full?Math.sqrt(sq/n-(sum/n)**2):null,mean:ps/(q.length/4),box:{x:px,y:py,w,h},canvas:{w:c.width,h:c.height}};
  },full);
}
async function saveChecked(page,name,condition,history) {
  expect(condition,`${name} durum assertion`).toBeTruthy();
  const p=await pixels(page,true), prior=history.at(-4);
  expect(p.std,`${name} tekduze kare`).toBeGreaterThan(8);
  expect(prior,`${name} uc kare onceki ornek`).toBeTruthy();
  expect(Math.abs(p.mean-prior.mean),`${name} canvas yenilenmedi`).toBeGreaterThan(.01);
  await page.screenshot({path:path.join(outDir,name)});
}

test('D01 Vector play acceptance', async ({page}) => {
  test.setTimeout(300000);
  console.log('KABUL_TARIFI 60Hz real-time keyboard; P1-P6 fixed (see source first comment)');
  await boot(page,{width:1280,height:720});
  const start=Date.now(), history=[], fired=new Set(), climbs=new Map(), climbed=new Set(), windows={}, samples=[];
  let catchSaved=false,midSaved=false,diveSaved=false,rollSaved=false,maxPen=0,chiefWorst=0,chiefMeasured=0,chiefFalls=0,upper=false;
  let lastState='normal',lastRoll=0,finishedByEdge=false,finishedByEvent=false,diveStarted=false,lastDiveAttempt=-Infinity;
  while(Date.now()-start<180000){
    const s=await page.evaluate(() => __TMB_A12__.getState());
    const p=s.player, right=p.x+s.hitbox.w, feet=p.y+s.hitbox.h, state=s.parkour.state;
    const pix=await pixels(page); history.push(pix); if(history.length>8)history.shift();
    samples.push({t:s.gameClock,x:p.x,y:p.y,onGround:p.onGround,state,roll:s.vectorRollStarts});
    if(s.deaths>0) throw new Error('D1 stop_on death '+JSON.stringify(samples.slice(-10)));
    if(s.chief?.caughtT) throw new Error('D1 stop_on chief caught '+JSON.stringify(s.chief));
    finishedByEdge ||= right>=10260; finishedByEvent ||= !!s.result;
    if(finishedByEdge||finishedByEvent) break;
    if(state==='catch'&&lastState!=='catch') {
      const d=feet-s.edgeClimb.wallTop, expected=.2+.6*Math.max(0,Math.min(1,(d-12)/24));
      climbs.set(s.edgeClimb.wallId,{start:s.gameClock,d,expected,hold:.12,pull:expected-.12});
    }
    if(s.edgeClimb && state==='climb') {
      const c=climbs.get(s.edgeClimb.wallId)||{start:s.gameClock}; c.mid=true; climbs.set(s.edgeClimb.wallId,c);
      if(s.edgeClimb.wallId==='d01-container-1'&&!midSaved&&s.edgeClimb.elapsed>.14&&s.edgeClimb.elapsed<.19){await saveChecked(page,'d01-climb-mid.png',true,history);midSaved=true;}
    }
    for(const [id,c] of climbs) if(!s.edgeClimb&&p.onGround&&!c.end){c.end=s.gameClock;c.duration=c.end-c.start;climbed.add(id);}
    if(s.edgeClimb?.wallId==='d01-container-1'&&!catchSaved){await saveChecked(page,'d01-catch.png',state==='catch',history);catchSaved=true;}
    upper ||= p.y<120&&p.x>=5900&&p.x<7150;
    const solids=[...grounds.map(([a,b,y])=>({x:a,y,w:b-a,h:100})),...s.route.obstacles.filter(o=>o.type==='platform')];
    for(const o of solids){const ox=Math.max(0,Math.min(p.x+s.hitbox.w,o.x+o.w)-Math.max(p.x,o.x)),oy=Math.max(0,Math.min(p.y+s.hitbox.h,o.y+(o.h||100))-Math.max(p.y,o.y));if(ox&&oy)maxPen=Math.max(maxPen,Math.min(ox,oy));}
    if(s.chief){const cf=s.chief.y+(s.chief.h||48),cx=s.chief.x+(s.chief.w||32)/2,g=grounds.filter(v=>cx>=v[0]&&cx<=v[1]).sort((a,b)=>a[2]-b[2])[0];if(g&&Math.abs(s.chief.vy||0)<.01){chiefWorst=Math.max(chiefWorst,Math.abs(cf-g[2]));chiefMeasured++;}if(s.chief.y>720)chiefFalls++;}
    const target=rises.find(([id,x])=>!climbed.has(id)&&right<=x+2);
    const move=moves.find(([id,x])=>x-right>=-2&&x-right<=55);
    if(move&&p.onGround){const gap=move[1]-right,choiceLook=Math.max(40,Math.min(60,Math.abs(p.vx)*.15)),inChoiceWindow=gap>=0&&gap<=choiceLook;if(gap<=2&&p.vx<=0){await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(320);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');}else if(!fired.has(move[0])&&(slideIds.has(move[0])?inChoiceWindow:gap>=18&&gap<=55)){await page.keyboard.down('ArrowUp');await page.waitForTimeout(45);await page.keyboard.up('ArrowUp');fired.add(move[0]);}}
    else if(target&&p.onGround){const gap=target[1]-right;if(gap>=-2&&gap<=58){await page.keyboard.down('ArrowUp');await page.waitForTimeout(45);await page.keyboard.up('ArrowUp');fired.add(target[0]);}}
    const center=p.x+s.hitbox.w/2;
    diveStarted ||= !!s.diveRun||state==='dive';
    if(center>=8060&&center<=8212&&!diveStarted&&p.onGround&&state==='normal'&&s.gameClock-lastDiveAttempt>.04){windows.dive={startRoll:s.vectorRollStarts,startY:feet,start:s.gameClock};await page.keyboard.press('ArrowUp');lastDiveAttempt=s.gameClock;fired.add('dive');}
    const diveBoxLeftGap=8260-p.x;
    if(center>8212&&!diveStarted&&p.onGround&&state==='normal'&&diveBoxLeftGap>=40&&diveBoxLeftGap<=60&&s.gameClock-lastDiveAttempt>.04){await page.keyboard.press('ArrowUp');lastDiveAttempt=s.gameClock;fired.add('dive-fallback');}
    if(s.diveRun&&!diveSaved){await saveChecked(page,'d01-dive.png',state==='dive',history);diveSaved=true;}
    if(fired.has('dive')&&!windows.dive.end&&p.onGround&&center>=8356&&center<=8364){windows.dive.end=s.gameClock;windows.dive.endRoll=s.vectorRollStarts;windows.dive.landX=center;}
    if(center>=9640&&center<=9760&&!fired.has('high')){windows.high={startRoll:s.vectorRollStarts,startY:feet,minFeet:feet,start:s.gameClock};await page.keyboard.press('ArrowUp');fired.add('high');}
    if(windows.high&&!windows.high.end){windows.high.minFeet=Math.min(windows.high.minFeet,feet);if(p.onGround&&center>=9880){windows.high.end=s.gameClock;windows.high.endRoll=s.vectorRollStarts;windows.high.drop=feet-windows.high.minFeet;}}
    if(windows.high?.end&&state==='roll'&&!rollSaved){await saveChecked(page,'d01-roll.png',windows.high.endRoll-windows.high.startRoll===1,history);rollSaved=true;}
    lastState=state;lastRoll=s.vectorRollStarts;
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');
  const end=await page.evaluate(() => __TMB_A12__.getState());
  const durations=[...climbs.entries()].map(([id,c])=>({id,d:c.d,expected:c.expected,measured:c.duration,diff:c.duration-c.expected,hold:c.hold,pull:c.pull}));
  const report={sampleHz:60,elapsed_s:(Date.now()-start)/1000,finishedByEdge,finishedByEvent,deaths:end.deaths,chiefCaught:!!end.chief?.caughtT,player:end.player,input:end.input,climbed:[...climbed],durations,upper,maxPen,high:windows.high,dive:windows.dive,totalRolls:end.vectorRollStarts,chiefWorst,chiefMeasured,chiefFalls,screens:{catchSaved,midSaved,diveSaved,rollSaved}};
  console.log('D01_PLAY '+JSON.stringify(report));
  expect(finishedByEdge||finishedByEvent).toBeTruthy(); expect(end.deaths).toBe(0); expect(end.chief?.caughtT||0).toBe(0);
  expect(catchIds.filter(id=>climbed.has(id)).length).toBeGreaterThanOrEqual(9);
  for(const d of durations) expect(Math.abs(d.diff),`${d.id} duration`).toBeLessThanOrEqual(.03);
  for(const d of durations.filter(v=>catchIds.includes(v.id))) expect(d.measured,`${d.id} low-step duration`).toBeLessThanOrEqual(.26);
  expect(maxPen).toBeLessThanOrEqual(2);
  expect(windows.high?.drop).toBeGreaterThanOrEqual(200); expect(windows.high.endRoll-windows.high.startRoll).toBe(1);
  expect(windows.dive?.landX).toBeGreaterThanOrEqual(8356); expect(windows.dive?.landX).toBeLessThanOrEqual(8364); expect(windows.dive.endRoll-windows.dive.startRoll).toBe(1);
  expect(chiefFalls).toBe(0); expect(chiefMeasured).toBeGreaterThan(0); expect(chiefWorst).toBeLessThanOrEqual(2);
  expect(catchSaved&&midSaved&&diveSaved&&rollSaved).toBeTruthy();
});

test('D01 390x844 first catch frame', async ({page}) => {
  test.setTimeout(45000); await boot(page,{width:390,height:844}); const history=[]; let vault=false,fired=false,saved=false;
  for(let i=0;i<2400&&!saved;i++){
    const s=await page.evaluate(() => __TMB_A12__.getState()),p=s.player,right=p.x+s.hitbox.w;
    history.push(await pixels(page));if(history.length>8)history.shift();
    if(!vault&&p.onGround&&230-right>=18&&230-right<=55){await page.keyboard.down('ArrowUp');await page.waitForTimeout(45);await page.keyboard.up('ArrowUp');vault=true;}
    if(!saved&&p.onGround&&520-right>=-2&&520-right<=58){await page.keyboard.down('ArrowUp');await page.waitForTimeout(45);await page.keyboard.up('ArrowUp');fired=true;}
    if(s.edgeClimb?.wallId==='d01-container-1'&&s.parkour.state==='catch'){
      const px=history.at(-1);expect(px.box.x).toBeGreaterThanOrEqual(0);expect(px.box.x+px.box.w).toBeLessThanOrEqual(px.canvas.w);
      await saveChecked(page,'d01-catch-390x844.png',true,history);saved=true;
    }
    await page.waitForTimeout(16);
  }
  await page.keyboard.up('ArrowRight');expect(saved).toBeTruthy();
});
