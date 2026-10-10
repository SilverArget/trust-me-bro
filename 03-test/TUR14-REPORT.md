# TUR14 — her şey açık test modu raporu

Tarih: 2026-10-10. Dal: `tur14-test-modu`. Taban: `e953200`. Push yapılmadı.

## Uygulama

- Uygulama commit'i: `48fabf6` (`Add web-only all-unlocked test mode`).
- `js/a12-campaign.js`
  - `TEST_MODE`, `testModeHostAllowed`, `isNativeRuntime`: `?test=hepsi` yalnız izinli web hostlarında etkinleşir.
  - `fullTestProfile`, `loadProfile`: gerçek profil okunup bellekte 6 koşucu, 9 kıyafet, 4 şef ve 4 dünya sahipliğiyle genişletilir.
  - `persist`: test modunda `PROFILE_KEY` yazımı yapmaz; yalnız bellek durumunu başarılı sayar.
  - `routeUnlocked`: test modunda mevcut 36 rotanın tamamını açar.
  - `installUI`, `renderShop`, `purchaseOrSelectWorld`: `TEST MODU` etiketi, `SEÇ/SEÇİLİ` eylemleri ve dünyaya göre 36 rota düğmesi eklenir; rota düğmesi seçilen rotayı doğrudan başlatır.
  - Mağaza tıklamasında eylem niyeti yeniden çizimden önce yakalandı ve aynı öğe üzerinde yinelenen `pointerover` çizimleri engellendi.
- `03-test/tur14-test-mode.spec.cjs`: gerçek click/tap ile tüm sahiplik seçenekleri, dünya rota sınırları, host/native kapıları, etiket çakışması ve kayıt izolasyonu.
- Fiyatlar, normal ekonomi, çizimler, şef/rota/kamera verisi ve `outfitLocked` değerleri değiştirilmedi.

## Açılış ve kapsam

- Etkin: <code>https://silver&#97;rget.github.io/trust-me-bro/?test=hepsi</code>, `http://localhost/.../?test=hepsi`, `http://127.0.0.1/.../?test=hepsi`.
- Devre dışı: parametresiz URL, Capacitor yerel çalışma zamanı ve Playgama host/paketi.
- Etiket ile duraklat, ses, ID, joystick ve zıplama kontrolleri arasındaki kesişim iki 915×412 görünümünde `0 px²`.

## Kayıt ve cüzdan ölçümü

Kontrollü gerçek-profil örneği `localStorage[trust_me_bro_campaign_profile_v1]` içine 618 UTF-8 bayt olarak kondu. Test modu öncesi/sonrası ham dize `===` ile birebir aynı kaldı. Test modunda tüm seçimler ve sekiz rota başlangıcından sonra cüzdan `321 → 321` oldu. Parametresiz yeniden açılışta normal sahiplikler aynen geri geldi: koşucu `2`, kıyafet `1`, şef `1`, dünya `1`; cüzdan yine `321`.

## Test matrisi

| Alan | 915×412 masaüstü | Android taklidi 915×412 |
|---|---|---|
| Kıyafetler (9; erkek + kadın) | PASS | PASS |
| Karakterler (6) | PASS | PASS |
| Şefler (4) | PASS | PASS |
| Dünyalar sekmesi (4) | PASS | PASS |
| Rıhtım 31 — 18 rota; D01/D18 başlatma | PASS | PASS |
| Donmuş — 6 rota; F01/F06 başlatma | PASS | PASS |
| Magma Diyarı — 6 rota; M01/M06 başlatma | PASS | PASS |
| Sonrası — 6 rota; A01/A06 başlatma | PASS | PASS |

Ek kapılar iki görünümde de PASS: GitHub Pages hostu etkin; `localhost` ve `127.0.0.1` etkin; parametresiz, Capacitor ve Playgama devre dışı. Toplam 36 rota düğmesinin dünya başına sayısı doğrulandı.

Komutlar:

```text
npx playwright test 03-test/tur14-test-mode.spec.cjs --reporter=line --workers=1
TUR14_VIEW=android npx playwright test 03-test/tur14-test-mode.spec.cjs --config=03-test/tur13-mobile.config.cjs --reporter=line --workers=1
```

Her iki koşu: `2 passed`. `node --check` ve `git diff --check`: PASS.

## Kanıt

- Klasör: `E:/oyunlar/TrustMeBro-wt/tur14/03-test/manager-preview/tur14/`
- `desktop/` ve `android/` altında dört sekme + dört dünya olmak üzere toplam 16 PNG vardır; `.gitignore` nedeniyle git'e girmez.
- `view_image` ile masaüstü ve Android sekme/dünya kareleri incelendi. Etiket okunur, dünya rota menüleri tam ve kontrol çakışması görünmüyor.

**ASSERT CHANGE:** Mevcut test assert'i değiştirilmedi; TUR14 için yeni bağımsız kabul/regresyon spec'i eklendi.
