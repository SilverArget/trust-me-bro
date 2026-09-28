from pathlib import Path
import json, re, hashlib, datetime, shutil

r = Path(__file__).resolve().parent.parent
out = Path((r/'03-test/a4b2b-run-path.txt').read_text(encoding='utf-8').strip())
def log(name):
    p=out/name
    if not p.exists(): return ''
    b=p.read_bytes()
    return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig',errors='replace')
def data(name):
    p=out/name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else []
final=log('final-magma-corrected.log')
completed={}
for match in re.finditer(r'M_COMPLETION (M0\d) (\[[^\r\n]+)',final):
    completed[match[1]]=json.loads(match[2])
accepted='29 passed' in final and '6 passed' in log('final-t1b.log') and '11 passed' in log('final-world.log') and '5 passed' in log('final-static.log')
status='PASS — A4b-2b kapsamı; 6 eski kırmızı kullanıcı kabulüyle kapsam dışı' if accepted else 'DUR — son MAGMA odak koşumunun kapanışı bekleniyor'
audit=[json.loads(line) for line in log('assert-audit/rejections.jsonl').splitlines() if line.strip()]
sha=data('final-sha.json')
coin='\n'.join(f'| {id} | {cj} | {cc} | {cs} |14| '+(f"{completed[id][0]['game_s']:.5f} / {completed[id][1]['game_s']:.5f} | {completed[id][0]['hash']} = {completed[id][1]['hash']} |" if id in completed else 'bekleniyor | bekleniyor |') for id,cj,cc,cs in [('M01',8,4,2),('M02',6,6,2),('M03',7,4,3),('M04',7,5,2)])
mechanics=data('mechanics-b.json')
themes=data('M03-theme.json')+data('M04-theme.json')
hazard=data('hazard-b.json')
if accepted:
    for p in (out/'release/02-kod/03-test/tn-a4-shots').glob('M0[34]-*.png'):
        shutil.copy2(p,r/'03-test/tn-a4-shots'/p.name)
