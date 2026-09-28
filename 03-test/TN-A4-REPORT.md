DISK DURUMU: PASS - A4c-1 AFTERMATH YARD tema; rota eklenmedi.

## A4c-1 - 2026-09-28T04:00:40.464195

Baslangic a12 `31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6`; son `c33c4acf3df1f194ac489d615af19f2c61b3764bfda2f037964baedc30881177`. Yedek `E:\oyunlar\TrustMeBro\01-tasarim\a4c1-20260928/pre`; baslangic hash listesi `baseline-sha.json`; nihai liste `final-sha.json`. Rota/girdi/fizik/Bot S/index korunumu 23/23 (integrity.json). Mevcut tn-a4 byte prefix korunur. Tum eski a12 baytlari yalniz registry enabled ve tema dispatch istisnalari disinda ayni; yeni fonksiyonlar sunum katmani.

Baslangic olcumu: AFTERMATH enabled=false, price500, routes[]; canli D geometrisinde DOCK foreground/backdrop fallback. Son: enabled=true/price500/routes[]; satin alma tek500, mevcut dunya/rota korunur, routes[] oldugu icin secim gecis kuyrugu yaratmaz. Magaza onizlemesi AFTERMATH arka planini kullanir; canli tema kabul kareleri mevcut DEBUG renderThemeFixture ile D geometrisinde. A rotasi bu cagrida YOK. Fiyat500 sartname degeri, yoneticiye yeni fiyat onerisi uygulanmadi.

### Kabul (4 alan)

|Kapi|Beklenen + tolerans|Orneklem/girdi|Kapsam|Pozitif / ayri negatif kontrol|
|---|---|---|---|---|
|registry-purchase|500, tek sahiplik/kesinti; routes[]; guvenli secim|1000 bakiye, Promise.all cift satin alma|AFTERMATH; mevcut secim korunur|cift kesinti/sahiplik, yanlis fiyat/rota/sira degerleri reddedildi|
|not-recolor|kanal bazli affine renk donusumu sonrasi RMSE>18|D01 baslangic/vault, D02 worker, D03 crane; 3 dunya x4ROI x3konum=36|gercek layout zemin/engel ROI; mobil ayri okunurluk; esik ayni|kaynak goruntusunun kendi kopyasi RMSE0 reddedildi|
|signatures-absent|dock periyodik deckStripe/31/vinc/koridor, buz imzasi0; eski renderer cagrisi0|canli AFTERMATH + kaynak dispatch denetimi|devrilmis konteyner/bant yasak imza sayilmaz; MAGMA lav/kul kurali tasinmadi|her imza1, eski cizici cagrisi ve eksik canli dispatch mutasyonu reddedildi|
|safe-surface-readable|kenar/doku kontrast>15|sabit kamera getImageData surface/edge|beton yuru yuzeyi|duz tek renk ROI kontrast0 reddedildi|
|readable|kontrast>15, ortucu0|1280x720 ve390x844; platform/vault/ramp/coin gercek ROI|8 olcum|her ROI sifir kontrast, ortucu1 reddedildi|
|moving-platform-visible|gizli-kare MAD>3, kontrast>15, yeni kare>=1|D03 vinc veD05 palet|AFTERMATH tasiyicilar|gizli/gizli MAD0, kontrast0, kare0 reddedildi|
|physics-identical|x/y fark<=.5px|DOCK/AFTERMATH D01 3sn ayni sag girdisi;15es-zaman noktasi|her iki eksen|her noktaya1px fark mutasyonu reddedildi|
|render-performance|AFTERMATH/DOCK<=1.5|120kare her dunya, performance.now, ayni rota|arka plan+dunya Canvas|1.51 oran reddedildi|
|emergency-light-bounded|max es-faz yuzey degisimi<=.15; isik var/degisir; tum fazlar kontrast>15|121kare,dt1/60,2sn tamcevrim; sabit kamera;acik/kapali ROI cifti|lamba+yuzey/kenar|gain20 gercek cizim mutasyonu .27098 reddedildi; isiksiz0 ve sabit0 degisim reddedildi|
|decor-never-collapses|kimlik/taban/gorunurluk sabit; kaynakta hazard baglantisi0|1800fizik adimi=30sn;her60adim ornek; sabit probe kamera|aftermathDecor salt sabit koordinat; yalniz collapsing dongusu state/fallY kullanir|sentetik dekor y+100 ve kaynak collapsing[0].fallY mutasyonu reddedildi|
|24kare|4dunya x2boyut x3konum; dunya/rota dogru; oyuncu/hedef>=.8kadraj;ortucu0|CDP screenshot; canli canvas olcumleri|ayri aftermath-a4c1 klasoru; eski D/F/M kanitlari ezilmedi|yanlis dunya/rota, kadraj0, ortucu1 reddedildi|

Negatif kontroller: 246 calistirilan reddetme; 117 benzersiz isim. Her AFTERMATH kabul asserti ilgili bozuk degeri ayni predicate/assert yolunda gorur; bunlar beklenen failure catch ile tutulur (ana testlerin PASS gorunmesi negatifin calismadigi anlamina gelmez). Isik/dekor/goruntu kontrolleri ayrica gercek sentetik girdi/cizim mutasyonu kullanir. Ham kanit verified.log ve negative-controls.json.

### Olcumler

Isik: `[{"max": 0.009557540178839684, "minEdge": 109.66666666666666, "lightMin": 9.532738095238102, "lightMax": 14.822420634920647, "negative": 0.27097746966586694, "frames": 121, "dt": 0.016666666666666666}]`
Performans: `[{"dock": 0.4375, "aftermath": 0.4083333333333333}]`
Tasiyicilar: `[{"mad": 15.581141930835734, "contrast": 102.66666666666667, "frameDelta": 1}, {"mad": 15.20749007936508, "contrast": 102.66666666666667, "frameDelta": 1}]`
Okunabilirlik: `[[{"size": {"width": 1280, "height": 720}, "kind": "edge", "contrast": 151.66666666666669, "cover": 0, "rect": {"x": 472, "y": 469, "w": 200, "h": 32}}, {"size": {"width": 1280, "height": 720}, "kind": "vault", "contrast": 147.66666666666669, "cover": 0, "rect": {"x": 494, "y": 518, "w": 32, "h": 64}}, {"size": {"width": 1280, "height": 720}, "kind": "ramp", "contrast": 147.66666666666666, "cover": 0, "rect": {"x": 485, "y": 484, "w": 240, "h": 99}}, {"size": {"width": 1280, "height": 720}, "kind": "coin", "contrast": 148, "cover": 0, "rect": {"x": 454, "y": 424, "w": 38, "h": 38}}, {"size": {"width": 390, "height": 844}, "kind": "edge", "contrast": 151.66666666666669, "cover": 0, "rect": {"x": 165, "y": 708, "w": 109, "h": 18}}, {"size": {"width": 390, "height": 844}, "kind": "vault", "contrast": 132.33333333333334, "cover": 0, "rect": {"x": 178, "y": 734, "w": 18, "h": 35}}, {"size": {"width": 390, "height": 844}, "kind": "ramp", "contrast": 227.66666666666666, "cover": 0, "rect": {"x": 171, "y": 716, "w": 131, "h": 54}}, {"size": {"width": 390, "height": 844}, "kind": "coin", "contrast": 140.33333333333331, "cover": 0, "rect": {"x": 155, "y": 683, "w": 21, "h": 21}}]]`
RMSE36: `[[{"route": "D01", "world": "dock31", "region": "background", "rmse": 21.769748651508085}, {"route": "D01", "world": "dock31", "region": "structures", "rmse": 23.781274243150104}, {"route": "D01", "world": "dock31", "region": "ground", "rmse": 36.73826768821075}, {"route": "D01", "world": "dock31", "region": "obstacle", "rmse": 48.61736711525156}, {"route": "D01", "world": "frozen", "region": "background", "rmse": 22.033300364708538}, {"route": "D01", "world": "frozen", "region": "structures", "rmse": 23.831263466737568}, {"route": "D01", "world": "frozen", "region": "ground", "rmse": 41.3175654222478}, {"route": "D01", "world": "frozen", "region": "obstacle", "rmse": 50.09927905852908}, {"route": "D01", "world": "magma", "region": "background", "rmse": 23.668083122822054}, {"route": "D01", "world": "magma", "region": "structures", "rmse": 23.60284846270361}, {"route": "D01", "world": "magma", "region": "ground", "rmse": 33.99714606030432}, {"route": "D01", "world": "magma", "region": "obstacle", "rmse": 51.079616566668165}, {"route": "D02", "world": "dock31", "region": "background", "rmse": 21.564628778034745}, {"route": "D02", "world": "dock31", "region": "structures", "rmse": 25.868232038117686}, {"route": "D02", "world": "dock31", "region": "ground", "rmse": 36.58419457314989}, {"route": "D02", "world": "dock31", "region": "obstacle", "rmse": 49.623449846561186}, {"route": "D02", "world": "frozen", "region": "background", "rmse": 22.033300364708538}, {"route": "D02", "world": "frozen", "region": "structures", "rmse": 26.366686010262097}, {"route": "D02", "world": "frozen", "region": "ground", "rmse": 41.32207658780584}, {"route": "D02", "world": "frozen", "region": "obstacle", "rmse": 55.315384681737335}, {"route": "D02", "world": "magma", "region": "background", "rmse": 23.668083122822054}, {"route": "D02", "world": "magma", "region": "structures", "rmse": 25.860196481332594}, {"route": "D02", "world": "magma", "region": "ground", "rmse": 33.59110622519491}, {"route": "D02", "world": "magma", "region": "obstacle", "rmse": 52.347665115475685}, {"route": "D03", "world": "dock31", "region": "background", "rmse": 23.297941386449978}, {"route": "D03", "world": "dock31", "region": "structures", "rmse": 28.036541184052396}, {"route": "D03", "world": "dock31", "region": "ground", "rmse": 38.36976123506878}, {"route": "D03", "world": "dock31", "region": "obstacle", "rmse": 41.04359453330568}, {"route": "D03", "world": "frozen", "region": "background", "rmse": 23.32209224710798}, {"route": "D03", "world": "frozen", "region": "structures", "rmse": 28.413121328217883}, {"route": "D03", "world": "frozen", "region": "ground", "rmse": 42.52232628621206}, {"route": "D03", "world": "frozen", "region": "obstacle", "rmse": 43.01098536137068}, {"route": "D03", "world": "magma", "region": "background", "rmse": 24.837500106020777}, {"route": "D03", "world": "magma", "region": "structures", "rmse": 28.242418775511382}, {"route": "D03", "world": "magma", "region": "ground", "rmse": 34.92069568002012}, {"route": "D03", "world": "magma", "region": "obstacle", "rmse": 42.974877301950094}]]`

### Regresyon - nihai urun SHA

- verified.log: 10 passed (54.9s)
- final-core.log: 38 passed (1.7m)
- final-frozen.log: 1 failed; 6 skipped; 13 passed (2.5m)
- final-magma.log: 1 skipped; 37 passed (4.7m)
- final-world.log: 11 passed (18.9s)
FROZEN rollDrop eski kabul edilmis hata; yeni D/F/M hatasi yoksa kapsam PASS. frozen13=eski12+AFTERMATH imza1; magma37=eski36+AFTERMATH imza1. parkour25+t1b6+t2-coins7=38. tn-a12/t2-chief bu tema cagrisi kullanici regresyon listesinde yok; tam regresyon KOSULMADI. Regresyon ayri kopyada, ana oturum post-a4b snapshot dokunulmadi.

### Duzeltme ve kanit sinirlari

- Ilk sabit ekran ROI gercek zemin disinda kaldigi icin sahte yesil verdi. Gercek layout/oge ROI ile genisletilen denetim canli drawWorld dispatch eksigini kirmizi yakaladi; CRLF/LF farkindan uygulanmayan dar early-return tamamlandi. Onceki 10/10 rapor kabulu DEGIL; verified.log tek nihai kabul.
- Kaynak dizisinde ilk vault kadraj disindaydi; gorunen vault secimi ve >=.8 kadraj kontrolu eklendi. Mobil vinc kamerası yuk genisligine gore yerlestirildi. Esikler gevsetilmedi.
- 30sn gozlem tek basina asla kaniti sayilmadi; dekor fonksiyonu sabit koordinatli, collapse/clock/timer/state referansi yok. Oge kimlikleri dogrudan canli cizicinin kullandigi aftermathDecor listesinden.
- Performans yerel mikrobenchmark; coklu test ve ana oturum CPU yuku var. Tum olcumler yerel, network/kurulum/AI gorsel/commit/yayin yok.
- Graphify AST update yapildi; 111 zero-node kaynak ve topluluk etiket kaymasi uyarisi mevcut (graphify-final.log); grafik medyasi acilmadi. LLM/API maliyeti0.


