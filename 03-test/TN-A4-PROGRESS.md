DISK DURUMU: A4b-2a M01/M02 PASS; genel kabul DUR — başlangıçta da görülen6 regresyon FAIL; son magma20 PASS/1 skip, world11 PASS, statik3 PASS.
# TN-A4 PROGRESS

## COIN-TEMAS C1 — 2026-09-26

- Kural: `collectPhysical()` artık oyuncu fizik kutusunun coin dairesine en yakın clamp noktasını kullanır; uzaklık `<=9 px` ise toplar. Rota istisnası/tolerans yoktur. `COIN_FILL_RADIUS=8` ve `COIN_STROKE_WIDTH=2` aynı kaynaktan dış temas yarıçapını `9 px` üretir.
- Canvas ölçümü: alfa piksel dış yarıçapı `10 px`, hesaplanan dış yarıçap `9 px` (`±1 px`). `coin-contact-only` D01/D03/D06/F02 × yatay/dikey/çapraz 1 px boşlukta false, 1 px örtüşmede true; eski 120 px modelinin boşluk örnekleri true (kırmızı pozitif kontrol).
- Yerleştirme yöntemi: gerçek klavye botlarının kesintisiz alt-yol ve D06 üst-geçit izleri örneklendi; coin merkezleri bu izlerde oyuncu kutusunun geçtiği en yakın güvenli noktaya projekte edildi. Kimlik/sayı değişmedi.
- Taşıma (taşınan/ortalama/maksimum px): D01 `40/2173.34/3772.16`; D02 `40/2677.46/4484.14`; D03 `40/4104.60/9762.00`; D04 `40/2601.61/6402.10`; D05 `40/4183.27/7602.00`; D06 `40/2524.10/8872.00`.
- Kapılar: tn-a4 `-g coin` 3/3; D03 all-40 1/1; D05 all-40 1/1; D06 all-40 1/1; D06 beceri ana-yol `skill<=7` ve `total>=20` 1/1. tn-a3 içinde D01/D02/D04 için ayrı all-40 test satırı ve mobil D01 40/40 satırı bulunmuyor.
- C2'ye devir: F01–F04 koordinatları değiştirilmedi; dar temas sonrası F rota 40/40 satırları C2 kapsamındadır ve bu turda koşulmadı.
- Görsel çizim parametreleri, coin kimlik/sayıları, engel/platform/tehlike geometrisi, `index.html` ve oyuncu kutusu değişmedi.
- Son SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `b46df89ac6fab67373fa9408faee4e8c4a769467a635f11a98a486e4fd3d5ee9`; spec `c87c7978938eb927b421126e8b0beb63e5c79039e840ad680e2ebfa1c984fa54`.

## A4b-1-REG — 2026-09-26

- H1 arka plan önbelleği — ELENDİ: kırmızı yalnız FROZEN örneklerinde üretildi; ölçüm kayıtlarında aktif dünya `frozen`, aktif anahtar yalnız `frozen|D01/F02/F03/F04|...`; MAGMA önbellek yolu bu karelerde 0 kez çalışır. Çizim sırası `drawBackground → drawWorld → drawRunnerLayer → drawOverlay`; ürün görsel kusuru yok.
- H2 çizimsiz 50 ms — KISMEN DOĞRU fakat tek kök neden değil: gizleme sonrası `renderFrameCount` artışı zorunlu kılındığında her örnek `frameDelta=1`; bayat kutulu ilk sayaçlı tur yine 3/10 yeşil, 7/10 `pixels=0`. Sabit süre yerine gerçek çizim karesi bekleme tüm gizle/oku kontrollerine uygulandı.
- H3 bayat oyuncu kutusu — DOĞRULANDI / kök neden TEST: görünür piksel 50 ms gecikmeli okunurken kamera ilerledi; eski kutu ile okuma-anı kutusu yatay farkı `1.08–172.49 px`. Kutuyu örnekleme anında yeniden hesaplayan görünür→gizle→en az 1 çizim karesi→aynı bölgeyi oku akışında piksel farkı `353205–1845585`, eşik değişmeden `>0`.
- H4 tema/cache karışması — ELENDİ: sekiz örneğin tamamında dünya `frozen`; anahtarlar `frozen|D01|2|1`, `frozen|F02|1|1`, `frozen|F03|1|1`, `frozen|F04|1|1`; MAGMA anahtarı görülmedi.
- Aynı kalıp taraması: `moving-platform-visible` içindeki iki gizle/oku noktası ve `magma-moving-platform-visible` gerçek çizim karesi kapısına geçirildi. `magma-not-recolor` gizleme yapmıyor; F01/F02 kareleri yalnız screenshot alıyor, bu nedenle değişmedi.
- Kapılar: `tn-a4:971 --repeat-each=10` 10/10; `-g magma` 8/8; `-g moving-platform` 2/2. Kabul eşikleri, ürün görsel çıktısı ve `index.html` değişmedi.
- F01 39/40: ana oturum logundaki toplanan kimliklerin 40'lık tanımla farkı `F01-c04`; bu turda düzeltilmedi.
- Değişen ürün debug ölçümü: `renderFrameCount` sayacı (`drawOverlayIntegrated`, `debugState.engine`); görsel davranışa etkisi yok. Değişen test ölçümü: oyuncu kutusunu okuma anında yenileme ve gizleme sonrası çizim-karesi kapıları.
- Son SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `c9b058a2f07f260fff9185935b0b9613184bf080c59319e9ff17783792e608b5`; spec `a8a6a527e43b04314c3075adfd117dcbcc28d6caeeffa9cfc8c4b55fc790d58b`.

## A4b-1 — 2026-09-26

- Registry/akış: `WORLDS.magma.enabled=true`, fiyat 500, rota boş; 1000→500, sahiplik 1, çift çağrı başarı 1/2. Rota-yok kararı: sahiplik kazanılır, `selectedWorldId=dock31`, `pendingWorldId=null`.
- Aktif çizim: `drawThemeScene`, `magmaSurface`, `drawBackgroundIntegrated`, `drawWorldIntegrated`; volkan/lav nehri, dökümhane, bazalt/ızgara, ısı giysili işçi ve MAGMA mekanik kılıfları. `drawCampaign` değişmedi.
- Piksel: güvenli yüzey lav `0.00804≤0.02`; arka plan `0.36421≥0.05`; okunabilirlik wide `35.67/35.67/35.67`, mobile `28/50/35.67` (`>15`).
- RMSE DOCK→MAGMA `18.48/23.33/25.59/26.25`; FROZEN→MAGMA `21.05/23.28/26.89/26.14` (`>18`); sentetik öz-kopya `0<1`.
- Vinç MAD/kontrast `31.01/150.33` (`>3/>15`); fizik 3 s/15 örnek `≤0.5 px`; 120 kare dock/magma `0.333/0.228 ms`, oran `0.685≤1.5`.
- İlk odaklı koşum `4/8`; lav, okunabilirlik, fizik ve RMSE kırmızı. Ara performans `15.70×` kırmızı. Son tarifli kapı `8/8`; tam 5 spec koşulmadı.
- SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `e1f641276870b9f8df52b8d6e3797308ae34a3fff9c5c225d5e570fe71be01e0`; spec `86aae9fd41203abe09937c3e403ae2abc9187ec02487b0d933c29a5e711f51d9`.