screens=[p for p in (r/'03-test/tn-a4-shots').glob('M0[34]-*.png')]
screen_sha={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in screens}
(out/'screens-sha.json').write_text(json.dumps(screen_sha,indent=2),encoding='utf-8')
summary=f'''DISK DURUMU: {status}.

## A4b-2b — {datetime.datetime.now().isoformat()}

Başlangıç A4b-2a kullanıcı tarafından kabul edildi. Başlangıç a12 SHA: `5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39`.
Yedek ve başlangıç SHA: `{out}/baseline/02-kod`, `start-sha.json`; manifestin ayrı kopyası `m-manifest.json`.
Nihai ürün SHA: `8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b`.
Hedef900sn aşıldı; kapanış25dk sınırı içinde tutulur. PROGRESS zaman damgaları bütçeyi ve ara kararları gösterir.

### Uygulama ve kapsam
- M03 Furnace Aisle: işçi/varil ve kayma dizisi; son rampayla çıkılan `m03-m-overpass`, servis kapısının üstündeki güvenli alternatif hattır. Kapı CLOSED iken gerçek Bot S geçişi ölçüldü: ayak238, kapı üstü275, itme0; 6s faz hazırlığı dahil ~73.43s.
- M04 Magma Lift: `m04-m-ramp` → launch/tuck/open → tek iniş; `m04-m-03` crane ve `m04-m-08` pallet üzerinde taşıma; finalden önce checkpoint15500. İlk280px rampa ikinci fırlatmayı tetikledi; yalnız yeni rampanın genişliği220px yapıldı.
- Her iki rota14 coin, sabit manifest tür sayıları korundu. EN/TR/RU adları ve dört rota registry eklendi. D/F ve M01/M02 geometri, coin ve girdileri değişmedi.
- `03-test/lib/bot-magma.cjs`: M03/M04 dünya seçim adaptasyonu; otomatik RAF yarışı için dünya/satın alma hazırlığından önce mevcut `manual()` kancası çağrılır. Bot S tetik çekirdeği aynı SHA. Yeni gözlemci `lib/magma-b-probe.cjs`, yeni kapılar `tn-a4.spec.cjs` ve `t2-coins.spec.cjs` sonuna eklendi.
- Tam kilit zinciri/kayıt/retry/next ve G7 geçiş kabulü 2c'de. Mevcut akışın M01/M02 sıra dizileri bu çağrıda genişletilmedi; dört rota registry'si tek başına normal kampanya zincirinin tamamlandığı anlamına gelmez.

### Madde23 — dört alanlı kapı kaydı
| Kapı | Beklenen+tolerans / sonuç | Örneklem+girdi | Kapsam | Pozitif / kasten kırmızı |
|---|---|---|---|---|
| O-M3/M4 / G2 | 14/14, ölüm0,45–90s, hash×2 eşit; son odak sonucu aşağıda | sabit seed0x1a2b3c4d,dt1/60, M03/M04.json; gerçek Space girdileri | başlangıç→bitiş, aktif magma/routeId doğrulaması; yüklenen JS byte boyutu diskle eşit | coin sayısı0 enjeksiyonu → iki test FAIL; W ayrı bot |
| G1 | W0/rota, kapsam≥.95; M03 .9746150, M04 .9743354 | segmentli yalnız sağ, zıplama yok | tüm x segmentlerinin birleşimi; teleport yürünmüş sayılmaz | sentetik alınmış coin → iki test FAIL; S14/14 pozitif |
| G3/G5/G7 statik | 5/5 PASS; D/F125 + M56 =181 | manifest ve dört M girdi dosyası/COINS | tür,bant,skill,kimlik,tekil move_id,coin'siz hareket,R0 tüm rampalar,R2≥400,R3≥1200,R4≥60 | M03/M04 ilk coin x0 → iki test FAIL |
| O-M-parkour | dört rotadaki mekanik türleri gözlendi; taşıyıcıların her birinde rideFrames>2 | S ve dış gözlemci; mechanics-b.json,hazard-b.json | vault/slide durumları, platform/overpass temasları, frontFlip fazları; M01 collapse durum makinesi; M03 kapı OPEN/PREPARING/CLOSING/CLOSED, varil2; yok bileşen0 | kapı crossing OPEN mutasyonu → FAIL; her assert ayrıca yanlış değerle reddetme denetimi |
| M03 kapalı kapı yan yolu | CLOSED, pushes0, üst hat ayak238≤275, ölüm0,14coin | başlangıçta6s gerçek idle sonra kilitli S resume | kapı geçiş anı,277 üst-hat temas karesi, son checkpoint16300 | açık kapı crossing mutasyonu → FAIL |
| O-M-visible M04 | her iki taşıyıcı temasında rideFrames≥3,MAD>3,kontrast>15,ekran payı≥.8,örtücü0 | crane/pallet gerçek S temasında yakalama; canvas görünür/gizli kare çifti | iki taşıyıcı,1280×720,aktif magma/M04 | MAD0 → FAIL; gizli çizim piksel farkı pozitif |
| O-M-hazard | 4rampa×20 gerçek faz,0 kesişim; kaynak listesi birebir | gerçek motor30tick/faz; door/barrel/collapse state ve koordinatları değişir | S'den ölçülen iniş yüksekliğinde x iniş bandı; rota kaynağı ayrı VM'den çıkarılır; fazlar hazard-b.json | aynı overlap hesabına çakışan sentetik rampa → test FAIL |
| B-M-theme | M03/M04×2konum×2boyut; bazalt .03–.30, yakınlav≤.01, tümkarelav≥.01,kül max≤36 ve≤.015,DOCK/FROZEN imzaları0,RMSE>18 | başlangıç+vault konumu;1280×720 ve390×844,canvas getImageData | iki rota8kare, kasa MAGMA oran≤.05; D01 kasa pozitif≥.30 | zemin oran0 → iki test FAIL; aynı-kare RMSE<1 ve D01 kasa pozitif |
| Korunum |39/39 PASS | başlangıç yedeğiyle route JSON/byte karşılaştırması | D/F,M01/M02 tüm rota verileri ve girdileri,index,BotS,BotW,ortak fizik/çizim/rota yüzeyi,eski test prefixleri,manifest | integrity-b.json; herhangi fark assert FAIL |

İniş taraması, hazardların20 gerçek durumunu ölçülen iniş zarfıyla karşılaştırır;20 ayrı başlangıç→bitiş koşusu olduğu iddia edilmez. M01 isteğe bağlı `m01-m-upper-exit` temas0; platform sistemi diğer öğelerde gözlendi. Bu kullanılmayan öğe saklanmadı; kabul edilmiş2a geometri/girdileri değiştirilmedi.

### Coin ve süre tablosu
| Rota |CJ|CC|CS|N| game_s ×2 | hash ×2 |
|---|---:|---:|---:|---:|---|---|
{coin}

### Test sonucu ve kanıt
- Son MAGMA: `{out}/final-magma-corrected.log` — {'29 PASS +1 emekli' if '29 passed' in final else 'henüz kapanmadı'}.
- World11/11 (`final-world.log`), statik5/5 (`final-static.log`), T1b6/6 (`final-t1b.log`).
- Parkour25/25, tn-a12 12PASS/5eskiFAIL (`final-core.log`); FROZEN12PASS/6skip/1eskiFAIL (`final-frozen.log`). Toplam eski6 kullanıcı tarafından kapsam dışı kabul edildi.
- Core logunda ayrıca dört ENOENT vardır: izole kopyada `coin-T1b1` eksikti. Gerekli dosyalar kopyalanıp aynı nihai ürün üzerinde T1b altı testin tamamı tekrarlandı ve6/6PASS. Bu dört altyapı hatası eski6 kümeye eklenmedi.
- Nihai ürün üzerindeki ilk MAGMA27PASS/1skip/2FAIL (`final-magma.log`): başlangıç RAF yarışı ve yeni denetimde yanlış per-obstacle kapsamı. İzinli adaptör/test düzeltmeleri sonrası etkilenen tüm MAGMA paketi tekrarlandı; eski eşikler/assertler değişmedi.
- Kasten kırmızı: `red-routes.log`10FAIL + `red-hazard.log`1FAIL. Ek oracle denetimi: `assert-audit/routes.log`10PASS; `assert-audit/hazard-corrected.log` sonucu. Yanlış değer reddetmeleri `{len(audit)}` çağrı, `{len(set(x['location'] for x in audit))}` benzersiz assert konumu; tamamı reddedildi={all(x['rejected'] for x in audit)}. Bu kayıtlar her koşul için yeni bir ürün mutasyonu olduğu anlamına gelmez; test FAIL kanıtları yukarıdaki11 koşumdur.
- Tema fixture ilk denemede yanlış dünya başlatma/kamera yerleşimi nedeniyle başarısızdı. Aktif rota/dünya assert'i korundu;850ms kare hazırlığı ve mevcut D01 kasa pozitif kontrolü kullanıldı. Eşikler gevşetilmedi.
- PNG sayısı: {len(screens)}; `03-test/tn-a4-shots/M03-*`, `M04-*`. Son kanıt kopyası `release/02-kod/03-test/tn-a4-shots`; hashler `screens-sha.json`. Medya otomatik açılmadı/önizlenmedi; insan görsel incelemesi yapılmadı.

### Devredilen
A4b-2c: tam kilit/kayıt/retry/next, dinamikG7, G4×12, mobil M01, M01/M02 rota-tema/kareleri,14×14benzerlik,ekonomi ve nihai tüm kabul. Bu çağrı tam A4b-2 kapanışı değildir.

### Son SHA256
```text
'''+''.join(f'{value}  {key}\n' for key,value in sha.items())+f'''```

Araçlar: PowerShell, Python, Node.js/yerel Playwright, graphify query/update(AST-only). Graphify1905düğüm/3182kenar/126topluluk;110dosya sıfır düğüm ve topluluk etiket kayması uyarısı var, grafik eksiksizlik kanıtı değildir. Ağ/kurulum/ücretli/commit/push/yayın/tam regresyon yok. Komut reçetesi: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line <spec> -g <odak>`; NODE_PATH aynı global modül dizini. İzole kopyalar eski T2/T1 kanıtlarını korur.

--- Önceki kayıtlar (korunur) ---

'''
report=r/'03-test/TN-A4-REPORT.md'
old=report.read_text(encoding='utf-8')
marker='--- Önceki kayıtlar (korunur) ---\n\n'
if '## A4b-2b —' in old[:500]: old=old.split(marker,1)[1]
report.write_text(summary+old,encoding='utf-8',newline='\n')
(out/'report-b.md').write_text(summary,encoding='utf-8',newline='\n')
print(json.dumps({'status':status,'routes':list(completed),'screens':len(screens),'assertRejects':len(audit),'uniqueAssertLocations':len(set(x['location'] for x in audit))},ensure_ascii=True))