### A4c-1 oge envanteri 2026-09-28T03:55:28.498802
Coin/HUD/runner ortak kalir; tum diger oge gruplari asagida. AFTERMATH DOCK ile ayni satir: 0.
|Oge|DOCK|FROZEN|MAGMA|AFTERMATH|
|---|---|---|---|---|
|Arka plan|liman binalari/vinc|buzul/aurora|volkan/uzak lav|aftermathBackdrop: kul-gri terminal, uzak ince duman, devrilmis yuk silueti|
|Dekor|duzenli konteyner/vinc|buz sivrilikleri|bazalt isitma yapisi|aftermathDecor + drawAftermathWorld: sabit tabanli egik hasarli yuk|
|Zemin|drawMetal duzenli serit|frozenSurface buz/kar|magmaSurface bazalt|aftermathSurface ground: catlak beton/egik plakalar/kopuk bant|
|Platform/ust hat|metal platform|buz raf|celik izgara|aftermathSurface platform: kirik panel dokusu/acik kenar|
|Vault/kasa|ahsap|buz sandik|yalitimli gumus kasa|drawAftermathWorld vault: ezik isli metal, bukulmus hat|
|Slide|sari kiris|buz kiris|celik kiris|drawAftermathWorld slide: devrilmis parca kenari/ok|
|Rampa|turuncu metal|kar/buz|bazalt celik|drawAftermathWorld ramp: kirik beton doseme|
|Vinc|liman yuku/kablo|buz yuku|pota|drawAftermathWorld movingPlatforms: asimetrik sarkik kablo/hasarli yuk|
|Palet|ahsap|karli kalas|dokum arabasi|aftermathSurface: yamali metal/palet ok|
|Kapi|servis kapisi|buz kapisi|firin kapagi|drawAftermathWorld containerDoors: yamuk cerceve/hasarli panel|
|Collapse|catlak metal|catlak buz|bazalt levha|drawAftermathWorld collapsing: catlak beton; ayni state/fallY|
|Isci|dock isci|soguk hava ekibi|aluminize tulum|aftermathRescuer: turuncu reflektif kurtarma ekibi/kask lambasi|
|Varil|yuvarlak ahsap|buz kap|gumus curuf kabi|drawAftermathWorld barrels: egik ezik yanmis kap|
|Sef|sprite sef|sprite sef|isi elbisesi|aftermathRescuer chief: sari yelekli yikim gozetmeni|
|Bitis|direk/bayrak|direk/bayrak|celik bayrak|drawAftermathWorld finish: yesil acil cikis cercevesi|
|Isik|liman lambasi|sabit saha lambasi|firin atmosferi|aftermathLights:2sn cevrim/lokal dusuk alfa|
Fonksiyon/satirlar: aftermathDecor:js/a12-campaign.js:2525, aftermathBackdrop:js/a12-campaign.js:2530, aftermathSurface:js/a12-campaign.js:2542, aftermathRescuer:js/a12-campaign.js:2550, aftermathLights:js/a12-campaign.js:2556, drawAftermathWorld:js/a12-campaign.js:2564, drawWorldIntegrated:js/a12-campaign.js:2747, drawBackgroundIntegrated:js/a12-campaign.js:2738

### Nihai SHA256

- `index.html` `fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142`
- `js/a12-campaign.js` `c33c4acf3df1f194ac489d615af19f2c61b3764bfda2f037964baedc30881177`
- `03-test/tn-a4.spec.cjs` `fda195fae80387b14a040e0253aab700767b315c6673f5448d439613fd1b089f`
- `03-test/t2-coins.spec.cjs` `5c00a4447c4454059f25cd366390a9b08ac5e9c6b36668da089248325eebb2e0`
- `03-test/route-inputs/D01.json` `b33d37b5a6cccf3ef425c0d1fe4bc559beb4a3f79664ecefe4ff882d079ffa3d`
- `03-test/route-inputs/D02.json` `1d3aa54a580dfc6f61f4a63796230d159bc667f4593d0657629793b9f265a7f5`
- `03-test/route-inputs/D03.json` `effbd227d1d20d3b899603889cbfdadf5ba8899af66bce3844b93acf855f5fad`
- `03-test/route-inputs/D04.json` `dcfb76cf64e06c9d3623db94274361a8570065f9c2791aea12e48d653efe3e5c`
- `03-test/route-inputs/D05.json` `d0dbe2c995288d6652309e24547827bf787728d732b03405ef03944dc4b93c16`
- `03-test/route-inputs/D06.json` `359437df9b5a0a1ae95cd39e940dde784201c80cdb403fdefa07ca9e11673fb2`
- `03-test/route-inputs/F01.json` `93c45367f0c57cac5464b304a385056ff685ee3d147bac68bd47a9a65f10e599`
- `03-test/route-inputs/F02.json` `4eaee23e869367413c4423a19d32acd8c944ffbde2744deeb1bf1837b535b17c`
- `03-test/route-inputs/F03.json` `dbde3548d6a189fd3b4e344a5736e1bf152292a58d94a9a197a850451287ef7f`
- `03-test/route-inputs/F04.json` `cb91849f19e85ca1b1bc27919607513f9e8c01ac54972df5b467505731ca84bd`
- `03-test/route-inputs/M01.json` `f37660cbe80c265798558fcbeab01cad3526ba0731cee8601203b0cd4885c095`
- `03-test/route-inputs/M02.json` `b17256abb64abf830978255135e62a770b6464a916d4ee9cd8511c678cafcdf9`
- `03-test/route-inputs/M03.json` `65a49bf350565e9cdaf38a603e7119bb0e02084897c8a5581f515603ebf1bd80`
- `03-test/route-inputs/M04.json` `36989b4ed79f9fe504254004591339500aed952d7f817acd240d4db00c3c462f`
- `03-test/lib/bot-magma.cjs` `a61bfffa8f340e6ec23cff3f1793cfff80615a4896ad7780a7e42401eef82054`
- `03-test/lib/bot-s-drive.cjs` `c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f`
- `03-test/lib/bot-w.cjs` `09ba3c04d1b470b9237f25f6a0808833e622f7e66d5d61c2f9a7368025fd7bbf`
- `03-test/lib/magma-b-probe.cjs` `324961d51d2e6687b243fe0029ca37f046e889dc5e7c7fd23ccd1629a5913359`
- `03-test/lib/magma-probe.cjs` `90e895229025812dc9dfd2138749be3c7ec3f65771a7f4ef67a734703ea0df03`


A4c-1 nihai provenance: AFTERMATH 10/10 tekrar native LASTEXITCODE=0 (native-exit-code.txt); verified.log bu son kosunun kopyasi; onceki kosu verified-earlier.log ile korundu. Regresyon kopyasi urun SHA ayni, eski test prefix ve -g magma/frozen tarafindan secilen ek imza testi birebir. tn-a4 tum-dosya SHA farki sadece bu regresyonlarda secilmeyen AFTERMATH D03 kamera fiksturu; regression-provenance.json iki SHAyi kaydeder. Tum baslatilan test surecleri sonlandi.

<!-- PRE-A4C-1 REPORT -->
DISK DURUMU: PASS - A4b-2c; kabul edilmis 6 eski kirmizi kapsam disi.

## A4b-2c - 2026-09-28T03:36:05.496901

Baslangic a12 `8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b`; yedek `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2c-20260928-031715/pre/02-kod`, hash listesi `start-sha.json`. Nihai a12 `31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6`. Ham kanit `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2c-20260928-031715`. Tam regresyon KOSULMADI.

### Uygulama ve korunum

- MAGMA onceki rota tamamlanmadan acilmaz; M01 -> M02 -> M03 -> M04 -> M01 next zinciri; restore/varsayilan secim acik en ileri M rotasini bilir. Registry M01-M04. UI sonuc next/retry, siradaki dunya MAGMA ise D/F rota kimligini MAGMA rotasina donusturur; MAGMA disina geciste hedef dunya baslangicina doner.
- debugState.route.unlocked MAGMA icin M01-M04 durumlarini verir. Ilk kilit testindeki hata F kilit haritasinin donmesiydi; anahtar sirasi ilk tahmini dogrulanmadi.
- Mekanik test fiksturu M02/M03 on kosullarini da kayda ekler; eski tema fiksturu M01-M03 sirayla bitirir. Eski assert/esikler ayni. index, Bot S cekirdegi, fizik, tum D/F/M geometri/coin/girdi byte dizileri ve fiyat/yildiz ayni. `integrity-c.json`: 29/29; `a12.diff`: izinli akisin tum farklari.
- Mobil test CDP touchEnd icin birakilacak parmak kimligini duzeltti. Klavye/teleport/yerlestirme kullanmadan 390x844 gercek trusted touch joystick+jump olaylari; manuel 1/60 sim zamaninda checkpoint5200, olum0.

### Kabul - her satir dort alan

| Kapi | Beklenen + tolerans | Orneklem + girdi | Kapsam | Pozitif / kasten kirmizi kontrol |
|---|---|---|---|---|
| B-M-chain/registry | Yalniz M01 acik; onceki bitisle tek sonraki; ikinci ucret0 | Yeni profil, 200coin satin al/sec; UI next ve retry; M01-M04 | M kilit/sahiplik, D/F ilerleme ayni | Kilitli M02/M03/M04 start false; red reject-locked |
| G7/kayit | start/retry/next her M14coin; retry coin durumu uygun; kayit ayni | Dort rota; her rotada yeni sayfada ayni profil, kismi coin kaydi | 12 start/retry/next satiri + result retry ve save | audit start-count/retry-count/save-resume/result-retry/next-count yanlis degeri reddeder |
| G4 pilot | 12 benzersiz hedef; k alinmamis; coinContact/iz kesisimi0; bitis | M01-M04 x CJ/CC/CS; S-k, sabit dt/seed; her hedef icin S pozitif | 12/12; tum segmentlerin fizik-adimi izleri; teleport boyunca yapay cizgi yok | Her hedef tam S kosusunda alinmis; sentetik dikdortgen temas; red g4-pass ve audit g4-trace |
| M-M | 390x844; kontrol alanlari gorunur/ortusme0; checkpoint>=5200/death0 | M01 baslangic, CDP iki parmak joystick+jump, 1355 adim | Ilk checkpoint; 7 trusted touch pointerdown | red mobile-checkpoint; audit mobile-controls/mobile-real-touch |
| B-M-similarity | 14x14; M-M/M-F mesafe>=0.3; ayni tip+en iyi kaydirma<=150px kopya yok | D6+F4+M4; x sirali tip dizisi, Levenshtein/max uzunluk; normalize x kaniti | Tum196 hucre; M-M min0.3125, M-F min0.352941 | D04 +500px sentetik kopya reddedilir; red distance |
| B-M-economy | Cuzdan delta = runCoins+15+ilk20+stil; fiyat200 | 14 rota x ilk/tekrar gercek Bot S =28 bitis; olum0 | D/F/M kazanci, ilk ve tekrar ayri; asagidaki tablo | Olculen cuzdan delta ve bank result uzlasmasi |
| M rota adlari | EN/TR/RU her4 ad mevcut, farkli; EN tam tasarim adi | i18n sozluk API | 12 isim | red names; audit english-names |
| B-M-theme | doku0.03..0.30; yakin lav<=0.01/uzak>=0.01; kul max36/kapsama<=.015; RMSE>18; DOCK/FROZEN imza0 | M01-M04 x start/engel x1280x720/390x844 | 16 canvas olcumu ve PNG; ortucu0, aktif dunya/rota dogru | D01 ahsap kontrol>=.30; M kasa<=.05; kendi-resmi RMSE<1; M01/M02 red ground0 |

### Rotalar - nihai SHA uzerinde Bot S x2

| Rota | Coin | Sure1 / sure2 s | Olum | Determinizm |
|---|---:|---:|---:|---|
|M01|14/14|64.25000 / 64.25000|0|473c1aa0 = 473c1aa0|
|M02|14/14|63.91667 / 63.91667|0|1ba9b3be = 1ba9b3be|
|M03|14/14|67.43333 / 67.43333|0|3653e81a = 3653e81a|
|M04|14/14|63.93333 / 63.93333|0|a5bef243 = a5bef243|

### G4x12

| Rota | Tur | Hedef | Iz ornek | Kesisim | Pozitif |
|---|---|---|---:|---:|---|
|M01|CJ|M01-c01|3900|0|True|
|M01|CC|M01-c02|3855|0|True|
|M01|CS|M01-c03|14981|0|True|
|M02|CJ|M02-c02|3908|0|True|
|M02|CC|M02-c01|15272|0|True|
|M02|CS|M02-c03|14976|0|True|
|M03|CJ|M03-c01|4091|0|True|
|M03|CC|M03-c03|4046|0|True|
|M03|CS|M03-c02|15395|0|True|
|M04|CJ|M04-c02|3882|0|True|
|M04|CC|M04-c01|3836|0|True|
|M04|CS|M04-c05|14510|0|True|

### Ekonomi (coin)

| Rota | Toplanan | Bitis | Ilk bonus | Stil | Ilk kazanc | Tekrar kazanc |
|---|---:|---:|---:|---:|---:|---:|
|D01|12|15|20|5|52|32|
|D02|10|15|20|8|53|33|
|D03|13|15|20|10|58|38|
|D04|12|15|20|10|57|37|
|D05|13|15|20|7|55|35|
|D06|13|15|20|10|58|38|
|F01|14|15|20|8|57|37|
|F02|13|15|20|10|58|38|
|F03|13|15|20|7|55|35|
|F04|12|15|20|10|57|37|
|M01|14|15|20|5|54|34|
|M02|14|15|20|10|59|39|
|M03|14|15|20|7|56|36|
|M04|14|15|20|8|57|37|

200coin MAGMA: bos cuzdan, arada satin alma yok, tam Bot S toplama varsayimiyla D01-D04 ilk tamamlamalari **4 kosu / 220coin**. Ilk bonuslar tukendiyse D01-D06 tekrar dongusu **6 kosu / 213coin**. FROZEN zaten sahiplenilmisse F01-F04 ilk **4 / 227**, tekrar dongusu **6 / 222**. MAGMA kazanci satin alma SONRASI geri kazanimdir: ilk M01-M04 **4 / 226**, tekrar dongusu **6 / 219**; MAGMA kendi kilidini acmak icin kullanilmadi. FROZEN satin alma maliyeti bu varsayima dahil degil. Kanit `economy.json`/`positive-s.json`/`final-economy.log`. D/F125+M56=181 coin; sayilar azaltilmadi.

### 14x14 normalize tip-duzenleme MESAFESI (benzerlik degil)

|Rota|D01|D02|D03|D04|D05|D06|F01|F02|F03|F04|M01|M02|M03|M04|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|D01|0.000|0.600|0.588|0.647|0.444|0.650|0.588|0.588|0.632|0.650|0.550|0.647|0.579|0.588|
|D02|0.600|0.000|0.650|0.550|0.550|0.650|0.600|0.600|0.650|0.550|0.650|0.600|0.550|0.600|
|D03|0.588|0.650|0.000|0.647|0.611|0.550|0.529|0.438|0.684|0.600|0.650|0.688|0.632|0.562|
|D04|0.647|0.550|0.647|0.000|0.556|0.500|0.529|0.647|0.684|0.450|0.600|0.706|0.632|0.647|
|D05|0.444|0.550|0.611|0.556|0.000|0.600|0.611|0.444|0.579|0.500|0.550|0.556|0.579|0.500|
|D06|0.650|0.650|0.550|0.500|0.600|0.000|0.600|0.500|0.700|0.600|0.750|0.650|0.800|0.500|
|F01|0.588|0.600|0.529|0.529|0.611|0.600|0.000|0.471|0.632|0.500|0.400|0.529|0.526|0.353|
|F02|0.588|0.600|0.438|0.647|0.444|0.500|0.471|0.000|0.526|0.500|0.600|0.500|0.632|0.500|
|F03|0.632|0.650|0.684|0.684|0.579|0.700|0.632|0.526|0.000|0.550|0.500|0.632|0.579|0.632|
|F04|0.650|0.550|0.600|0.450|0.500|0.600|0.500|0.500|0.550|0.000|0.550|0.550|0.700|0.450|
|M01|0.550|0.650|0.650|0.600|0.550|0.750|0.400|0.600|0.500|0.550|0.000|0.500|0.400|0.450|
|M02|0.647|0.600|0.688|0.706|0.556|0.650|0.529|0.500|0.632|0.550|0.500|0.000|0.526|0.312|
|M03|0.579|0.550|0.632|0.632|0.579|0.800|0.526|0.632|0.579|0.700|0.400|0.526|0.000|0.526|
|M04|0.588|0.600|0.562|0.647|0.500|0.500|0.353|0.500|0.632|0.450|0.450|0.312|0.526|0.000|