## A4a-2-FIX2 — 2026-09-26

- Hipotezler: H1 ELENDİ — aktif oyun canvas bağlamı `drawWorldIntegrated(c)` içinde doğru; H2 ELENDİ — FROZEN yüzeyleri platformlardan sonra örtmüyordu; H3 DOĞRULANDI — hareketli platform çizimi yalnız çağrılmayan `drawCampaign()` içindeydi, aktif entegre çizim yolunda hiç yoktu.
- Ürün · ölçülen: FROZEN crane/pallet görünür; DOCK eski dolgu/çerçeve/işaret kolu korundu · örneklem/girdi: F02 crane+pallet, D03 crane, D05 pallet canlı kutuları · kapsam: yalnız render + `#debug` gizleme kancası · pozitif kontrol: düzeltme öncesi F02 pallet `MAD=0` ile kırmızı.
- Piksel kabulü · ölçülen: F02 crane `28.62/144`, pallet `3.95/170.67`, D03 crane `32.73/98`, D05 pallet `27.13/80.67` (`MAD/P90−P10`) · örneklem/girdi: Canvas `getImageData`, görünür/gizli aynı bölge · kapsam: `moving-platform-visible` · pozitif kontrol: eşikler `MAD>3`, kontrast `>15`, gevşetilmedi.
- Engel kareleri · ölçülen: F01–F04 görünür mekanik bölgeleri kontrast `>15`; F02 oyuncu `onGround` ve ayak altındaki nesne canlı platform · örneklem/girdi: 1280×720 + 390×844 · kapsam: mevcut obstacle testi + F02 kareleri · pozitif kontrol: kutu kesişimi tek başına artık yeterli değil.
- Kapılar · ölçülen: obstacle 1/1, `moving-platform-visible` 1/1, parkour 25/25 · örneklem/girdi: workers=1, hedefli satırlar · kapsam: brief kapıları; tn-a3/tn-a12/tam tn-a4 koşulmadı · pozitif kontrol: yeni assert düzeltme öncesi kasten kırmızı.
- Son SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `35782e29dac6d3280f1266b3175781bd69dde3817581843797743e7d1ea1bd8c`; spec `775ed97bdde6f6532b2c7d8ebec613b928098618b52cd8cdba998dd31161f416`.
- F02 obstacle SHA-256: wide `e3938794b2c9d161f07ec4147c93267f683bee8bd199c6d973cb21c3053c9d74`; mobile `a9b11140e32d3108d11198bac06e75b199f01be22663c8b41ec4f529d518ee22`.

## A4a-2-FIX — 2026-09-26

- Hipotezler: H1 DOĞRULANDI — `placePlayer` sonrası 100 ms kamera yakınsaması yetersizdi; H2 ELENDİ — oyuncu y/viewport kapısı yeşil; H3 ELENDİ — koşu/pause bayrağı çizimi engellemiyordu.
- Engel kadrajı · ölçülen: oyuncu kutusu tamamen viewport içinde, adlandırılmış mekanik kutusu kesişiyor ve görünür/gizli oyuncu kutusu piksel farkı >0, 8/8 PNG · örneklem/girdi: `__tmb.cam/layout` ekran dönüşümü + Canvas `getImageData` · kapsam: F01 vault; F02 crane/pallet ayrı kare; F03 door+worker; F04 collapse · pozitif kontrol: eski 100 ms/görünmez-oyuncu kurulumu piksel farkı 0 ile kırmızı.
- Vault gözlemi · ölçülen: F01+F02 `--repeat-each=5` 10/10, 45–90 s, 40/40 ve `vault` · örneklem/girdi: kalıcı `engine.observedStates` olay kaydı + gerçek klavye · kapsam: tn-a4 gerçek koşu ve taşıyıcı/bypass olay kaydı · pozitif kontrol: koşu öncesi vault kaydı 0.
- Bot kararlılığı · ölçülen: F01 geçerli 520 px/s vault yaklaşımı; F02 c16+vault korunuyor · örneklem/girdi: F01 kısa yavaşlama, F02 üst-hat sonrası gerçek sol/sağ backtrack · kapsam: yalnız test botu · pozitif kontrol: erken vault aralığı `frontFlip,cleanLanding` ile; backtrack yokluğu 39/40 ile kırmızı.
- Kapılar · ölçülen: ekran 1/1; tn-a4 F01/F02 ×5 10/10 (9.0 dk); parkour 25/25 · örneklem/girdi: brief tarifleri, workers=1 · kapsam: değişen ekran testi + zorunlu parkour ucu · pozitif kontrol: mevcut assert/eşik gevşetilmedi.
- Son SHA-256: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `53daeebcf71a8bd32c898f88bb9df587bb944ebc6c39b164f76b3b98345cfb5a`; spec `8ab60d14a1933a86a189ae230aa4201835ef0e6be898b1f94ac9344401c8515e`.
- PNG SHA-256: F01 wide/mobile `1114278a…1387` / `05d0892b…ddc4f`; F02 `16c5c978…d5a7` / `8478df88…2a4`; F03 `cfe6d1f9…1e31` / `846df4e9…a646`; F04 `74fd85ea…bec9` / `7a13bc47…18b`.

FINAL A4a-2b KAPISI: F03 57.302 s, F04 48.509 s; 40/40. `tn-a4` 30/30; regresyon ucu 43/43.

## A4a-2b — 2026-09-26

- F03 Hangar Run: slide + worker/varil + containerDoor üst overpass kaçışı + vault; 25+15 coin; gerçek koşu 49.931 s, 0 ölüm, 40/40.
- F04 Frostline Express: uzun rampa + güvenli rollDrop koridoru + uyarılı collapse üst kestirme; 25+15 coin; gerçek koşu 49.127 s, 0 ölüm, 40/40.
- Hazard: tüm F rampaları ×20 faz, çakışma 0; kaynak-rampa listesi birebir. Skill: ana yol 0/15, tam bot 15/15.
- Benzerlik: 10×10 matris yeşil; en yüksek D04–F01 .667, D01–D05 .600, D03–D04 .500; D04+500 sentetik kopya kırmızı kontrolü.
- Ek düzeltme: obstacle karelerinde oyuncu+mekanik kadraj assert'i; F02 pallet, F03 door+worker, F04 collapse; F01–F04 obstacle kareleri yenilendi.
- Kasıtlı kırmızılar: F03 38/40, F04 x=2268 kilidi ve 25/40, rollDrop gözlemi yok, parkour test timeout; geometri/girdi ve test süresi düzeltmeleri sonrası hedefli yeşil.

## A4a-2a — 2026-09-26

