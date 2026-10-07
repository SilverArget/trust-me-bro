# video-bulgu-1007 ozet

Baz: `5bdb306`. Dal: `video-bulgu-1007`. Tur 5 kapsami: D14/D15 son slide karari, asili segmentlere carpisma degistirmeyen halat gorseli, audit/valid/test kabul zinciri.

## Degisiklikler

| Bulgu | Degisim | Karar / kok neden | Kanit |
|---|---|---|---|
| D14 `d14-slide-01` | Runtime rotadan kaldirildi. | `d14-v-05 -> d14-v-06` basamak cikisi/tutunma bitisinden ~44 px sonra; `d14-v-06` kisa, D09 kuralina uygun duz yer yok. | `audit-after.json`, D14 0-retry kayit |
| D14 `d14-slide-02` | Runtime rotadan kaldirildi. | `d14-v-12 -> d14-v-14` inis yayindan sonra guvenli duz bolge yok. | `audit-after.json`, D14 0-retry kayit |
| D15 `d15-slide-02` | Runtime rotadan kaldirildi. | `d15-v-06 -> d15-v-07` basamak inisinden 58 px sonra; dusus inis noktasina biniyor. | `audit-after.json`, D15 0-retry kayit |
| D04 asili sutun | `d04-v-14`, `d04-v-24`, `d04-v-27` icin `visualAttachments += suspend`. | Altinda oyuncu yolu/bosluk olan asili segmentlere zemine ayak konmadi; sadece ustten halat gorseli eklendi. | `d04-asili-000236-yanyana.png`, `d04-asili-000005-yanyana.png` |
| D11 havada kasa/platform | `d11-v-24`, `d11-v-22`, `d11-v-17`, `d11-deadend-i11-step-2/3` icin `visualAttachments += suspend`. | Videodaki kasa `d11-v-24` ustundeki `d11-vault-02`; yol kesmeden ustten halatla desteklendi. | `d11-asili-yanyana.png` |
| D18 snapback | Degisiklik yok. | Yonetici karari bekliyor; Tur 4 olcumu korunuyor. | `d18-snapback2/` |

Asili yapi audit kurali: altta `>20 px` bosluk olup `stack-to-ground` veya `suspend` destegi olmayan segment FLAG. Altinda oyuncu yolu varsa ayak yerine halat zorunlu.

## Audit ve path

| Kontrol | Sonuc |
|---|---|
| `node 03-test/d09-logic-audit.cjs --json` | PASS: D01-D18,F01-F04 `issues=0`; cikti `audit-after.json`. |
| Siki slide kuralinda hedef disi liste | Listed only: D03 `d03-slide-01`, D07 `d07-slide-02`, D09 `d09-ir-slide-01/04`, D15 `d15-slide-04`, F04 `f04-p2-d03-slide-01`. |
| `TMB_MEASURE_HARD_TRACE=1 node 03-test/record-chief-paths.cjs D14 D15` | PASS: D14 ve D15 finish, deaths=0, retries=0 kosudan yazildi. |
| `chiefPathStatus` D01-D18,F01-F04 | PASS: `chief-runner` HASH satirlarinda 22/22 valid. |

## Matris

Ayni harness ile iki kok kosuldu:

| Kosu | Sonuc |
|---|---|
| 5bdb306 baseline | FAIL kumesi: `D06,D07,D09,M02`; 24 passed / 4 failed. |
| Yeni dal | FAIL kumesi: `D07,M02`; 26 passed / 2 failed. |
| Fark | PASS: yeni-only fail yok; `D06` ve `D09` baseline'a gore kapandi. |

## Regresyon

| Kabul satiri | Durum |
|---|---|
| Audit tum D/F | PASS: `issues=0`. |
| 22/22 chief valid | PASS. |
| `dokunmatik-input.spec.cjs --browser=webkit` | PASS: 1 passed. |
| `dokunmatik-input.spec.cjs --browser=chromium` | PASS: 1 passed. |
| `python 03-test/refresh-rate-audit.py` | PASS: script exit 0. |
| `chief-runner`, `hermes-tum-oyun`, `d09-sarkan`, `ios-tamekran`, `host-lock` | PASS: 35 passed, 2 skipped. |
| Tam O-1 B-5 baseline farki | PASS: yeni-only fail yok. |

## Artefaktlar

- Yan yana kareler: `03-test/manager-preview/video-bulgu/*-yanyana.png`
- D04/D11 hedef kareler: `d04-asili-000236-yanyana.png`, `d11-asili-yanyana.png`
- Audit: `audit-after.json`
- Respawn olcumu onceki turdan korunuyor: `respawn-before.json`, `respawn-after.json`

Push yapilmadi. `index.html` degismedi; geometri hash'i yalniz D14/D15 slide kaldirma nedeniyle degisti ve kayitlar 0-retry finish kosudan yenilendi. Asili destekler gorseldir; collision/geometri/chief hash degistirmez.