### Regresyon ucu / negatif kanit

| Paket | Nihai sonuc |
|---|---|
|final-core.log|44 passed; 5 failed|
|final-frozen.log|12 passed; 6 skipped; 1 failed|
|final-magma.log|36 passed; 1 skipped|
|final-world.log|11 passed|
|final-static.log|7 passed|
Eski FAIL kumesi: tn-a12 campaign-movement-and-frontflip; reward-budget-first-and-repeat; purchase-double-tap; D01/D02 real-input route completion; frozen-parkour-carriers-and-bypasses (rollDrop). Bu6 onceki yedekte dogrulandi ve kullanici tarafindan kapsam disi kabul edildi. Yeni hata bu kumeye eklenmedi. Core44PASS = parkour25 + t1b6 + chief1 + tn-a12 kalan12.
Yedi yeni testin tamaminda beklenen exit1 / 1failed goruldu (`red-c.json`, red-*.log). Yeni ortak assert denetiminde 26 farkli etiket yanlis bool degerini reddetti (`assert-audit-c.jsonl`); bunlar PASS kosusundaki dogru deger assertlerinin yerine gecmez. Tema M01/M02 ayni kabul edilmis 2b oraklini kullanir.
Graphify AST-only guncellendi; 1957node/3232edge/131community. 111 zero-node ve community etiket uyari kaydi `graphify-update.log`; semantik/ag/ucretli cagrisi yok. Yeni arac betikleri/rapor sonrasi son AST sonucuna bakiniz.

### Nihai SHA256

```text
fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142 index.html
31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6 js/a12-campaign.js
d59c09d59d228d0ef8da05817c79eadc7de0fc38b9a92fea5ce7edfdecf067bb 03-test/tn-a4.spec.cjs
5c00a4447c4454059f25cd366390a9b08ac5e9c6b36668da089248325eebb2e0 03-test/t2-coins.spec.cjs
f37660cbe80c265798558fcbeab01cad3526ba0731cee8601203b0cd4885c095 03-test/route-inputs/M01.json
b17256abb64abf830978255135e62a770b6464a916d4ee9cd8511c678cafcdf9 03-test/route-inputs/M02.json
65a49bf350565e9cdaf38a603e7119bb0e02084897c8a5581f515603ebf1bd80 03-test/route-inputs/M03.json
36989b4ed79f9fe504254004591339500aed952d7f817acd240d4db00c3c462f 03-test/route-inputs/M04.json
a61bfffa8f340e6ec23cff3f1793cfff80615a4896ad7780a7e42401eef82054 03-test/lib/bot-magma.cjs
c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f 03-test/lib/bot-s-drive.cjs
09ba3c04d1b470b9237f25f6a0808833e622f7e66d5d61c2f9a7368025fd7bbf 03-test/lib/bot-w.cjs
324961d51d2e6687b243fe0029ca37f046e889dc5e7c7fd23ccd1629a5913359 03-test/lib/magma-b-probe.cjs
90e895229025812dc9dfd2138749be3c7ec3f65771a7f4ef67a734703ea0df03 03-test/lib/magma-probe.cjs
```

### Teslim / snapshot

`E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\post-a4b-mirror\02-kod` sprites ve tum calisma zamani varliklariyla hash dogrulamali kopyalandi: 779 dosya, 38 sprite, 16 PNG. `READY-post-a4b.txt` snapshot tamamlama isaretidir; bu dosya yazilmadan snapshot HAZIR sayilmaz. Ana oturumun tam regresyonu icin yerel yol/env tarifi READY icindedir. Uretilen16PNG otomatik acilmadi.
Araclar: PowerShell, Python, Node.js/yerel Playwright-CDP, graphify. Commit/push/kurulum/ucretli/yayin/tam regresyon yok.


---

DISK DURUMU: PASS — A4b-2b kapsamı; 6 eski kırmızı kullanıcı kabulüyle kapsam dışı.

## A4b-2b — 2026-09-28T03:15:41.165350

Başlangıç A4b-2a kullanıcı tarafından kabul edildi. Başlangıç a12 SHA: `5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39`.
Yedek ve başlangıç SHA: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2b-20260928-025238/baseline/02-kod`, `start-sha.json`; manifestin ayrı kopyası `m-manifest.json`.
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
| M01 | 8 | 4 | 2 |14| 64.25000 / 64.25000 | 473c1aa0 = 473c1aa0 |
| M02 | 6 | 6 | 2 |14| 63.91667 / 63.91667 | 1ba9b3be = 1ba9b3be |
| M03 | 7 | 4 | 3 |14| 67.43333 / 67.43333 | 3653e81a = 3653e81a |
| M04 | 7 | 5 | 2 |14| 63.93333 / 63.93333 | a5bef243 = a5bef243 |

### Test sonucu ve kanıt
- Son MAGMA: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2b-20260928-025238/final-magma-corrected.log` — 29 PASS +1 emekli.
- World11/11 (`final-world.log`), statik5/5 (`final-static.log`), T1b6/6 (`final-t1b.log`).
- Parkour25/25, tn-a12 12PASS/5eskiFAIL (`final-core.log`); FROZEN12PASS/6skip/1eskiFAIL (`final-frozen.log`). Toplam eski6 kullanıcı tarafından kapsam dışı kabul edildi.
- Core logunda ayrıca dört ENOENT vardır: izole kopyada `coin-T1b1` eksikti. Gerekli dosyalar kopyalanıp aynı nihai ürün üzerinde T1b altı testin tamamı tekrarlandı ve6/6PASS. Bu dört altyapı hatası eski6 kümeye eklenmedi.
- Nihai ürün üzerindeki ilk MAGMA27PASS/1skip/2FAIL (`final-magma.log`): başlangıç RAF yarışı ve yeni denetimde yanlış per-obstacle kapsamı. İzinli adaptör/test düzeltmeleri sonrası etkilenen tüm MAGMA paketi tekrarlandı; eski eşikler/assertler değişmedi.
- Kasten kırmızı: `red-routes.log`10FAIL + `red-hazard.log`1FAIL. Ek oracle denetimi: `assert-audit/routes.log`10PASS; `assert-audit/hazard-corrected.log` sonucu. Yanlış değer reddetmeleri `123` çağrı, `26` benzersiz assert konumu; tamamı reddedildi=True. Bu kayıtlar her koşul için yeni bir ürün mutasyonu olduğu anlamına gelmez; test FAIL kanıtları yukarıdaki11 koşumdur.
- Tema fixture ilk denemede yanlış dünya başlatma/kamera yerleşimi nedeniyle başarısızdı. Aktif rota/dünya assert'i korundu;850ms kare hazırlığı ve mevcut D01 kasa pozitif kontrolü kullanıldı. Eşikler gevşetilmedi.
- PNG sayısı: 8; `03-test/tn-a4-shots/M03-*`, `M04-*`. Son kanıt kopyası `release/02-kod/03-test/tn-a4-shots`; hashler `screens-sha.json`. Medya otomatik açılmadı/önizlenmedi; insan görsel incelemesi yapılmadı.

### Devredilen
A4b-2c: tam kilit/kayıt/retry/next, dinamikG7, G4×12, mobil M01, M01/M02 rota-tema/kareleri,14×14benzerlik,ekonomi ve nihai tüm kabul. Bu çağrı tam A4b-2 kapanışı değildir.

### Son SHA256
```text
fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142  index.html
8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b  js/a12-campaign.js
a8cc49eb817d532db1da29f8a2f4eef1f0e93f3d427861b1ea720a520529e457  03-test/tn-a4.spec.cjs
5c00a4447c4454059f25cd366390a9b08ac5e9c6b36668da089248325eebb2e0  03-test/t2-coins.spec.cjs
c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f  03-test/lib/bot-s-drive.cjs
a61bfffa8f340e6ec23cff3f1793cfff80615a4896ad7780a7e42401eef82054  03-test/lib/bot-magma.cjs
324961d51d2e6687b243fe0029ca37f046e889dc5e7c7fd23ccd1629a5913359  03-test/lib/magma-b-probe.cjs
65a49bf350565e9cdaf38a603e7119bb0e02084897c8a5581f515603ebf1bd80  03-test/route-inputs/M03.json
36989b4ed79f9fe504254004591339500aed952d7f817acd240d4db00c3c462f  03-test/route-inputs/M04.json
f37660cbe80c265798558fcbeab01cad3526ba0731cee8601203b0cd4885c095  03-test/route-inputs/M01.json
b17256abb64abf830978255135e62a770b6464a916d4ee9cd8511c678cafcdf9  03-test/route-inputs/M02.json
```

Araçlar: PowerShell, Python, Node.js/yerel Playwright, graphify query/update(AST-only). Graphify1905düğüm/3182kenar/126topluluk;110dosya sıfır düğüm ve topluluk etiket kayması uyarısı var, grafik eksiksizlik kanıtı değildir. Ağ/kurulum/ücretli/commit/push/yayın/tam regresyon yok. Komut reçetesi: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line <spec> -g <odak>`; NODE_PATH aynı global modül dizini. İzole kopyalar eski T2/T1 kanıtlarını korur.

--- Önceki kayıtlar (korunur) ---

DISK DURUMU: A4b-2a M01–M02 kapıları PASS; genel kabul DUR — regresyon ucunda 6 başarısız eski satır, tn-a12 beş hata başlangıç yedeğinde de mevcut; frozen kontrolü aynı FAIL ile tamamlandı.

## A4b-2a — 2026-09-28T02:46:37.818099

PAL düzeltmeleri 1–7 ve PAL_RECEIPT öncelikli uygulandı. M03/M04 oluşturulmadı; registry yalnız ["M01","M02"]. Tam A4b-2 kapanışı değildir. Hedef 900 sn aşıldı; 25 dakika üst sınırına göre bitirilecek. PROGRESS dosyasında bir güncelleme aralığı 5 dakikayı aştı; bu süreç koşulu PASS değildir.

Kanıt dizini: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2a-20260928-022754`. Yedek: `01-tasarim/coin-T2/pre-a4b2/` + `sha256.json`. Başlangıç tam SHA: `start-sha.json`; teslim SHA: `final-sha.json` / `final-sha.txt`.

### Uygulama
- Ön adım: eski `magma-safe-surface-not-lava` gövdesi korunarak `test.skip` + tam `// EMEKLİ [Y §10 C uzakta lav] → magma-lava-far-only` satırı. Ön MAGMA: **14 PASS + 1 skip**; brief'teki 15/15 ifadesi diskteki aktif test sayısıyla uyumlu değil. Statik D/F: **125**.
- Manifest uygulamadan önce sabitlendi: `coin-T2/m-manifest.json`, SHA `b9c5f50e36319e4b211a804f3864854704e6f9f073ab7101c5cfddc723f09a15`. Her rota N=14, C=14 birlikte yerleştirilebilir slot tanığı; tür/konum aralıkları mevcut. Başarısız ilk dinamik koşulardan sonra N azaltılmadı. M03/M04 kapasitesi tasarım rezervasyonudur; henüz oynanmış rota kanıtı değildir.
- `lib/bot-magma.cjs`: gerçek MAGMA sahipliği/satın alma ve dünya/rota doğrulaması, ardından kilitli `runBot(...,{resume:true})`. Test fikstürü M02 erişimi için M01 tamamlanmasını önceden kaydeder; bu fikstür tam kilit zinciri kabulü değildir. W ve G4'te dünya/fikstür/hedef/çıktı adaptasyonu. M G4 eksik CJ/CC/CS'yi sessiz atlamaz, ayrı T2_OUT zorunludur; G4 bu çağrıda çalıştırılmadı.
- Eski G3 yalnız D/F filtresiyle sınırlandı; eski 125 ve diğer assert değerleri değişmedi. M testleri ayrı satırlar, **tüm rampalar** R0'a dahil.
- M01: rampa, işaretli zemin boşluğu, mevcut platformla çelik geçiş, üst çöken ızgara ve kesintisiz güvenli alt devam. Zemin segmentleri yalnız M verisinden mevcut `setGeometry` API'sine veriliyor; yeni zemin/ölüm fiziği eklenmedi. D/F tek parça zemini aynen kalır.
- M02: iki vinç + kayan palet, üst platformlar ve alt çelik hat. EN/TR/RU rota adları eklendi. Mevcut MAGMA A4b-1-FIX çizim dalları kullanılıyor.
- İlk denemede M01 boşluğa düşerek başlangıca döndü; taşıyıcı/iniş geometrisi düzeltildi. M02 ikinci vincin hareket aralığı düzeltildi. Yalnız yeni M öğeleri/coin konumları değişti.

