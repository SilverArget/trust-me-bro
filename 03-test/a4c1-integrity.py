from pathlib import Path
import hashlib,json,re,datetime,difflib
r=Path.cwd();o=r.parent/'01-tasarim/a4c1-20260928';s=(r/'js/a12-campaign.js').read_text();old=(o/'pre/a12-campaign.js').read_bytes();cur=(r/'js/a12-campaign.js').read_bytes();checks=[]
def check(k,v):
 checks.append({'check':k,'pass':v});assert v,k
# Strip only the authorized additions to demonstrate full byte preservation elsewhere.
x=cur
start=x.index(b'  // AFTERMATH presentation only.');end=x.index(b'  function drawThemeScene(',start);x=x[:start]+x[end:]
start=x.index(b'        aftermathProbe:');end=x.index(b'        benchmarkWorldDraw:',start);x=x[:start]+x[end:]
x=x.replace(b'price: 500, enabled: true, routes: []',b'price: 500, enabled: false, routes: []',1)
x=x.replace(b'    if (worldId === "aftermath") { aftermathBackdrop(c,w,h); return; }\r\n',b'')
x=x.replace(b'\n    if(profile.selectedWorldId==="aftermath"){drawAftermathWorld(c);return;}',b'')
x=x.replace(b'frozen||magma||profile.selectedWorldId==="aftermath"',b'frozen||magma')
check('All pre-existing a12 bytes except registry enabled and theme dispatch identical',x==old)
for f in ['index.html','03-test/t2-coins.spec.cjs']:
 check(f,(r/f).read_bytes()==(o/'pre'/Path(f).name).read_bytes())
check('Existing tn-a4 tests byte prefix unchanged',(r/'03-test/tn-a4.spec.cjs').read_bytes().startswith((o/'pre/tn-a4.spec.cjs').read_bytes()))
for p in (o/'pre/route-inputs').glob('*.json'):check(p.name,(r/'03-test/route-inputs'/p.name).read_bytes()==p.read_bytes())
baseline=json.loads((o/'baseline-sha.json').read_text(encoding='utf-8-sig'))
for row in baseline:
 p=Path(row['Path'])
 if '/lib/' in str(p).replace('\\','/'):check(p.name,hashlib.sha256(p.read_bytes()).hexdigest().upper()==row['Hash'])
(o/'integrity.json').write_text(json.dumps(checks,indent=2))
(o/'a12.diff').write_text(''.join(difflib.unified_diff(old.decode().splitlines(True),cur.decode().splitlines(True),fromfile='pre',tofile='final')),encoding='utf8')
rows=[('Arka plan','liman binalari/vinc','buzul/aurora','volkan/uzak lav','aftermathBackdrop: kul-gri terminal, uzak ince duman, devrilmis yuk silueti'),('Dekor','duzenli konteyner/vinc','buz sivrilikleri','bazalt isitma yapisi','aftermathDecor + drawAftermathWorld: sabit tabanli egik hasarli yuk'),('Zemin','drawMetal duzenli serit','frozenSurface buz/kar','magmaSurface bazalt','aftermathSurface ground: catlak beton/egik plakalar/kopuk bant'),('Platform/ust hat','metal platform','buz raf','celik izgara','aftermathSurface platform: kirik panel dokusu/acik kenar'),('Vault/kasa','ahsap','buz sandik','yalitimli gumus kasa','drawAftermathWorld vault: ezik isli metal, bukulmus hat'),('Slide','sari kiris','buz kiris','celik kiris','drawAftermathWorld slide: devrilmis parca kenari/ok'),('Rampa','turuncu metal','kar/buz','bazalt celik','drawAftermathWorld ramp: kirik beton doseme'),('Vinc','liman yuku/kablo','buz yuku','pota','drawAftermathWorld movingPlatforms: asimetrik sarkik kablo/hasarli yuk'),('Palet','ahsap','karli kalas','dokum arabasi','aftermathSurface: yamali metal/palet ok'),('Kapi','servis kapisi','buz kapisi','firin kapagi','drawAftermathWorld containerDoors: yamuk cerceve/hasarli panel'),('Collapse','catlak metal','catlak buz','bazalt levha','drawAftermathWorld collapsing: catlak beton; ayni state/fallY'),('Isci','dock isci','soguk hava ekibi','aluminize tulum','aftermathRescuer: turuncu reflektif kurtarma ekibi/kask lambasi'),('Varil','yuvarlak ahsap','buz kap','gumus curuf kabi','drawAftermathWorld barrels: egik ezik yanmis kap'),('Sef','sprite sef','sprite sef','isi elbisesi','aftermathRescuer chief: sari yelekli yikim gozetmeni'),('Bitis','direk/bayrak','direk/bayrak','celik bayrak','drawAftermathWorld finish: yesil acil cikis cercevesi'),('Isik','liman lambasi','sabit saha lambasi','firin atmosferi','aftermathLights:2sn cevrim/lokal dusuk alfa')]
lines=['\n### A4c-1 oge envanteri '+datetime.datetime.now().isoformat(),'Coin/HUD/runner ortak kalir; tum diger oge gruplari asagida. AFTERMATH DOCK ile ayni satir: 0.','|Oge|DOCK|FROZEN|MAGMA|AFTERMATH|','|---|---|---|---|---|']+['|'+'|'.join(row)+'|' for row in rows]
lines+=['Fonksiyon/satirlar: '+', '.join(f'{f}:js/a12-campaign.js:{s[:s.index("function "+f)].count(chr(10))+1}' for f in ['aftermathDecor','aftermathBackdrop','aftermathSurface','aftermathRescuer','aftermathLights','drawAftermathWorld','drawWorldIntegrated','drawBackgroundIntegrated'])]
with (r/'03-test/TN-A4-PROGRESS.md').open('a',encoding='utf8') as f:f.write('\n'.join(lines)+'\n')
(o/'inventory.md').write_text('\n'.join(lines),encoding='utf8');print('INTEGRITY',len(checks),'PASS')
