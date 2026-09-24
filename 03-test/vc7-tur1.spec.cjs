"use strict";
const { test, expect } = require("playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
let server, base;
const harness = String.raw`
window.__vc7Setup=(level,part)=>{if(rafId)cancelAnimationFrame(rafId);rafId=0;loopRunning=false;systemPaused=false;currentLevel=31;currentPart=2;dead=won=upgradePending=characterSelectOpen=livesPending=adPending=false;deathDeadline=0;collected.clear();coins=deaths=partDeaths=0;resetScene(false);spawnGrace=10;rt.done=true;rt.enemies=[];rt.fish=[];rt.fans=[];keys.left=keys.right=keys.jump=false;if(toastT>0&&toastT!==99)update(4);currentLevel=level;currentPart=part;resetScene(false);spawnGrace=0;rt.enemies=[];rt.fish=[];rt.fans=[];window.__tmbWarningDraw=true};
window.__vc7View=()=>({scale:viewScale,ox:viewOffsetX,oy:viewOffsetY});
window.__vc7ForceResize=()=>{if(resizeFrame)cancelAnimationFrame(resizeFrame);resizeFrame=0;resize();return{viewportW,viewportH,canvasW:c.width/dpr,canvasH:c.height/dpr}};
window.__vc7Pads=()=>{const out=[];for(let l=1;l<=31;l++)for(let p=1;p<=2;p++)selectLaunchPads(l,p).forEach((q,i)=>out.push({level:l,part:p,index:i,box:q.box,landingX:validateScene(l,p).launchPads[i].landingX}));return out};
window.__vc7PadTrial=(level,part,index)=>{__vc7Setup(level,part);const pad=rt.launchPads[index],p=pad.box,dt=1/120;rt.done=true;cachedSolidRects=[];cachedGroundSegments=[];cachedStaticPlatforms=[];speedLevel=1;speedHold=2.2;speedHoldDir=1;player.x=p.x-player.w-270;player.y=p.y-player.h;player.vx=400;player.vy=0;player.onGround=true;keys.right=true;let warningFrame=null,contactFrame=null;for(let i=0;i<180;i++){player.y=p.y-player.h;player.vx=400;player.vy=0;player.onGround=true;update(dt);if(warningFrame===null&&pad.warningStarted)warningFrame=i+1;if(player.x+player.w>p.x){contactFrame=i+1;break}}keys.right=false;return{level,part,index,warningFrame,contactFrame,ms:warningFrame!==null&&contactFrame!==null?(contactFrame-warningFrame)*dt*1000:null,input:'real game update() 120 Hz; speedLevel=1; speedHold=2.2; vx=400; collision-free measured approach lane; contact=player/pad overlap'}};
const __vc7Diff=(a,b)=>{let sum=0,changed=0,n=0;for(let i=0;i<a.length;i+=4){const d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;sum+=d;if(d>12)changed++;n++}return{mean:sum/n,changedRatio:changed/n,pixels:n}};
window.__vc7PadPixels=()=>{const q=__vc7Pads()[0];__vc7Setup(q.level,q.part);const pad=rt.launchPads[q.index],c=document.getElementById('game'),g=c.getContext('2d');player.x=pad.box.x-player.w-80;player.y=pad.box.y-player.h;cam=Math.max(sceneStart()-cameraPadLeft,pad.box.x-300);pad.warningStarted=false;draw();const x=Math.max(0,Math.floor(pad.box.x-cam-18)),y=Math.max(0,Math.floor(pad.box.y-48)),w=pad.box.w+60,h=60,A=g.getImageData(x,y,w,h).data;pad.warningStarted=true;window.__tmbWarningDraw=true;draw();const B=g.getImageData(x,y,w,h).data;window.__tmbWarningDraw=false;draw();const C=g.getImageData(x,y,w,h).data;window.__tmbWarningDraw=true;return{positive:__vc7Diff(A,B),negative:__vc7Diff(A,C),box:{x,y,w,h}}};
window.__vc7SpikeTrial=(part)=>{__vc7Setup(13,part);const sc=scene(),x=sc.start+rt.a.trap.trigger,dt=1/120;player.x=x+1;player.y=GROUND-player.h;player.onGround=true;let armedFrame=null,lethalFrame=null,safe=true;for(let i=0;i<180&&!dead;i++){update(dt);if(armedFrame===null&&rt.armed){armedFrame=i+1;player.x=rt.spikeX+20;player.y=GROUND-player.h}if(rt.armed&&rt.warning>0&&dead)safe=false;if(dead)lethalFrame=i+1}return{part,armedFrame,lethalFrame,ms:(lethalFrame-armedFrame)*dt*1000,telegraphSafe:safe,input:'real game update() 120 Hz; player held inside spike hitbox'}};
window.__vc7SpikePixels=(part)=>{__vc7Setup(13,part);const sc=scene(),x=sc.start+rt.a.trap.trigger,c=document.getElementById('game'),g=c.getContext('2d');cam=x-300;player.x=x+1;player.y=GROUND-player.h;update(1/120);const bx=Math.floor(x-cam-15),by=GROUND-42,w=115,h=42;window.__tmbWarningDraw=false;draw();const A=g.getImageData(bx,by,w,h).data;window.__tmbWarningDraw=true;draw();const B=g.getImageData(bx,by,w,h).data;window.__tmbWarningDraw=false;draw();const C=g.getImageData(bx,by,w,h).data;window.__tmbWarningDraw=true;return{positive:__vc7Diff(A,B),negative:__vc7Diff(A,C)}};
window.__vc7CapturePad=(warning)=>{const q=__vc7Pads()[0];__vc7Setup(q.level,q.part);const pad=rt.launchPads[q.index],gap=warning?120:270,dt=1/120;player.x=pad.box.x-player.w-gap;player.y=pad.box.y-player.h;player.vx=0;player.vy=0;player.onGround=true;update(dt);if(Boolean(pad.warningStarted)!==warning)throw Error('pad phase mismatch warning='+warning+' started='+pad.warningStarted);player.x=pad.box.x-player.w-gap;player.y=pad.box.y-player.h;player.vx=player.vy=0;player.onGround=true;cam=Math.max(sceneStart()-cameraPadLeft,Math.min(sceneStart()+SCENE_W-W,player.x-W*.31));draw();return{phaseTick:1,warningStarted:pad.warningStarted,warn:pad.warn,padRegion:{x:Math.floor(pad.box.x-cam-18),y:Math.floor(worldY+pad.box.y-48),w:pad.box.w+60,h:60},playerRegion:{x:Math.floor(player.x-cam),y:Math.floor(worldY+player.y),w:player.w,h:player.h}}};
window.__vc7CaptureSpike=(stage)=>{__vc7Setup(13,1);const trigger=scene().start+rt.a.trap.trigger,dt=1/120;player.x=stage==='before'?trigger-90:trigger+1;player.y=GROUND-player.h;player.vx=0;player.vy=0;player.onGround=true;let ticks=0;if(stage!=='before'){update(dt);ticks++;const target=stage==='telegraph'?35:95;while(ticks<target){player.x=trigger-55;player.y=GROUND-player.h;player.vx=player.vy=0;player.onGround=true;update(dt);ticks++}}const telegraph=rt.armed&&rt.warning>0,lethal=rt.armed&&rt.warning<=0;if(stage==='before'&&(rt.armed||rt.warning>0))throw Error('spike before phase mismatch armed='+rt.armed+' warning='+rt.warning);if(stage==='telegraph'&&!telegraph)throw Error('spike telegraph phase mismatch tick='+ticks+' armed='+rt.armed+' warning='+rt.warning);if(stage==='lethal'&&!lethal)throw Error('spike lethal phase mismatch tick='+ticks+' armed='+rt.armed+' warning='+rt.warning);player.x=trigger-55;player.y=GROUND-player.h;player.vx=player.vy=0;player.onGround=true;cam=Math.max(sceneStart()-cameraPadLeft,Math.min(sceneStart()+SCENE_W-W,player.x-W*.31));draw();return{phaseTick:ticks,telegraph,lethal,warning:rt.warning,armed:rt.armed,spikeX:rt.spikeX,groundRegion:{x:Math.floor((Number.isFinite(rt.spikeX)?rt.spikeX:trigger)-cam-20),y:Math.floor(worldY+GROUND-48),w:150,h:48},spikeRegion:{x:Math.floor(rt.spikeX-cam-10),y:Math.floor(worldY+GROUND-45),w:155,h:45},playerRegion:{x:Math.floor(player.x-cam),y:Math.floor(worldY+player.y),w:player.w,h:player.h}}};
window.__vc7CaptureFrame=(name)=>{window.__vc7VisualMs=window.__vc7FixedVisualMs==null?performance.now():window.__vc7FixedVisualMs;try{const state=name==='pad-uyarisiz'?__vc7CapturePad(false):name==='pad-uyari'?__vc7CapturePad(true):name==='diken-oncesi'?__vc7CaptureSpike('before'):name==='diken-telegraph'?__vc7CaptureSpike('telegraph'):__vc7CaptureSpike('lethal');if(dead||deathDeadline!==0||toastT>0)throw Error('toast covers capture name='+name+' dead='+dead+' deathDeadline='+deathDeadline+' toastT='+toastT+' toast='+toast);const c=document.getElementById('game'),g=c.getContext('2d'),cs=()=>{const m=g.getTransform();return{alpha:g.globalAlpha,composite:g.globalCompositeOperation,filter:g.filter,shadowBlur:g.shadowBlur,shadowColor:g.shadowColor,lineWidth:g.lineWidth,lineCap:g.lineCap,fillStyle:String(g.fillStyle),strokeStyle:String(g.strokeStyle),transform:[m.a,m.b,m.c,m.d,m.e,m.f]}};const contextBefore=cs();window.__tmbWarningDraw=true;draw();const contextAfter=cs(),pixels=g.getImageData(0,0,c.width,c.height),snap=document.createElement('canvas');snap.width=c.width;snap.height=c.height;snap.getContext('2d').putImageData(pixels,0,0);const orange=(d)=>{let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>200&&d[i+1]<150&&d[i+2]<110)n++;return n},css=c.getBoundingClientRect(),tr=__vc7View(),region=state.groundRegion||state.spikeRegion||null,sx=c.width/css.width,sy=c.height/css.height,pr=region?{x:Math.max(0,Math.floor((region.x*tr.scale+tr.ox)*sx)),y:Math.max(0,Math.floor((region.y*tr.scale+tr.oy)*sy)),w:Math.max(1,Math.floor(region.w*tr.scale*sx)),h:Math.max(1,Math.floor(region.h*tr.scale*sy))}:null,rd=pr?g.getImageData(pr.x,pr.y,Math.min(pr.w,c.width-pr.x),Math.min(pr.h,c.height-pr.y)).data:null,triggerX=scene().start+rt.a.trap.trigger,spikeWorldX=Number.isFinite(rt.spikeX)?rt.spikeX:triggerX,cameraTarget=Math.max(sceneStart()-cameraPadLeft,Math.min(sceneStart()+SCENE_W-W,player.x-W*anchorFrac));return{state,visualMs:window.__vc7VisualMs,transform:tr,dataUrl:snap.toDataURL('image/png'),diag:{toast,toastT,deathToast,dead,deathDeadline,contextBefore,contextAfter,contextTrack:window.__vc7ContextTrack?.(g)||null,pngState:window.__tmb?.pngState||null,trapImagePath:'procedural-canvas-no-Image',canvas:{width:c.width,height:c.height,cssWidth:css.width,cssHeight:css.height},devicePixelRatio,viewScale,viewOffsetX,viewOffsetY,isPortrait,W,H,viewportW,viewportH,worldY,regionCss:region,regionPixels:pr,orangeRegion:rd?orange(rd):null,orangeFull:orange(pixels.data),fonts:document.fonts?.status||null,loopRunning,systemPaused,rafId,rafDiag:window.__vc7RafDiag?{...window.__vc7RafDiag}:null,cam,cameraTarget,anchorFrac,playerX:player.x,triggerX,spikeX:rt.spikeX,telegraphScreen:{left:(spikeWorldX-cam)*viewScale+viewOffsetX,right:(spikeWorldX+80-cam)*viewScale+viewOffsetX},visibleHorizontal:{left:0,right:viewportW},armed:rt.armed,warning:rt.warning,spikeHeight:rt.warning>0?'telegraph-tips-6-10px':'lethal-28px',done:rt.done,t:rt.t}}}finally{window.__vc7VisualMs=null}};
window.__vc7CaptureFrames=(names)=>{const out={};for(const name of names)out[name]=__vc7CaptureFrame(name);return out};
window.__vc7PrimeDeathToast=()=>{__vc7Setup(13,1);spawnGrace=0;kill('Forward was the correct answer.','spike');return{dead,toast,toastT,deathToast}};
window.__vc7CanvasStd=()=>{const c=document.getElementById('game'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0,sum2=0,n=0;for(let i=0;i<d.length;i+=4){const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=y;sum2+=y*y;n++}const mean=sum/n;return{width:c.width,height:c.height,std:Math.sqrt(sum2/n-mean*mean)}};
`;
const captureHarness = harness;
const fixedVisualMs = process.env.VC7_VISUAL_MS === "wall" ? null : Number(process.env.VC7_VISUAL_MS || 25);
async function finishGameFlow(page) {
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  if (await page.locator("#characterSelect.show").isVisible())
    await page.locator(".characterChoice").last().click();
  await page.waitForFunction(() => !__tmb.characterSelectOpen);
  await page.waitForFunction(
    () =>
      !document.getElementById("introOverlay") &&
      !document.querySelector("#bootOverlay:not(.hidden)") &&
      !document.querySelector("#missionBrief.show"),
  );
}
async function assertNoCanvasCover(page) {
  const covered = await page.evaluate(() => {
    const c = document.getElementById("game"),
      r = c.getBoundingClientRect(),
      modalish =
        /overlay|modal|panel|brief|card|select|complete|upgrade|lives/i;
    return [...document.body.querySelectorAll("*")]
      .filter((e) => e !== c && !c.contains(e) && !e.contains(c))
      .map((e) => {
        const s = getComputedStyle(e),
          b = e.getBoundingClientRect(),
          ix = Math.max(
            0,
            Math.min(r.right, b.right) - Math.max(r.left, b.left),
          ),
          iy = Math.max(
            0,
            Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top),
          ),
          ratio = (ix * iy) / (r.width * r.height);
        return { e, s, b, ratio };
      })
      .filter(
        (x) =>
          x.s.display !== "none" &&
          x.s.visibility !== "hidden" &&
          Number(x.s.opacity) > 0 &&
          x.b.width > 0 &&
          x.b.height > 0 &&
          x.ratio > 0 &&
          (x.ratio > 0.05 || modalish.test(`${x.e.id} ${x.e.className}`)),
      )
      .map((x) => ({
        tag: x.e.tagName,
        id: x.e.id,
        class: String(x.e.className),
        ratio: x.ratio,
        display: x.s.display,
        opacity: x.s.opacity,
        bbox: { x: x.b.x, y: x.b.y, w: x.b.width, h: x.b.height },
      }));
  });
  expect(
    covered,
    `visible DOM elements covering canvas: ${JSON.stringify(covered)}`,
  ).toEqual([]);
}
async function readPngPixels(page, file) {
  const url =
      "data:image/png;base64," + fs.readFileSync(file).toString("base64"),
    png = await page.evaluate(async (url) => {
      const im = new Image();
      im.src = url;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const g = c.getContext("2d");
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let s = "";
      for (let i = 0; i < d.length; i += 32768)
        s += String.fromCharCode(...d.subarray(i, i + 32768));
      return { width: c.width, height: c.height, b64: btoa(s) };
    }, url);
  return {
    width: png.width,
    height: png.height,
    data: Buffer.from(png.b64, "base64"),
  };
}
const crop = (png, r) => {
  const out = [],
    x0 = Math.max(0, r.x | 0),
    y0 = Math.max(0, r.y | 0),
    x1 = Math.min(png.width, Math.ceil(r.x + r.w)),
    y1 = Math.min(png.height, Math.ceil(r.y + r.h));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      out.push(png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]);
    }
  return out;
};
const changedRatio = (a, b) => {
  let changed = 0,
    n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
    if (
      Math.abs(a[i] - b[i]) +
        Math.abs(a[i + 1] - b[i + 1]) +
        Math.abs(a[i + 2] - b[i + 2]) >
      24
    )
      changed++;
    n++;
  }
  return changed / n;
};
const playerContrast = (png, r) => {
  let inside = 0,
    insideN = 0,
    ring = 0,
    ringN = 0;
  const x0 = Math.max(0, Math.floor(r.x - 4)),
    y0 = Math.max(0, Math.floor(r.y - 4)),
    x1 = Math.min(png.width, Math.ceil(r.x + r.w + 4)),
    y1 = Math.min(png.height, Math.ceil(r.y + r.h + 4));
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4,
        v = (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        inside += v;
        insideN++;
      } else {
        ring += v;
        ringN++;
      }
    }
  return Math.abs(inside / insideN - ring / ringN);
};
test.beforeAll(async () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  server = http.createServer((req, res) => {
    const rel =
        decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
          /^\/+/,
          "",
        ) || "index.html",
      file = path.join(root, rel);
    fs.readFile(file, (e, b) => {
      if (e) {
        res.statusCode = 404;
        return res.end("missing");
      }
      if (rel === "index.html")
        b = Buffer.from(
          b
            .toString()
            .replaceAll("performance.now()/80", "(window.__vc7VisualMs??performance.now())/80")
            .replaceAll("performance.now()/105", "(window.__vc7VisualMs??performance.now())/105")
            .replaceAll("performance.now()/75", "(window.__vc7VisualMs??performance.now())/75")
            .replaceAll("performance.now()/38", "(window.__vc7VisualMs??performance.now())/38")
            .replaceAll("performance.now()/31", "(window.__vc7VisualMs??performance.now())/31")
            .replaceAll("performance.now()/37", "(window.__vc7VisualMs??performance.now())/37")
            .replace(
              /\}\)\(\);\s*<\/script><\/body><\/html>\s*$/,
          `window.__vc7FixedVisualMs=${JSON.stringify(fixedVisualMs)};\n${captureHarness}\n})();\n</script></body></html>`,
            ),
        );
      res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug${process.env.VC7_SUPPRESS_TELEMETRY === "1" ? "&telemetryOff" : ""}`;
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});
test.beforeEach(async ({ page }) => {
  const randomSeed = process.env.VC7_RANDOM_SEED ?? null;
  const traceRandom = process.env.VC7_RANDOM_TRACE === "1";
  const flakeDiag = process.env.VC7_FLAKE_DIAG === "1";
  await page.addInitScript(({ randomSeed, traceRandom, flakeDiag }) => {
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.__vc7RafDiag = { requested: 0, fired: 0, lastFiredAt: null };
    if (flakeDiag) window.requestAnimationFrame = (callback) => {
      window.__vc7RafDiag.requested++;
      return nativeRaf((time) => {
        window.__vc7RafDiag.fired++;
        window.__vc7RafDiag.lastFiredAt = time;
        return callback(time);
      });
    };
    if (randomSeed !== null) {
      let state = Number(randomSeed) >>> 0;
      const calls = [];
      Math.random = () => {
        state += 0x6d2b79f5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        calls.push({ index: calls.length, value, stack: traceRandom ? new Error().stack : null });
        return value;
      };
      const fill = (array) => {
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        return array;
      };
      try { Object.defineProperty(Crypto.prototype, 'getRandomValues', { configurable: true, value: fill }); } catch {}
      try { Object.defineProperty(Crypto.prototype, 'randomUUID', { configurable: true, value: () => {
        const b = fill(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
        const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
      } }); } catch {}
      window.__vc7RandomTrace = calls;
    }
    const p = CanvasRenderingContext2D.prototype,
      save = p.save,
      restore = p.restore,
      clip = p.clip,
      states = new WeakMap(),
      state = (ctx) => {
        if (!states.has(ctx)) states.set(ctx, { depth: 0, clips: 0, underflow: 0 });
        return states.get(ctx);
      };
    if (flakeDiag) {
      p.save = function (...a) { state(this).depth++; return save.apply(this, a); };
      p.restore = function (...a) { const s=state(this); if(s.depth>0)s.depth--;else s.underflow++; return restore.apply(this, a); };
      p.clip = function (...a) { state(this).clips++; return clip.apply(this, a); };
      window.__vc7ContextTrack = (ctx) => ({ ...state(ctx) });
    }
  }, { randomSeed, traceRandom, flakeDiag });
  const rate = Number(process.env.VC7_CPU_THROTTLE || 1);
  if (rate > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  }
});
test("VC7 TUR1 warning acceptance measurements", async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto(base);
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  await page.locator("#characterSelect.show").waitFor();
  await page.locator(".characterChoice").first().click();
  await page.waitForFunction(() => !__tmb.characterSelectOpen);
  const pads = await page.evaluate(() => __vc7Pads()),
    padTrials = [];
  for (const p of pads)
    padTrials.push(
      await page.evaluate((p) => __vc7PadTrial(p.level, p.part, p.index), p),
    );
  const padPixels = await page.evaluate(() => __vc7PadPixels());
  const spikeTrials = [];
  for (const part of [1, 2])
    for (let n = 0; n < 5; n++)
      spikeTrials.push(await page.evaluate((p) => __vc7SpikeTrial(p), part));
  const spikePixels = await page.evaluate(() => __vc7SpikePixels(1));
  const out = { pads, padTrials, padPixels, spikeTrials, spikePixels };
  fs.writeFileSync(
    path.join(__dirname, "VC7-TUR1-MEASUREMENTS.json"),
    JSON.stringify(out, null, 2),
  );
  expect(pads).toHaveLength(28);
  expect(
    Math.min(...padTrials.map((x) => x.ms)),
    `minimum measured pad warning ${Math.min(...padTrials.map((x) => x.ms))} ms`,
  ).toBeGreaterThanOrEqual(600);
  expect(padPixels.positive.changedRatio).toBeGreaterThan(0.01);
  expect(padPixels.negative.changedRatio).toBe(0);
  expect(Math.min(...spikeTrials.map((x) => x.ms))).toBeGreaterThanOrEqual(600);
  expect(spikeTrials.every((x) => x.telegraphSafe)).toBe(true);
  expect(spikePixels.positive.changedRatio).toBeGreaterThan(0.01);
  expect(spikePixels.negative.changedRatio).toBe(0);
});
test("VC7 TUR1B canvas PNG evidence 16:9 and 9:16", async ({ page }) => {
  test.setTimeout(120000);
  const dir = path.join(__dirname, "vc7-tur1b");
  fs.mkdirSync(dir, { recursive: true });
  const all = {};
  for (const view of [
    { tag: "16x9", width: 960, height: 540 },
    { tag: "9x16", width: 540, height: 960 },
  ]) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.goto(base);
    await finishGameFlow(page);
    const layout = await page.evaluate(() => __vc7ForceResize());
    expect(layout, `${view.tag} synchronous viewport layout`).toEqual({
      viewportW: view.width,
      viewportH: view.height,
      canvasW: view.width,
      canvasH: view.height,
    });
    await assertNoCanvasCover(page);
    const frames = [
        "pad-uyarisiz",
        "pad-uyari",
        "diken-oncesi",
        "diken-telegraph",
        "diken-olumcul",
      ],
      results = {};
    for (const name of frames) {
      if (name === "diken-telegraph" && process.env.VC7_PRIME_DEATH_TOAST === "1")
        await page.evaluate(() => __vc7PrimeDeathToast());
      const captured = await page.evaluate((frameName) => __vc7CaptureFrame(frameName), name),
        state = captured.state,
        transform = captured.transform,
        dataUrl = captured.dataUrl,
        file = path.join(dir, `${name}-${view.tag}.png`);
      fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
      const png = await readPngPixels(page, file),
        sx = png.width / view.width,
        sy = png.height / view.height,
        scaled = (r) => ({
          x: (r.x * transform.scale + transform.ox) * sx,
          y: (r.y * transform.scale + transform.oy) * sy,
          w: r.w * transform.scale * sx,
          h: r.h * transform.scale * sy,
        }),
        contrast = playerContrast(png, scaled(state.playerRegion));
      expect(
        [png.width, png.height],
        `${name}-${view.tag} decoded PNG dimensions`,
      ).toEqual([view.width, view.height]);
      expect(
        contrast,
        `${name}-${view.tag} player/background contrast`,
      ).toBeGreaterThanOrEqual(1.5);
      results[name] = {
        state: {
          ...state,
          padRegion: state.padRegion && scaled(state.padRegion),
          groundRegion: state.groundRegion && scaled(state.groundRegion),
          spikeRegion: state.spikeRegion && scaled(state.spikeRegion),
        },
        contrast,
        transform,
        png,
        file,
        diag: captured.diag,
      };
    }
    const padBox = {
        ...results["pad-uyarisiz"].state.padRegion,
        w: 90,
        height: 70,
        h: 70,
      },
      padA = crop(results["pad-uyarisiz"].png, padBox),
      padB = crop(results["pad-uyari"].png, padBox),
      padChanged = Math.round(changedRatio(padA, padB) * (padA.length / 4));
    const spikeBox = {
        ...results["diken-telegraph"].state.groundRegion,
        w: 120,
        h: 50,
      },
      spikeA = crop(results["diken-oncesi"].png, spikeBox),
      spikeB = crop(results["diken-telegraph"].png, spikeBox),
      spikeRatio = changedRatio(spikeA, spikeB),
      tele = crop(results["diken-telegraph"].png, spikeBox);
    let teleOrange = 0;
    for (let i = 0; i < tele.length; i += 4)
      if (tele[i] > 200 && tele[i + 1] < 150 && tele[i + 2] < 110) teleOrange++;
    all[view.tag] = {
      telegraphPhaseTick: results["diken-telegraph"].state.phaseTick,
      telegraphWarning: results["diken-telegraph"].state.warning,
      fixedVisualMs,
      padChangedPixels: padChanged,
      spikeChangedRatio: spikeRatio,
      telegraphOrangePixels: teleOrange,
      captureDiag: Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.diag])),
      randomTrace: await page.evaluate(() => window.__vc7RandomTrace || []),
      playerContrast: Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.contrast])),
      files: Object.fromEntries(Object.entries(results).map(([k,v])=>[k,v.file])),
    };
    if (process.env.VC7_FLAKE_DIAG === "1") {
      const diagDir = path.join(__dirname, "vc7-tur2", "flake-runs");
      fs.mkdirSync(diagDir, { recursive: true });
      fs.writeFileSync(path.join(diagDir, `${process.pid}.json`), JSON.stringify(all, null, 2));
      if (view.tag === "9x16" && teleOrange < 150)
        fs.copyFileSync(results["diken-telegraph"].file, path.join(diagDir, `bad-9x16-${process.pid}.png`));
    }
    if (process.env.VC7_FLAKE_DIAG !== "1") expect(padChanged, `${view.tag} pad changed pixels`).toBeGreaterThanOrEqual(
      900,
    );
    if (process.env.VC7_FLAKE_DIAG !== "1") expect(
      spikeRatio,
      `${view.tag} telegraph changed ratio`,
    ).toBeGreaterThanOrEqual(0.15);
    if (process.env.VC7_FLAKE_DIAG !== "1") expect(
      teleOrange,
      `${view.tag} telegraph orange-red pixels tick=${results["diken-telegraph"].state.phaseTick} warning=${results["diken-telegraph"].state.warning} ratio=${spikeRatio}`,
    ).toBeGreaterThanOrEqual(150);
  }
  fs.writeFileSync(
    path.join(__dirname, "VC7-TUR1B-PNG-MEASUREMENTS.json"),
    JSON.stringify(all, null, 2),
  );
  console.log("VC7_TUR1B_PNG " + JSON.stringify(all));
});