- Akış/kayıt: registry F01–F04; FROZEN başlangıcı en ileri tanımlı açık rota; F01 öncesi F02 reddi, bitiriş sonrası ve yeni sayfada F02; F03/F04 tanımsız ve kilitli.
- F01 Cold Arrival: geniş platform/rampa/vault; 25+15 coin; gerçek klavye 49.572 s, 0 ölüm, 40/40.
- F02 Suspended Cargo: crane+pallet, üst/alt hat, rampa/vault; 25+15 coin; gerçek klavye 51.969 s, 0 ölüm, 40/40.
- Tema/mobil: DOCK imzası 0/5; sekiz F01/F02 PNG; 390×844 kontrol kesişimi 0 ve ilk checkpoint.
- Kasıtlı kırmızı: 41/40 ortak kapı; F01 39/40, F02 33/40→38/40; yalnız rota/coin geometrisiyle düzeltildi.
- Regresyon: parkour 25/25; tn-a12 17/17; D01→D06 1/1; tn-a4 final koşumu teslimde. `index.html` değişmedi.

## A4a-1

- WorldRegistry: DOCK ücretsiz; FROZEN 500 ve etkin; MAGMA/AFTERMATH 500 ve PLANLANDI/devre dışı · katalog/debug state · dört dünya · etkinlik satırı geçici bozulunca satın alma testleri kırmızı.
- world-purchase: 500→0, FROZEN sahip+seçili; MAGMA satın alma false · 1 gerçek debug işlemi · cüzdan+sahiplik aynı snapshot · FROZEN geçici devre dışıyken kırmızı.
- world-purchase-double-tap: 1000→500, sahiplik 1 adet, başarı 1/2 · eşzamanlı iki gerçek çağrı · FROZEN · purchaseBusy koruması kaldırılmadan FROZEN devre dışı kontrolü kırmızı.
- world-purchase-save-failure: hata sonrası 500 ve sahiplik yok; kurtarma sonrası başarı · failSave debug enjeksiyonu · FROZEN snapshot rollback · FROZEN devre dışıyken kırmızı.
- world-preview-no-side-effect: previewWorldId=frozen; profil ve run ledger birebir aynı · canlı canvas/UI · WORLDS önizleme · preview ataması geçici kaldırılınca kırmızı.
- world-switch-cache: FROZEN piksel toplamı DOCK'tan farklı; DOCK dönüş farkı <15000; cache 0→1 nesne · getImageData · D01 v2/dpr anahtarı · FROZEN geçici devre dışıyken kırmızı.
- world-theme-readable: kontrast 238.67>120, renk kovası >20, DOM örtücü 0 · getImageData · FROZEN tam canvas · eşik geçici 300 iken kırmızı.
- Kayıt şeması değişmedi (schemaVersion 1); mevcut ownedWorldIds/selectedWorldId kullanıldı, bu nedenle yeni göç gerekmedi. v36 regresyonu geçti.
- Regresyon ucu: tn-a12 17/17 + parkour-tur1 25/25 + screenshot 1/1 = 43/43.
- PLACEHOLDER: FROZEN final lisanslı sanat/sprite varlıkları; bu turda kod içi Canvas2D katmanları kullanıldı.

## A4a-1-FIX — 2026-09-26
- FROZEN ışık · ölçülen: dolu turuncu daire kaldırıldı; direk + 22×7 armatür + trapez ışık konisi, coin-benzeri dekor pikseli 0 · örneklem/girdi: Canvas `getImageData`, 1 ölçüm · kapsam: §19 E · pozitif kontrol: eski daire biçimi bu imzayı kırmızı yapar.
- UI satın alma · ölçülen: gerçek 30 ms çift tıklama 1000→500, sahiplik 1; yetersiz 499→499 ve EN/TR/RU metni sözlükle eşit · örneklem/girdi: Playwright UI ×2 · kapsam: WORLDS işlem kilidi/i18n · pozitif kontrol: ilk görünmez-yeniden-render hedefi kırmızı görüldü.
- Bölgesel okunabilirlik · ölçülen: coin 50.33>15; rampa 69.00>15; kenar 50.67>15; DOM örtücü 0 · örneklem/girdi: %10–90 luminans açıklığı · kapsam: FROZEN okunabilirlik · pozitif kontrol: 35 eşiğiyle kırmızı görüldü.
- Cache/safe-start · ölçülen: aktif anahtar dock31/frozen doğru; 3 döngü nesne farkı ≤1; havada x/route/runCoins değişmedi, pending frozen sonraki start'ta uygulandı · örneklem/girdi: debug state + gerçek akış ×2 · kapsam: güvenli geçiş · pozitif kontrol: satın alım sonrası pending atanmayan sürüm kırmızı görüldü.
- Test eski→yeni · satır 6 API satın alma→UI+i18n; 7 API Promise→30 ms gerçek çift tıklama; 8 UI save rollback; 9 UI preview; 10 çelişkili frozen anahtar→aktif anahtar+3 döngü; yeni 12 safe-start; 13 tüm-kare→coin/rampa/kenar/dekor bölgeleri; 14 görüntüler yenilendi.
- Kapılar · tn-a4 --repeat-each=2: 16/16; tn-a12+parkour: 42/42; tam dört spec çalıştırılmadı.

## A4a-1-FIX2 — 2026-09-26
- Görüntü aktif-dünya kapısı · ölçülen: dock/frozen × 1280×720/390×844 için 4/4 `selectedWorldId` doğru · örneklem/girdi: `purchaseWorld` + ürünün `startRoute` yolu · kapsam: pending seçim sonrası doğru ekran kanıtı · pozitif kontrol: DOCK için geçici `frozen` beklentisi kırmızı görüldü.
- Dikey FROZEN ışığı · ölçülen: 390×844 piksel ölçümünde direk alt ucu 768 px, yapı başlangıcı 768 px, fark 0 px (≤4) · örneklem/girdi: Canvas `getImageData` · kapsam: armatürün yapıya bağlanması · pozitif kontrol: eski kısa direk 178 px farkla kırmızı görüldü.
- WORLDS i18n · ölçülen: TR `SATIN AL — 500`, RU `КУПИТЬ — 500`, 2/2 sözlükle eşit · örneklem/girdi: gerçek WORLDS düğmesi · kapsam: `buyWorld` sözlük anahtarı · pozitif kontrol: anahtar yokken test kırmızı görüldü.
- Kapılar · tn-a4 10/10; tn-a12+parkour 42/42; birlikte 52/52. Dört kare yeniden üretildi; tam dört spec çalıştırılmadı.