### Madde 23 — dört alanlı kabul kaydı
| Kapı | Beklenen + tolerans / ölçülen | Örneklem + girdi | Taranan kapsam | Pozitif / kasten kırmızı kontrol |
|---|---|---|---|---|
| Ön MAGMA + T2 tabanı | PASS 14 aktif +1 emekli; statik125/125 | pre-magma.log, pre-static.log; başlangıç SHA | A4b-1-FIX mevcut MAGMA satırları ve D/F tüm coinler | emekli gövde korunur; lava-far-only aktif |
| O-M1 / G2 | PASS 2/2 bitiş; 14/14; ölüm0; 64.25s; hash473c1aa0 | sabit seed0x1a2b3c4d, dt1/60, M01.json, gerçek Space girdileri | 70→16160; her iki koşuda aktif magma/M01 | M_RED coin sayısı0 → gerçek test FAIL; W0 ayrı bot |
| O-M2 / G2 | PASS 2/2 bitiş; 14/14; ölüm0; 63.9167s; hash1ba9b3be | aynı sabitler, M02.json; final-M.log | 70→16160; iki hash eşit; sınır45–90s | M_RED coin sayısı0 → FAIL; W0 ayrı bot |
| G1 M01/M02 | PASS0/0; kapsam .97321655/.97477097 ≥.95 | sağ tuşu, zıplamasız segmentli W | iki rotanın segment birleşimi; ışınlanma yürünmüş sayılmaz; son segment finish | M_RED sahte alınmış zemin coin'i → iki test FAIL; S aynı coinlerin hepsini alır |
| G3/G5/G7 statik | PASS 3/3; D/F125 + M28 =153; ihlal0 | final-static.log; manifest + route-inputs + gerçek COINS/ROUTES | tür/bant/skill/move_id/kimlik/coin'siz hareket; R0 tüm rampalar, R2≥400,R3≥1200,R4≥60 | M_RED ilk coin x=0 → her M satırı FAIL |
| O-M-parkour (M01/M02) | PASS vault/slide durumları, platform teması, rampa frontFlip; M01 collapse READY→CONTACT_WARNING→FALLING→ABSENT; M02 taşıyıcı rideFrames60/55/54 | kilitli S, dış gözlemci; final-M.log + mechanics-final.log | bileşen türü→durum/temas; M01 taşıyıcı0, M02 collapse0 | M_RED vault gözlemi false → FAIL; yok bileşenler sıfır |
| O-M-visible M02 | PASS 3 taşıyıcı, rideFrames>2; MAD23.5–24.4 >3; kontrast138–150 >15; ekran kapsamı≥.8, örtücü0 | S gerçek temasında durdurma; görünür/gizli canvas piksel çifti | m02-m-01,06,10; 1280×720; UI/dünya/rota kontrolü | son fixture ile M_RED MAD0 → FAIL (visible-red-final.log); gizli kare pozitif farkı |
| Korunum | PASS 5/5 karşılaştırma | integrity.json; başlangıç ve son kaynak | D/F ROUTES/COINS metni; 10 girdi; index; Bot S; beforePhysicsIntegrated/updateIntegrated; dar G3 | byte/SHA karşılaştırması; eski verinin herhangi değişimi false üretir |
| Regresyon core | 43 PASS /5 FAIL; parkour25/25, t1b6/6, tn-a12 12/17 | regression-core.log; ayrı tam kaynak kopyası; final ürün JS ile aynı SHA | yalnız istenen 3 spec; tam regresyon koşulmadı | başlangıç yedeğinde aynı tn-a12 paketi aynı5 FAIL/12 PASS; baseline-a12.log |
| tn-a4 frozen/world/magma | frozen12 PASS/6 skip/1 FAIL; world11/11; magma sonucu aşağıda tamamlanacak | ayrı kaynak kopyası, -g frozen / world / magma | mevcut satırlar ve M kapıları | frozen rollDrop satırının başlangıç kontrolü sürüyor |

### Coin dağılımı
| Rota | CJ | CC | CS | N | Durum |
|---|---:|---:|---:|---:|---|
| M01 |8|4|2|14|S14/14 ×2, W0|
| M02 |6|6|2|14|S14/14 ×2, W0|
| M03 |7|4|3|14|yalnız sabit manifest; rota yok|
| M04 |7|5|2|14|yalnız sabit manifest; rota yok|

Kasten kırmızı: `red-gates.log` 8/8 beklenen FAIL; görünürlük fixture düzeltildikten sonra `visible-red-final.log` ayrıca FAIL; son `final-M.log` **8/8 PASS**, `final-static.log` **3/3 PASS**. İlk görünürlük ölçümünde manuel koşu sonrasında kare çizilmediği için MAD0 oluştu; yalnız testin render hazırlığı düzeltildi, eşik gevşetilmedi. Son helper rampa gözlemi de kaydeder; final-M/mechanics-final bu teslim helper'ına aittir.

### Açık / devredilen
PAL6 gereği A4b-2b: M03/M04, dört rota hazard gerçek20faz ve kalan mekanik gözlemleri. A4b-2c: tam registry/kilit zinciri/kayıt/retry/next G7, G4×12, mobil, rota-tema, benzerlik, ekonomi, M ekran görüntüleri ve son kanıtlar. Bunlar bu çağrıda PASS sayılmadı. M01/M02 özel ekran görüntüleri üretilmedi; eski MAGMA/frozen/world testlerinin çıktıları kanıt kopyasında bulunur. Üretilen medya otomatik açılmadı.

Regresyon hataları eski testteki 40-coin/fiyat beklentileri ve sabit eski girdi pencereleridir; baseline karşılaştırması bitmeden "yeni değil" kabul edilmez. Kilitli eski testler gevşetilmedi/emekli edilmedi. Genel kabul bu hatalar ve devredilen kapılar nedeniyle DUR. Çalışır M01/M02 adayı diskte bırakıldı; askıda kalan test süreci yok.

Son SHA256:
```text
fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142  index.html
5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39  js/a12-campaign.js
e2eea098e7f2f68bdbd9a937544252cf7ee3694b0a6b7abc129af689433018e1  03-test/tn-a4.spec.cjs
cbe5f71ccc09ba715950c3bdc1b4750a6c829447a3b47ff4de934add5855ca98  03-test/t2-coins.spec.cjs
7c31fd302114571124429d052f6a50074c519ab2f15086878ec0e733e898d19e  03-test/t2-b-dynamic.cjs
26a456dd27e74ce2b706520a6c0153f6440dcc28f130931798d61657acacfc6b  03-test/a4b2a-measure.cjs
d12335b476f9ab8ab41c1617908509fad4fa3c433d4858a2e6840cfb47757636  03-test/lib/bot-magma.cjs
c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f  03-test/lib/bot-s-drive.cjs
09ba3c04d1b470b9237f25f6a0808833e622f7e66d5d61c2f9a7368025fd7bbf  03-test/lib/bot-w.cjs
4072d6492b456c36c76d6ea6613cf2a5f8c4189c1ad8c7c37c5a196bf5424802  03-test/lib/magma-probe.cjs
b33d37b5a6cccf3ef425c0d1fe4bc559beb4a3f79664ecefe4ff882d079ffa3d  03-test/route-inputs/D01.json
1d3aa54a580dfc6f61f4a63796230d159bc667f4593d0657629793b9f265a7f5  03-test/route-inputs/D02.json
effbd227d1d20d3b899603889cbfdadf5ba8899af66bce3844b93acf855f5fad  03-test/route-inputs/D03.json
dcfb76cf64e06c9d3623db94274361a8570065f9c2791aea12e48d653efe3e5c  03-test/route-inputs/D04.json
d0dbe2c995288d6652309e24547827bf787728d732b03405ef03944dc4b93c16  03-test/route-inputs/D05.json
359437df9b5a0a1ae95cd39e940dde784201c80cdb403fdefa07ca9e11673fb2  03-test/route-inputs/D06.json
93c45367f0c57cac5464b304a385056ff685ee3d147bac68bd47a9a65f10e599  03-test/route-inputs/F01.json
4eaee23e869367413c4423a19d32acd8c944ffbde2744deeb1bf1837b535b17c  03-test/route-inputs/F02.json
dbde3548d6a189fd3b4e344a5736e1bf152292a58d94a9a197a850451287ef7f  03-test/route-inputs/F03.json
cb91849f19e85ca1b1bc27919607513f9e8c01ac54972df5b467505731ca84bd  03-test/route-inputs/F04.json
f37660cbe80c265798558fcbeab01cad3526ba0731cee8601203b0cd4885c095  03-test/route-inputs/M01.json
b17256abb64abf830978255135e62a770b6464a916d4ee9cd8511c678cafcdf9  03-test/route-inputs/M02.json
```

Araçlar: PowerShell, Python, Node.js/yerel Playwright, graphify query/update (AST-only). Dış ağ/kurulum/ücretli çağrı/commit/push/yayın yok. Graphify güncellemesi tamamlandı; 106 dosyada sıfır düğüm ve topluluk etiket kayması uyarısı var, grafik eksiksizlik kanıtı değildir.


Kapanış 2026-09-28T02:50:36.483866: final SHA doğrulaması tüm listede PASS. Son ürün `5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39`. MAGMA satın alma regresyonu kapandı; kalan6 FAIL başlangıçta da var. Son değişiklikten etkilenen magma/world/statik kapıları son SHA üzerinde PASS; core/frozen paketleri M satın alma düzeltmesinden önceki adaya aittir (bu sınırlama korunur). M01–M02 rotaları teslim edildi, genel A4b-2 kabulü kapatılmadı.

--- Önceki kayıtlar (değiştirilmeden korunur) ---

# TN-A4 REPORT

## COIN-TEMAS C1

`collectPhysical()` daire–dikdörtgen clamp kesişimine geçirildi: dolgu 8 px + 2 px konturdan dış temas yarıçapı 9 px; rota bazlı 46/120 px istisnaları kaldırıldı. Canvas alfa sınırı 10 px ölçüldü (`9±1`). `coin-contact-only` 12/12 yaklaşım satırında 1 px boşlukta toplamadı, 1 px örtüşmede topladı; eski 120 px modeli boşluk örneklerini topladı. D01–D06 coin id/sayıları korunarak gerçek bot izine projekte edildi; taşıma metrikleri TN-A4-PROGRESS içindedir. Odaklı kapılar: coin 3/3, D03/D05/D06 all-40 3/3, D06 beceri 1/1. D01/D02/D04 için ayrı all-40 ve mobil D01 satırı mevcut spec'te yoktur. F01–F04 yerleşimi/40-40 C2'ye devredildi ve koşulmadı.

## A4b-1 — MAGMA TERMINAL

| Kabul | Ölçülen / beklenen | Örneklem ve kapsam |
|---|---|---|
| `magma-registry-purchase` | 1000→500; sahiplik 1; çift çağrı başarı 1 | Rota yok: satın al, DOCK'ta kal; pending null |
| `magma-not-recolor-and-screenshots` | RMSE DOCK `18.48/23.33/25.59/26.25`, FROZEN `21.05/23.28/26.89/26.14`, `>18` | D01 dört bölge; öz-kopya `0<1`; dört MAGMA PNG |
| `magma-dock-frozen-signatures-absent` | sekiz imza `0` | DOCK beş + FROZEN kar/sarkıt/buz |
| `magma-safe-surface-not-lava` | yüzey `%0.804≤%2`; arka plan `%36.421≥%5` | HSV maskesi |
| `magma-readable` | wide `35.67/35.67/35.67`; mobile `28/50/35.67`, `>15` | zemin/engel/kenar |
| `magma-moving-platform-visible` | MAD `31.01>3`; kontrast `150.33>15` | D03 pota vinci |
| `magma-physics-identical` | 15/15 örnek `≤0.5 px` | D01, 3 s, aynı ArrowRight girdisi |
| `magma-render-performance` | `0.333/0.228 ms`, oran `0.685≤1.5` | 120 kare dock/magma |

Aktif işlevler: `drawThemeScene`, `magmaSurface`, `drawBackgroundIntegrated`, `drawWorldIntegrated`; test-only `renderWorldOnRoute` mevcut `DEBUG` kapısında. DOCK/FROZEN dalları, girdi/fizik/çarpışma ve `index.html` korunmuştur. M01–M04/AFTERMATH yok. İlk kırmızılar: lav bandı 0, okunabilirlik 15, fizik 8.02 px, DOCK arka plan RMSE 10.38, performans 15.70×. Son magma kapısı `8/8`; regresyon uçları koşulmadı.

Son SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `e1f641276870b9f8df52b8d6e3797308ae34a3fff9c5c225d5e570fe71be01e0`; spec `86aae9fd41203abe09937c3e403ae2abc9187ec02487b0d933c29a5e711f51d9`.

FINAL A4a-2b KAPISI: F03 57.302 s, F04 48.509 s; ikisi 0 ölüm ve 40/40. `tn-a4` 30/30; `parkour-tur1` + `tn-a12` + `tn-a3:41` 43/43.

## A4a-2b — F03/F04

- O-F3 · ölçülen+beklenen: 49.931 s, 0 ölüm, 40/40 (45–90 s, 40/40) · örneklem+girdi: 40 ms gerçek ArrowRight/Space botu · kapsam: Hangar Run başlangıç→bitiş, slide/overpass/vault · pozitif kontrol: ilk geometri 38/40 kırmızı.
- O-F4 · ölçülen+beklenen: 49.127 s, 0 ölüm, 40/40 (45–90 s, 40/40) · örneklem+girdi: 40 ms gerçek ArrowRight/Space botu · kapsam: Frostline Express uzun rampa→rollDrop→collapse kestirmesi→bitiş · pozitif kontrol: güvenli iniş platformu ilk konumunda x=2268 kilidi kırmızı.
- O-F-parkour · ölçülen+beklenen: F02 crane+pallet rideFrames >0; F03 slide+overpassRide; F04 rollDrop; taşıyıcısız F01 movingPlatforms=0 · örneklem+girdi: gerçek klavye + oyun `observedStates`/taşıyıcı durumu · kapsam: F02 ek düzeltme, F03–F04 · pozitif kontrol: roll girdisi olmadan `run`/rollDrop yok kırmızı.
- O-F-hazard · ölçülen+beklenen: F01–F04 tüm rampalar ×20 faz, tehlike çakışması 0; taranan rampa kimlikleri kaynakla birebir · örneklem+girdi: rota tanımı ve dikdörtgen kesişimi · kapsam: collapse/containerDoor/worker iniş bölgeleri · pozitif kontrol: sentetik ramp+collapse sınırı eşleşti.
- O-F-skill · ölçülen+beklenen: her rota 15 skill; yalnız ana-yol ölçümü 0/15 (≤7), tam bot F01–F04 15/15 · örneklem+girdi: ana-yol ArrowRight ve gerçek tam bot · kapsam: dört F rotası · pozitif kontrol: ana-yol y'sine sentetik taşıma modeli eşik ihlali.
- B-F-similarity · ölçülen+beklenen: hiçbir çift aynı dizi+≤150 px kaydırma değil; F çiftlerinde normalize edit uzaklığı ≥0.3 · örneklem+girdi: D01–D06+F01–F04 10×10 matris · kapsam: sıra+normalize konum imzası · pozitif kontrol: D04+500 kopyası yakalandı.
- B-F-similarity en yüksek üç: D04–F01 0.667; D01–D05 0.600; D03–D04 0.500 (eşit üçüncüler: D03–F01, D04–F04, D05–F01, F01–F04).
- B-F-economy · Sabit: FROZEN 500 · Değer: 10 tamamlanan 40 coin DOCK koşusu · Gerekçe: koşu başına 40 fiziksel + 15 bitiş = 55, `ceil(500/55)=10` · Ölçüm: gerçek bot runCoins=40 + kaynak finishBonus=15; F03/F04 kazancı 55.
- B-F-theme · ölçülen+beklenen: F03/F04 başlangıç+engel, iki viewport, DOCK imzası 0/5 · örneklem+girdi: aktif world/route ve canvas kareleri · kapsam: buzul geçidi · pozitif kontrol: DOCK 5/5.
- Görsel kadraj: F01 vault; F02 pallet; F03 containerDoor+worker/varil; F04 collapse. Oyuncu ve adlı mekanik dünya-x farkı viewport eşiğinde assert edildi; F01–F04 obstacle kareleri yenilendi, F03/F04 start kareleri eklendi.
- 10×10 matris test annotation'ında JSON olarak kayıtlıdır. Tam 5 spec çalıştırılmadı; commit/push/yayın yok.

