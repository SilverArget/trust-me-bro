from pathlib import Path
import json,hashlib,datetime,difflib,struct,re
r=Path.cwd();o=r.parent/'01-tasarim/coin-T2/a4c2b-20260928'
def read(p):
 b=p.read_bytes();return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig',errors='replace')
files=['index.html','js/a12-campaign.js','03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs']+[str(p.relative_to(r)).replace('\\','/') for p in (r/'03-test/route-inputs').glob('*.json')]+[str(p.relative_to(r)).replace('\\','/') for p in (r/'03-test/lib').glob('*.cjs')]
sha={f:hashlib.sha256((r/f).read_bytes()).hexdigest() for f in files};sha['../01-tasarim/coin-T2/a-manifest.json']=hashlib.sha256((o.parent/'a-manifest.json').read_bytes()).hexdigest();(o/'final-sha.json').write_text(json.dumps(sha,indent=2))
for f in ['js/a12-campaign.js','03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs']:
 (o/(Path(f).name+'.diff')).write_text(''.join(difflib.unified_diff(read(o/'pre'/f).splitlines(True),read(r/f).splitlines(True),fromfile='pre/'+f,tofile=f)),encoding='utf8')
shots=[]
for p in (r/'03-test/tn-a4-shots/aftermath-a4c2b').glob('*.png'):
 b=p.read_bytes();shots.append(dict(file=str(p),size=struct.unpack('>II',b[16:24]),sha256=hashlib.sha256(b).hexdigest()))
(o/'shots-sha.json').write_text(json.dumps(shots,indent=2))
mirror=o/'regression/evidence/a4c2b-run-path'
def data(n):
 p=mirror/n
 if not p.exists():p=o/n
 return json.loads(read(p))
chief=data('chief.json');hazard=data('hazard.json');theme=data('theme.json');mechanics=data('mechanics.json')
results={}
for name in ['final-core','final-frozen','final-magma','final-world','final-pause','final-aftermath','final-magma-G4','D06-final','static','red-a03','red-a04','red-static','red-hazard-collision']:
 log=o/(name+'.log');rc=o/(name+'.rc');s=read(log) if log.exists() else ''
 results[name]={'rc':read(rc).strip() if rc.exists() else 'RUNNING','summary':re.findall(r'\b\d+ (?:passed|failed|skipped)(?: \([^\n]+\))?',s)[-3:]}