## A4a-1-FIX3 — 2026-09-26
- Mekan · ölçülen: FROZEN liman çizim yolu 0; aurora, buzul dağları, buz kanyonu/mağarası, buz sütunları, donmuş göl, kar tümsekli ve çatlaklı buz yüzeyi, buz sarkıtı, zemine bağlı kutup lambası, montlu/bereli işçi · örneklem/girdi: D01 başlangıç+engel, iki çözünürlük · kapsam: yalnız render · pozitif kontrol: DOCK imza beklentisi geçici ters çevrilince kırmızı.
- Not-recolor · ölçülen RMSE: arka plan 43.81, yapı 42.30, zemin 41.28, engel 49.03; sentetik doğrusal-renk kontrolü 0, eşik 18 · örneklem/girdi: kanal başına en küçük kareler · kapsam: dört ayrı bölge · pozitif kontrol: sentetik kopya eşik altında.
- Zemin/okunabilirlik · ölçülen: sarı piksel oranı 0.00431 (<0.01); kenar 117, engel 116, rampa 116 (>18); mobil lamba-zemin farkı ≤4 px · örneklem/girdi: Canvas piksel bölgeleri · kapsam: desen ve okunabilirlik · pozitif kontrol: eski lamba 27/13 px farkla kırmızı görüldü.
- DOCK imzaları · ölçülen: FROZEN sarı-siyah şerit 0, `31` 0, konteyner blok 0, liman vinci 0; DOCK kontrolleri 1/1/1/1 · örneklem/girdi: aktif render imza sayacı · kapsam: aktif kare · pozitif kontrol: FROZEN için >0 beklentisi kırmızı.
- Fizik/performance · ölçülen: 3 s, 15 ortak zaman örneğinde x/y farkı ≤0.5 px; draw dock 0.407 ms, frozen 0.403 ms, oran 0.992 (≤1.5) · örneklem/girdi: ArrowRight + oyun saati enterpolasyonu, 120 kare · kapsam: render-only eşitlik · pozitif kontrol: duvar-saati örneklemesi 4.89 px farkla kırmızı.
- Kapılar · tn-a4 15/15; regresyon ilk koşum 40/42 (bilinen D01 vault örnekleme aralıklılığı), başarısız satırlar + D02 aynı disk durumunda 3/3 yeşil; tam dört spec çalıştırılmadı.

## A4a-1-FIX4 — 2026-09-26
- Koyu bant · kaynak: `drawThemeScene` içindeki `#17384b` tam-genişlik `h*.78→h` dolgusu; açık buz sahanlığı + düzensiz kar setine çevrildi · DOCK `loadingCorridor=1`, FROZEN `0` · pozitif kontrol: eski imza ile FROZEN `1` kırmızı görüldü.
- Lamba teması · kaynak: ön plan direğinin `GROUND+40` bitmesi; bitiş `GROUND` yapıldı · 390×844 ve 1280×720 farkları `0/0 px` (eşik ≤4) · pozitif kontrol: yatay yeni assert eski uçla `40 px` kırmızı görüldü.
- Kapı · tn-a4 `16/16`; ekran görüntüsü testi DOCK/FROZEN × iki konum × iki çözünürlük olmak üzere sekiz kareyi yeniden üretti.
# COIN-TEMAS C1-R — 2026-09-26

Durum: **TAMAMLANMADI / son yeşilde duruldu.** `dockTraceCoins()` kaldırıldı ve D01–D06 brief tabanına döndürüldü. G1–G5/G8 yapısal kapısı yeşil; D03 gerçek girdi 40/40 yeşil. D05 ve D06 ilk gerçek-iz kapıları kırmızı kaldığından D01/D02/D04, G7 ve zorunlu regresyon ucu çalıştırılmadı.

- D01 taşınan: c16(+10,0), c17(+3,0), c18(-5,0), c19(-12,0), c20(-19,0), c21(+14,0), c22(+7,0), c26(-10,0), c28(-3,0), c31(+5,0), c33(+12,0), c35(+19,0), c37(-14,0), c39(-7,0).
- D02 taşınan: c24(+15,0), c25(+8,0), c26(-15,0), c28(-8,0).
- D03 taşınan: c05(0,-84), c13(-5,0), c14(+2,0), c15(0,-99), c20(-160,-140), c26–c30(0,+41), c31–c33(0,-49), c34(+5,+41), c35–c36(0,+41), c37(-2,+41), c38–c39(0,+41), c40(0,-64). Gerçek girdi: 40/40.
- D04 taşınan: c08(+10,0), c09(-20,0), c10(-10,0), c32(-10,0), c35(+20,0), c38(+10,0).
- D05 taşınan x: c15(-7,0), c16(-17,0), c17(+13,0), c18(+3,0), c29(+8), c31(+18), c33(-12), c35(-2); y: c19=-49, c20/c21=-42, c26–c35=+66, c36=-133, c37=-104. Son ölçüm (bu y düzeltmelerinden önce): 25/40; doğrulama bekliyor.
- D06 taşınan: c02(0,-140), c07(0,-140), c10(0,-140). Son ölçüm (bu y düzeltmelerinden önce): 37/40; doğrulama bekliyor.

G1–G5 ölçümleri: sıra tüm rotalarda korundu; maks |Δx|=160, maks |Δy|=140; min aralık D01=40, D02=40, D03=40.45, D04=68.01, D05 (son y düzeltmesi öncesi)=72.11, D06=50 px; ana/beceri yayılımı tabanın %100'ü veya üstü; en büyük 1000 px dilim farkı D03=1, diğerleri=0. G8 mevcut taşımalar için 0 hazard hit yapısal kontrolü yeşil.

Negatif kontrol (reddedilen C1): G1 D01–D05 geçti/D06 kırmızı; G2 altı rotada kırmızı (maks |Δx| 3772–9762 px); G3 altı rotada kırmızı (min 12 px, D06 0 px); G4 altı rotada kırmızı (ana yayılım 288 px, D06 beceri 0 px); G5 altı rotada kırmızı (maks dilim farkı 28–38). G6/G7/G8 negatif koşuları henüz tamamlanmadı.

Koşular: `tn-a4 -g coin-layout` 2/2 yeşil; `tn-a3 -g d03-all-40-coins-real-input` 1/1 yeşil (40/40); D05 0/1 (25/40, düzeltme öncesi); D06 0/1 (37/40, düzeltme öncesi). Regresyon ucu `parkour-tur1.spec.cjs` + `tn-a12.spec.cjs`: **KOŞULMADI (ön kapılar kırmızı)**.

SHA-256 (rapor yazımı öncesi ürün/test dosyaları): `js/a12-campaign.js` 2F6049A57484EF8F5CFBB77B935D7E11EC3A1DEB94DE35F98497B0D8FAB5458D; `03-test/tn-a3.spec.cjs` 1A023BB49989B5BCEF3D9E8643AE57A896B75C86397A00E7010708B464C7B842; `03-test/tn-a4.spec.cjs` 0F845A2310F887218D8E9EE4F2499B5BD917A89AC0D27942DDCF0DE6F8EDD548.

# COIN-TEMAS C1-R2 — 2026-09-27

TAMAMLANMADI

**DUR nedeni:** G7 `d-skill-line-main-only` kapısı D03'te 13/15, D04'te 14/15 skill coin topladı (eşik ≤7). D01/D02 rapor ölçümü 15/15 ve 15/15. Mevcut G6 gerçek-girdi rotası/yerleşimi korunurken yalnız koordinatlarla G7'yi geçirmek skill hattını ana hatta yığmayı veya kabul girdisini değiştirmeyi gerektiriyor; brief'in tasarımı bozma stop kapısı nedeniyle iterasyon durduruldu. Regresyon ucu özellikle koşulmadı.