## A4a-2a — F01/F02

- O-F1 · ölçülen+beklenen: 49.572 s, 0 ölüm, 40/40 coin (45–90 s, 40/40) · örneklem+girdi: 50 ms gerçek klavye ArrowRight/Space botu, girdisiz 250 ms x değişimi 0 · kapsam: F01 başlangıç→sonuç · pozitif kontrol: 39/40 kırmızı görüldü, coin geometrisiyle düzeldi.
- O-F2 · ölçülen+beklenen: 51.969 s, 0 ölüm, 40/40 coin (45–90 s, 40/40) · örneklem+girdi: aynı gerçek klavye botu · kapsam: F02 başlangıç→sonuç · pozitif kontrol: 33/40 ve 38/40 kırmızı görüldü, üst/alt hat geometrisiyle düzeldi.
- O-F-parkour · ölçülen+beklenen: F01/F02 `vault` ≥1; bulunmayan slide/wallRun/rollDrop 0 · örneklem+girdi: aynı koşularda `player.state` · kapsam: F01–F02 · pozitif kontrol: `toContain('vault')`.
- B-F-chain · ölçülen+beklenen: T/F/F/F→T/T/F/F, ikinci kesinti 0, yeni sayfada F02 · örneklem+girdi: satın alma→kilitli deneme→F01 bitiriş→aynı context yeni sayfa · kapsam: F zinciri/kayıt · pozitif kontrol: kilitli F02 başlangıcı `false`.
- B-F-theme · ölçülen+beklenen: F01/F02 sekiz karede DOCK imzası 0/5 · örneklem+girdi: 1280×720 ve 390×844, başlangıç+engel, aktif world/route assert · kapsam: FROZEN buzul geçidi · pozitif kontrol: DOCK A4a-1 ölçümü 5/5.
- M-F · ölçülen+beklenen: 390×844 kontrol kesişimi 0, checkpoint 3600 · örneklem+girdi: mobil viewport + ArrowRight · kapsam: F01 başlangıç→ilk checkpoint · pozitif kontrol: çiftler arası piksel kesişim hesabı.
- Rota süreleri: F01 49.572 s; F02 51.969 s. Kasıtlı ortak kırmızı: `Expected 41 / Received 40`.
- Regresyon ucu: parkour 25/25; tn-a12 17/17; tn-a3:41 1/1; tn-a4 final koşumu aşağıdaki teslim sonucudur. Tam 5 spec koşulmadı.
- SHA-256 (rapor yazımı öncesi kod/test): index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `5ed2ce460a038aa25bd58ddcfa2946b8f249a9e42028b95f09a68f636be18f7a`; spec `5d5533bc44bcd3517021b03d783d01218f161697b8e1e3db5d59f0d556bbd383`.

## A4a-1 matrisi

| Madde | Dosya / işlev | Test | Sonuç |
|---|---|---|---|
| WorldRegistry + bağımsız fiyat | `js/a12-campaign.js` `WORLD_REGISTRY` | `world-purchase` | geçti |
| WORLDS canlı önizleme | `renderShop`, `drawShopPreview`, `drawThemeScene` | `world-preview-no-side-effect` | geçti |
| Atomik satın alma/geri alma | `purchaseOrSelectWorld` | purchase, double-tap, save-failure | 3/3 geçti |
| Güvenli dünya seçimi/cache | `purchaseOrSelectWorld`, `drawBackgroundIntegrated` | `world-switch-cache` | geçti; cache 0→1 |
| FROZEN canvas teması | `drawThemeScene` | `world-theme-readable` | 238.67 kontrast, >20 renk, 0 örtücü |

Kayıt şeması değişmedi; sahiplik/cüzdan mevcut profil snapshot'ında tutuluyor. MAGMA ve AFTERMATH katalogda 500 coin, devre dışı/PLANLANDI. FROZEN rota listesi bu çağrıda boş. PLACEHOLDER: final FROZEN sanat varlıkları.

Son SHA-256: `index.html` `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js` `9d922e2c576f4a3fda6e781ec800dc50211663f9cb0e01ecfb272ba1e981494a`; `03-test/tn-a4.spec.cjs` `68cf829b289619262f0f4e071c1977811970b6ba95597f06486b6f34155a3f48`. Kilitli mevcut spec hashleri değişmedi.

## A4a-1-FIX
- PASSED — FROZEN sıcak ışıklar coin bandındaki turuncu daireler değildir; direk/armatür/ışık konisi kullanır, coin-benzeri dekor imzası 0.
- PASSED — WORLDS gerçek UI çift tıklama tek kesinti ve tek sahiplik; 499 bakiyede EN/TR/RU yetersiz metni ve kesinti 0.
- PASSED — coin/rampa/platform-kenarı ayrı bölge açıklıkları 50.33 / 69.00 / 50.67 (eşik >15), DOM örtücü 0.
- PASSED — DOCK→FROZEN→DOCK×3 aktif cache anahtarı doğru, cache nesne büyümesi ≤1.
- PASSED — havada seçim aktif sahne/x/runCoins'i değiştirmedi; `pendingWorldId` yalnız sonraki rota başlangıcında uygulandı.
- PASSED — yeni/değişen testler 16/16; regresyon ucu 42/42.

## A4a-1-FIX2
- PASSED — dört ekran görüntüsünün her birinde çekimden önce ürünün `startRoute` yolu çalıştı ve aktif dünya 4/4 beklenen kimlikle eşleşti.
- PASSED — FROZEN 390×844 armatür direği yapı/zemine bağlandı; ölçülen alt-uç/yapı farkı 0 px (eşik ≤4).
- PASSED — WORLDS satın alma metni `buyWorld` sözlüğünden üretildi; TR `SATIN AL — 500`, RU `КУПИТЬ — 500`.
- PASSED — tn-a4 10/10; kilitli regresyon ucu 42/42. Pozitif kontroller üç yeni assert için kırmızı görüldü ve geri alındı.

Son FIX2 SHA-256: `index.html` `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js` `c43553797d3571edfe143e390c7643e8a4a7d616a4873d155e18f755c0ba1976`; `03-test/tn-a4.spec.cjs` `2e422b366fe24518491ef188aa785047bc1c5eeee5919da2183a7ca340a9c7b8`. Kilitli spec hashleri değişmedi.

## A4a-1-FIX3
- PASSED — FROZEN artık kutup ikmal hattı/buzul geçidi: DOCK güvertesi, konteyneri, vinci ve `31` kimliği yerine buz kanyonu/mağarası, buz sütunları, donmuş göl, aurora, kar-buz yüzeyleri ve buz kılığı mekanikler.
- PASSED — `frozen-not-recolor`: gerçek RMSE arka plan/yapı/zemin/engel = 43.81/42.30/41.28/49.03; sentetik doğrusal renk dönüşümü 0; eşik 18.
- PASSED — `frozen-ground-pattern`: sarı oran 0.00431 < 0.01; okunabilirlik kenar/engel/rampa = 117/116/116 > 18.
- PASSED — FROZEN DOCK imzaları şerit/31/konteyner/vinç = 0/0/0/0; DOCK pozitif kontrolleri = 1/1/1/1.
- PASSED — fizik 3 s boyunca 15 ortak örnekte ≤0.5 px; render 120 kare dock/frozen = 0.407/0.403 ms, oran 0.992.
- PASSED — tn-a4 15/15. Regresyon ilk koşum 40/42; bilinen D01 vault aralıklılığı veren iki satır hedefli yeniden koşumda, D02 ile birlikte 3/3 geçti. Tam dört spec çalıştırılmadı.

## A4a-1-FIX4
- PASSED — FROZEN altındaki koyu `#17384b` tam-genişlik koridor bloğu kaldırıldı; yerini açık buz sahanlığı ve düzensiz kar seti aldı. Beşinci DOCK imzası `loadingCorridor`: DOCK/FROZEN `1/0`.
- PASSED — ön plan kutup lambaları `GROUND+40` yerine `GROUND` seviyesinde bitiyor; 390×844 ve 1280×720 uç–zemin farkı `0/0 px` (≤4).
- PASSED — iki yeni assert eski çizimde sırasıyla FROZEN imza `1` ve yatay fark `40 px` ile kırmızı görüldü; son kapı tn-a4 `16/16`, sekiz kare yeniden üretildi.

## A4b-1-FIX ? 2026-09-28T01:32:49
D?SK DURUMU: ?L??LD? ? MAGMA kap?s? 14 PASS / 1 FAIL; eski lav ROI ?art? yeni uzak-lav ?art?yla ?eli?iyor. Genel kabul DUR; ?r?n d?zeltmeleri diskte. S?re nedeniyle yar?m b?rak?lm?? uygulama yok; kabul tan?m? engeli a??k.

