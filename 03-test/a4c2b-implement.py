from pathlib import Path
import json
r=Path.cwd();p=r/'js/a12-campaign.js';s=p.read_bytes().decode();m=json.loads((r.parent/'01-tasarim/coin-T2/a-manifest.json').read_text());routes=[];cs=[]
for n in [3,4]:
 id=f'A0{n}';pref=id.lower()+'-m-';obs=[dict(id=pref+'intro',type='slide',x=300,w=56,h=160)];coins=[]
 for j,v in enumerate(m['routes'][id]['capacityWitness']):
  t=v['type'];x=v['x'];o=dict(id=v['move_id'],type=t,x=x,w=24 if t=='vault' else 56 if t=='slide' else 320,h=48 if t=='vault' else 160 if t=='slide' else 24)
  if t in ['platform','crane','pallet']:o['y']=370 if t=='platform' else 390
  if t in ['crane','pallet']:o.update(w=230,minX=x,maxX=x+60,speed=40)
  obs.append(o);coins.append(dict(n=j,move_id=o['id'],kind=v['kind'],x=x-35 if t=='vault' else x+18 if t=='slide' else x,y=355 if t=='vault' else 440 if t=='slide' else o['y']-20,skill=v['kind']!='CJ'))
 if n==4:obs.extend([dict(id=pref+'ramp',type='ramp',x=650,w=100,h=40),dict(id=pref+'upper-entry',type='platform',x=14500,y=370,w=260,h=24),dict(id=pref+'collapse',type='collapse',x=14760,y=370,w=200,h=24,warning=.6),dict(id=pref+'upper-exit',type='platform',x=14960,y=370,w=250,h=24)])
 obs.extend([dict(id=pref+'door',type='containerDoor',x=15500,w=100,h=170,openY=250,closedY=285),dict(id=pref+'bypass',type='overpass',x=15300,y=260,w=650,h=24)])
 # reachable raised bypass via two existing steps, clear of coin movements
 obs.extend([dict(id=pref+'step',type='platform',x=15050,y=370,w=200,h=24)])
 inputs=[]
 for o in obs:
  if o['type'] in ['vault','slide','platform','crane','pallet','overpass']:
   inputs.extend([dict(x=o['x']-95,action='jump',holdMs=120,move_id=o['id']),dict(x=o['x']+105,action='release',holdMs=0,move_id=o['id'])])
 route=dict(routeId=id,worldId='aftermath',version=1,name='LAST COURIER' if n==3 else 'FINAL DISPATCH',length=16600,finishX=16460,checkpoints=[70,3000,6000,9000,11900,14900,16000],obstacles=obs)
 if n==3:route['chief']=dict(startX=12000)
 routes.append(json.dumps(id)+':'+json.dumps(route)[:-1]+',"coins":makeCoins("'+id+'",COINS.'+id+')},');cs.append(json.dumps(id)+':'+json.dumps(coins)+',')
 (r/f'03-test/route-inputs/{id}.json').write_text(json.dumps(inputs,indent=2))
s=s.replace('  const COINS = Object.freeze({','  const COINS = Object.freeze({\r\n'+''.join(cs),1).replace('  const ROUTES = Object.freeze({','  const ROUTES = Object.freeze({\r\n'+''.join(routes),1)
s=s.replace('aftermath", price: 500, enabled: true, routes: ["A01", "A02"]','aftermath", price: 500, enabled: true, routes: ["A01", "A02", "A03", "A04"]')
s=s.replace('campaignChief = routeId === "D06" ?', 'campaignChief = (routeId === "D06" || route.chief) ?').replace('!campaignChief.active && player.x>=1800','!campaignChief.active && player.x>=(route.chief?.startX ?? 1800)')
p.write_bytes(s.encode())
b=(r/'03-test/a4c2a-measure.cjs').read_text().replace('a4c2a-run','a4c2b-run').replace("['A01','A02']","['A03','A04']").replace('progressByRoute:{A01:{completed:true}}','progressByRoute:{A01:{completed:true},A02:{completed:true},A03:{completed:true}}');(r/'03-test/a4c2b-measure.cjs').write_text(b)
b=(r/'03-test/lib/magma-b-probe.cjs').read_text().replace('Magma','Aftermath').replace('magma','aftermath');(r/'03-test/lib/aftermath-b-probe.cjs').write_text(b)
p=r/'03-test/t2-coins.spec.cjs';b=p.read_bytes().decode();block=b[b.index("for(const id of ['A01','A02'])"):].replace("['A01','A02']","['A03','A04']");p.write_bytes((b+'\r\n'+block).encode())
print('A03/A04 candidate written')
