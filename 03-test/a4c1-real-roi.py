from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();a=s.index('// A4c-1:');old=s[:a];n=s[a:]
n=n.replace('o?o.x:300','o?o.x-110:300')
start=n.index(' const m=await page.evaluate(()=>{const c=document.querySelector(\'#game\'),ctx=c.getContext(\'2d\'),w=c.width,h=c.height,s=__TMB_A12__.getState();return {world:s.world.selectedWorldId,route:s.routeId,regions:')
end=n.index(" aftermathCheck('shot world",start)
new=r''' const m=await page.evaluate(()=>{
 const c=document.querySelector('#game'),ctx=c.getContext('2d'),w=c.width,h=c.height,s=__TMB_A12__.getState(),l=__tmb.layout,sx=c.width/c.getBoundingClientRect().width,sy=c.height/c.getBoundingClientRect().height;
 const box=(x,y,W,H)=>[(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*sx,(l.viewOffsetY+(l.worldY+y)*l.viewScale)*sy,W*l.viewScale*sx,H*l.viewScale*sy];
 const player=box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h),o=s.routeId==='D02'?s.route.obstacles.find(o=>o.type==='worker'):s.routeId==='D03'?s.movingPlatforms[0]:s.route.obstacles.find(o=>o.type==='vault');
 const ob=s.routeId==='D02'?box(o.x-24,455-98,48,98):s.routeId==='D03'?box(o.x,o.y-18,o.w,o.h+32):box(o.x,455-o.h,o.w,o.h),ground=box(__tmb.cam,455,Math.min(500,w/(l.viewScale*sx)),60);
 const rects={background:[0,h*.10,w*.7,h*.23],structures:[0,ground[1]-190,w*.7,170],ground,obstacle:ob};
 const visible=b=>Math.max(0,Math.min(w,b[0]+b[2])-Math.max(0,b[0]))*Math.max(0,Math.min(h,b[1]+b[3])-Math.max(0,b[1]))/(b[2]*b[3]);
 return {world:s.world.selectedWorldId,route:s.routeId,cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,playerVisible:visible(player),targetVisible:visible(ob),regions:Object.fromEntries(Object.entries(rects).map(([k,r])=>{const x=Math.max(0,Math.floor(r[0])),y=Math.max(0,Math.floor(r[1])),W=Math.max(1,Math.min(w-x,Math.floor(r[2]))),H=Math.max(1,Math.min(h-y,Math.floor(r[3]))),d=ctx.getImageData(x,y,W,H).data;let b='';for(let i=0;i<d.length;i+=16384)b+=String.fromCharCode(...d.subarray(i,i+16384));return [k,btoa(b)];}))};
 });
 aftermathCheck('shot no cover',m.cover,x=>x===0,1);aftermathCheck('shot player in frame',m.playerVisible,x=>x>=.8,0);if(route!=='D01')aftermathCheck('shot target in frame',m.targetVisible,x=>x>=.8,0);
'''
n=n[:start]+new.replace('\n','\r\n')+n[end:]
# Explicit loaded-source parity for the new test suite only.
n=n.replace("// A4c-1: independent theme acceptance; no route or physics mutation.","// A4c-1: independent theme acceptance; no route or physics mutation.\r\nasync function aftermathLoaded(page){const bytes=await page.evaluate(async()=>new TextEncoder().encode(await (await fetch('js/a12-campaign.js')).text()).length);aftermathCheck('loaded JS bytes',bytes,x=>x===fs.statSync(path.join(__dirname,'../js/a12-campaign.js')).size,-1);}")
n=n.replace("async({page})=>{","async({page})=>{ await aftermathLoaded(page);")
n=n.replace('async ({ page }) => {','async ({ page }) => { await aftermathLoaded(page);')
p.write_bytes((old+n).encode())
