from pathlib import Path
import shutil,json,hashlib
r=Path(r'E:/oyunlar/TrustMeBro/02-kod'); out=r.parent/'01-tasarim/a4c1-20260928'
for p in (r/'03-test/route-inputs').glob('*.json'):
 d=out/'pre/route-inputs'/p.name;d.parent.mkdir(exist_ok=True);shutil.copy2(p,d)
s=(r/'js/a12-campaign.js').read_bytes().decode();nl='\r\n' if '\r\n' in s else '\n'
code=r'''  // AFTERMATH presentation only. Decor is derived from immutable coordinates, never hazard state.
  const aftermathBackdropCache = new Map();
  function aftermathDecor() {
    const items=[];
    for(let x=150;x<route.length;x+=930) items.push({id:`wreck-${x}`,x,y:GROUND,visible:true});
    return items;
  }
  function aftermathBackdrop(c,w,h) {
    const key=`${w}x${h}`;
    if(aftermathBackdropCache.has(key)){c.drawImage(aftermathBackdropCache.get(key),0,0);return;}
    const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#9b9c91');sky.addColorStop(.53,'#626960');sky.addColorStop(1,'#232f30');c.fillStyle=sky;c.fillRect(0,0,w,h);
    // Thin smoke stays in the distant sky, above the gameplay band.
    for(let i=0;i<4;i++){c.strokeStyle='#353f4055';c.lineWidth=9+i*2;c.beginPath();c.moveTo(w*(.16+i*.24),h*.28);c.bezierCurveTo(w*(.08+i*.24),h*.2,w*(.22+i*.24),h*.12,w*(.13+i*.24),-10);c.stroke();}
    for(let i=0;i<8;i++){const x=i*w/7;c.fillStyle=i%2?'#3a4947':'#50564a';c.beginPath();c.moveTo(x,h*.61);c.lineTo(x+15,h*.32);c.lineTo(x+65,h*.38);c.lineTo(x+90,h*.6);c.fill();c.fillStyle='#bbc3a3';c.fillRect(x+27,h*.4,18,7);}
    c.fillStyle='#303a35';c.fillRect(0,h*.64,w,h*.36);
    // Diagonal toppled freight silhouettes, not the regular dock corridor.
    for(let x=-45;x<w;x+=227){c.save();c.translate(x,h*.59);c.rotate(-.28);c.fillStyle='#59645a';c.fillRect(0,-55,160,65);c.strokeStyle='#8d9380';c.lineWidth=3;c.strokeRect(0,-55,160,65);for(let q=12;q<150;q+=23){c.beginPath();c.moveTo(q,-51);c.lineTo(q,6);c.stroke();}c.restore();}
    const tile=document.createElement('canvas');tile.width=w;tile.height=h;tile.getContext('2d').drawImage(c.canvas,0,0);aftermathBackdropCache.set(key,tile);
  }
  function aftermathSurface(c,x,y,w,h,kind='platform') {
    c.fillStyle=kind==='ground'?'#696e64':'#535f55';c.fillRect(x,y,w,h);
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    for(let q=0;q<w;q+=83){c.fillStyle=q%166?'#3f4843':'#929485';c.beginPath();c.moveTo(x+q,y+8);c.lineTo(x+q+63,y+17);c.lineTo(x+q+73,y+h);c.lineTo(x+q+14,y+h);c.fill();c.strokeStyle='#222e2b';c.lineWidth=2;c.beginPath();c.moveTo(x+q+32,y+4);c.lineTo(x+q+18,y+31);c.lineTo(x+q+39,y+44);c.lineTo(x+q+29,y+h);c.stroke();}
    c.restore();c.fillStyle='#e1e7c9';c.fillRect(x,y,w,5);
    // Broken, isolated tape patches; no continuous periodic dock stripe.
    c.fillStyle='#d4b554';if(w>100){c.save();c.translate(x+38,y+13);c.rotate(-.17);c.fillRect(0,0,29,6);c.restore();}
  }
  function aftermathRescuer(c,x,y,chief=false) {
    c.fillStyle='#222c29';c.fillRect(x-12,y-27,9,27);c.fillRect(x+5,y-27,9,27);
    c.fillStyle=chief?'#d9a83e':'#de742c';c.beginPath();c.moveTo(x-16,y-62);c.lineTo(x+16,y-57);c.lineTo(x+22,y-25);c.lineTo(x-21,y-25);c.fill();
    c.strokeStyle='#e8f2cb';c.lineWidth=5;c.beginPath();c.moveTo(x-11,y-57);c.lineTo(x-3,y-28);c.moveTo(x+10,y-55);c.lineTo(x+6,y-28);c.stroke();
    c.fillStyle='#be9770';c.fillRect(x-9,y-77,19,15);c.fillStyle='#ddd6b7';c.fillRect(x-15,y-84,30,9);c.fillStyle='#fcffe1';c.fillRect(x+5,y-82,8,5);
  }
  function aftermathLights(c,time,enabled=true,gain=1) {
    if(!enabled)return;
    const pulse=.5+.5*Math.sin(time*Math.PI); // 2 second period; surface overlay <= 4% alpha.
    for(const d of aftermathDecor()){
      c.fillStyle=`rgba(255,94,38,${.58+.32*pulse})`;c.fillRect(d.x+64,GROUND-116,16,9);
      c.fillStyle=`rgba(255,171,85,${.04*pulse*gain})`;c.fillRect(d.x,GROUND-3,150,28);
    }
  }
  function drawAftermathWorld(c,light=true,time=gameClock,gain=1) {
    for(const d of aftermathDecor()){c.save();c.translate(d.x,d.y-12);c.rotate(-.19);c.fillStyle='#384941';c.fillRect(0,-84,146,77);c.strokeStyle='#86917b';c.lineWidth=3;c.strokeRect(0,-84,146,77);for(let q=16;q<138;q+=27){c.beginPath();c.moveTo(q,-80);c.lineTo(q,-13);c.stroke();}c.restore();}
    aftermathSurface(c,0,GROUND,route.length,100,'ground');
    for(const s of routeSurfaces(route).filter(v=>v.kind!=='ground')){
      aftermathSurface(c,s.x,s.y,s.w,s.h);
      if(s.parkour==='vault'){c.strokeStyle='#c6c9af';c.lineWidth=3;c.beginPath();c.moveTo(s.x+4,s.y+8);c.lineTo(s.x+s.w*.6,s.y+s.h*.6);c.lineTo(s.x+s.w-4,s.y+11);c.stroke();c.fillStyle='#262c29';c.fillRect(s.x+s.w*.2,s.y+s.h*.6,s.w*.6,8);}
      if(s.parkour==='slide'){c.fillStyle='#eff0cc';c.fillRect(s.x-5,s.y+s.h-6,s.w+10,6);c.fillStyle='#e9c04b';c.font='bold 17px system-ui';c.fillText('↓',s.x+s.w/2-7,s.y+s.h+17);}
    }
    for(const o of route.obstacles){if(o.type==='ramp'){c.fillStyle='#73796b';c.beginPath();c.moveTo(o.x,GROUND);c.lineTo(o.x+o.w,GROUND-o.h);c.lineTo(o.x+o.w,GROUND);c.closePath();c.fill();c.strokeStyle='#edf1cd';c.lineWidth=6;c.stroke();c.strokeStyle='#333d35';c.lineWidth=3;c.beginPath();c.moveTo(o.x+o.w*.5,GROUND-o.h*.5+7);c.lineTo(o.x+o.w*.6,GROUND-10);c.stroke();}else if(o.type==='worker'){aftermathRescuer(c,o.x,GROUND);if(workerClock>1.65){c.fillStyle='#ff6551';c.font='bold 22px system-ui';c.fillText('!',o.x-3,GROUND-97);}}}
    if(!debugHideMovingPlatforms)for(const p of movingPlatforms){if(p.type==='crane'){c.strokeStyle='#d5d7b9';c.lineWidth=4;c.beginPath();c.moveTo(p.x+p.w*.3-35,115);c.quadraticCurveTo(p.x+p.w*.3+20,190,p.x+p.w*.3,p.y);c.moveTo(p.x+p.w*.75+22,115);c.lineTo(p.x+p.w*.75,p.y);c.stroke();}aftermathSurface(c,p.x,p.y,p.w,p.h);c.fillStyle='#ecbd55';c.fillRect(p.x+7,p.y+7,Math.max(4,p.w*.24),6);c.fillStyle='#eff2d5';c.font='bold 18px system-ui';c.fillText(p.type==='pallet'?'↔':'!',p.x+p.w/2-7,p.y-9);}
    for(const p of collapsing){if(p.state==='ABSENT')continue;c.save();if(p.state==='CONTACT_WARNING')c.translate(Math.sin(p.timer*55)*3,0);const y=p.y+p.fallY;aftermathSurface(c,p.x,y,p.w,p.h);c.strokeStyle='#17251d';c.lineWidth=4;c.beginPath();c.moveTo(p.x+10,y+5);c.lineTo(p.x+p.w*.4,y+19);c.lineTo(p.x+p.w*.7,y+5);c.lineTo(p.x+p.w-10,y+20);c.stroke();c.fillStyle='#f3c54b';c.fillRect(p.x,y,p.w,4);c.restore();}
    for(const d of containerDoors){aftermathSurface(c,d.x,d.currentY,d.w,d.h);c.strokeStyle='#d5c8a0';c.lineWidth=6;c.beginPath();c.moveTo(d.x-8,d.currentY+d.h);c.lineTo(d.x-3,d.currentY-12);c.lineTo(d.x+d.w+9,d.currentY-5);c.stroke();c.fillStyle=d.state==='OPEN'?'#63f2a5':d.state==='PREPARING'?'#ffd34d':'#ff5b55';c.beginPath();c.arc(d.x+d.w/2,d.currentY-26,9,0,7);c.fill();}
    for(const b of barrels){c.fillStyle='#343c32';c.strokeStyle='#c6bd94';c.lineWidth=3;c.beginPath();c.moveTo(b.x+5,b.y);c.lineTo(b.x+27,b.y+4);c.lineTo(b.x+24,b.y+27);c.lineTo(b.x,b.y+22);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(b.x+3,b.y+9);c.lineTo(b.x+23,b.y+17);c.stroke();}
    if(campaignChief?.active)aftermathRescuer(c,campaignChief.x+14,campaignChief.y+48,true);
    c.strokeStyle='#c1c9ad';c.lineWidth=8;c.strokeRect(route.finishX,GROUND-126,112,126);c.fillStyle='#44be82';c.fillRect(route.finishX+8,GROUND-120,96,35);c.fillStyle='#102a20';c.font='bold 14px system-ui';c.fillText(t('finish'),route.finishX+17,GROUND-97);
    aftermathLights(c,time,light,gain);
    for(const coin of route.coins)if(!run?.collectedCoinIds.includes(coin.id))drawCoin(c,coin);
  }
'''
s=s.replace('price: 500, enabled: false, routes: []','price: 500, enabled: true, routes: []',1)
s=s.replace('  function drawThemeScene(',code.replace('\n',nl)+'  function drawThemeScene(',1)
s=s.replace('    if (worldId === "magma") {','    if (worldId === "aftermath") { aftermathBackdrop(c,w,h); return; }'+nl+'    if (worldId === "magma") {',1)
s=s.replace('    renderSignatures=(frozen||magma)?','    renderSignatures=(frozen||magma||profile.selectedWorldId==="aftermath")?')
s=s.replace('    if(frozen||magma) drawThemeScene','    if(frozen||magma||profile.selectedWorldId==="aftermath") drawThemeScene')
s=s.replace('  function drawWorldIntegrated(c) {'+nl+'    ctx = c;','  function drawWorldIntegrated(c) {'+nl+'    ctx = c;'+nl+'    if(profile.selectedWorldId==="aftermath"){drawAftermathWorld(c);return;}')
hook=r'''        aftermathProbe: (time=0,light=true,gain=1) => {
          const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');
          aftermathBackdrop(c,1280,720);drawAftermathWorld(c,light,time,gain);
          const sample=r=>Array.from(c.getImageData(...r).data);
          return {decor:aftermathDecor(),light:sample([210,338,28,12]),surface:sample([150,455,150,25]),edge:sample([150,451,150,12])};
        },
'''
s=s.replace('        benchmarkWorldDraw:',hook.replace('\n',nl)+'        benchmarkWorldDraw:',1)
(r/'js/a12-campaign.js').write_bytes(s.encode())
print('renderer written',len(s))
