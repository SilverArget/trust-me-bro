# video-bulgu-1007 ozet

Baz: `5bdb306`. Dal: `video-bulgu-1007`. Tur 4 kapsami: D14/D15 audit flag duzeltmeleri, asili yapi karelerinin video kompozisyonuna gore yenilenmesi, D18 snapback olcumu ve tam matris karsilastirmasi.

## Route duzeltmeleri

| Bulgu | Degisim | Kok neden / karar | Kanit |
|---|---|---|---|
| D14 `d14-slide-01` | Runtime rotada `x=1144.56` -> `x=1050`, `baseY=231.375`; `d14-v-06` ustunde kenardan uzak. | Eski konum `d14-v-06` sag kenarina 17 px kalip basamak inisine biniyordu. | `audit-after.json`, `chiefPathStatus` 22/22 |
| D14 `d14-slide-02` | Runtime rotadan kaldirildi. | `d14-v-12` -> `d14-v-14` inis yayindan sonra slide icin guvenli duz bolge kalmiyordu. | `audit-after.json`, D14 0-retry chief kaydi |
| D15 `d15-slide-02` | Runtime rotada `x=1642.8` -> `x=1280`, `baseY=289.375`; `d15-v-07` ustunde kenardan uzak. | Eski konum `d15-v-07` sag kenarina 15 px kalip `d15-v-10` basamak inisine biniyordu. | `audit-after.json`, D15 0-retry chief kaydi |
| D04 asili sutun | `d04-v-06` icin `visualSupports += stack-to-ground`. | Videodaki `kare-000236` sag ust sari seritli koyu sutun, ust segment olarak `d04-v-06`; islevli ve oyuncu yolunu kesmeden desteklenebilir. | `d04-asili-000236-yanyana.png` |
| D11 havada kasa | Rota verisinde sahne `x~=1120`, kasa `d11-vault-06`, tasiyan platform `d11-v-02`; mevcut runtime destek `d11-v-02` ile dogru yere kare alindi. | Kasa islevli vault; kaldirilmedi. Eski kanit yanlis `d11-v-28` noktasindaydi. | `d11-asili-yanyana.png` |
| D03/D05/D08 | D03 `d03-v-13`, D05 `d05-v-08`, D08 `d08-v-31` destekleri korunuyor; yeni kareler ayni video kompozisyonuna gore yenilendi. | Karelerdeki ogeler islevli/rota gorsel hacminde; destek kuralina uygun. | `d03-asili-yanyana.png`, `d05-asili-yanyana.png`, `d08-asili-yanyana.png` |

## D18 snapback olcumu

Yalniz olcum yapildi; geometri degismedi. `TMB_MEASURE_HARD_TRACE=1` + `TMB_TARGET_CAPTURE_XS=681,6051,8187` ile oyuncu x/kamera tablo ve PNG alindi.

| Nokta | Sonuc |
|---|---|
| x~=681 | Geri isinlanma yok; hedef pencere dx pozitif, screenX ~320 px sabit. |
| x~=6051 | OYUN HATASI: tek karede `x 6072.382 -> 5896.018` (`dx=-176.364`), kamera `5652.046 -> 5643.625`, screenX `420.336 -> 252.393`; gorunur geri sicrama. |
| x~=8187 | Geri isinlanma yok; hedef pencere dx pozitif, screenX ~325 px sabit. |

Artefaktlar: `d18-snapback2/D18-target-681.png`, `D18-target-6051.png`, `D18-target-8187.png`, `D18-snapback-01.png`, `D18-target-table.json`, `D18-snapback-table.json`.

## Chief path ve audit

| Kontrol | Sonuc |
|---|---|
| `node 03-test/d09-logic-audit.cjs --json` | PASS: tum D/F rotalarda `issues=0`; cikti `audit-after.json`. |
| D14/D15 chief kaydi | PASS: `TMB_MEASURE_HARD_TRACE=1 node 03-test/record-chief-paths.cjs D14 D15`; ikisi de finish, deaths=0, retries=0 kosudan yazildi. |
| `chiefPathStatus` D01-D18,F01-F04 | PASS: 22/22 valid. |
| `d09-sarkan` esik notu | `4140 -> 4110`: `d09-ir-slide-04` artik `x=4156`; sarkan kume testi yalniz `slide-01/02/03` gecisini olcer, kume cikisi ~4117 oldugu icin 4110 gercek hedef. |

## Matris

Ayni yeni harness iki koka karsi kosuldu:

| Kosu | Sonuc |
|---|---|
| `TMB_APP_ROOT=.../video-bulgu-baseline-5bdb306 ... -g "O-1 B-5"` | 28 route goruldu; fail kumesi: D01,D02,D04,D05,D06,D07,D08,D10,D11,D12,D13,D14,D15,D16,D17,F01,F02,M02. |
| Yeni dal tam kosu | 28 route goruldu; fail kumesi: D01,D02,D04,D05,D06,D07,D08,D10,D11,D12,D13,D14,D15,D16,D17,F01,F02,M01,M02. |
| Fark | `M01` yeni-only olarak tam kosuda 13/14 coin ile dustu; hedefli tekrar `TMB_ROUTE_IDS=M01` PASS 14/14 verdi. Rapor karari: tam kosu farki FAIL olarak isaretlendi, hedefli tekrar flake kaniti eklendi. |

Ham ozetler: `matrix-baseline-failset.json`, `matrix-after-failset.json`; loglar: `matrix-baseline.log`, `matrix-after.log`.

## Regresyon

| Kabul satiri | Durum |
|---|---|
| `dokunmatik-input.spec.cjs --browser=webkit` | PASS: 1 passed. |
| `dokunmatik-input.spec.cjs --browser=chromium` | PASS: 1 passed. |
| `python 03-test/refresh-rate-audit.py` | PASS: exit 0; 120/144/144-stutter/165 satirlari es, 60 satiri teslim-1007b ile ayni sekilde ayri runSpeed mesafesi raporluyor. |
| `chief-runner`, `hermes-tum-oyun`, `d09-sarkan`, `ios-tamekran`, `host-lock` combined | PASS: 35 passed, 2 skipped. |
| D14/D15 path valid | PASS: 22/22 valid tabloda D14/D15 hash current=stored. |
| Tam O-1 B-5 baseline farki | FAIL: tam kosuda yeni-only `M01`; hedefli tekrar PASS. |

## Artefaktlar

- Yan yana kareler: `03-test/manager-preview/video-bulgu/*-yanyana.png`
- Snapback olcumu: `03-test/manager-preview/video-bulgu/d18-snapback2/`
- Respawn olcumu onceki turdan korunuyor: `respawn-before.json`, `respawn-after.json`

Push yapilmadi. `index.html` degismedi; TR/RU mojibake riski yok. Yalniz hash yenileme yapilmadi; D14/D15 kayitlari 0-retry finish kosudan uretildi.
