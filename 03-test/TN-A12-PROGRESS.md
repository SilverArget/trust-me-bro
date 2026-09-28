# TN A1+A2 İlerleme Günlüğü

## 2026-09-25 — Başlangıç / A1.1

- Brief ve `TrustMeBro_TEK_NIHAI_GOREV.txt` (898 satır) tamamen okundu.
- Başlangıç çalışma ağacı temizdi (`git status --short`: çıktı yok).
- Mevcut `graphify-out/graph.json` üzerinden movement/fixture/test bağları sorgulandı.
- Kısa regresyon: `readiness.spec.cjs` + `parkour-tur1.spec.cjs`.
- Sonuç: **PASSED — 28/28**, süre 15.5 s. Komut:
  `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test --workers=1 03-test/readiness.spec.cjs 03-test/parkour-tur1.spec.cjs`
- Tam regresyon koşulmadı (brief gereği ana oturuma bırakıldı).
- Yeni kampanyada anlamsızlaşacak legacy rage testleri silinmeyecek; arşiv adayı: `trap-fairness-v71/v72/v73`, `validate-186`, `fan-denetimi`, `chief*`, `difficulty-ramp`, `vc7-tur2*` ve 31×2/186 segment beklentili rapor/testler.

## 2026-09-25 — A1.2 Veri sınırı ve migration

- `js/a12-campaign.js` içinde yeni profil şeması, legacy envelope, v36 doğrulama/migration ve normalize/kurtarma yolu eklendi.
- Eski clearance stamp `coins` ile `walletBalance/runCoins` arasında kod bağı kurulmadı.
- `03-test/TN-A1-BAGLANTI-HARITASI.md` oluşturuldu; güncel semboller ve ayrım sınırları kaydedildi.
- `save-migration-v36`, bozuk/eksik alan defaultları, tekrar migration ve `save-failure-recovery` kabul testlerine alındı.
- Sonuç (yeni suite tam turunun ilgili satırları): **PASSED**.

## 2026-09-25 — A2 D01/D02 oynanış örneği

- Ayrı yerel Canvas2D kampanya katmanı; iki runner; D01/D02 registry; 40'ar coin; rampa/front flip; işçi/telegraph/varil sınırı; checkpoint/retry; flow; idempotent banka; Dock Crew mağaza/önizleme; sonuç kartı; EN/TR/RU sözlüğü eklendi.
- İlk entegrasyon turu: 10/13 PASSED; rampa, worker bekleme ve mobil selector sorunları bulundu. Rampa hacmi, telegraph ölçümü ve joystick input bağı düzeltildi.
- Hedefli tekrar: `ramp-frontflip-safe-landing` **PASSED 1/1 (18.9 s)**; `mobile-multitouch` **PASSED 1/1 (3.0 s)**.
- Son tam ilgili suite: `tn-a12.spec.cjs` **PASSED 13/13 (1.7 dk)**. D01 **31.8 s**, D02 **31.5 s**, gerçek klavye girdisiyle başlangıçtan bitişe tamamlandı.
- Görsel runner/Dock Crew çizimleri işlevsel kod-piksel placeholder'dır; final asset değildir (**PARTIAL/PLACEHOLDER**).

## 2026-09-25 — Son yeşil nokta

- Final kısa regresyon tekrarlandı: `readiness.spec.cjs` + `parkour-tur1.spec.cjs` **PASSED 28/28 (14.1 s)**.

