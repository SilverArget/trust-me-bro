from pathlib import Path
import json
r=Path.cwd();p=r/'js/a12-campaign.js';s=p.read_bytes().decode();m=json.loads((r.parent/'01-tasarim/coin-T2/a-manifest.json').read_text());routes=[];cs=[]
for n in [1,2]:
 id=f'A0{n}';pref=id.lower()+'-m-';obs=[dict(id=pref+'intro',type='slide',x=300,w=56,h=160)];coins=[]
 for j,v in enumerate(m['routes'][id]['capacityWitness']):
  t=v['type'];x=v['x'];o=dict(id=v['move_id'],type=t,x=x,w=24 if t=='vault' else 56 if t=='slide' else 320,h=48 if t=='vault' else 160 if t=='slide' else 24)
  if t in ['platform','crane','pallet']:o['y']=370 if t=='platform' else 390
  if t in ['crane','pallet']:o.update(w=230,minX=x,maxX=x+60,speed=40)
  obs.append(o);coins.append(dict(n=j,move_id=o['id'],kind=v['kind'],x=x-35 if t=='vault' else x+18 if t=='slide' else x,y=355 if t=='vault' else 440 if t=='slide' else o['y']-20,skill=v['kind']!='CJ'))
 if n==1:obs.extend([dict(id=pref+'upper-entry',type='platform',x=14700,y=370,w=260,h=24),dict(id=pref+'collapse',type='collapse',x=14960,y=370,w=200,h=24,warning=.6),dict(id=pref+'upper-exit',type='platform',x=15160,y=370,w=300,h=24)])
 else:obs.extend([dict(id=pref+'worker',type='worker',x=15400,w=44,h=84),dict(id=pref+'rescue-overpass',type='overpass',x=14050,y=370,w=1800,h=24)])
 route=dict(routeId=id,worldId='aftermath',version=1,name='BROKEN RECEIVING' if n==1 else 'EMERGENCY CARGO',length=16600,finishX=16460,checkpoints=[70,3000,6000,9000,12000,15800],obstacles=obs)
 routes.append(json.dumps(id)+':'+json.dumps(route)[:-1]+',"coins":makeCoins("'+id+'",COINS.'+id+')},');cs.append(json.dumps(id)+':'+json.dumps(coins)+',')
s=s.replace('  const COINS = Object.freeze({','  const COINS = Object.freeze({\r\n'+''.join(cs),1).replace('  const ROUTES = Object.freeze({','  const ROUTES = Object.freeze({\r\n'+''.join(routes),1)
s=s.replace('aftermath", price: 500, enabled: true, routes: []','aftermath", price: 500, enabled: true, routes: ["A01", "A02"]')
s=s.replace('  function routeUnlocked(id) {','  function routeUnlocked(id) {\r\n    if (/^A0/.test(id)) return !!ROUTES[id] && (id === "A01" || !!profile.progressByRoute[`A0${Number(id.slice(1))-1}`]?.completed);')
s=s.replace('  function firstRouteForWorld(worldId=profile.selectedWorldId) {','  function firstRouteForWorld(worldId=profile.selectedWorldId) {\r\n    if (worldId==="aftermath") return [...WORLD_REGISTRY.aftermath.routes].reverse().find(id=>routeUnlocked(id));')
s=s.replace('    if (pendingWorldId && profile.ownedWorldIds.includes(pendingWorldId)) {','    if (pendingWorldId && profile.ownedWorldIds.includes(pendingWorldId)) {\r\n      if (pendingWorldId === "aftermath" && !/^A0/.test(id || "")) id = firstRouteForWorld("aftermath");\r\n      else if (profile.selectedWorldId === "aftermath" && pendingWorldId !== "aftermath" && /^A0/.test(id || "")) id = firstRouteForWorld(pendingWorldId);')
s=s.replace('    if (!routeUnlocked(id)) return false;','    if (/^A0/.test(id||"") && profile.selectedWorldId!=="aftermath") return false;\r\n    if (!routeUnlocked(id)) return false;')
s=s.replace('const order=profile.selectedWorldId==="magma"?', 'const order=profile.selectedWorldId==="aftermath"?WORLD_REGISTRY.aftermath.routes:profile.selectedWorldId==="magma"?')
s=s.replace('id === "magma" ? null : item.routes.length','(id === "magma" || id === "aftermath") ? null : item.routes.length')
p.write_bytes(s.encode())
b=(r/'03-test/lib/bot-magma.cjs').read_text().replace('Magma','Aftermath').replace('M0','A0').replace('MAGMA','AFTERMATH').replace('magma','aftermath').replace('setWallet(200)','setWallet(500)');(r/'03-test/lib/bot-aftermath.cjs').write_text(b)
p=r/'03-test/lib/bot-w.cjs';b=p.read_bytes().decode().replace("id[0]==='M'?'magma':","id[0]==='A'?'aftermath':id[0]==='M'?'magma':");p.write_bytes(b.encode())
b=(r/'03-test/lib/magma-probe.cjs').read_text().replace('Magma','Aftermath').replace('M01','A01').replace('M02','A02').replace('M03','A03');(r/'03-test/lib/aftermath-probe.cjs').write_text(b)
b=(r/'03-test/a4b2a-measure.cjs').read_text().replace('Magma','Aftermath').replace('bot-magma','bot-aftermath').replace('M01','A01').replace('M02','A02').replace('a4b2a-run','a4c2a-run').replace('m-s.json','a-s.json');(r/'03-test/a4c2a-measure.cjs').write_text(b)
print('A01/A02 created; controller unchanged')