## K1–K3 ve yerleşim

- K1: `03-test/tn-a3.spec.cjs:15` D03 girdisi `jumpEvery:18` → `jumpEvery:100000`; eşikler/assert'ler değişmedi. D03 zıplamasız kapı son ölçümde 40/40, 1/1 yeşil.
- K2: `03-test/tn-a4.spec.cjs:1433-1465` G3 taban-<40 muafiyeti uygulandı. Muaf çiftler: D01 `c16-c26` 20→eşik19, `c18-c31` 30→29, `c19-c33` 38.484→37.484, `c20-c35` 35.057→34.057, `c21-c37` 12→11; D02 `c24-c26` 10→9, `c25-c28` 24→23. D03–D06 muaf çift yok. Reddedilen C1 negatif kontrolü spacing ihlalleri üretmeye devam etti.
- K3: önceki yalnız-G3 x kaydırmaları geri alındı. Son durumda Δx≠0 gerekçeleri: D01 c16 +100 ve c26 -110 (`iz-yok @x=2730/2710`); D02 c12 +60 ve c20 +60 (`iz-yok @x=2040/3400`); D03 c20 -160 (`iz-yok @x=8150`); D05 c26 +100 (`iz-yok @x=4350`); D06 c07 +160 ve c10 +160 (`iz-yok @x=2840/4160`, sıçrama zamanlamasında kararlı temas izi yok).
- Taşınanlar (Δx,Δy), kısa gösterim: D01 tüm 40 coin y izine taşındı; c16(+100,+17), c26(-110,-140), c27(0,-37), c28(0,+41), c33/c39(0,+100), diğerleri Δx=0 ve Δy +17/+52/+65. D02 tüm 40 coin y izine taşındı; c12(+60,+17), c17(0,-140), c18(0,-61), c20(+60,+52), diğerleri Δx=0 ve Δy +17/+52 (c08 +100). D03 c05(0,-84), c13/c14(0,+6), c15(0,-99), c20(-160,-140), c26–c30(0,+41), c31–c33(0,-49), c34/c37(0,-1), c35/c36/c38/c39(0,+41), c40(0,-64). D04 tüm 40 coin taşındı; Δx=0, ana coin'ler çoğunlukla +17/+52, c05 -76, c08 +100, c09/c10 +65; skill c26–c40 çoğunlukla +107 (c34 +41). D05 c15–c18(0,+30), c19(0,-49), c20/c21(0,-42), c26(+100,+66), c27/c28/c32/c34(0,+66), c29/c31/c33/c35(0,+50), c30(0,+86), c36(0,-133), c37(0,-104). D06 c02(0,-140), c07(+160,-18), c10(+160,-18).

## Kapılar ve ölçümler

- G1–G5/G8 ara kapısı birden çok turda 2/2 yeşil oldu; son iki D04 y ayrıştırmasından sonra yeniden koşulmadı. Son yeşil ölçümde: sıra korundu; max |Δx|=160, max |Δy|=140; spacing ihlali 0; span ≥%90; segment farkı ≤2; hazard hit=0. Son disk durumunun tekrar doğrulanması gerekiyor.
- G6: D03 40/40 yeşil. Yeni D01 satırı son koşuda 40/40 yeşil. D02 son koşu 39/40 idi (c20); ardından c20 kararlı x'e taşındı, tekrar koşulmadı. D04 son koşu 35/40 idi; ardından c05/c08/c09/c10/c34 y düzeltmeleri yapıldı, tekrar koşulmadı. D05 son koşu 35/40 idi; ardından c15–c18/c26 düzeltildi, tekrar koşulmadı. D06 son koşu 38/40 idi; ardından c07/c10 kararlı x'e taşındı, tekrar koşulmadı.
- G7: D01 15/15 (rapor), D02 15/15 (rapor), D03 13/15 **kırmızı**, D04 14/15 **kırmızı**. D05 ve mevcut D06 G7 satırları stop kapısından sonra koşulmadı.
- Negatif kontrol: C1 yerleşimi G2/G3/G4/G5'te kırmızı kalıyor; G3 yeni tanımla da çok sayıda ihlal üretti.

Koşulan komutlar: `tn-a4 -g coin-layout` (çeşitli ara turlar; 2/2 yeşil görüldü), `tn-a3 -g d03-all-40` (son 1/1 yeşil, 40/40), `tn-a3 -g d05-clean-chain-40` (ara sonuçlar 39,31,32,35,36,35/40), `tn-a3 -g d06-all-40` (ara sonuçlar 38,39,38/40), `tn-a4 -g d-all-40` (son toplu: D01 40, D02 39, D04 35), `tn-a4 -g d-skill-line` (2 geçti, 2 kaldı: D03/D04 kırmızı). `parkour-tur1` ve `tn-a12` **KOŞULMADI**.

Dokunulan dosyalar: `js/a12-campaign.js`, `03-test/tn-a3.spec.cjs`, `03-test/tn-a4.spec.cjs`, bu rapor; proje kuralı gereği `graphify update .` ayrıca `graphify-out/` türetilmiş indekslerini yeniledi. Mevcut satır değişiklikleri: `a12-campaign.js:247` D06'ya `adjustCoins` bağlandı; `a12-campaign.js:317-326` rota coin düzeltmeleri; `tn-a3.spec.cjs:15` yalnız izinli K1 girdi geri alması; `tn-a3.spec.cjs:31,33` yalnız tanı log/trace ekleri; `tn-a4.spec.cjs:1433-1465` yalnız izinli K2 G3 tanımı/assert'i. Yeni kabul satırları yalnız `tn-a4.spec.cjs:1486-1525`.

SHA-256: `js/a12-campaign.js` `4D38BB488A4DE1E8516E3641D07F1206BD222EB26959C9DF96057C1B6B06BF4E`; `03-test/tn-a3.spec.cjs` `2F9DB1A2CF6A3365F1CFB290BAFF2581036A57714CFE28C2B931E7485900A83B`; `03-test/tn-a4.spec.cjs` `CFD57CEDFCC9ED8DEC54A422308E5BBDF736B88DA4E9D48BAA6F375A267CE069`.

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

A4b-2a 2026-09-28T02:31:22.218088: ön kapı 14 PASS/1 skip + statik PASS125. pre-a4b2 yedek/SHA yazıldı. Manifest dört rota N14, CJ/CC/CS>=1 sabit. M01/M02 ilk geometri/girdi/coin adayı; dinamik ölçüm sırada.

A4b-2a 2026-09-28T02:37:07.156175: M01 S2x14/14,64.25s,hash473c1aa0; M02 S2x14/14,63.9167s,hash1ba9b3be; ölüm0. W0/0 kapsam .9732/.9748. Statik 3/3 PASS (125 D/F+28M). Görünürlük ve negatif kontroller sırada. Regresyon ölçümleri eski T2/T1 kanıtlarını ezmemek için ayrı tam kaynak kopyasında koşulacak.