## 2026-09-25 — RED-1/2/3 düzeltme turu
- Kampanya ikinci canvas/RAF hattından çıkarıldı; `index.html` içindeki kontrollü `__installCampaignEngine` köprüsüyle tek `loop`, `doPhysics`, `playerGameState`, `drawCourier` hattına bağlandı.
- D01: gerçek vault + slide + rampa/frontFlip. D02: gerçek vault + slide + wallRun + işçi/varil.
- `PK_WALL_HEIGHT=130` korundu; `PK_WALL_RISE` 30→42. Kampanya wall assist aynı parkour state/timer/geometry yolunu kullanıyor.
- Runner ve mağaza önizlemesi mevcut courier PNG atlas renderer'ına taşındı; frontFlip tüm figür rotate etmez, tuck katmanı/fazı kullanır; hitbox 32×48 kalır.
- Legacy rage update/draw aktif kampanya sırasında dispatch edilmez; ikinci `a12Canvas` yoktur.
- `tn-a12.spec.cjs`: **PASSED 13/13 (1.6 dk)**. D01 26.7 s, D02 33.0 s gerçek klavye girdisiyle bitti.
- FrontFlip pozitif kontrol: `renderMode='flat-rotate'` geçici mutasyonunda test beklenen şekilde **FAILED**; geri alındı ve final test yeşil.
- Kısa regresyon ilk tekrar 24/28 FAILED (kampanya repeat-key listener çakışması); düzeltme sonrası **PASSED 28/28 (14.3 s)**.
- Yeni A1+A2 suite **PASSED 13/13 (1.7 dk)**; toplam ilgili final kanıtı 41/41 yeşil.
- Tam regression seti brief gereği koşulmadı. Commit/push/yayın yapılmadı.

## 2026-09-25 — RED-4 release boot düzeltme turu
- Hash'siz boot debug `__tmb` yüzeyinden ayrıldı: ana motor boot tamamlanınca `tmb-engine-ready` olayı yayıyor; kampanya üretimde bu olaydan kuruluyor.
- Debug global'i olmayan release sinyalleri eklendi: `body[data-game-mode][data-campaign-phase][data-route-id]`; `__TMB_A12__` yalnız `#debug` altında kalıyor.
- Temiz açılışta iki runner, gerçek tıklama, D01 ve reload devamı; v36 açılışta D01 + `legacyProgress` migration test edildi.
- Çağrılmayan eski `updateCampaign` özel fizik fonksiyonu silindi.
- Pozitif kontrol: `init()` geçici `DEBUG` koşuluna bağlandığında `release-boot` **FAILED** (`gameMode` undefined); mutasyon geri alındı.
- Final ilgili koşum: `tn-a12` + readiness + parkour **PASSED 43/43 (2.0 dk)**. Tam regresyon koşulmadı; commit/push/yayın yapılmadı.

## 2026-09-25 — RED-5/6/7 UI, Dock renderer ve i18n
- Sonuç eylemleri CSS `[hidden]` ile koşu sırasında kapatıldı; NEXT→D02, RETRY→aynı rota/yeni attempt, SHOP→mağaza gerçek tıklamayla **PASSED**.
- Kampanya legacy `drawBackdrop` ve `drawMetal` renderer'larını dar engine API ile yeniden kullanıyor. Cache scope: `worldId|routeId|routeVersion|dpr`; konteyner/vinç katmanı, palet vault, kiriş slide, ok/kenar/glow rampa, ayrı işçi-varil ve damga stili coin eklendi.
- Yardım, sonuç ve mağaza metinleri EN/TR/RU sözlüğüne alındı; anahtar kümeleri eşit ve boş anahtar yok. Dil değişimi HUD/yardım/sonuç/mağazayı canlı yeniliyor.
- `tn-a12.spec.cjs`: **PASSED 17/17 (1.6 dk)**. Kısa movement/readiness regresyonu: **PASSED 28/28 (14.3 s)**.
- Hash'siz, gerçek runner tıklaması + klavye ile 1080x540, 844x390, 390x844 kanıtları: `03-test/tn-a12-shots/` (**15 PNG**). Medya otomatik açılmadı.
- Temiz boot testi depolamayı `addInitScript` ile navigation öncesi temizler; `pagehide` eski profili geri yazamaz. Runner seçimi 2 görünür seçenek olarak **PASSED**.
