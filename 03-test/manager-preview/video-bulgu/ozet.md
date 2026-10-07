# video-bulgu-1007 ozet

Baz: `5bdb306`. Dal: `video-bulgu-1007`. Tur 6 kapsami: D18 snapback duzeltmesi, suspend halat cizim yonu, son kabul zinciri.

## Degisiklikler

| Bulgu | Degisim | Karar / kok neden | Kanit |
|---|---|---|---|
| D14 `d14-slide-01` | Runtime rotadan kaldirildi. | `d14-v-05 -> d14-v-06` basamak cikisi/tutunma bitisinden ~44 px sonra; `d14-v-06` kisa, D09 kuralina uygun duz yer yok. | `audit-after.json`, D14 0-retry kayit |
| D14 `d14-slide-02` | Runtime rotadan kaldirildi. | `d14-v-12 -> d14-v-14` inis yayindan sonra guvenli duz bolge yok. | `audit-after.json`, D14 0-retry kayit |
| D15 `d15-slide-02` | Runtime rotadan kaldirildi. | `d15-v-06 -> d15-v-07` basamak inisinden 58 px sonra; dusus inis noktasina biniyor. | `audit-after.json`, D15 0-retry kayit |
| D04 asili sutun | `d04-v-14`, `d04-v-24`, `d04-v-27` icin `visualAttachments += suspend`. | Altinda oyuncu yolu/bosluk olan asili segmentlere zemine ayak konmadi; sadece ustten halat gorseli eklendi. | `d04-asili-000236-yanyana.png`, `d04-asili-000005-yanyana.png` |
| D11 havada kasa/platform | `d11-v-24`, `d11-v-22`, `d11-v-17`, `d11-deadend-i11-step-2/3` icin `visualAttachments += suspend`. | Videodaki kasa `d11-v-24` ustundeki `d11-vault-02`; yol kesmeden ustten halatla desteklendi. | `d11-asili-yanyana.png` |
| D18 snapback | `diveRun`/`jumpRun` aktif arc uygulamasina D18 icin monotonic-x guard eklendi. | Kök neden: D18 ikinci dive arc'i basladiktan sonra oyuncu normal fizik hiziyla arc formülünün onune geciyor; sonraki frame arc x'i geriden hesaplaninca oyuncu x'i gorunur bicimde geri cekiliyordu. | `tur6-d18-final.log`, `tur6-d18-final-snapback.json` |
| Suspend halatlari | `suspend` halat hook noktasi platform/slide ust kenarina cekildi. | D11 `d11-v-24` AFTER karesinde bir halat platform altindan asagi uzuyordu; artik tum suspend halatlari yalniz ustten yukari ciziliyor. | `d11-asili-yanyana.png` |

Asili yapi audit kurali: altta `>20 px` bosluk olup `stack-to-ground` veya `suspend` destegi olmayan segment FLAG. Altinda oyuncu yolu varsa ayak yerine halat zorunlu.

## Audit ve path

| Kontrol | Sonuc |
|---|---|
| `node 03-test/d09-logic-audit.cjs` | PASS: D01-D18,F01-F04 `issues=0`; cikti `tur6-audit-final.log`. |
| Siki slide kuralinda hedef disi liste | Listed only: D03 `d03-slide-01`, D07 `d07-slide-02`, D09 `d09-ir-slide-01/04`, D15 `d15-slide-04`, F04 `f04-p2-d03-slide-01`. |
| `TMB_MEASURE_HARD_TRACE=1 node 03-test/record-chief-paths.cjs D14 D15` | PASS: D14 ve D15 finish, deaths=0, retries=0 kosudan yazildi. |
| `chiefPathStatus` D01-D18,F01-F04 | PASS: `tur6-chief-final.log`, 22/22 valid. |

## Tur 6 snapback

| Kapsam | BEFORE | AFTER |
|---|---:|---:|
| D18 ideal kosu `>150 px` geri sicrama | 1 (`x 6072 -> 5896`, onceki Tur 4 olcumu) | 0 |
| D01-D18,F01-F04 toplam `>150 px` geri sicrama | 1 | 0 |

Rota bazli tablo: `tur6-snapback-table.json`. `vp-dock-play` retry algisi eski anlamina donduruldu (`>150 px` geri = retry); D18 final kosu yine `finish, deaths=0, retries=0`.

## Matris

Ayni harness ile iki kok kosuldu:

| Kosu | Sonuc |
|---|---|
| 5bdb306 baseline | FAIL kumesi: `D01,D02,D04,D05,D06,D07,D08,D10,D11,D12,D13,D14,D15,D16,D17,F01,F02,M01,M02`; 9 passed / 19 failed. |
| Yeni dal tam kosu | Ilk Tur 6 genis guard ile yeni-only `A02,F04` coin fail verdi. |
| Final dar guard | `A02,F04` hedefli tekrar PASS 14/14; D18 hedefli tekrar PASS. D18 disi arc davranisi eski hale dondugu icin yeni-only fail kalmadi. |

## Regresyon

| Kabul satiri | Durum |
|---|---|
| Audit tum D/F | PASS: `issues=0`. |
| 22/22 chief valid | PASS. |
| `dokunmatik-input.spec.cjs --browser=webkit` | PASS: 1 passed. |
| `dokunmatik-input.spec.cjs --browser=chromium` | PASS: 1 passed. |
| `python 03-test/refresh-rate-audit.py` | PASS: script exit 0. |
| `chief-runner`, `hermes-tum-oyun`, `d09-sarkan`, `ios-tamekran`, `host-lock` | PASS: 35 passed, 2 skipped. |
| D18 final `O-1 B-5` | PASS: finish, deaths=0, retries=0, snapback=0. |
| Tam O-1 B-5 baseline farki | PASS after final scoping: tam kosuda gorulen yeni-only `A02,F04` hedefli final tekrar PASS; bu rotalar D18 guard kapsami disina alindi. |

## Artefaktlar

- Yan yana kareler: `03-test/manager-preview/video-bulgu/*-yanyana.png`
- D04/D11 hedef kareler: `d04-asili-000236-yanyana.png`, `d11-asili-yanyana.png`
- Audit: `audit-after.json`
- Respawn olcumu onceki turdan korunuyor: `respawn-before.json`, `respawn-after.json`

Push yapilmadi. `index.html` degismedi; geometri hash'i yalniz D14/D15 slide kaldirma nedeniyle degisti ve kayitlar 0-retry finish kosudan yenilendi. Asili destekler gorseldir; collision/geometri/chief hash degistirmez.
