# TN A1+A2 Uygulama ve Kabul Raporu

## Mimari karar

Legacy v36 motoru ve hareket regresyon yüzeyi `index.html` içinde korunmuştur. Yeni kampanya `js/a12-campaign.js` içinde ayrı, stateless Canvas2D çizim katmanı + registry/profile/economy sorumlulukları olarak kurulmuştur. Gerekçe: çalışan vault/slide/wallRun/roll testlerini bozmadan legacy stamp ekonomisini yeni cüzdandan fiziksel olarak ayırmak ve sonraki 18 rota/dünya genişlemesine veri tabanlı sınır sağlamak.

## Değişen / eklenen dosyalar

- `index.html` — yerel kampanya modülü yükleme satırı.
- `js/a12-campaign.js` — RouteRegistry (D01/D02), profil/migration, ekonomi, kampanya fizik/çizim, mağaza, i18n, debug sözleşmesi.
- `03-test/tn-a12.spec.cjs` — 13 isimli kabul sahnesi + D01/D02 tam gerçek-input koşuları (15 test).
- `03-test/TN-A1-BAGLANTI-HARITASI.md` — legacy/yeni ekonomi bağlantı haritası.
- `03-test/TN-A12-PROGRESS.md` — kesinti dayanıklı ilerleme günlüğü.
- `03-test/TN-A12-REPORT.md` — bu rapor.

## İzlenebilir kabul matrisi

| Madde | Uygulama | Durum | Test | Kanıt |
|---|---|---|---|---|
| Legacy movement korunumu | mevcut `index.html` motoru | IMPLEMENTED | PASSED | Final kısa regresyon 28/28 (parkour 25 + readiness 3) |
| v36 migration + envelope + idempotency | `migrateV36`, `normalizeProfile` | IMPLEMENTED | PASSED | `save-migration-v36` |
| Bozuk/eksik kayıt + save rollback | normalize/default, `persist`, purchase rollback | IMPLEMENTED | PASSED | `save-failure-recovery` |
| İki runner / aynı hitbox | `RUNNERS`, `drawRunner`, `selectRunner` | PARTIAL (kod-piksel placeholder) | PASSED | `onboarding`, `runner-switch` |
| D01 + 40 coin + rampa/front flip | `ROUTES.D01`, `updateIntegrated` | IMPLEMENTED | PASSED | `ramp-frontflip-safe-landing`, D01 tam koşu |
| D02 + işçi/varil/üst beceri coin hattı | `ROUTES.D02`, barrel controller | IMPLEMENTED | PASSED | `worker-barrel-warning`, D02 tam koşu 31.5 s |
| Coin ekonomi ayrımı/idempotent banka | `freshRun`, `collectPhysical`, `bankRun` | IMPLEMENTED | PASSED | `checkpoint-retry-coins`, `reward-budget-first-and-repeat` (85/65; tekrar finish ödeme yok) |
| Checkpoint, ~0.8 s dönüş, 2 s koruma | `failToCheckpoint`, `retry` | IMPLEMENTED | PARTIAL TEST | Ledger/retry PASSED; gerçek düşüş/ezilme sahnesi NOT_TESTED |
| Flow instanceId/spam koruması | `flowSeen`, `addFlow` | IMPLEMENTED | PASSED | Ödül bütçesi ve front flip olay kanıtı |
| Dock Crew 120, canlı preview, çift dokunma | `OUTFITS`, `purchaseOrWear`, `drawShopPreview` | PARTIAL (görsel placeholder) | PASSED | `purchase-double-tap`, `shop-preview-without-purchase` |
| Sonuç kartı + NEXT/RETRY/SHOP | `drawResult`, `a12Actions`, `syncActionVisibility` | IMPLEMENTED | PASSED | Koşuda gizli; sonuçta görünür; üç eylem gerçek tıklamayla doğrulandı |
| EN/TR/RU | `I18N`, `t`, `applyLanguage` | IMPLEMENTED (A2 metinleri) | PASSED | HUD + yardım + sonuç + mağaza; eşit anahtar kümeleri |
| Mobil joystick + tek aksiyon/multitouch | DOM input bağı | IMPLEMENTED | PASSED (emülasyon) | `mobile-multitouch`; gerçek cihaz NOT_TESTED |
| Platform cloud yeni profil kaydı | local profile + legacy adapter korunumu | PARTIAL | NOT_TESTED | Yeni profil localStorage kullanır; cihazlar arası cloud iddiası yok |

## Test komutları

