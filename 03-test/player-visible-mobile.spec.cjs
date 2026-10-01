const {test,expect,devices}=require('playwright/test');
const fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');let server,origin;
const pixel=devices['Pixel 7'];
test.use({...pixel,viewport:{width:pixel.viewport.height,height:pixel.viewport.width},isMobile:true,hasTouch:true,launchOptions:{args:['--autoplay-policy=user-gesture-required']}});
test.beforeAll(async()=>{server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://x').pathname.slice(1)||'index.html';try{const b=fs.readFileSync(path.join(root,rel));res.setHeader('Content-Type',rel.endsWith('.js')?'text/javascript':rel.endsWith('.html')?'text/html':rel.endsWith('.ogg')?'audio/ogg':'application/octet-stream');res.end(b)}catch{res.statusCode=404;res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`});
test.afterAll(async()=>new Promise(r=>server.close(r)));
async function open(page){await page.goto(`${origin}/index.html#debug`);await page.waitForFunction(()=>window.__tmb&&window.__tmbAudio)}

test('safe-area keeps camera framing centered and controls on their safe side',async({page})=>{
  await open(page);const cdp=await page.context().newCDPSession(page),rows=[];
  for(const [name,left,right] of [['none',0,0],['left',45,0],['right',0,45]]){
    await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left,bottom:0,right}});await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(50);
    const row=await page.evaluate(()=>{const l=__tmb.layout,s=v=>v*l.viewScale,joy=document.querySelector('#joystick').getBoundingClientRect(),jump=document.querySelector('#jumpWrap').getBoundingClientRect();return{center:(l.gameRect.x+s(l.safeLeft)+(l.gameRect.w-s(l.safeLeft+l.safeRight))/2)-innerWidth/2,pad:l.cameraPadLeft,joyLeft:joy.left,jumpRight:innerWidth-jump.right,safeLeft:s(l.safeLeft),safeRight:s(l.safeRight)}});rows.push({name,...row});
    expect(Math.abs(row.center),name).toBeLessThanOrEqual(1);expect(row.joyLeft+1,name).toBeGreaterThanOrEqual(left);expect(row.jumpRight+1,name).toBeGreaterThanOrEqual(right);
  }
  expect(Math.abs(rows[1].pad-rows[2].pad)).toBeLessThanOrEqual(1);console.log('MOBILE_SAFE',JSON.stringify(rows));
});

test('fullscreen control is reachable in landscape without covering play UI',async({page,browser})=>{
  const cases=[['none',0,0],['left',45,0],['right',0,45]],rows=[];
  await open(page);const cdp=await page.context().newCDPSession(page);
  for(const [name,left,right] of cases){
    await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left,bottom:0,right}});await page.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(50);
    const button=page.locator('#fullscreenBtn');await expect(button,name).toBeVisible();
    rows.push(await page.evaluate(name=>{const r=e=>{const x=e.getBoundingClientRect();return{x:x.left,y:x.top,w:x.width,h:x.height,right:x.right,bottom:x.bottom}},hit=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)),b=r(fullscreenBtn),l=__tmb.layout,s=v=>v*l.viewScale,canvasRect=x=>({x:l.viewOffsetX+s(x.x),y:l.viewOffsetY+s(x.y),w:s(x.w),h:s(x.h),right:l.viewOffsetX+s(x.x+x.w),bottom:l.viewOffsetY+s(x.y+x.h)}),runner=canvasRect(l.runner),targets={hud:canvasRect(l.hud),pause:r(pauseBtn),mute:r(muteBtn),swap:r(characterChange),joystick:r(document.querySelector('#joystick')),jump:r(document.querySelector('#jumpWrap button'))};return{name,button:b,intersections:Object.fromEntries(Object.entries({...targets,runner}).map(([k,v])=>[k,hit(b,v)]))}},name));
  }
  await page.locator('#fullscreenBtn').click();await page.waitForFunction(()=>!!(document.fullscreenElement||document.webkitFullscreenElement));await expect(page.locator('#fullscreenBtn')).toBeHidden();await page.evaluate(()=>document.exitFullscreen());await expect(page.locator('#fullscreenBtn')).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>dispatchEvent(new Event('orientationchange')));await expect(page.locator('#fullscreenBtn')).toBeHidden();
  const hiddenCases=[['desktop',{viewport:{width:1280,height:720},hasTouch:false,isMobile:false},null],['native',{...pixel,viewport:{width:pixel.viewport.height,height:pixel.viewport.width}},()=>{window.Capacitor={isNativePlatform:()=>true}}],['playables',{...pixel,viewport:{width:pixel.viewport.height,height:pixel.viewport.width}},()=>{window.ytgame={IN_PLAYABLES_ENV:true}}]];
  for(const [name,options,init] of hiddenCases){const context=await browser.newContext(options);if(init)await context.addInitScript(init);const candidate=await context.newPage();await open(candidate);await expect(candidate.locator('#fullscreenBtn'),name).toBeHidden();await context.close()}
  for(const row of rows.filter(x=>x.intersections))for(const [target,area] of Object.entries(row.intersections))expect(area,`${row.name}:${target}`).toBe(0);console.log('MOBILE_FULLSCREEN',JSON.stringify(rows));
});