(o/'results.json').write_text(json.dumps(results,indent=2))
status='PASS' if all(results[k]['rc']=='0' for k in ['final-world','final-pause','final-aftermath','final-magma-G4','D06-final','static']) and results['final-core']['rc']=='1' and results['final-frozen']['rc']=='1' else 'DUR — final checks pending'
text=f'''## A4c-2b — {datetime.datetime.now().isoformat()}
DISK DURUMU: {status}. Product SHA {sha['js/a12-campaign.js']}.

Başlangıç 731ebff96e08dd3ef3ff32c29caf3114f8dfbaef47ae312dca6e9dbbca9f4ede doğrulandı; ayrı pre/ yedeği ve baseline-sha.json. Ana oturumun MAGMA kanıt yazımı açıklaması kaydedildi; bu turun regresyon kanıtları ayrı mirror/evidence yollarına yönlendirildi.

| Kabul | Ölçüm / beklenen + tolerans | Örneklem + girdi | Kapsam | Negatif / pozitif kontrol |
|---|---|---|---|---|
| O-A3, G2 | 64.9667 s; 14/14; ölüm0; hash904e49c7 eşit; beklenen45–90/100%/0 | A03 Bot S×2, dt1/60 seed0x1a2b3c4d; route-inputs/A03.json | kilitli S, AFTERMATH resume adaptörü | A_RED coin0 gerçek FAIL; W bağımsız |
| O-A4, G2 | 64.95 s;14/14;ölüm0;hash323b9ded eşit | A04 Bot S×2; aynı dt/seed | gerçek final/result, checkpoint16000 | A_RED coin0 FAIL |
| G1 | A03 .9736118, A04 .9747801 kapsam;0 coin;beklenen>=.95 ve0 | segmentli W tüm rota | A03/A04 | sentetik yürüyüş coin'i FAIL; eş S14/14 |
| G3/G5/G7 | 11 statik test PASS; A03 6CJ/4CC/4CS; A04 6CJ/5CC/3CS;her biri14 | manifest, ROUTES, girdi dosyaları | tekil move_id, skill, tüm rampalardaR0, bant,R2/R3/R4, coin'siz hareket | clone coin x=0 mutasyonu yeni iki rota FAIL; sayı azaltılmadı |
| A03 şef | kovalamaca {chief['chaseSeconds']:.2f}s; başlangıç12000; temiz kaçış;kapı CLOSED üst hat bottom370<385, pushes0 | 6s ön beklemeli S;toplam{chief['seconds']:.4f}s | görünür yaklaşma,durunca yakalanma,pause/yeniden doğuş | boş iz/yanlış eşik/yakalama sayısı/lead/pause konumu ayrı reddedildi |
| A03 checkpoint | aralıklar {chief['intervals']};dönüş{chief['returnDistance']:.2f}px;yakalama{chief['catchSeconds']:.4f}s;toparlanma{chief['recoverySeconds']:.2f}s | durma x12501.15→11900;zemin455;lead380 | <=3000 tasarım hedefi;başlangıç/son aralık dahil;ek yakalanma0 | yanlış dönüşX/zemin/lead ve ek yakalanma reddedildi |
| A04 parkur | vault/slide/platform/overpass temas;crane40/pallet36;collapse READY→CONTACT_WARNING→FALLING→ABSENT;launch/tuck/open + tek iniş;kapı durumları | gerçek S;6s kapı hazırlığı | tüm rota mekanikleri;final/result mevcut akış | her mekanik için boş/yanlış durum/temas negatifleri |
| Hazard | A01/A02/A03 rampa0, A04 rampa1×20 gerçek faz;çakışma0 | kaynak envanteri eşit;gerçek collapse/door durumları ve varil konumları değişiyor | dört rota;0 rampa olan rotalar açıkça raporlandı | sentetik rampa inişini kapanan kapıya taşıma gerçek FAIL; temiz rota PASS |
| A04 görünürlük | rideFrames10/9;MAD16.872/15.635>3;kontrast90>15;kadraj>=.8;örtücü0 | gerçek temas sonrası görünür/gizli canvas ROI | crane+pallet | MAD0 gerçek FAIL |
| Tema/kare | D/F/M karşılaştırma RMSE min{min(v['rmse'] for v in theme if 'rmse' in v):.3f}>18;kontrast min{min(v['contrast'] for v in theme if 'contrast' in v):.3f}>15;8PNG | A03/A04×başlangıç/engel×1280×720,390×844 | her kare aktif AFTERMATH+routeId;oyuncu/engel>=.8;DOM0 | renk-fit özdeş görüntü RMSE0;örtücü/kimlik/kontrast ayrı negatifler |
| D06 korunum |60.6167s/ölüm0/hash e9700f1f;şef izi856118c2… birebir | başlangıç ve final JS,aynı S/dt/seed | şef oluşturma sadece D06 veya route.chief;A03 startX;ortak algoritma aynı | yanlış iz/hash reddedildi;t2-chief ve pause ayrı regresyon |
| Dosya korunum |47/47 | integrity.json | D/F/M/A01/A02 tanımları+coinler,eski girdiler,index,BotS,çizim/fizik korunur | kaynak normalize farkı yalnız yetkili şef yapılandırması;testte yalnız aşama registry2→4 kesin liste güncellemesi |

A03 koşul bağlantısı ilk sürümde t1b testinin metin tabanlı `if (!campaignChief.active && player.x>=1800)` kancasını bozdu. Test değiştirilmedi; ürünün eski dış koşulu korundu, A03 startX kontrolü iç koşula taşındı. D06 diferansiyel koşu aynı kaldı. İlk registry testi2 rota bekliyordu; onaylı4 rota listesine kesin eşitlik güncellendi, fiyat500 ve diğer assertler korunuyor. Bunlar ilk deneme sonuçlarıdır; nihai kapılar aşağıdadır.

İlk hazard negatifinde çökme öğesi örnekleme anında ABSENT olduğu için çakışma oluşmadı: bu deneme NEGATİF KANIT SAYILMADI. Son negatifte iniş kapanan kapıyla kesiştirildi ve safe-landing assert'i gerçekten kırmızı oldu. Tema ilk fixture'ında A03 kilidi nedeniyle hata vardı; test önce A01→A02→A03 bitirerek fixture kilidini açıyor.

MAGMA izolasyonunda eski G4 pilot JSON girişleri ilk kopyada eksikti (ENOENT). Dört kabul edilmiş pilot giriş dosyası hashleri korunarak mirror'a kopyalandı; aynı G4 testi tekrar PASS. Bu kapı eski MAGMA kanıtını okur; yeni G4 koşusu değildir. MAGMA toplam36 ilkPASS+1 tekrarPASS=37PASS,1emekli.

Nihai sonuçlar:
```json
{json.dumps(results,ensure_ascii=False,indent=2)}
```

Kabul edilmiş eski hatalar: tn-a12 campaign-movement-and-frontflip, reward-budget-first-and-repeat, purchase-double-tap, D01/D02 real-input completion; frozen-parkour-carriers-and-bypasses rollDrop. Atlanan testler PASS sayılmaz. Tam regresyon çalıştırılmadı. Son ürün üzerinde odak kapıları koşuldu; mirror ürün SHA aynı. Yeni D06 testi ve son hazard varyasyonları ayrıca koşuldu.

Son SHA256:
```json
{json.dumps({k:v for k,v in sha.items() if k in ['index.html','js/a12-campaign.js','03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs'] or '/A0' in k or k.endswith('bot-s-drive.cjs')},indent=2)}
```

Tüm lib/rota SHA'ları final-sha.json; başlangıç/son farklar *.diff; ham loglar *.log ve native çıkış kodları *.rc; kare envanteri shots-sha.json. Graphify AST-only güncelleme; ücretli/ağ/kurulum/git/commit/yayın yok. Medya açılmadı. Kalan kapsam A4c-2c: tam zincir/kayıt/retry/next,G4×12,mobil,18×18 benzerlik,ekonomi ve son envanter.
'''
(o/'REPORT-A4c2b.md').write_text(text,encoding='utf8')
p=r/'03-test/TN-A4-REPORT.md';s=p.read_text(encoding='utf8');marker='\n## A4c-2b —';s=s.split(marker)[0];p.write_text(s+'\n'+text,encoding='utf8')
print(status);print(json.dumps(results))
