from pathlib import Path
import json,datetime
r=Path.cwd();o=Path((r/'03-test/a4c2a-run-path.txt').read_text());sha=json.loads((o/'final-sha.json').read_text());theme=json.loads((o/'theme.json').read_text());contract=(o/'A03-chief-contract.md').read_text(encoding='utf8')
text='''## A4c-2a — AFTERMATH A01/A02 — '''+datetime.datetime.now().isoformat()+'''
DISK DURUMU: nihai regresyon devam ediyor; kapanış henüz yok.

Başlangıç a12 c33c4acf3df1f194ac489d615af19f2c61b3764bfda2f037964baedc30881177, index fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142. Başlangıç hashleri diskten doğrulandı; `baseline-sha.json` ve `pre/` ayrı yedek.

| Kabul | Ölçülen / beklenen (tolerans) | Örneklem / girdi | Kapsam / kontrol |
|---|---|---|---|
| Manifest | A01 7CJ/4CC/3CS; A02 6CJ/5CC/3CS; A03 6CJ/4CC/4CS; A04 6CJ/5CC/3CS; N=C=14 | a-manifest.json uygulamadan önce sabitlendi | A01–A04; N azaltılmadı; A03/A04 henüz uygulanmadı |
| O-A1/G2 | 65.3167 game_s; 14/14; ölüm0; hash94a9561f x2; beklenen45–90/%100/0/eşit | S x2; route-inputs/A01.json; dt1/60, seed0x1a2b3c4d | kilitli S resume adaptörü; coin sayısı0 mutasyonu FAIL |
| O-A2/G2 | 65.10 game_s; 14/14; ölüm0; hashded0ad92 x2 | S x2; route-inputs/A02.json; aynı dt/seed | aynı kontrol |
| G1 | W coin0; kapsam A01 .973665, A02 .974291; beklenen>=.95 | segmentli W, iki rota | bitiş true; sentetik ground coin ekleme FAIL; pozitif eş S 14/14 |
| G3/G5/G7 | 7 statik test PASS (D/F1+M4+A2); A toplam28 | manifest/girdi/ROUTES; tüm rampalar R0 döngüsünde | A rotalarında bu aşamada rampa yok; x0 mutasyonu A01/A02 FAIL |
| O-A-parkour | A01 READY→CONTACT_WARNING→FALLING→ABSENT; alt yolda yalnız READY, ölüm0/bitiş; A01/A02 vault/slide/platform kullanım>2 | A01 üst/alt iki gerçek S koşusu; parkour-audit12/12 | collapse dışı hiçbir id çökme listesinde yok; yanlış durum/boş iz/yanlış tip kaynak mutasyonları reddedildi |
| A02 worker | doğuşlar ve frame iz hashleri x2 eşit; her doğuş warning>=.7 (tanım .75), vx=-185 | 2 gerçek S koşusu; worker.json | rastgele saldırı çağrısı yok; yanlış hash/boş doğuş/Math.random mutasyonu reddedildi |
| O-A-visible | 3 taşıyıcı maxride48/33/45; yakalamada rideFrames9; MAD>=16.58, kontrast>=91.67; beklenen >2/>3/>15 | A02 crane/pallet/crane gerçek S teması; gizli-kare farkı | kadraj>=.8; DOM örtücü0; MAD0 mutasyonu FAIL |
| B-A-theme | RMSE min '''+str(min(x['rmse'] for x in theme if 'rmse' in x))+'''>18; kontrast min54.667>15; kaynak/çizim imzaları0 | A01/A02 × başlangıç/engel × masaüstü/mobil; masaüstünde D/F/M karşılaştırması | aynı görüntü renk-fit negatifi RMSE0; kontrast0/yanlış dünya/yanlış id/örtücü1 reddedildi |
| Kareler | 8 PNG; her karede aktif dünya/rota ve oyuncu/öğe kadrajı doğrulandı | 1280x720 ve390x844; shots-sha.json | canvas pixel ROI, DOM örtücü0; otomatik açılmadı |
| Korunum | 35/35 PASS | D/F/M 14 rota tanımı+coin; eski14girdi; index/BotS; updateIntegrated/beforePhysicsIntegrated/routeSurfaces/drawAftermathWorld; D06 initializer | integrity.json; eski veriler/fizik/şef aynı |

Değişiklikler: ayrı A verisi/coin/girdi, WORLD_REGISTRY.aftermath.routes=[A01,A02], A kilit/ilk rota/next seçimi, satın alma mevcut koşuyu korur. Bot S çekirdeği değişmedi. Bot W yalnız A dünya seçimi eklendi. G4 adaptörü ayrı `03-test/a4c-g4-dynamic.cjs`; kullanım T2_ROUTE=A01/A02, T2_OUT=ayrı A kanıt dizini, T2_G2_EVIDENCE=bu turun a-s.json; G4 bu aşamada koşulmadı (2c).

A4c-1 satın alma testindeki tarihsel `routes:[]` koşulu, bu çağrının açık `routes:[A01,A02]` talebiyle değiştirildi. Fiyat/tek kesinti/sahiplik/aktif koşu koruma assertleri aynı; eski gövde pre yedeği ve diffte. Eşik gevşetilmedi. DEBUG renderThemeFixture yalnız A rota başlangıç dünyasını destekleyecek şekilde dar genişletildi; prod fizik yok.

A03 sözleşmesi (uygulama 2b):
'''+contract+'''

Kanıt yolları: '''+str(o)+'''. `a-final.log` 8/8 PASS; `red-dynamic.log` 5 beklenen FAIL +1 pozitif; `red-static.log`2 beklenen FAIL. Nihai regresyon `final-*.log/.rc`. İlk regresyon eski kaynakta, nihai debug-A fixture değişikliğinden sonra yeniden koşuldu; ilk MAGMA koşusu M01 W satırında durduruldu, yazan MAGMA kapılarına ulaşmadı. Nihai mirror M_B/M_C çıktı yolları kopya kanıt dizinlerine yönlendirildi; D/F/M kanıtları korunur.

Graphify: query + AST-only update; 2053 düğüm/3346kenar. Uyarı:113 dosya sıfır düğüm üretti (çoğu JSON),37 topluluk hub adıyla yenilendi; semantik/ücretli çağrı yapılmadı. PROGRESS dosyasındaki ilk aralık5dk hedefini aştı; ara commentary güncellemeleri verildi.

Nihai SHA256:
```json
'''+json.dumps(sha,indent=2)+ '\n```\n'
(o/'REPORT-A4c2a.md').write_text(text,encoding='utf8');print(o/'REPORT-A4c2a.md')