A4b-2a 2026-09-28T02:44:30.108662: M01/M02 dinamik ve statik kapılar PASS; M02 taşıyıcı görünürlük düzeltmesi PASS. 8 negatif satır FAIL (beklenen); görünürlük son fixture ile ayrıca negatif FAIL. Regresyon: core43 PASS/5 FAIL (tn-a12 eski fiyat/coin ve girdi koşuları), frozen12 PASS/6 skip/1 FAIL rollDrop; world11 PASS; magma sürüyor. Aynı hataların başlangıç yedeğinde kontrolü sürüyor. D/F geometri/COINS/girdiler, index/BotS ve fizik fonksiyonları karşılaştırması PASS. Önceki PROGRESS dosya satırından bu satıra 5 dakika sınırı aşıldı; ara kullanıcı yorumları kayıp dosya güncellemesinin yerine PASS sayılmıyor. Hedef900sn aşıldı; 1500sn üst sınır korunacak.

A4b-2a 2026-09-28T02:48:41.068151: başlangıç tn-a12 aynı5 FAIL/12 PASS. Yeni magma-registry-purchase regresyonu yalnız MAGMA satın alma dalında düzeltildi: satın alma mevcut koşuyu korur; sahip olunan dünyayı ayrıca seçmek geçişi sıraya alır. Son ürün SHA 5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39. Etkilenen magma/world/statik son ölçüm sürüyor; frozen baseline bitişi bekleniyor. Genel kabul DUR.

A4b-2a 2026-09-28T02:50:36.485039: KAPANIŞ. Son SHA 5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39. Tüm koşular bitti. Rapor TN-A4-REPORT.md üst bloğu; raw release-magma/world/static ve baseline-a12/frozen logları. Tam regresyon/commit/ağ/kurulum yok.


## A4b-2b 2026-09-28T02:52:38.505675
?nceden test listesi/b?t?e: 0?180sn ba?lang?? SHA/yedek/kaynak; 180?480sn M03/M04 geometri/girdi/14 coin ve G1/G2/G3/G5/G7; 480?750sn d?rt rota ger?ek20faz hazard, mekanik, M03 kapal? kap? yan yolu, M04 g?r?n?rl?k, M03/M04 tema/kare; 750?900sn regresyon ucu ba?latma/rapor. Hedef900sn; ?st s?n?r1500sn, son ye?il kap?da DUR. Regresyon yaln?z parkour-tur1,tn-a12,t1b-bot-s,tn-a4 frozen/magma/world,t2 statik. Alt? eski k?rm?z? kullan?c? taraf?ndan kapsam d??? kabul edildi. Tam regresyon/a?/kurulum/yay?n yok.
Kan?t: E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2b-20260928-025238
Ba?lang?? a12 SHA: 5307cc529823cfaaa94cea35bc58c4be170aeb49e5b5b068e1780bfe554c2b39

A4b-2b 2026-09-28T02:55:33.777271: M03/M04 aday yazildi. Ilk olcum COINS ekleme yer isareti hatasi nedeniyle yuklenemedi; test encoding ve COINS hedefi duzeltildi; dinamik olcum yeniden.

A4b-2b 2026-09-28T03:00:10.087783: G2 iki rota14/14 x2/death0/hash esit; W0 kapsam>.974; statik5/5. M03 kapali kapi bypass CLOSED/push0/bottom238<door275 (beklemeyle73.47s). M04 cift rampa tetigi yalniz yeni rampa w220 ile duzeltildi. Hazard4x20 gercek faz PASS; kaynak eslesmesi ve dinamik state cesitliligi kontrol edildi. Tema/kare ve final regresyon sirada.

A4b-2b 2026-09-28T03:03:35.150001: Urun SHA e6183321c210cf678e4ccd0f177159f39b2ae9676712e55a0cd4f982b6e46275. M03 tema4/4 kare PASS; M04 mobil kamera yerlesimi beklemesi850ms duzeltildi (esik degismedi). Core regresyon ve frozen odak izole kaynakta suruyor. Hazard20faz PASS; kasten kirmizi sentetik rampa ayni overlap hesap yoluna baglandi.

A4b-2b 2026-09-28T03:06:06.307763: 11/11 yeni test kasten kirmizi goruldu (red-routes10 + red-hazard1). Korunum39/39 PASS; index/BotS/D-F/M01-M02/manifest/mevcut test prefixleri ayni. Yazim aracinin CRLF donusumu geri alindi: ortak fizik byte ayniligi PASS. Nihai a12 SHA8400376f...; regresyon ucu bu nihai byte tabaninda tekrar baslatiliyor. Tema8kare PASS, otomatik acilmadi.

A4b-2b 2026-09-28T03:10:02.822909: Nihai frozen12 PASS/6skip/1 eskiFAIL. Nihai magma yeni M bitisleri/temas ve kapali kapi PASS, son tema satirlari suruyor. Core izole kopyasinda4 ENOENT (coin-T1b1 eksik) bulundu; kaynak veriler kopyalandi ve t1b6 yeniden kosuluyor. Bu4 altyapi hatasi eski6 kumeye eklenmedi. Graphify AST update tamamlandi:1905nodes/3182edges,110zero-node ve etiket kaymasi uyari; medya acilmadi.

A4b-2b 2026-09-28T03:12:09.078959: Final world11/11, static5/5, t1b6/6. Core parkour25/25 ve tn-a12 ayni5 eskiFAIL; frozen ayni1 eskiFAIL. Magma27PASS/1skip/2FAIL goruldu: M04 baslangic RAF yarisi adaptorde manual onceye alinarak duzeltildi; yeni dort-rota mekanik denetimi sistem-turu kapsamina duzeltildi (M01 upper-exit istege bagli,temas0; kabul edilmis2a geometri/girdisine dokunulmadi). Tam magma odak son helper ile yeniden suruyor. UrunSHA8400376f degismedi.

A4b-2b 2026-09-28T03:14:52.711446: Son adaptorle M03/M04 tekrarhashleri esit; hazard oracle denetimi PASS. Assert audit123 reddetme/26konum,tumu beklenen hata. Son magma hazard/tema satirlari bitiyor; world11/statik5/t1b6/parkour25 PASS, eski tn-a12=5/frozen=1 disinda urun regresyonu beklenmiyor. Rapor diskten uretilmis taslak; son surec bitisiyle kapanacak.

A4b-2b 2026-09-28T03:15:41.469408: KAPANIS PASS (cagri kapsami). Nihai MAGMA29PASS+1emekli; world11PASS; statik5PASS; parkour25PASS; t1b6PASS; tn-a12 ayni5FAIL/frozen ayni1FAIL kullanici kapsam disi. 8PNG nihai kopyadan teslim edildi; PNG boyutlari/hash ve release/source SHA eslesmesi PASS. UrunSHA8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b. Rapor TN-A4-REPORT.md ust blogu, ham kanit E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4b2b-20260928-025238. Tum test surecleri bitti; tam regresyon/commit/ag/kurulum/yayin yok. Son graphify1920node/3195edge/133community;111zero-node uyarisi raporda. 2c kapilari acik.

