# VC7 TUR 1 RAPORU

Kaynak taban: `88287f7`. Ölçüm girdileri: `VC7-TUR1-MEASUREMENTS.json` ve `TRAP-FAIRNESS-v72.json`. Genel sonuç: **PASS**.

| id | eşik (brief'teki metin birebir) | ölçülen değer | örneklem | girdi kaynağı | PASS/FAIL |
|---|---|---|---|---|---|
| A1-1 | Her pad için (28/28, tüm sektör/part) uyarı başlangıcı → temas süresi ≥ 600 ms, en hızlı koşuda ölçülür. Örneklem: 28 pad × 1 koşu, girdi = gerçek oyun (sentetik fonksiyon çağrısı DEĞİL). Assert mesajındaki her sayı ölçülmüş değişkenden gelir. | min 600,000 ms; maks 616,667 ms; 28/28 | 28 pad × 1 koşu | Chromium, gerçek `update()` 120 Hz; speedLevel=1, speedHold=2.2, vx=400; çarpışmasız ölçüm yaklaşım şeridi | PASS |
| A1-2 | Piksel assert: uyarı aktif kare ile aynı konumda uyarısız kare arasında pad bölgesinde fark > eşik (eşiği ve ölçülen değeri raporla). Tekdüze/boş kare → FAIL. | eşik: değişen piksel oranı > 0,01; ölçülen 0,326111; 5.400 piksel | 1 aynı-konum kare çifti | Canvas `getImageData`, pad bbox + uyarı bölgesi | PASS |
| A1-3 | Negatif kontrol: uyarı çizimi kapatılınca (test bayrağı) A1-2 FAIL verir — kanıtla. | çizim kapalı fark 0,000000; A1-2 eşiğini geçmedi | 1 aynı-konum kare çifti | `window.__tmbWarningDraw=false`, Canvas `getImageData` | PASS |
| A1-4 | Pad fiziği değişmedi: 28 pad için iniş X'i (mevcut `launchValidation.landingX`) önce/sonra birebir. | 28/28; `selectLaunchPads`, `launchVX`, `vy=-520`, `boostT`, `landingX` kaynak satırları tabana göre diff=0 | 28 pad | `git diff 88287f7 -- index.html`; `validateScene().launchPads` | PASS |
| A2-1 | Tetik → ilk ölümcül kare arası ≥ 600 ms, iki part'ta ayrı ölçülür (örneklem 2 part × 5 koşu). | part 1: 666,667 ms (5/5); part 2: 666,667 ms (5/5) | 2 part × 5 koşu | Chromium, gerçek `update()` 120 Hz; oyuncu spike hitbox içinde | PASS |
| A2-2 | Telegraph evresinde dikenle temas ölüm üretmez (oyuncu bilerek içinde durdurulur). | 10/10 telegraphSafe=true; 0 ölüm | 2 part × 5 koşu | gerçek `update()`; oyuncu telegraph boyunca hitbox içinde | PASS |
| A2-3 | Piksel assert: telegraph karesi, tetik öncesi kareden zemin bölgesinde ayırt edilir; negatif kontrol: telegraph çizimi kapalıyken FAIL. | eşik: değişen piksel oranı > 0,01; pozitif 0,069565; negatif 0,000000; 4.830 piksel | 1 pozitif + 1 negatif aynı-durum kare çifti | Canvas `getImageData`; `window.__tmbWarningDraw` | PASS |
| A2-4 | Geçilebilirlik: mevcut kanıtlı parkour planıyla bilen bot iki part'ı 5/5 geçer (pozitif kontrol; yeni bot YAZMA — `trap-fairness-v71.spec.cjs` içindeki kanıtlı plan kullanılır). | 13.1: 5/5; 13.2: 5/5 | 2 part × 5 koşu | mevcut `parkour-bot.spec.cjs` + `parkour-plans.json`, v72 koşumu | PASS |
| A3-1 | 51 ölümcül satırın her birinde başarılı aralık listesi dolu VEYA satır "ARAÇ YETERSİZ" kovasında (gerekçeyle) — null yasak. | 51/51: 12 satır dolu aralık listesi; 39 satır gerekçeli `ARAC YETERSIZ`; null=0 | 51 satır × 41 gecikme × 3 koşu | gerçek `update()`; 0–1000 ms, 25 ms adım | PASS |
| A3-2 | Satırdan satıra birebir sabit çıkan değer ŞÜPHELİ etiketi alır. | yinelenen imzaya sahip 43/51 satır `SUPHELI`; diğer 8 satır benzersiz | 51 ölümcül satır | `TRAP-FAIRNESS-v72.json` aralık imzası gruplaması | PASS |
| A3-3 | Çıktı: `03-test/TRAP-FAIRNESS-v72.{json,md}`; İş 1 ve İş 2'nin yeni uyarı ölçümleri de bu tabloda (pad satırları eklenir). | iki çıktı üretildi; JSON `vc7_warning_measurements` içerir; MD'de 28 pad satırı ve uyarı ms alanı var | 62 tuzak satırı + 28 pad satırı | v72 Playwright ölçüm koşumu | PASS |

## Kilit diff

| Kilit | Önce | Sonra | Diff |
|---|---|---|---:|
| `warnScale` | aynı fonksiyon | aynı fonksiyon | 0 |
| `WARNING_MIN_ABS` | `.67` | `.67` | 0 |
| `WARNING_SCALE_END` | `.70` | `.70` | 0 |
| rage (`RAGE_POOL`, `RAGE_PARTS`, seçim/güncelleme) | taban kaynak | aynı kaynak | 0 |
| `ROUTE_PARTS` | `2` | `2` | 0 |
| `PART_COUNT` | `6` | `6` | 0 |
| `SCENE_COUNT` | `31` | `31` | 0 |
| `SAVE_KEY` | `trust_me_bro_last_delivery_v2_save` | aynı | 0 |
| `LEGACY_SAVE_KEY` | `trust_me_bro_last_delivery_v2_legacy_unused` | aynı | 0 |
| `CHIEF_RESPAWN_MS` | `820` | `820` | 0 |
| normal ölüm beklemesi | `deathDeadline=performance.now()+820` | aynı | 0 |

## FAIL / ARAÇ YETERSİZ

- FAIL: yok.
- ARAÇ YETERSİZ: 39 ölümcül satırda 0–1000 ms / 25 ms / n=3 taramada 3/3 başarılı gecikme aralığı üretilemedi; her satırın gerekçesi `TRAP-FAIRNESS-v72.json` içindeki `escape.reason` alanındadır. Bu kova A3-1 tarafından açıkça kabul edilir.

## Test sonuçları

- Odaklı VC7 testi: 1/1 PASS.
- trap-fairness-v72: 1/1 PASS.
- Tam set (`--workers=1`): **140/140 PASS** (`140 passed (5.2m)`).
- `validate-186`: **PASS**, `{"reports":186,"bad":0,"examples":[]}`.
