from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();nl='\r\n' if '\r\n' in s else '\n'
# Existing pixel and physics methods remain unchanged; add separate AFTERMATH tests.
parts=[]
for start,end in [('test("magma-readable"','test("magma-moving-platform-visible"'),('test("magma-moving-platform-visible"','test("magma-physics-identical"'),('test("magma-physics-identical"','test("magma-render-performance"'),('test("magma-render-performance"','test("magma-not-recolor-and-screenshots"')]:
 block=s[s.index(start):s.index(end)].replace('magma','aftermath').replace('MAGMA','AFTERMATH');parts.append(block)
extra=r'''
// A4c-1: independent theme acceptance; no route or physics mutation.
async function aftermathScene(page,route='D01',x=300){
 await page.evaluate(({route,x})=>{__TMB_A12__.renderThemeFixture('aftermath',route);__TMB_A12__.placePlayer(x);},{route,x});await page.waitForTimeout(250);
 expect((await page.evaluate(()=>__TMB_A12__.getState())).world.selectedWorldId).toBe('aftermath');
}
const aftermathAudit=[];
function aftermathCheck(name,value,predicate,negative){
 expect(predicate(value),name).toBe(true);
 expect(()=>expect(predicate(negative),name+' NEGATIVE').toBe(true)).toThrow();
 aftermathAudit.push(name);console.log('AFTERMATH_NEGATIVE',name,'rejected');
}
test('aftermath-registry-purchase',async({page})=>{
 const before=await page.evaluate(()=>__TMB_A12__.getState());
 await page.evaluate(()=>__TMB_A12__.setWallet(1000));
 const result=await page.evaluate(()=>Promise.all([__TMB_A12__.purchaseWorld('aftermath'),__TMB_A12__.purchaseWorld('aftermath')]));
 const s=await page.evaluate(()=>__TMB_A12__.getState());
 aftermathCheck('single purchase',result.filter(Boolean).length,x=>x===1,2);
 aftermathCheck('500 cost',s.profile.walletBalance,x=>x===500,499);
 aftermathCheck('one ownership',s.profile.ownedWorldIds.filter(x=>x==='aftermath').length,x=>x===1,2);
 aftermathCheck('no pending route',s.world.pendingWorldId,x=>x===null,'A01');
 aftermathCheck('safe selection',s.world.selectedWorldId,x=>x===before.world.selectedWorldId,'missing');
 const source=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8');
 aftermathCheck('registry no routes',source,x=>/aftermath: \{[^\n]*price: 500, enabled: true, routes: \[\]/.test(x),source.replace('price: 500, enabled: true','price: 501, enabled: true'));
});
test('aftermath-emergency-light-bounded',async({page})=>{
 await aftermathScene(page);
 const m=await page.evaluate(()=>{__tmbParkour.manual();const mean=a=>a.reduce((s,v,i)=>s+(i%4===3?0:v),0)/(a.length/4*3),spread=a=>{const b=[];for(let i=0;i<a.length;i+=4)b.push((a[i]+a[i+1]+a[i+2])/3);b.sort((a,b)=>a-b);return b[Math.floor(b.length*.9)]-b[Math.floor(b.length*.1)];};let max=0,minEdge=Infinity;const lamps=[];for(let f=0;f<=120;f++){const a=__TMB_A12__.aftermathProbe(f/60,true),b=__TMB_A12__.aftermathProbe(f/60,false);max=Math.max(max,Math.abs(mean(a.surface)-mean(b.surface))/mean(b.surface));minEdge=Math.min(minEdge,spread(a.edge));lamps.push(mean(a.light)-mean(b.light));}const bad=__TMB_A12__.aftermathProbe(.5,true,20),off=__TMB_A12__.aftermathProbe(.5,false);return {max,minEdge,lightMin:Math.min(...lamps),lightMax:Math.max(...lamps),negative:Math.abs(mean(bad.surface)-mean(off.surface))/mean(off.surface),frames:121,dt:1/60};});
 aftermathCheck('light surface max relative <=.15',m.max,x=>x<=.15,m.negative);
 aftermathCheck('light exists',m.lightMax,x=>x>5,0);
 aftermathCheck('light changes',m.lightMax-m.lightMin,x=>x>1,0);
 aftermathCheck('all phases readable',m.minEdge,x=>x>15,0);
 console.log('AFTERMATH_LIGHT',JSON.stringify(m));
});
test('aftermath-decor-never-collapses',async({page})=>{
 await aftermathScene(page);const m=await page.evaluate(()=>{__tmbParkour.manual();const initial=__TMB_A12__.aftermathProbe().decor;let equal=true;for(let i=0;i<1800;i++){__tmbCampaignStep(1/60);if(i%60===0)equal&&=JSON.stringify(__TMB_A12__.aftermathProbe(i/60).decor)===JSON.stringify(initial);}const bad=structuredClone(initial);bad[0].y+=100;return {initial,equal,negative:JSON.stringify(bad)===JSON.stringify(initial)};});
 aftermathCheck('stable decor id/base/visible 30s',m.equal,x=>x===true,m.negative);
 const src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),body=src.slice(src.indexOf('  function aftermathDecor()'),src.indexOf('  function aftermathBackdrop('));
 aftermathCheck('decor no hazard controller',body,x=>!/(collapsing|fallY|gameClock|\.state|timer)/.test(x),body+' collapsing[0].fallY');
 console.log('AFTERMATH_DECOR',JSON.stringify(m));
});
test('aftermath-safe-surface-readable',async({page})=>{
 await aftermathScene(page);const m=await page.evaluate(()=>{const a=__TMB_A12__.aftermathProbe(0,false),lum=d=>{const z=[];for(let i=0;i<d.length;i+=4)z.push((d[i]+d[i+1]+d[i+2])/3);z.sort((a,b)=>a-b);return z[Math.floor(z.length*.9)]-z[Math.floor(z.length*.1)];};return {edge:lum(a.edge),texture:lum(a.surface)};});
 aftermathCheck('safe edge contrast',m.edge,x=>x>15,0);aftermathCheck('concrete surface structure',m.texture,x=>x>15,0);console.log('AFTERMATH_SURFACE',JSON.stringify(m));
});
test('aftermath-dock-frozen-magma-signatures-absent',async({page})=>{
 await aftermathScene(page);const sig=await page.evaluate(()=>__TMB_A12__.getState().world.renderSignatures);
 for(const k of ['deckStripe','dock31Text','dockCrane','loadingCorridor','snowCap','icicles','iceRatio'])aftermathCheck(k,sig[k],x=>x===0,1);
 const src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),body=src.slice(src.indexOf('  function aftermathDecor()'),src.indexOf('  function drawThemeScene('));
 for(const k of ['drawMetal','drawDockBackdrop','frozenSurface','magmaSurface','magmaBackdropCache'])aftermathCheck('source absent '+k,body,x=>!x.includes(k),body+k);
});
test('aftermath-not-recolor-and-screenshots',async({page})=>{
 test.setTimeout(90000);const fit=(a,b)=>{let total=0,n=0;for(let ch=0;ch<3;ch++){let sx=0,sy=0,sxx=0,sxy=0,m=0;for(let i=ch;i<a.length;i+=4){sx+=a[i];sy+=b[i];sxx+=a[i]*a[i];sxy+=a[i]*b[i];m++;}const den=m*sxx-sx*sx,A=den?(m*sxy-sx*sy)/den:0,B=(sy-A*sx)/m;for(let i=ch;i<a.length;i+=4){total+=(b[i]-(A*a[i]+B))**2;n++;}}return Math.sqrt(total/n);};
 const dir=path.join(__dirname,'tn-a4-shots','aftermath-a4c1');fs.mkdirSync(dir,{recursive:true});const values=[];
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const route of ['D01','D02','D03']){
 const all={};await page.setViewportSize(size);
 for(const world of ['dock31','frozen','magma','aftermath']){
 await page.evaluate(({world,route})=>{__TMB_A12__.renderThemeFixture(world,route);const s=__TMB_A12__.getState(),o=route==='D02'?s.route.obstacles.find(o=>o.type==='worker'):route==='D03'?s.movingPlatforms[0]:null;__TMB_A12__.placePlayer(o?o.x:300);},{world,route});await page.waitForTimeout(850);
 const m=await page.evaluate(()=>{const c=document.querySelector('#game'),ctx=c.getContext('2d'),w=c.width,h=c.height,s=__TMB_A12__.getState();return {world:s.world.selectedWorldId,route:s.routeId,regions:Object.fromEntries(Object.entries({background:[0,Math.floor(h*.1),Math.floor(w*.7),Math.floor(h*.23)],structures:[0,Math.floor(h*.3),Math.floor(w*.7),Math.floor(h*.23)],ground:[0,Math.floor(h*.56),Math.floor(w*.7),Math.floor(h*.12)],obstacle:[Math.floor(w*.25),Math.floor(h*.43),Math.floor(w*.4),Math.floor(h*.17)]}).map(([k,r])=>[k,Array.from(ctx.getImageData(...r).data)]))};});
 aftermathCheck('shot world '+world,m.world,x=>x===world,'wrong');aftermathCheck('shot route '+route,m.route,x=>x===route,'wrong');all[world]=m.regions;
 await page.screenshot({path:path.join(dir,`${world}-${route}-${size.width}x${size.height}.png`)});
 }
 // Desktop fixture ROIs retain the established not-recolor definition; mobile readability has its own gate.
 if(size.width===1280)for(const world of ['dock31','frozen','magma'])for(const region of Object.keys(all.aftermath)){const v=fit(all[world][region],all.aftermath[region]);aftermathCheck(`${route} ${world} ${region} RMSE`,v,x=>x>18,fit(all[world][region],all[world][region]));values.push({route,world,region,rmse:v});}
 }
 console.log('AFTERMATH_RMSE',JSON.stringify(values));
});
'''
p.write_bytes((s+extra.replace('\n',nl)+''.join(parts)).encode())