## A4b-2c 2026-09-28T03:17:21.9807639+03:00
Test listesi/butce ONCEDEN: 0-180sn SHA/yedek/kaynak; 180-450sn zincir/G7/G4x12; 450-700sn mobil/benzerlik/ekonomi/tema/adlar; 700-900sn sinirli regresyon (parkour-tur1,tn-a12,t1b-bot-s,tn-a4 frozen/magma/world,t2-coins,t2-chief), rapor/snapshot. Ust sinir1500sn; eski6 kirmizi kapsam disi; tam regresyon yok. Baslangic a12 8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b. Kanit: E:/oyunlar/TrustMeBro/01-tasarim/coin-T2/a4b2c-20260928-031715

A4b-2c 2026-09-28T03:20:51.6805663+03:00: Yedek/SHA tamam. MAGMA onceki-rota kilidi/next/restore dort rotaya tamamlandi. D/F ve M geometrisi degismedi. Statik on olcum M-M min .3125, M-F min .35294. Zincir/G7/isim testleri ve 28 Bot S ekonomi kosusu suruyor; G4 12 hedef icin ayri cikti dizinleri hazirlanacak.

A4b-2c 2026-09-28T03:24:52.1675156+03:00: Zincir/G7 PASS; G4x12 PASS (12benzersiz,iz kesismesi0,pozitif12). Benzerlik14x14/adlar PASS. Ekonomi28 bitis olumsuz tamamlandi. Mobil CDP gercek touch ilk slide sonrasinda takiliyor; girdinin koordinat/faz tanisi suruyor. Regresyon core ve frozen kaynak kopyasinda suruyor.

A4b-2c 2026-09-28T03:31:44.8318374+03:00: UI kuyruklu MAGMA gecis/geri donus dalina dar duzeltme yapildi; zincir UI next ile PASS. Nihai a12 SHA31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6. Korunum29/29 PASS; yedi yeni testin kasten-kirmizi kosusu beklenenFAIL. Ilk regresyon magma36PASS+1skip/core44PASS+5eskiFAIL/frozen12PASS+6skip+1eskiFAIL/world11/statik7. Nihai SHA kopyasinda tum odaklar yeniden suruyor. Mobil gercekCDPtouch checkpoint5200/death0; yanlis parmak birakma test duzeltildi, urun girdisi ayni.

A4b-2c 2026-09-28T03:34:33.8148672+03:00: NIHAl SHA kapilari tamam: magma36PASS+1emekli; core44PASS+5eskiFAIL (parkour25/t1b6/chief1/a12kalan12); frozen12PASS+6emekli+1eskiFAIL; world11PASS; t2-coins7PASS. G4x12 nihaiSHA tekrar PASS; ekonomi28kosu/death0. Rapor A4b-2c blogu yazildi. Snapshot/sprites/SHA denetimi ve READY son adim olarak hazirlaniyor. Tam regresyon kosulmadi.

A4b-2c 2026-09-28T03:37:08.084100: KAPANIS PASS. Snapshot post-a4b-mirror/02-kod: 779 dosya/38 runtime sprite/16PNG SHA ve boyut dogrulamasi PASS; READY-post-a4b.txt yazildi. Tum baslatilan surecler sonlandi. Son graphify1957node/3232edge/131community;111zero-node uyarisi. Ana oturum tam regresyonu READY tarifinde, burada kosulmadi. a12SHA31072738d514a4ceef9e31e86101151c81176ecf0b72c758a540c654a9ccb2a6.

## A4c-1 2026-09-28T03:39:39.6505369+03:00
Test/butce ONCEDEN: 0-240sn kaynak/yedek/envanter; 240-600sn Canvas tema ve olcumler; 600-900sn kabul/negatif kontroller; 900-1450sn sinirli regresyon/rapor. Ust sinir1500sn. tn-a4 aftermath/world/frozen/magma; parkour-tur1; t1b-bot-s; t2-coins statik. Tam regresyon YOK. Baslangic SHA31072738, indexFA5F956A dogrulandi. aftermath enabled=false price500 routes[]; aktif DOCK fallback. Kanit E:/oyunlar/TrustMeBro/01-tasarim/a4c1-20260928.

A4c-1 2026-09-28T03:44:12.0535349+03:00: Canvas tema + 10 yeni kapi yazildi. Ilk isik olcumu max goreli .00956 (<.15), negatif asiri modulasyon .27098;121es-faz;dekor30s+statikPASS. D/F/M kanitlari icin regresyon ayri kopyada.

### A4c-1 oge envanteri 2026-09-28T03:47:28.019433
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

### A4c-1 oge envanteri 2026-09-28T03:52:12.772130
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

A4c-1 2026-09-28T03:54:04.4518459+03:00: Ilk not-recolor sabit ROI sahte-yesil yakalandi; gercek zemin/engel ROI zorunlu yapildi. DrawWorld dispatch ekleme CRLF/LF nedeniyle uygulanmamis; dar AFTERMATH early-return ile duzeltildi. ROI listesi kaynak sirali ilk vault yerine kadrajdaki vault olarak duzeltildi. Esikler ayni. Onceki10/10 kabul kaniti DEGIL. Nihai SHA regresyon tekrar basladi; ilk regresyon core38/world11/magma37+1skip/frozen13+6skip+1eski rollDrop.

### A4c-1 oge envanteri 2026-09-28T03:54:04.630260
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

A4c-1 2026-09-28T03:59:49.3531900+03:00: Nihai urunSHA c33c4acf3df1f194ac489d615af19f2c61b3764bfda2f037964baedc30881177; AFTERMATH10/10,246negatif,24PNG boyut/hashPASS. Nihai core38/world11/magma37+1skip/frozen13+6skip+1kabul-edilmis-rollDropFAIL. Regresyon kopyasi urunSHA ayni; eski test prefix ve ek imza testi birebir (regression-provenance.json). Ana tn-a4 son fark yalniz AFTERMATH D03 kamera fiksturu; nihai tema verified.log. PowerShell wrapper exit1/native stderr ayrimini kesinlestirmek icin LASTEXITCODE ayri dosyada son tema kosusu.

A4c-1 2026-09-28T04:00:40.649914: KAPANIS PASS. Native exit0, AFTERMATH10/10, core38/world11/MAGMA37+1skip/FROZEN13+6skip+1eskiFAIL;23korunum;246negatif kontrol;24PNG hash/boyut. indexFA5F956A/BotS/D-F-M ayni. a12 c33c4acf3df1f194ac489d615af19f2c61b3764bfda2f037964baedc30881177. Rapor+envanter+nihaiSHA diskten dogrulandi. Askida surec yok; tam regresyon/commit/ag/kurulum/AI gorsel yok.

## A4c-2a 2026-09-28T04:02:52.354576
Ba?lang?? SHA do?ruland?; yedek: E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4c2a-20260928\pre
B?t?e: haz?rl?k/manifest 180 s; geometri/adapt?r 240 s; A dinamik/statik/mekanik/tema 300 s; regresyon ucu 600 s; rapor 120 s. Hedef 900 s, sert s?n?r 1500 s. Kap?lar: A01/A02 S x2, W, G3/G5/G7, collapse/alt yol, worker determinismi, ta??y?c? temas/MAD, tema; parkour-tur1, tn-a12, t1b-bot-s, frozen/magma/world/aftermath, statik ve t2-chief. Tam regresyon yok.

