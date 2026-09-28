from pathlib import Path
import json,hashlib,re,datetime,struct
r=Path.cwd();o=r.parent/'01-tasarim/a4c1-20260928'
def read(name):
 p=o/name
 if not p.exists():return ''
 b=p.read_bytes();return b.decode('utf-16' if b[:2] in [b'\xff\xfe',b'\xfe\xff'] else 'utf-8-sig',errors='replace')
def values(label):return [json.loads(v) for v in re.findall(label+r' (\{[^\r\n]+|\[[^\r\n]+)',read('verified.log'))]
logs={k:read(k) for k in ['verified.log','final-core.log','final-frozen.log','final-magma.log','final-world.log']}
complete=all(v in logs[k] for k,v in [('verified.log','10 passed'),('final-core.log','38 passed'),('final-frozen.log','13 passed'),('final-magma.log','37 passed'),('final-world.log','11 passed')])
status='PASS' if complete else 'DUR - nihai regresyon bekleniyor'
files=['index.html','js/a12-campaign.js','03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs']+[p.relative_to(r).as_posix() for p in (r/'03-test/route-inputs').glob('*.json')]+[p.relative_to(r).as_posix() for p in (r/'03-test/lib').glob('*.cjs')]
sha={f:hashlib.sha256((r/f).read_bytes()).hexdigest() for f in files};(o/'final-sha.json').write_text(json.dumps(sha,indent=2),encoding='utf8')
assert sha['index.html']=='fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142'
assert sha['js/a12-campaign.js']==hashlib.sha256((o/'regression/02-kod/js/a12-campaign.js').read_bytes()).hexdigest()
shots=[]
for p in sorted((r/'03-test/tn-a4-shots/aftermath-a4c1').glob('*.png')):
 raw=p.read_bytes();wh=struct.unpack('>II',raw[16:24]);assert wh in [(1280,720),(390,844)];shots.append({'path':str(p),'width':wh[0],'height':wh[1],'sha256':hashlib.sha256(raw).hexdigest()})