test('audio unlock retries after a resume that resolves while still suspended',async({page})=>{
  await page.addInitScript(()=>{window.__blockAudioResume=true;const A=window.AudioContext||window.webkitAudioContext,raw=A.prototype.resume,failed=new WeakSet(),resumed=new WeakSet();let owner=A.prototype,state;while(owner&&!(state=Object.getOwnPropertyDescriptor(owner,'state')))owner=Object.getPrototypeOf(owner);A.prototype.resume=function(){if(window.__blockAudioResume){failed.add(this);return Promise.resolve()}resumed.add(this);return raw.call(this)};Object.defineProperty(A.prototype,'state',{configurable:true,get(){return failed.has(this)&&!resumed.has(this)?'suspended':state.get.call(this)}})});await open(page);
  await page.evaluate(()=>dispatchEvent(new Event('click')));await page.waitForTimeout(50);expect((await page.evaluate(()=>__tmbAudio.state().context))).toBe('suspended');
  await page.evaluate(()=>window.__blockAudioResume=false);await page.evaluate(()=>dispatchEvent(new Event('click')));await page.waitForFunction(()=>__tmbAudio.state().context==='running');const start=await page.evaluate(()=>__tmbAudio.state().clock);await page.waitForFunction(x=>__tmbAudio.state().clock>x+.001,start);
  const reading=await page.evaluate(async()=>{void __tmbAudio.play('land');let db=-Infinity,end=performance.now()+1000;while(performance.now()<end){db=Math.max(db,__tmbAudio.sample('sfx').db);await new Promise(r=>setTimeout(r,5))}return{db,a5:__tmbAudio.state(),legacy:__tmb.audio}});expect(reading.db).toBeGreaterThan(-40);expect(reading.legacy.acState).toBe('running');console.log('MOBILE_AUDIO',JSON.stringify(reading));
});

test('audio unlock retries when the first resume promise never settles',async({page})=>{
  await page.addInitScript(()=>{const A=window.AudioContext||window.webkitAudioContext,raw=A.prototype.resume,calls=new WeakMap(),blocked=new WeakSet(),resumed=new WeakSet();let owner=A.prototype,state;while(owner&&!(state=Object.getOwnPropertyDescriptor(owner,'state')))owner=Object.getPrototypeOf(owner);window.__armPendingResume=()=>{window.__pendingResumeArmed=true};A.prototype.resume=function(){if(!window.__pendingResumeArmed){blocked.add(this);return Promise.resolve()}const n=(calls.get(this)||0)+1;calls.set(this,n);if(n===1){blocked.add(this);return new Promise(()=>{})}resumed.add(this);return raw.call(this)};Object.defineProperty(A.prototype,'state',{configurable:true,get(){return blocked.has(this)&&!resumed.has(this)?'suspended':state.get.call(this)}})});await open(page);await page.evaluate(()=>__armPendingResume());
  await page.evaluate(()=>dispatchEvent(new Event('click')));await page.waitForTimeout(50);expect((await page.evaluate(()=>__tmbAudio.state().context))).toBe('suspended');
  await page.evaluate(()=>dispatchEvent(new Event('click')));await page.waitForFunction(()=>__tmbAudio.state().context==='running');const start=await page.evaluate(()=>__tmbAudio.state().clock);await page.waitForFunction(x=>__tmbAudio.state().clock>x+.001,start);
  const reading=await page.evaluate(async()=>{void __tmbAudio.play('land');let db=-Infinity,end=performance.now()+1000;while(performance.now()<end){db=Math.max(db,__tmbAudio.sample('sfx').db);await new Promise(r=>setTimeout(r,5))}return{db,legacy:__tmb.audio}});expect(reading.db).toBeGreaterThan(-40);expect(reading.legacy.acState).toBe('running');console.log('MOBILE_AUDIO_PENDING',JSON.stringify(reading));
});