Ba?lang?? SHA (bu turun diski, brief'teki bayat SHA kullan?lmad?):
```json
{
  "js/a12-campaign.js": "aeaa4f9a71588d75241dc9ee22e54fd0413eea587e32354d9f584aab6e0e0c64",
  "index.html": "fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142",
  "03-test/tn-a4.spec.cjs": "0922f7b28d0f1a09651093fd0e149c520d22fbd6fbbccd6f00d42ef6648b46b7",
  "03-test/t2-b-dynamic.cjs": "1b52fac9113e6c7411504cf071d8990f272e3de80f510a6fa92cbf225a92f3cf",
  "03-test/lib/bot-s-drive.cjs": "c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f"
}
```
A?F: envanter a?a??da; kasa/zemin/lav/k?l/i??i/varil/?ef/biti? MAGMA dallar? g?ncellendi. G?rseller Canvas ile yerel ?retildi; AI/?cretli g?rsel yok. `renderThemeFixture` yaln?z DEBUG nesnesinde; FROZEN'?n D rotas?n? F rotas?na ?evirmesini atlayarak ayn? geometriyi ?? temada ?izdirir. Normal renderWorldOnRoute/girdi/fizik yolu de?i?mez.

| ??e | DOCK | FROZEN | MAGMA | Kaynak |
|---|---|---|---|---|
| Zemin | engine.drawMetal | frozenSurface | magmaSurface: bazalt alt?gen + ?elik ?zgara | js/a12-campaign.js:2551 |
| Platform / ?st hat | drawMetal | buz/kar kapa?? | magmaSurface: ?elik ?zgara ?st? | js/a12-campaign.js:2670 |
| Sand?k / vault | ah?ap ?apraz kiri? | buz kapl? kutu | g?m?? yal?t?m, kenar ?er?evesi ve kilit | js/a12-campaign.js:2698 |
| Kayma kiri?i | sar? alt bant | buz alt bant | mat metal alt bant + magmaSurface | js/a12-campaign.js:2708 |
| Rampa | sar? ??gen | kar basamaklar? | ?elik destekli koyu rampa | js/a12-campaign.js:2721 |
| Vin? | dikd?rtgen liman y?k? | buzlu y?k ve makara | oval pota, kal?n ask? | js/a12-campaign.js:2743 |
| Palet | ah?ap palet | kar ?st? | ?elik ?er?eveli as?l? palet | js/a12-campaign.js:2743 |
| Kap? | konteyner ??talar? | buz kap? sil?eti | f?r?n s?rg?s? kal?n ?er?eve | js/a12-campaign.js:1960 |
| ??ken zemin | d?z metal | buz y?zeyi | ?zgara y?zeyi; i?levsel ?atlak i?areti ortak | js/a12-campaign.js:2763 |
| ???i | turuncu yelek/kask | mavi mont/kask | al?minize tulum/kap??on/viz?r/eldiven | js/a12-campaign.js:2724 |
| Varil | kahverengi daire | buz ?okgeni | sekizgen metal kap / dikey ku?ak | js/a12-campaign.js:2788 |
| ?ef | sprite | sprite | yal?t?ml? ?ef kap??onu/ayr? bacaklar | js/a12-campaign.js:2793 |
| Biti? | ye?il levha/direk | ye?il levha/direk | metal kap? ?er?evesi ve levha | js/a12-campaign.js:2803 |
| Yak?n dekor | liman bina/vin? sil?eti | buz sivri k?tleleri | f?r?n a??zl? bazalt yap?lar | js/a12-campaign.js:2673 |
| Arka plan | engine.drawDockBackdrop | aurora/buz/su | volkan, ince uzak lav, k???k k?l | js/a12-campaign.js:2506 |

MAGMA'n?n b?t?n ??e ?izimi DOCK ile birebir ayn? kalan sat?r: 0. ??levsel uyar? glifleri (ok, ?nlem, ?atlak) ortak; coin/HUD/oyuncu kapsam d???. Bu envanter kaynak dallar?n?n denetimidir, b?t?n ??eler i?in ayr? piksel ispat? de?ildir.

| Kabul | ?l??len / beklenen | ?rneklem + girdi | Kapsam | Pozitif kontrol |
|---|---|---|---|---|
| ground-texture | PASS: Sobel %3?30 | D01, 1280?720 + 390?844 | zemin y..y+80, oyuncu hari?; Sobel b?y?kl??? >80 | eski kare zaten %5.99 / %10.78; negatif kontrol beklenen k?rm?z?y? vermedi |
| lava-far-only | PASS: yak?n ?%1, t?m kare ?%1 | ayn? iki D01 karesi | geni?te 200, mobilde 160 px yak?n bant | t?m kare lav varl??? + eski yak?n bant %19.90 k?rm?z? |
| ash-small-sparse | PASS: max16 / 5 px?, kapsama %0.0280 / %0.0300 | iki D01 karesi; tam HUD kutular? maskesi son odak testinde | y?zeyden 260px yukar?; a??k gri S<.2,V>.35, 4-kom?uluk | eski max1020px? / %3.864 k?rm?z?; exact-HUD tekrar?nda da k?rm?z? |
| crate-not-dock | PASS: MAGMA %0, DOCK >%59 | iki D01 karesi, ayn? vault | sand?k kutusu, brief HSV | DOCK ?%30 ve eski MAGMA %60.84 k?rm?z? |
| worker-variant | PASS: her kar??la?t?rma RMSE>18 | D02 i??i, iki boyut ? DOCK/FROZEN | i??i kutusu kanal ba??na do?rusal fit | ?z-kopya RMSE<1; eski s?r?m RMSE60?67 zaten PASS (negatif kontrol ?art? sa?lanm?yor) |
| crane-in-frame | PASS: %100 / %86.56 g?r?n?r, MAD>3, kontrast>15 | D03 vin? y?k?, iki boyut | y?k ekran kutusu + oyuncu kadraj? | gizli y?k karesi; eski 200ms haz?rl?k mobil %0, d?zeltilmi? kare haz?rl??? eski ?izimde de PASS |
| kareler | 18/18 dosya | 3 tema ? 3 konum ? 2 boyut | D01 ba?lang??, D02 i??i haz?rl???, D03 y?k | aktif d?nya assert; oyuncu kadraj? |

Ham ?l??mler (`magma-release.log`; exact HUD sonucu `ash-exact-hud.log`):
```text
MAGMA_READABLE [{"size":{"width":1280,"height":720},"v":[35.666666666666664,35.666666666666664,35.666666666666664]},{"size":{"width":390,"height":844},"v":[27.999999999999996,35.666666666666664,35.666666666666664]}]
MAGMA_MOVING {"mad":30.784552113352547,"contrast":150.33333333333334,"frameDelta":1}
MAGMA_PERF {"dock":0.48916666669150194,"magma":0.3358333334326744}
MAGMA_RMSE {"dock31-background":41.97288275968259,"dock31-structures":23.755852300820138,"dock31-ground":25.433981034708957,"dock31-obstacle":28.230125936657366,"frozen-background":43.222056487903885,"frozen-structures":23.826427761131264,"frozen-ground":25.15560186890063,"frozen-obstacle":28.240107053115697}
FIX_GROUND 1280 0.215300349103166
FIX_GROUND 390 0.25773195876288657
FIX_LAVA 1280 {
  near: 0.0007265625,
  all: 0.029773220486111113,
  ground: 582.6666666666666
FIX_LAVA 390 {
  near: 0.0008974358974358974,
  all: 0.029915542593267713,
  ground: 769.6111111111111
FIX_ASH 1280 { max: 16, coverage: 0.00025154798761609906 }
FIX_ASH 390 { max: 5, coverage: 0.0001558572146807441 }
FIX_CRATE 1280 { dock31: 0.6181640625, magma: 0 }
FIX_CRATE 390 { dock31: 0.5936507936507937, magma: 0 }
FIX_WORKER 1280 dock31 69.38314277848706
FIX_WORKER 1280 frozen 71.59964323128764
FIX_WORKER 390 dock31 67.11150909763391
FIX_WORKER 390 frozen 69.43877764682443
FIX_CRANE 1280 { visible: 0.9999999999999994, mad: 28.045028818443804, contrast: 131 }
FIX_CRANE 390 {
  visible: 0.8655614526181364,
  mad: 24.7795245398773,
  contrast: 39.99999999999999
```

### Kabul engelleri / ?NER? (uygulanmad?)
1. Eski `magma-safe-surface-not-lava` sabit `[0,450,width,70]` alan?nda lav ?%5 istiyor. Geni? karede y?zey y=582.667; yeni yasak yak?n alan [382.667,582.667]. Eski alan tamamen yeni alan?n i?inde. Eski minimum, yeni yak?n alanda en az 70?0.05/200 = %1.75 lav demektir; yeni maksimum %1. Birlikte sa?lanamaz. Son eski lav ROI oran? ~%0.09, bu y?zden FAIL. **?NER?:** eski pozitif lav kontrol?n? ger?ek ufuk ROI'sine ta??mak; %5 e?i?ini korumak. Mevcut test izinsiz de?i?tirilmedi.
2. Her yeni assert'in mevcut s?r?mde k?rm?z? olmas? ?art? ground/worker ve d?zeltilmi? crane fixture i?in sa?lanmad?. Negatif s?r?m ger?ek ?l??m?: 3 yeni test FAIL, 3 yeni test PASS (ayr? kare ?retimi PASS). E?ikler de?i?tirilmedi, sahte k?rm?z? ?retilmedi. Ground ve worker metriklerinin ek ?ekil ?l??t?yle g??lendirilmesi ayr? kabul karar?d?r.
3. Piksel ?l??mleri ve 18 PNG ?retimi yap?ld?; medya otomatik a??lmad?/?nizlenmedi. G?rsel insan incelemesi bu oturumda yap?lmad?. FROZEN t?m paket ve tam regresyon ana oturum kapsam?d?r; burada ?al??t?r?lmad?.

Kap? komutu: izole `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\run-b3-20260928-011508/02-kod` i?inde `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/tn-a4.spec.cjs -g magma` ? 14/15 PASS. Ard?ndan yaln?z HUD maskesi d?zeltmesi i?in ash testi tekrarland?: 1/1 PASS; negatif kar??l??? FAIL. Di?er assert/girdiler ayn?. D?nya/purchase/shop + moving-platform-visible + coin statik: 16/16 PASS (`final-focused.log`).
Kan?t klas?r?: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\run-b3-20260928-011508`. Kareler `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\run-b3-20260928-011508/02-kod/03-test/tn-a4-shots`; negatif kareler `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\run-b3-20260928-011508/negative/02-kod/03-test/tn-a4-shots`. ?nceki ana kaynak kareleri ve snapshot'lar korunur.

Son SHA:
```text
f57ba0787e3df42c6ad814e7a15977be20bb4672a71b3f45c855254122c2520e js/a12-campaign.js
fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142 index.html (ba?lang??la ayn?)
61572a739d4e254b4c0c983e37f1dd115b4a5651b7bfd244cbaf867b6b365456 03-test/tn-a4.spec.cjs
```
Ara?lar: PowerShell, Python, Node.js/yerel Playwright, graphify (AST-only). ROUTES geometri metni, index.html, kilitli Bot S ve route-inputs ayn?. Commit/push/kurulum/?cretli/a? ?a?r?s? yok.

Son ?l??m d?zeltmesi: HUD kutular? hem k?l pay?ndan hem paydas?ndan ??kar?l?r. `final-pixel.log`: k?l ve 18 kare (oyuncu yatay/dikey kadraj assertleri) 2/2 PASS; max16/5 px?, kapsama %0.0279709/%0.0299799. Bu de?i?iklik yaln?z yeni testlerde; tam magma ko?umu 14/15 sonras? etkilenen iki yeni sat?r yeniden ko?uldu.

## A4b-2a 2026-09-28T02:27:54.062339
Test listesi ve s?re b?t?esi (?nceden): 0?180 sn brief/taban SHA + magma emeklilik, magma odak ve t2-coins statik; 180?300 sn yedek/manifest/adapt?r; 300?650 sn M01?M02 geometri/girdi/coin, G1/G2/G3/G5 ve g?r?n?rl?k/negatif kontroller; 650?900 sn regresyon ucu (parkour-tur1, tn-a12, t1b-bot-s, tn-a4 frozen/magma/world, t2 statik), rapor. Hedef 900 sn; ?st s?n?r 1500 sn; son ye?il kap?da DUR. PAL 6: G4, tam zincir/G7 ge?i?, mobil/tema/ekonomi/benzerlik 2c; d?rt rota hazard/mekanik 2b. Tam regresyon yok.
Kan?t: E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2a-20260928-022754

Ba?lang?? SHA:
```json
{
  "index.html": "fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142",
  "js/a12-campaign.js": "f57ba0787e3df42c6ad814e7a15977be20bb4672a71b3f45c855254122c2520e",
  "03-test/tn-a4.spec.cjs": "61572a739d4e254b4c0c983e37f1dd115b4a5651b7bfd244cbaf867b6b365456",
  "03-test/t2-coins.spec.cjs": "bc9fd768dfdb1381130477403ce595a23f48c27377922331d7a0e7c4830153a0",
  "03-test/t2-b-dynamic.cjs": "77cbdd3b3c688984330fe7e78f5f3c5c93e3b421eb9e4528a26b045e48a38901",
  "03-test/lib/bot-s-drive.cjs": "c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f",
  "03-test/lib/bot-w.cjs": "2b36c1b6cf662b21ae1c45a1673e0c03a6c7494d8673edb5e3612659bef68ec3",
  "03-test/route-inputs/D01.json": "b33d37b5a6cccf3ef425c0d1fe4bc559beb4a3f79664ecefe4ff882d079ffa3d",
  "03-test/route-inputs/D02.json": "1d3aa54a580dfc6f61f4a63796230d159bc667f4593d0657629793b9f265a7f5",
  "03-test/route-inputs/D03.json": "effbd227d1d20d3b899603889cbfdadf5ba8899af66bce3844b93acf855f5fad",
  "03-test/route-inputs/D04.json": "dcfb76cf64e06c9d3623db94274361a8570065f9c2791aea12e48d653efe3e5c",
  "03-test/route-inputs/D05.json": "d0dbe2c995288d6652309e24547827bf787728d732b03405ef03944dc4b93c16",
  "03-test/route-inputs/D06.json": "359437df9b5a0a1ae95cd39e940dde784201c80cdb403fdefa07ca9e11673fb2",
  "03-test/route-inputs/F01.json": "93c45367f0c57cac5464b304a385056ff685ee3d147bac68bd47a9a65f10e599",
  "03-test/route-inputs/F02.json": "4eaee23e869367413c4423a19d32acd8c944ffbde2744deeb1bf1837b535b17c",
  "03-test/route-inputs/F03.json": "dbde3548d6a189fd3b4e344a5736e1bf152292a58d94a9a197a850451287ef7f",
  "03-test/route-inputs/F04.json": "cb91849f19e85ca1b1bc27919607513f9e8c01ac54972df5b467505731ca84bd"
}
```


## A4c-2a — AFTERMATH A01/A02 — 2026-09-28T04:17:07.147865
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
| B-A-theme | RMSE min 20.762765861392253>18; kontrast min54.667>15; kaynak/çizim imzaları0 | A01/A02 × başlangıç/engel × masaüstü/mobil; masaüstünde D/F/M karşılaştırması | aynı görüntü renk-fit negatifi RMSE0; kontrast0/yanlış dünya/yanlış id/örtücü1 reddedildi |
| Kareler | 8 PNG; her karede aktif dünya/rota ve oyuncu/öğe kadrajı doğrulandı | 1280x720 ve390x844; shots-sha.json | canvas pixel ROI, DOM örtücü0; otomatik açılmadı |
| Korunum | 35/35 PASS | D/F/M 14 rota tanımı+coin; eski14girdi; index/BotS; updateIntegrated/beforePhysicsIntegrated/routeSurfaces/drawAftermathWorld; D06 initializer | integrity.json; eski veriler/fizik/şef aynı |

Değişiklikler: ayrı A verisi/coin/girdi, WORLD_REGISTRY.aftermath.routes=[A01,A02], A kilit/ilk rota/next seçimi, satın alma mevcut koşuyu korur. Bot S çekirdeği değişmedi. Bot W yalnız A dünya seçimi eklendi. G4 adaptörü ayrı `03-test/a4c-g4-dynamic.cjs`; kullanım T2_ROUTE=A01/A02, T2_OUT=ayrı A kanıt dizini, T2_G2_EVIDENCE=bu turun a-s.json; G4 bu aşamada koşulmadı (2c).

A4c-1 satın alma testindeki tarihsel `routes:[]` koşulu, bu çağrının açık `routes:[A01,A02]` talebiyle değiştirildi. Fiyat/tek kesinti/sahiplik/aktif koşu koruma assertleri aynı; eski gövde pre yedeği ve diffte. Eşik gevşetilmedi. DEBUG renderThemeFixture yalnız A rota başlangıç dünyasını destekleyecek şekilde dar genişletildi; prod fizik yok.

A03 sözleşmesi (uygulama 2b):
# A03 chief configuration contract ? A4c-2a
Implementation deferred to A4c-2b. D06 initialization and update algorithm remain identical.
Current startRoute: chief only D06, speed 205, spawn gap 380, dimensions 32x48; updateIntegrated: trigger x=1800; catch returns to run.checkpointX, same gap 380, caughtT=.35.
Proposed narrow configuration: ROUTES.A03.chief={startX:12000}; instantiate existing chief for D06 or a route declaring chief. Use route chief startX with D06 fallback 1800. No speed/contact/catch/pause algorithm rewrite.
A03 design target length 16600, finishX 16460, total Bot S 45?90 s; final chase 4460 px measured separately (~16 s target). Checkpoints <=3000 px is a design target, not approved acceptance constant. Put safe checkpoint immediately before chase and before closed-door bypass; report actual return distance/time and start/end intervals.
A4c-2b acceptance: visible approach, clean escape, stopping causes catch, checkpoint respawn safety, closed-door overpass while chief active, pause-during-chase, t2-chief D06 unchanged. If existing controller is unsafe with this geometry, STOP; do not rewrite controller.


Kanıt yolları: E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4c2a-20260928. `a-final.log` 8/8 PASS; `red-dynamic.log` 5 beklenen FAIL +1 pozitif; `red-static.log`2 beklenen FAIL. Nihai regresyon `final-*.log/.rc`. İlk regresyon eski kaynakta, nihai debug-A fixture değişikliğinden sonra yeniden koşuldu; ilk MAGMA koşusu M01 W satırında durduruldu, yazan MAGMA kapılarına ulaşmadı. Nihai mirror M_B/M_C çıktı yolları kopya kanıt dizinlerine yönlendirildi; D/F/M kanıtları korunur.

Graphify: query + AST-only update; 2053 düğüm/3346kenar. Uyarı:113 dosya sıfır düğüm üretti (çoğu JSON),37 topluluk hub adıyla yenilendi; semantik/ücretli çağrı yapılmadı. PROGRESS dosyasındaki ilk aralık5dk hedefini aştı; ara commentary güncellemeleri verildi.

Nihai SHA256:
```json
{
  "index.html": "fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142",
  "js/a12-campaign.js": "731ebff96e08dd3ef3ff32c29caf3114f8dfbaef47ae312dca6e9dbbca9f4ede",
  "03-test/tn-a4.spec.cjs": "67d2018347a0e3257669dbf1bfb36fe8712b781643db45bb21cd3dd4056bd968",
  "03-test/t2-coins.spec.cjs": "79dfc522615da69d9db8bfe49f9857da81979b2483fca3a975c1e9d0b871e67f",
  "03-test/lib/bot-s-drive.cjs": "c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f",
  "03-test/lib/bot-w.cjs": "a65af5fb0ae42f1009a08bdc5f819b40c249799e2bf57a41dab30634ec7211da",
  "03-test/lib/bot-aftermath.cjs": "411cf684e5f7313e1b0c07f355237a1e2d8a9f9cf81aa1e8a525d67ea7c3c59d",
  "03-test/lib/aftermath-probe.cjs": "fbbb707442686d909fe6b872ca81a3d3ddbe0b1a344bc90c66d8e4615c250bf2",
  "03-test/a4c-g4-dynamic.cjs": "01c01822f8ad01b9b58ac6b8fc0296eb28cae6c46688e3c982b6e838cca35f02",
  "03-test/route-inputs/A01.json": "ed1fd06852bba8e858bf2d4db0bd5677741d257c411b22547e37b49b67073111",
  "03-test/route-inputs/A02.json": "4b89569b24898998b1e0f87ad4d8a75b1f145fb686af619fb7ef5e93f92ef62b",
  "../01-tasarim/coin-T2/a-manifest.json": "8dd411cc8b66e0b607d0a50fb412926311148ee837812e4bc7093d1a4a8081ba"
}
```

### Nihai regresyon
```json
{
  "core": {
    "rc": 1,
    "passed": 44,
    "failed": 5,
    "skipped": 0
  },
  "world": {
    "rc": 0,
    "passed": 11,
    "failed": 0,
    "skipped": 0
  },
  "frozen": {
    "rc": 1,
    "passed": 13,
    "failed": 1,
    "skipped": 6
  },
  "magma": {
    "rc": 0,
    "passed": 37,
    "failed": 0,
    "skipped": 1
  },
  "aftermath": {
    "rc": 0,
    "passed": 18,
    "failed": 0,
    "skipped": 0
  },
  "static": {
    "rc": 0,
    "passed": 7,
    "failed": 0,
    "skipped": 0
  }
}
```
AFTERMATH18/18 native rc0; statik7/7 native rc0. Core eski FAIL adlar?: campaign-movement-and-frontflip, reward-budget-first-and-repeat, purchase-double-tap, D01/D02 real-input route completion. FROZEN eski FAIL: frozen-parkour-carriers-and-bypasses (rollDrop). Bunlar ?nceki kabul edilmi? k?me; yeni hata yok. t2-chief PASS. Son product/index/lib/input sha dosyalar? tekrar e?le?tirildi; final mirror a12 byte-e?it. Tam regresyon ko?ulmad?. A03/A04, G4x12, mobil, tam zincir/kay?t ve 18x18 benzerlik ilgili2b/2c a?amas?nda.

## A4c-2b — 2026-09-28T04:45:40.929495
DISK DURUMU: PASS. Product SHA 6a54e5d7742f63f550b2b32273da9045eababfdc98f191d869320909d33e14eb.

Başlangıç 731ebff96e08dd3ef3ff32c29caf3114f8dfbaef47ae312dca6e9dbbca9f4ede doğrulandı; ayrı pre/ yedeği ve baseline-sha.json. Ana oturumun MAGMA kanıt yazımı açıklaması kaydedildi; bu turun regresyon kanıtları ayrı mirror/evidence yollarına yönlendirildi.

| Kabul | Ölçüm / beklenen + tolerans | Örneklem + girdi | Kapsam | Negatif / pozitif kontrol |
|---|---|---|---|---|
| O-A3, G2 | 64.9667 s; 14/14; ölüm0; hash904e49c7 eşit; beklenen45–90/100%/0 | A03 Bot S×2, dt1/60 seed0x1a2b3c4d; route-inputs/A03.json | kilitli S, AFTERMATH resume adaptörü | A_RED coin0 gerçek FAIL; W bağımsız |
| O-A4, G2 | 64.95 s;14/14;ölüm0;hash323b9ded eşit | A04 Bot S×2; aynı dt/seed | gerçek final/result, checkpoint16000 | A_RED coin0 FAIL |
| G1 | A03 .9736118, A04 .9747801 kapsam;0 coin;beklenen>=.95 ve0 | segmentli W tüm rota | A03/A04 | sentetik yürüyüş coin'i FAIL; eş S14/14 |
| G3/G5/G7 | 11 statik test PASS; A03 6CJ/4CC/4CS; A04 6CJ/5CC/3CS;her biri14 | manifest, ROUTES, girdi dosyaları | tekil move_id, skill, tüm rampalardaR0, bant,R2/R3/R4, coin'siz hareket | clone coin x=0 mutasyonu yeni iki rota FAIL; sayı azaltılmadı |
| A03 şef | kovalamaca 17.70s; başlangıç12000; temiz kaçış;kapı CLOSED üst hat bottom370<385, pushes0 | 6s ön beklemeli S;toplam70.9667s | görünür yaklaşma,durunca yakalanma,pause/yeniden doğuş | boş iz/yanlış eşik/yakalama sayısı/lead/pause konumu ayrı reddedildi |
| A03 checkpoint | aralıklar [2930, 3000, 3000, 2900, 3000, 1100, 460];dönüş601.15px;yakalama2.1833s;toparlanma2.55s | durma x12501.15→11900;zemin455;lead380 | <=3000 tasarım hedefi;başlangıç/son aralık dahil;ek yakalanma0 | yanlış dönüşX/zemin/lead ve ek yakalanma reddedildi |
| A04 parkur | vault/slide/platform/overpass temas;crane40/pallet36;collapse READY→CONTACT_WARNING→FALLING→ABSENT;launch/tuck/open + tek iniş;kapı durumları | gerçek S;6s kapı hazırlığı | tüm rota mekanikleri;final/result mevcut akış | her mekanik için boş/yanlış durum/temas negatifleri |
| Hazard | A01/A02/A03 rampa0, A04 rampa1×20 gerçek faz;çakışma0 | kaynak envanteri eşit;gerçek collapse/door durumları ve varil konumları değişiyor | dört rota;0 rampa olan rotalar açıkça raporlandı | sentetik rampa inişini kapanan kapıya taşıma gerçek FAIL; temiz rota PASS |
| A04 görünürlük | rideFrames10/9;MAD16.872/15.635>3;kontrast90>15;kadraj>=.8;örtücü0 | gerçek temas sonrası görünür/gizli canvas ROI | crane+pallet | MAD0 gerçek FAIL |
| Tema/kare | D/F/M karşılaştırma RMSE min20.894>18;kontrast min54.667>15;8PNG | A03/A04×başlangıç/engel×1280×720,390×844 | her kare aktif AFTERMATH+routeId;oyuncu/engel>=.8;DOM0 | renk-fit özdeş görüntü RMSE0;örtücü/kimlik/kontrast ayrı negatifler |
| D06 korunum |60.6167s/ölüm0/hash e9700f1f;şef izi856118c2… birebir | başlangıç ve final JS,aynı S/dt/seed | şef oluşturma sadece D06 veya route.chief;A03 startX;ortak algoritma aynı | yanlış iz/hash reddedildi;t2-chief ve pause ayrı regresyon |
| Dosya korunum |47/47 | integrity.json | D/F/M/A01/A02 tanımları+coinler,eski girdiler,index,BotS,çizim/fizik korunur | kaynak normalize farkı yalnız yetkili şef yapılandırması;testte yalnız aşama registry2→4 kesin liste güncellemesi |

A03 koşul bağlantısı ilk sürümde t1b testinin metin tabanlı `if (!campaignChief.active && player.x>=1800)` kancasını bozdu. Test değiştirilmedi; ürünün eski dış koşulu korundu, A03 startX kontrolü iç koşula taşındı. D06 diferansiyel koşu aynı kaldı. İlk registry testi2 rota bekliyordu; onaylı4 rota listesine kesin eşitlik güncellendi, fiyat500 ve diğer assertler korunuyor. Bunlar ilk deneme sonuçlarıdır; nihai kapılar aşağıdadır.

İlk hazard negatifinde çökme öğesi örnekleme anında ABSENT olduğu için çakışma oluşmadı: bu deneme NEGATİF KANIT SAYILMADI. Son negatifte iniş kapanan kapıyla kesiştirildi ve safe-landing assert'i gerçekten kırmızı oldu. Tema ilk fixture'ında A03 kilidi nedeniyle hata vardı; test önce A01→A02→A03 bitirerek fixture kilidini açıyor.

MAGMA izolasyonunda eski G4 pilot JSON girişleri ilk kopyada eksikti (ENOENT). Dört kabul edilmiş pilot giriş dosyası hashleri korunarak mirror'a kopyalandı; aynı G4 testi tekrar PASS. Bu kapı eski MAGMA kanıtını okur; yeni G4 koşusu değildir. MAGMA toplam36 ilkPASS+1 tekrarPASS=37PASS,1emekli.

Nihai sonuçlar:
```json
{
  "final-core": {
    "rc": "1",
    "summary": [
      "5 failed",
      "55 passed (5.8m)"
    ]
  },
  "final-frozen": {
    "rc": "1",
    "summary": [
      "1 failed",
      "6 skipped",
      "13 passed (2.5m)"
    ]
  },
  "final-magma": {
    "rc": "1",
    "summary": [
      "1 failed",
      "1 skipped",
      "36 passed (4.7m)"
    ]
  },
  "final-world": {
    "rc": "0",
    "summary": [
      "11 passed (18.5s)"
    ]
  },
  "final-pause": {
    "rc": "0",
    "summary": [
      "1 passed (7.1s)"
    ]
  },
  "final-aftermath": {
    "rc": "0",
    "summary": [
      "28 passed (4.1m)"
    ]
  },
  "final-magma-G4": {
    "rc": "0",
    "summary": [
      "1 passed (2.7s)"
    ]
  },
  "D06-final": {
    "rc": "0",
    "summary": [
      "1 passed (9.0s)"
    ]
  },
  "static": {
    "rc": "0",
    "summary": [
      "11 passed (6.0s)"
    ]
  },
  "red-a03": {
    "rc": "1",
    "summary": [
      "2 failed",
      "2 passed (57.3s)"
    ]
  },
  "red-a04": {
    "rc": "1",
    "summary": [
      "3 failed",
      "1 passed (35.7s)"
    ]
  },
  "red-static": {
    "rc": "1",
    "summary": [
      "4 failed"
    ]
  },
  "red-hazard-collision": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  }
}
```

Kabul edilmiş eski hatalar: tn-a12 campaign-movement-and-frontflip, reward-budget-first-and-repeat, purchase-double-tap, D01/D02 real-input completion; frozen-parkour-carriers-and-bypasses rollDrop. Atlanan testler PASS sayılmaz. Tam regresyon çalıştırılmadı. Son ürün üzerinde odak kapıları koşuldu; mirror ürün SHA aynı. Yeni D06 testi ve son hazard varyasyonları ayrıca koşuldu.

Son SHA256:
```json
{
  "index.html": "fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142",
  "js/a12-campaign.js": "6a54e5d7742f63f550b2b32273da9045eababfdc98f191d869320909d33e14eb",
  "03-test/tn-a4.spec.cjs": "a66d57022d0c3199ec531c9fcdae8d65fbbacbafe678a0f7b3970aec7afa866b",
  "03-test/t2-coins.spec.cjs": "bba1f8bff28dd1017b3196f1d5f26613ca234b38493be3ce0c1c52a55de53792",
  "03-test/route-inputs/A01.json": "ed1fd06852bba8e858bf2d4db0bd5677741d257c411b22547e37b49b67073111",
  "03-test/route-inputs/A02.json": "4b89569b24898998b1e0f87ad4d8a75b1f145fb686af619fb7ef5e93f92ef62b",
  "03-test/route-inputs/A03.json": "bbdd25d06b6ecad5c065f28f99391278187ddd4c5106e5aa7f1471119fc154a7",
  "03-test/route-inputs/A04.json": "d37f48475ff779097aa7c8c47790e18f5916f2a19b1a5d9adab6cfff17b3fbee",
  "03-test/lib/bot-s-drive.cjs": "c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f"
}
```

Tüm lib/rota SHA'ları final-sha.json; başlangıç/son farklar *.diff; ham loglar *.log ve native çıkış kodları *.rc; kare envanteri shots-sha.json. Graphify AST-only güncelleme; ücretli/ağ/kurulum/git/commit/yayın yok. Medya açılmadı. Kalan kapsam A4c-2c: tam zincir/kayıt/retry/next,G4×12,mobil,18×18 benzerlik,ekonomi ve son envanter.

## A4c-2c — 2026-09-28T04:58:22.215877
DISK DURUMU: PASS. Ürün SHA `4a85b9d741aecd2d5213b845c82dd2bb3a5073bb047dbe339039c3f225f862cd`.

Başlangıç 6a54e5d7 doğrulandı; pre/ yedeği ve baseline-sha.json. Tam registry/kilit/next ve dünya geçişi önceki aşamada uygulanmıştı; bu çağrıda AFTERMATH kayıt yükleme listesi, debug unlocked kapsamı ve EN/TR/RU canlı rota adları tamamlandı. Ortak fizik, şef, fiyat, 18 rota geometri/coinleri ve tüm Bot S girdileri korunur. API tabanlı zincir testi yanında mağaza düğmeleriyle satın alma/seçme ve sonuç-next UI geçişi de ölçüldü.

| Kabul | Beklenen + ölçüm / tolerans | Örneklem + girdi | Kapsam | Negatif / pozitif kontrol |
|---|---|---|---|---|
| Zincir/kayıt/G7 | A01 açık; sıralı açılma; her rotada14; ikinci kesinti0; retry coin korunur, sonuç retry sıfırlar | dört rota; yeni sayfada aynı localStorage; chain-g7.json | satın alma500, registry, kilitli start reddi, reload/next/wrap; D/F/M ilerleme | purchase zorla yanlış kırmızı; her guard A_C_AUDIT yanlış boole reddi |
| UI dünya geçişi | DOCK sonuç-next → A01; D/F/M dönüşü ilk rota ve sonra ikinci rota | gerçek mağaza/next tıklamaları; ui-transition.json | satın alma ile seçme ayrımı; diğer dünyalar korunur | ui-A01 kırmızı; her dönüşte dünya+rota kontrolü |
| G4×12 | 12 benzersiz; her A rotasında CJ/CC/CS birer; kaçırma, iz kesişimi0, bitiş ve pozitif kontrol | dt1/60, seed0x1a2b3c4d; yalnız hedef move_id bastırıldı; A*/g4-pilot.json | segment atlamalarında süpürme çizgisi yok; bütün fizik örnekleri ayrıca daire-kutu kontrolü | g4-count kırmızı; hedef merkezine kutu pozitif teması; normal S hedefi alır |
| Mobil | 390×844; 3000 checkpoint; ölüm0; kontroller kadrajda ve ayrı | CDP gerçek trusted touch; joystick+3 zıplama, 776 fizik adımı | A01 başlangıçtan ilk checkpoint; klavye girdisi yok | mobile-checkpoint kırmızı; olay türü/isTrusted kontrolü |
| Benzerlik | 18×18; A–A min0.333333>=0.3; aynı tip+en iyi kaydırmada <=150px kopya yok | kaynak routeDefinition sıralı tip ve normalize x; similarity.json | D6/F4/M4/A4; A–F/A–M için kopya yasağı, 0.3 zorunluluğu yok | D04+500 sentetik kopya algılandı; distance kırmızı |
| EN/TR/RU | 4 ayrı isim/dil; soru işareti yok; İngilizce tam isimler | i18n sözlüğü + HUD/debug rota adı t(routeId) | A01–A04 | names yanlış değer kırmızı; UTF-8 aktarımında ilk görülen ? düzeltildi |
| Tema | dört A rota ×2 konum×2 boyut; RMSE>18 ve kontrast>15, kimlik/kadraj/DOM kontrolleri | nihai izole aftermath paketi; a4c2a/a4c2b theme.json | 16 kare, D/F/M karşılaştırmaları; mevcut tema kabulü tekrar | her mevcut tema predicate kendi yanlış girdisini reddeder |
| Ekonomi | 36 bitmiş S koşusu; ölüm0; amount==walletDelta; ilk/tekrar ayrı | economy.json/positive-s.json; her rotada ilk+tekrar | 500 yalnız A satın alınmadan erişilebilen rotalardan; fiyat160/200 korunur | bitmeyen/ölümlü koşu ölçüm scriptini düşürür; bakiye farkı uzlaştırıldı |
| Korunum |52/52 PASS | integrity.json; başlangıç yedeğine byte/routeDefinition karşılaştırması |18 geometri+coin,18 girdi,lib,index,ortak fizik/şef; eski test prefix aynı | fark varsa exit1; kaynak diff kaydı |

Mobilde eski M01 testinin en az5 dokunma olayı sayısı kopyalanmadı: A01'in daha yakın ilk checkpoint'ine kadar joystick+3 jump=4 trusted pointerdown yeterlidir; yeni A kapısı bu gerçek örneklemden türetildi. Eski test değiştirilmedi.

Ekonomi varsayımları: tüm coinler ve ölçülen stil bonusuyla başarılı koşular; başarısız koşu/farklı stil dahil değil. Aşağıdaki yol sayıları belirtilen sıranın sonucudur, küresel minimum iddiası değildir. 'already-owned-DFM' başlangıcında D/F/M zaten sahip, bakiye0; satın alma maliyetleri bu senaryoda geçmiş harcamadır. Yeni kayıt alternatifinde F160 ve M200 harcamaları bakiyeden açıkça düşülür. A ödülleri500'e erişimde kullanılmaz.

| Rota | Coin | İlk ödül | Tekrar ödülü | İlk/tekrar bonus |
|---|---:|---:|---:|---|
| D01 | 12 | 52 | 32 | 40 / 20 |
| D02 | 10 | 53 | 33 | 43 / 23 |
| D03 | 13 | 58 | 38 | 45 / 25 |
| D04 | 12 | 57 | 37 | 45 / 25 |
| D05 | 13 | 55 | 35 | 42 / 22 |
| D06 | 13 | 58 | 38 | 45 / 25 |
| F01 | 14 | 57 | 37 | 43 / 23 |
| F02 | 13 | 58 | 38 | 45 / 25 |
| F03 | 13 | 55 | 35 | 42 / 22 |
| F04 | 12 | 57 | 37 | 45 / 25 |
| M01 | 14 | 54 | 34 | 40 / 20 |
| M02 | 14 | 59 | 39 | 45 / 25 |
| M03 | 14 | 56 | 36 | 42 / 22 |
| M04 | 14 | 57 | 37 | 43 / 23 |
| A01 | 14 | 51 | 31 | 37 / 17 |
| A02 | 14 | 57 | 37 | 43 / 23 |
| A03 | 14 | 52 | 32 | 38 / 18 |
| A04 | 14 | 59 | 39 | 45 / 25 |

- frozen160-dock-only: 3 tamamlanan koşu; son bakiye 163.
- magma200-dock-only: 4 tamamlanan koşu; son bakiye 220.
- aftermath500-dock-only: 11 tamamlanan koşu; son bakiye 508.
- aftermath500-already-owned-DFM: 9 tamamlanan koşu; son bakiye 503.
- fresh-buy-F-after-D6-M-after-F4: 17 tamamlanan koşu; son bakiye 529.

Benzerlik matrisi:

| Rota | D01 | D02 | D03 | D04 | D05 | D06 | F01 | F02 | F03 | F04 | M01 | M02 | M03 | M04 | A01 | A02 | A03 | A04 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D01 | 0.000 | 0.600 | 0.588 | 0.647 | 0.444 | 0.650 | 0.588 | 0.588 | 0.632 | 0.650 | 0.550 | 0.647 | 0.579 | 0.588 | 0.556 | 0.588 | 0.556 | 0.636 |
| D02 | 0.600 | 0.000 | 0.650 | 0.550 | 0.550 | 0.650 | 0.600 | 0.600 | 0.650 | 0.550 | 0.650 | 0.600 | 0.550 | 0.600 | 0.650 | 0.700 | 0.650 | 0.773 |
| D03 | 0.588 | 0.650 | 0.000 | 0.647 | 0.611 | 0.550 | 0.529 | 0.438 | 0.684 | 0.600 | 0.650 | 0.688 | 0.632 | 0.562 | 0.722 | 0.706 | 0.667 | 0.682 |
| D04 | 0.647 | 0.550 | 0.647 | 0.000 | 0.556 | 0.500 | 0.529 | 0.647 | 0.684 | 0.450 | 0.600 | 0.706 | 0.632 | 0.647 | 0.667 | 0.706 | 0.667 | 0.727 |
| D05 | 0.444 | 0.550 | 0.611 | 0.556 | 0.000 | 0.600 | 0.611 | 0.444 | 0.579 | 0.500 | 0.550 | 0.556 | 0.579 | 0.500 | 0.556 | 0.556 | 0.500 | 0.636 |
| D06 | 0.650 | 0.650 | 0.550 | 0.500 | 0.600 | 0.000 | 0.600 | 0.500 | 0.700 | 0.600 | 0.750 | 0.650 | 0.800 | 0.500 | 0.750 | 0.750 | 0.700 | 0.727 |
| F01 | 0.588 | 0.600 | 0.529 | 0.529 | 0.611 | 0.600 | 0.000 | 0.471 | 0.632 | 0.500 | 0.400 | 0.529 | 0.526 | 0.353 | 0.500 | 0.647 | 0.500 | 0.455 |
| F02 | 0.588 | 0.600 | 0.438 | 0.647 | 0.444 | 0.500 | 0.471 | 0.000 | 0.526 | 0.500 | 0.600 | 0.500 | 0.632 | 0.500 | 0.611 | 0.471 | 0.556 | 0.636 |
| F03 | 0.632 | 0.650 | 0.684 | 0.684 | 0.579 | 0.700 | 0.632 | 0.526 | 0.000 | 0.550 | 0.500 | 0.632 | 0.579 | 0.632 | 0.632 | 0.632 | 0.632 | 0.682 |
| F04 | 0.650 | 0.550 | 0.600 | 0.450 | 0.500 | 0.600 | 0.500 | 0.500 | 0.550 | 0.000 | 0.550 | 0.550 | 0.700 | 0.450 | 0.650 | 0.650 | 0.650 | 0.636 |
| M01 | 0.550 | 0.650 | 0.650 | 0.600 | 0.550 | 0.750 | 0.400 | 0.600 | 0.500 | 0.550 | 0.000 | 0.500 | 0.400 | 0.450 | 0.300 | 0.450 | 0.300 | 0.409 |
| M02 | 0.647 | 0.600 | 0.688 | 0.706 | 0.556 | 0.650 | 0.529 | 0.500 | 0.632 | 0.550 | 0.500 | 0.000 | 0.526 | 0.312 | 0.556 | 0.529 | 0.500 | 0.500 |
| M03 | 0.579 | 0.550 | 0.632 | 0.632 | 0.579 | 0.800 | 0.526 | 0.632 | 0.579 | 0.700 | 0.400 | 0.526 | 0.000 | 0.526 | 0.421 | 0.421 | 0.263 | 0.455 |
| M04 | 0.588 | 0.600 | 0.562 | 0.647 | 0.500 | 0.500 | 0.353 | 0.500 | 0.632 | 0.450 | 0.450 | 0.312 | 0.526 | 0.000 | 0.444 | 0.471 | 0.500 | 0.409 |
| A01 | 0.556 | 0.650 | 0.722 | 0.667 | 0.556 | 0.750 | 0.500 | 0.611 | 0.632 | 0.650 | 0.300 | 0.556 | 0.421 | 0.444 | 0.000 | 0.500 | 0.333 | 0.455 |
| A02 | 0.588 | 0.700 | 0.706 | 0.706 | 0.556 | 0.750 | 0.647 | 0.471 | 0.632 | 0.650 | 0.450 | 0.529 | 0.421 | 0.471 | 0.500 | 0.000 | 0.444 | 0.636 |
| A03 | 0.556 | 0.650 | 0.667 | 0.667 | 0.500 | 0.700 | 0.500 | 0.556 | 0.632 | 0.650 | 0.300 | 0.500 | 0.263 | 0.500 | 0.333 | 0.444 | 0.000 | 0.409 |
| A04 | 0.636 | 0.773 | 0.682 | 0.727 | 0.636 | 0.727 | 0.455 | 0.636 | 0.682 | 0.636 | 0.409 | 0.500 | 0.455 | 0.409 | 0.455 | 0.636 | 0.409 | 0.000 |

Nihai odak sonuçları (tam regresyon koşulmadı; kabul edilmiş tn-a12×5 ve FROZEN rollDrop×1 ayrı eski küme):
```json
{
  "core": {
    "rc": "1",
    "summary": [
      "5 failed",
      "55 passed (5.8m)"
    ]
  },
  "magma": {
    "rc": "0",
    "summary": [
      "1 skipped",
      "37 passed (4.7m)"
    ]
  },
  "frozen-world": {
    "rc": "0",
    "summary": [
      "1 failed",
      "6 skipped",
      "13 passed (2.5m)",
      "12 passed (22.3s)"
    ]
  },
  "aftermath": {
    "rc": "0",
    "summary": [
      "34 passed (4.4m)"
    ]
  },
  "pause": {
    "rc": "0",
    "summary": [
      "1 passed (7.2s)"
    ]
  },
  "g4-run": {
    "rc": "0",
    "summary": []
  },
  "economy": {
    "rc": "0",
    "summary": []
  },
  "mobile": {
    "rc": "0",
    "summary": [
      "1 passed (7.1s)"
    ]
  },
  "ui": {
    "rc": "0",
    "summary": [
      "1 passed (3.9s)"
    ]
  },
  "red-chain": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "red-similarity": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "red-names": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "red-g4": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "red-mobile": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "red-ui": {
    "rc": "1",
    "summary": [
      "1 failed"
    ]
  },
  "frozen": {
    "rc": "1",
    "summary": "1 accepted old FAIL; 13 PASS; 6 retired"
  }
}
```

Yeni kırmızı kapılar başarısızlık için rc1, olumlu kapılar rc0 bekler. A_C_AUDIT yanlış boole kontrolü guard erişimini kanıtlar; bu tek başına ürün mutasyonu değildir. G4 temas kontrolü, benzerlik sentetik kopyası ve tema predicate mutasyonları ayrıca bağımsız veri kontrolleridir.

SHA envanteri: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4c2c-20260928\final-sha.json`. 18 rota envanteri: `E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\route-inventory-18.md`. Son snapshot/READY yalnız bütün zorunlu kapılar tamamlanınca yazılır.

A4c-2c SNAPSHOT VERIFIED: post-a4c-mirror/02-kod; runtime and test source identical; only six *run-path.txt sidecars point inside snapshot. 38 runtime sprites. Snapshot static11/11 and G4 evidence2/2 PASS. Full regression NOT run. READY-post-a4c.txt provides the main-session command and six accepted old failures.