A4c-2a 2026-09-28T04:10:34.901136: manifest fixed 14/route; A01 S x2 65.3167s hash 94a9561f; A02 65.10s hash ded0ad92; 14/14, deaths0. W coverage .973665/.974291, coins0. Static7/7. Worker deterministic and warned; collapse positive/lower path pass; source negative mutation corrected to replaceAll. Regression running in isolated mirror. Progress-file interval exceeded 5 minutes during implementation; commentary updates supplied.

A4c-2a 2026-09-28T04:15:08.081992: A paketi 8/8; negatif dinamik 5/5 beklenen FAIL, statik 2/2 beklenen FAIL; korunum35/35. Nihai a12 731ebff96e08dd3ef3ff32c29caf3114f8dfbaef47ae312dca6e9dbbca9f4ede. Son regresyon s?r?yor. Graphify AST g?ncellendi; 113 dosya s?f?r d???m, 37 topluluk ad? hub ile yenilendi (semantik ?a?r? yok).

A4c-2a 2026-09-28T04:19:30.883167: nihai core44PASS+5 kabul edilmi? eski FAIL; frozen13PASS+6SKIP+1 eskiFAIL; magma37PASS+1SKIP; world11PASS. Son AFTERMATH18 test s?r?yor. Eski MAGMA kan?tlar?ndaki9 e?zamanl? de?i?im kaydedildi; ilk8 bizim MAGMA ko?umuz ba?lamadan ?nce, yazan s?re? kesin de?il; geri yaz?lmad?.

A4c-2a 2026-09-28T04:22:18.900818: PASS. Nihai AFTERMATH18/18 rc0; MAGMA37+1emekli; world11; statik7; core44+5eskiFAIL; frozen13+6skip+1eskiFAIL; t2-chief PASS. Rapor: E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\a4c2a-20260928\REPORT-A4c2a.md. a12 731ebff96e08dd3ef3ff32c29caf3114f8dfbaef47ae312dca6e9dbbca9f4ede. 8kare otomatik a??lmad?.

## A4c-2b 2026-09-28T04:24:49.6548214+03:00
Baseline 731ebff9 / index fa5f956a verified; backup a4c2b-20260928/pre. Budget: setup180s, routes+chief240s, dynamic/mechanics/hazard/theme360s, focused regression540s, report120s; hard limit1500s. Tests: A03/A04 Sx2 W G3/G5/G7; chief approach/catch/checkpoint/closed-door/pause; A04 mechanics/visible; A01-A04 ramp20 phases; theme; parkour-tur1 tn-a12 t1b-bot-s frozen magma world aftermath t2-coins t2-chief D06 chief. No full regression. Prior MAGMA evidence modification explained by user's snapshot absolute output paths.

A4c-2b 2026-09-28T04:29:44.0238327+03:00: A03/A04 initial Sx2 14/14 deaths0 deterministic; corrected new door data to complete existing state machine fields. A04 final S64.95s hash323b9ded, W0 coverage.97478, 2 carrier MAD15.63+/contrast90; all mechanics and closed bypass PASS. A03 theme fixture unlock setup corrected (test only); chief scenarios and hazard next.

A4c-2b 2026-09-28T04:35:25.1582531+03:00: A03 final64.9667s/hash904e49c7, A04 64.95s/hash323b9ded, Sx2 14/14 deaths0. Chief chase17.7s, catch2.1833s return11900 distance601.15 recovery2.55s; closed door bypass/pausePASS. D06 baseline vs current full BotS/chief traces identical PASS. Static11/11, integrity47/47, theme8PNG PASS. Regression frozen13PASS+6skip+1acceptedFAIL; core/magma/aftermath ongoing. Graphify AST updated no paid calls.

A4c-2b 2026-09-28T04:40:44.9413691+03:00: T1b fixture literal chief hook incompatible with rewritten condition; retained original D06 condition and nested only A03 startX guard. D06 differential re-PASS full trace e9700f1f/chief856118c2;47/47 integrity. Registry exact expectation2->4 is stage update (no price/assert tolerance change). Final-source regression restarted. Hazard now exercises live collapse state changes, door phases and barrel positions; synthetic colliding landing produces actual FAIL. 25min hard stop remains.

A4c-2b 2026-09-28T04:43:59.1192777+03:00: final productSHA6a54e5d7 same in mirror. Integrity47/47, D06 differential0 deaths/equal trace, t2-chief and T1b segmented W completed without new errors. Final frozen13PASS+6skip+1accepted oldFAIL; pause1PASS. Remaining final packages completing; report drafted with all 4-field acceptance, negative evidence, full SHA list.

A4c-2b 2026-09-28T04:45:41.1323352+03:00: KAPANIS PASS. AFTERMATH28/28 rc0; statik11/11; integrity47/47; core55PASS+5accepted oldFAIL; frozen13PASS+6skip+1accepted oldFAIL; MAGMA36PASS+G4 retest1PASS=37PASS+1skip (missing old pilot input fixed in isolated mirror); world11PASS; pause1PASS; D06 old/new full traces identical; t2-chiefPASS; no new remaining regression. ProductSHA6a54e5d7742f63f550b2b32273da9045eababfdc98f191d869320909d33e14eb, indexfa5f956a. 8 final PNG copied from tested mirror and hash-checked, not opened. Full regression not run. Report REPORT-A4c2b.md, final-sha.json, raw logs and native rc retained.

## A4c-2c 2026-09-28T04:48:41.018267
Test budget: setup/flow 180s; economy/G4 180s; chain/mobile/similarity 120s; scoped regression/theme 600s; audit/report/snapshot 300s. Target 900s; hard stop 1500s. No full regression. Initial a12 SHA verified 6a54e5d7; all protected files backed up.

A4c-2c 2026-09-28T04:56:29.663957 ? chain/G7, mobile, UI transition, similarity passed; G4 twelve PASS; integrity52/52; current product4a85b9d7. Scoped regression running on isolated copy; final economy remeasurement begun after localization correction.

A4c-2c 2026-09-28T04:58:22.416840 FINAL: AFTERMATH34PASS, MAGMA37PASS+1skip, world12PASS, core55PASS+5accepted oldFAIL, frozen13PASS+6skip+1accepted oldFAIL, pause1PASS; new failures0. Integrity52/52. G4twelvePASS. Six new closing tests individually intentional-red rc1; final positive rc0. Economy36 final runs, inventory18 routes/237coins. Snapshot next; no full regression.

A4c-2c SNAPSHOT VERIFIED: post-a4c-mirror/02-kod; runtime and test source identical; only six *run-path.txt sidecars point inside snapshot. 38 runtime sprites. Snapshot static11/11 and G4 evidence2/2 PASS. Full regression NOT run. READY-post-a4c.txt provides the main-session command and six accepted old failures.
