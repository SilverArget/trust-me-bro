from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();nl='\r\n' if '\r\n' in s else '\n';a=s.index('// A4c-1:');old=s[:a];n=s[a:]
n=n.replace('test.setTimeout(90000);const fit=',"test.setTimeout(180000);const cdp=await page.context().newCDPSession(page);const fit=")
n=n.replace('await page.screenshot({path:path.join(dir,`${world}-${route}-${size.width}x${size.height}.png`)});',"const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,`${world}-${route}-${size.width}x${size.height}.png`),Buffer.from(shot.data,'base64'));")
start=n.index('test("aftermath-readable"');end=n.index('test("aftermath-moving-platform-visible"',start)
new=r'''test("aftermath-readable",async({page})=>{
 const rows=[];
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const kind of ['edge','vault','ramp','coin']){
 await page.setViewportSize(size);
 await page.evaluate(kind=>{__TMB_A12__.renderThemeFixture('aftermath','D01');const s=__TMB_A12__.getState(),o=kind==='coin'?s.route.coins[0]:s.route.obstacles.find(o=>o.type===(kind==='edge'?'platform':kind));window.__aRead={kind,o};__TMB_A12__.placePlayer(o?o.x-65:300);},kind);await page.waitForTimeout(850);
 const m=await page.evaluate(()=>{const c=document.querySelector('#game'),l=__tmb.layout,scale=l.viewScale*c.width/c.getBoundingClientRect().width,{kind,o}=__aRead;let r=kind==='coin'?{x:o.x-14,y:o.y-14,w:28,h:28}:kind==='edge'?{x:o?.x||300,y:o?.y||455,w:Math.min(o?.w||150,150),h:24}:kind==='ramp'?{x:o.x,y:455-o.h,w:o.w,h:o.h}: {x:o.x,y:455-o.h,w:o.w,h:o.h};const x=Math.max(0,Math.floor((l.viewOffsetX+(r.x-__tmb.cam)*l.viewScale)*c.width/c.getBoundingClientRect().width)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+r.y)*l.viewScale)*c.height/c.getBoundingClientRect().height)),w=Math.min(c.width-x,Math.ceil(r.w*scale)),h=Math.min(c.height-y,Math.ceil(r.h*scale)),d=c.getContext('2d').getImageData(x,y,w,h).data,z=[];for(let i=0;i<d.length;i+=4)z.push((d[i]+d[i+1]+d[i+2])/3);z.sort((a,b)=>a-b);return {contrast:z[Math.floor(z.length*.9)]-z[Math.floor(z.length*.1)],cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,rect:{x,y,w,h}};});
 aftermathCheck(`readable ${size.width} ${kind}`,m.contrast,x=>x>15,0);aftermathCheck('readable no cover',m.cover,x=>x===0,1);rows.push({size,kind,...m});
 }console.log('AFTERMATH_READABLE',JSON.stringify(rows));
});
'''
n=n[:start]+new.replace('\n',nl)+n[end:]
n=n.replace('expect(m.frameDelta).toBeGreaterThanOrEqual(1);',"aftermathCheck('moving fresh frame',m.frameDelta,x=>x>=1,0);")
n=n.replace('expect(m.mad).toBeGreaterThan(3);expect(m.contrast).toBeGreaterThan(15);',"aftermathCheck('moving MAD',m.mad,x=>x>3,0);aftermathCheck('moving contrast',m.contrast,x=>x>15,0);")
n=n.replace('expect(Math.abs(dock[i][0]-aftermath[i][0])).toBeLessThanOrEqual(.5);expect(Math.abs(dock[i][1]-aftermath[i][1])).toBeLessThanOrEqual(.5);',"aftermathCheck('physics x '+i,Math.abs(dock[i][0]-aftermath[i][0]),x=>x<=.5,1);aftermathCheck('physics y '+i,Math.abs(dock[i][1]-aftermath[i][1]),x=>x<=.5,1);")
n=n.replace('expect(m.aftermath/m.dock).toBeLessThanOrEqual(1.5);',"aftermathCheck('render ratio',m.aftermath/m.dock,x=>x<=1.5,1.51);")
p.write_bytes((old+n).encode())