assert len(shots)==24
(o/'shots-sha.json').write_text(json.dumps(shots,indent=2),encoding='utf8')
neg=re.findall(r'AFTERMATH_NEGATIVE (.+) rejected',read('verified.log'));(o/'negative-controls.json').write_text(json.dumps({'executions':len(neg),'unique_checks':sorted(set(neg))},indent=2),encoding='utf8')
light=values('AFTERMATH_LIGHT');rmse=values('AFTERMATH_RMSE');perf=values('AFTERMATH_PERF');moving=values('AFTERMATH_MOVING');readable=values('AFTERMATH_READABLE')
lines=[f'DISK DURUMU: {status} - A4c-1 AFTERMATH YARD tema; rota eklenmedi.',f'\n## A4c-1 - {datetime.datetime.now().isoformat()}\n',f'Baslangic a12 `31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6`; son `{sha["js/a12-campaign.js"]}`. Yedek `{o}/pre`; baslangic hash listesi `baseline-sha.json`; nihai liste `final-sha.json`. Rota/girdi/fizik/Bot S/index korunumu 23/23 (integrity.json). Mevcut tn-a4 byte prefix korunur. Tum eski a12 baytlari yalniz registry enabled ve tema dispatch istisnalari disinda ayni; yeni fonksiyonlar sunum katmani.\n',
'Baslangic olcumu: AFTERMATH enabled=false, price500, routes[]; canli D geometrisinde DOCK foreground/backdrop fallback. Son: enabled=true/price500/routes[]; satin alma tek500, mevcut dunya/rota korunur, routes[] oldugu icin secim gecis kuyrugu yaratmaz. Magaza onizlemesi AFTERMATH arka planini kullanir; canli tema kabul kareleri mevcut DEBUG renderThemeFixture ile D geometrisinde. A rotasi bu cagrida YOK. Fiyat500 sartname degeri, yoneticiye yeni fiyat onerisi uygulanmadi.\n',
'### Kabul (4 alan)\n','|Kapi|Beklenen + tolerans|Orneklem/girdi|Kapsam|Pozitif / ayri negatif kontrol|','|---|---|---|---|---|',
'|registry-purchase|500, tek sahiplik/kesinti; routes[]; guvenli secim|1000 bakiye, Promise.all cift satin alma|AFTERMATH; mevcut secim korunur|cift kesinti/sahiplik, yanlis fiyat/rota/sira degerleri reddedildi|',
'|not-recolor|kanal bazli affine renk donusumu sonrasi RMSE>18|D01 baslangic/vault, D02 worker, D03 crane; 3 dunya x4ROI x3konum=36|gercek layout zemin/engel ROI; mobil ayri okunurluk; esik ayni|kaynak goruntusunun kendi kopyasi RMSE0 reddedildi|',
'|signatures-absent|dock periyodik deckStripe/31/vinc/koridor, buz imzasi0; eski renderer cagrisi0|canli AFTERMATH + kaynak dispatch denetimi|devrilmis konteyner/bant yasak imza sayilmaz; MAGMA lav/kul kurali tasinmadi|her imza1, eski cizici cagrisi ve eksik canli dispatch mutasyonu reddedildi|',
'|safe-surface-readable|kenar/doku kontrast>15|sabit kamera getImageData surface/edge|beton yuru yuzeyi|duz tek renk ROI kontrast0 reddedildi|',
'|readable|kontrast>15, ortucu0|1280x720 ve390x844; platform/vault/ramp/coin gercek ROI|8 olcum|her ROI sifir kontrast, ortucu1 reddedildi|',
'|moving-platform-visible|gizli-kare MAD>3, kontrast>15, yeni kare>=1|D03 vinc veD05 palet|AFTERMATH tasiyicilar|gizli/gizli MAD0, kontrast0, kare0 reddedildi|',
'|physics-identical|x/y fark<=.5px|DOCK/AFTERMATH D01 3sn ayni sag girdisi;15es-zaman noktasi|her iki eksen|her noktaya1px fark mutasyonu reddedildi|',
'|render-performance|AFTERMATH/DOCK<=1.5|120kare her dunya, performance.now, ayni rota|arka plan+dunya Canvas|1.51 oran reddedildi|',
'|emergency-light-bounded|max es-faz yuzey degisimi<=.15; isik var/degisir; tum fazlar kontrast>15|121kare,dt1/60,2sn tamcevrim; sabit kamera;acik/kapali ROI cifti|lamba+yuzey/kenar|gain20 gercek cizim mutasyonu .27098 reddedildi; isiksiz0 ve sabit0 degisim reddedildi|',
'|decor-never-collapses|kimlik/taban/gorunurluk sabit; kaynakta hazard baglantisi0|1800fizik adimi=30sn;her60adim ornek; sabit probe kamera|aftermathDecor salt sabit koordinat; yalniz collapsing dongusu state/fallY kullanir|sentetik dekor y+100 ve kaynak collapsing[0].fallY mutasyonu reddedildi|',
'|24kare|4dunya x2boyut x3konum; dunya/rota dogru; oyuncu/hedef>=.8kadraj;ortucu0|CDP screenshot; canli canvas olcumleri|ayri aftermath-a4c1 klasoru; eski D/F/M kanitlari ezilmedi|yanlis dunya/rota, kadraj0, ortucu1 reddedildi|',
f'\nNegatif kontroller: {len(neg)} calistirilan reddetme; {len(set(neg))} benzersiz isim. Her AFTERMATH kabul asserti ilgili bozuk degeri ayni predicate/assert yolunda gorur; bunlar beklenen failure catch ile tutulur (ana testlerin PASS gorunmesi negatifin calismadigi anlamina gelmez). Isik/dekor/goruntu kontrolleri ayrica gercek sentetik girdi/cizim mutasyonu kullanir. Ham kanit verified.log ve negative-controls.json.\n',
'### Olcumler\n',f'Isik: `{json.dumps(light)}`',f'Performans: `{json.dumps(perf)}`',f'Tasiyicilar: `{json.dumps(moving)}`',f'Okunabilirlik: `{json.dumps(readable)}`',f'RMSE36: `{json.dumps(rmse)}`',
'\n### Regresyon - nihai urun SHA\n']
for name,txt in logs.items():lines.append(f'- {name}: '+ '; '.join(re.findall(r'\b\d+ (?:passed|failed|skipped)(?: \([^\r\n]*\))?',txt)[-4:]))
lines+=['FROZEN rollDrop eski kabul edilmis hata; yeni D/F/M hatasi yoksa kapsam PASS. frozen13=eski12+AFTERMATH imza1; magma37=eski36+AFTERMATH imza1. parkour25+t1b6+t2-coins7=38. tn-a12/t2-chief bu tema cagrisi kullanici regresyon listesinde yok; tam regresyon KOSULMADI. Regresyon ayri kopyada, ana oturum post-a4b snapshot dokunulmadi.',
'\n### Duzeltme ve kanit sinirlari\n','- Ilk sabit ekran ROI gercek zemin disinda kaldigi icin sahte yesil verdi. Gercek layout/oge ROI ile genisletilen denetim canli drawWorld dispatch eksigini kirmizi yakaladi; CRLF/LF farkindan uygulanmayan dar early-return tamamlandi. Onceki 10/10 rapor kabulu DEGIL; verified.log tek nihai kabul.',
'- Kaynak dizisinde ilk vault kadraj disindaydi; gorunen vault secimi ve >=.8 kadraj kontrolu eklendi. Mobil vinc kamerası yuk genisligine gore yerlestirildi. Esikler gevsetilmedi.',
'- 30sn gozlem tek basina asla kaniti sayilmadi; dekor fonksiyonu sabit koordinatli, collapse/clock/timer/state referansi yok. Oge kimlikleri dogrudan canli cizicinin kullandigi aftermathDecor listesinden.',
'- Performans yerel mikrobenchmark; coklu test ve ana oturum CPU yuku var. Tum olcumler yerel, network/kurulum/AI gorsel/commit/yayin yok.',
'- Graphify AST update yapildi; 111 zero-node kaynak ve topluluk etiket kaymasi uyarisi mevcut (graphify-final.log); grafik medyasi acilmadi. LLM/API maliyeti0.',
'\n'+(o/'inventory.md').read_text(encoding='utf8'),'\n### Nihai SHA256\n']
lines += [f'- `{f}` `{h}`' for f,h in sha.items()]
report='\n'.join(lines)+'\n\n';p=r/'03-test/TN-A4-REPORT.md';text=p.read_text(encoding='utf8');marker='\n<!-- PRE-A4C-1 REPORT -->\n'
if marker in text:text=text.split(marker,1)[1]
p.write_text(report+marker+text,encoding='utf8');(o/'report.md').write_text(report,encoding='utf8');print(status,sha['js/a12-campaign.js'],len(shots),len(neg))