```text
NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test --workers=1 03-test/readiness.spec.cjs 03-test/parkour-tur1.spec.cjs
# Başlangıç: 28/28 PASSED (15.5 s); RED düzeltmesi sonrası final tekrar: 28/28 PASSED (14.3 s)

## RED doğrulaması sonrası mimari düzeltme
- Karar: ayrı overlay oyununu kaldırıp `index.html` IIFE içinden dar bir `__installCampaignEngine` API açmak. Gerekçe: ekonomi/UI modülü ayrı kalırken player, input, parkour state machine, collider ve atlas renderer tek sahipte kalır.
- RED-1: **IMPLEMENTED / PASSED** — aktif kampanya `loop → updateDispatch → doPhysics → playerGameState`; D01/D02 gerçek girdide vault+slide, D02 wallRun gözlendi. Legacy rage update/draw kampanya dispatch'inde çağrılmaz.
- RED-2: **IMPLEMENTED / PASSED** — frontFlip launch→tuck(4 zaman karesi)→open→land; tüm figür rotasyonu yok; 32×48 hitbox değişmez. `flat-rotate` pozitif kontrolü kırmızı verdi.
- RED-3: **IMPLEMENTED / PASSED (görsel kalite PARTIAL)** — ana runner ve shop preview mevcut `sprites/courier*.png` / `picker*.png` atlas renderer'ından çizilir; Dock Crew atlas üstü şekil katmanıdır. Final kadın/Dock Crew üretim atlası hâlâ PLACEHOLDER/PARTIAL.
- K-TN-05: **IMPLEMENTED / PASSED** — yükseklik 130 px, rise 42 px (önce 30); fixture süre/geometri regresyonları 30/60/120 Hz yeşil.
- Kanıt: `03-test/tn-a12.spec.cjs` 13/13; `03-test/parkour-tur1.spec.cjs` + `readiness.spec.cjs` 28/28.

## RED-4 release boot düzeltmesi
- **IMPLEMENTED / PASSED** — hash'siz temiz boot iki runner seçimini açar; gerçek tıklama D01'i başlatır; reload seçimi yeniden sormadan kampanyayı sürdürür.
- **IMPLEMENTED / PASSED** — hash'siz v36 boot yeni profile migrate olur, `legacyProgress.envelope` korunur ve legacy 31×2 akışına girmez.
- **IMPLEMENTED / PASSED** — `__TMB_A12__` release'te yoktur; kabul DOM `data-*` durumu ve yeni profil anahtarıyla ölçülür.
- **IMPLEMENTED** — çağrılmayan eski `updateCampaign` silindi; tek hareket sahibi `doPhysics` + `updateIntegrated` kaldı.
- Pozitif kontrol: kampanya init'ini geçici `DEBUG` koşuluna bağlama `release-boot` testini kırmızı yaptı; değişiklik geri alındı.
- Final kanıt: `tn-a12.spec.cjs` 15/15 + parkour/readiness 28/28 = **43/43 PASSED (2.0 dk)**.

## RED-5/6/7 doğrulaması
- RED-5 **IMPLEMENTED / PASSED**: `syncActionVisibility` ve `[hidden]{display:none!important}`; koşuda gizli, sonuçta görünür. NEXT/RETRY/SHOP gerçek DOM tıklamasıyla doğrulandı.
- RED-6 **IMPLEMENTED / PASSED (görsel QA: ekran kanıtı)**: legacy Dock 31 backdrop + metal renderer yeniden kullanıldı; oynanış geometrisi liman nesneleriyle giydirildi. Backdrop cache scope `dock31|routeId|routeVersion|dpr`.
- RED-7 **IMPLEMENTED / PASSED**: görünür A2 metinleri EN/TR/RU sözlüğünden; anahtar kümeleri birebir eşit, boş değer yok.
- Release onboarding **PASSED**: test `addInitScript` ile depolamayı ilk navigation'dan önce temizler; iki runner seçimi görünür ve gerçek tıklama D01'i başlatır.
- Kanıt: `tn-a12.spec.cjs` **17/17 PASSED**; parkour/readiness **28/28 PASSED**; `03-test/tn-a12-shots/` 15 hash'siz PNG.

NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test --workers=1 03-test/tn-a12.spec.cjs
# Final ilgili suite: 13/13 PASSED (1.7 dk)
```

Kanıt yolları: `03-test/tn-a12.spec.cjs`, `03-test/TN-A12-PROGRESS.md`, Playwright `test-results/` (yalnız başarısız ara turların hata bağlamları; final tur yeşil).

## Açık sınırlar

- Runner ve Dock Crew üretim kalitesinde sprite atlası değil, brief'in A2 için izin verdiği kod-piksel placeholder'dır.
- Gerçek mobil cihaz, platform cloud ve görsel gözle QA yapılmadı; otomatik medya açılmadı.
- Legacy rage testleri silinmedi. Yeni kampanyada 31×2 segment/rage beklentili testler arşiv adayıdır ve tam regresyon ana oturuma bırakılmıştır.
