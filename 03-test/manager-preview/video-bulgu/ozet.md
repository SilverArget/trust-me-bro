# video-bulgu-1007 ozet

Baz: `5bdb306`. Dal: `video-bulgu-1007`. Bu rapor Tur 3 / D18 chief kaydi regresyon duzeltmesini kapsar.

## Bulgular

### 1. D09 05:33-07:14 ezici/cukur

- Degisenler: oyunun gordugu runtime rotada `d09-ir-slide-04` artik cukur/alcaltilmis `d09-ir-25` ustunde degil; `d09-ir-26` duz zemini ustune `x=4156`, `baseY=277.375` tasindi. `d09-ir-slide-01/02/03` korunuyor.
- Kok neden: onceki hedefleme kaynak rota ile runtime rota farkini kacirdi; sorunlu oge `__TMB_A12__.routeDefinition("D09")` icindeki `d09-ir-slide-04` idi.
- Kanit: `d09-cukur-yanyana.png` 1280x720 BEFORE=`5bdb306`, AFTER=yeni dal, ayni rota/x civari.

### 2. D18 12:13-12:57 yakalanma dongusu

- Degisenler: runtime rotada yalniz hedef iki slide kaldirildi: `d18-p1-a01-slide-02` (vault/kenar sikismasi) ve `d18-p1-a01-slide-04` (v19->v20 ziplama inis yayina biniyordu). Bu turda oyun geometrisine dokunulmadi.
- Chief kaydi: `record-chief-paths.cjs D18` basarili kosudan calisti; `O-1 B-5 D18` finish, `deaths=0`, `retries=0`; `chiefPathStatus(D18).valid=true`.
- Kok neden: D18 retry'nin kok nedeni oyun geometrisi degil, test harness'in vector dive arc sirasinda olusan x snapback'ini gercek checkpoint retry'si sanmasiydi; bu nedenle `record-chief-paths.cjs` basarili kosuya ulasamiyor, D18 hash invalid kalip urun eski sabit hizli sefe dusuyordu.
- Kanit: `d18-vault-basamak-yanyana.png` ve `d18-inis-yayi-yanyana.png` 1280x720 BEFORE=`5bdb306`, AFTER=yeni dal.

### 3. D07 dogusta hizli yakalanma

- Degisenler: urun tarafinda Dock recorded-chief delay runtime'da en az `2.5s` olacak sekilde korunuyor (`chiefDelay=Math.max(recordedDelay,2.5)`).
- Kok neden: `5bdb306` kayitli delay degeri D03,D04,D07,D08,D10,D11,D13,D15,D17,D18 icin `1.5s`; checkpoint dogusunda sef `t-delay` ile yerlestigi icin Dock 2.5 sn pay sozu dusuyordu.
- Olcum: `03-test/measure-respawn-catch.cjs`, cp>70 checkpoint, sef yakalamasindan sonra dogus ve girdisiz bekleme.

| Route | BEFORE wait | AFTER wait | AFTER delay | Sonuc |
|---|---:|---:|---:|---|
| D01 | 2.417s | 2.483s | 2.500s | PASS |
| D02 | 2.417s | 2.483s | 2.500s | PASS |
| D03 | 1.983s | 2.483s | 2.500s | PASS |
| D04 | 1.983s | 2.483s | 2.500s | PASS |
| D05 | 2.433s | 2.483s | 2.500s | PASS |
| D06 | 2.417s | 2.483s | 2.500s | PASS |
| D07 | 2.033s | 3.033s | 2.500s | PASS |
| D08 | 1.983s | 2.483s | 2.500s | PASS |
| D09 | 2.433s | 2.483s | 2.500s | PASS |
| D10 | 1.983s | 2.483s | 2.500s | PASS |
| D11 | 1.983s | 2.483s | 2.500s | PASS |
| D12 | 2.417s | 2.483s | 2.500s | PASS |
| D13 | 1.983s | 2.483s | 2.500s | PASS |
| D14 | 2.417s | 2.483s | 2.500s | PASS |
| D15 | 1.983s | 2.483s | 2.500s | PASS |
| D16 | 3.000s | 3.000s | 2.500s | PASS |
| D17 | 1.983s | 2.817s | 2.500s | PASS |
| D18 | 1.983s | 2.483s | 2.500s | PASS |

### 4. Havada asili yapilar

- Durum: onceki committe eklenen `visualSupports` hedefleri korunuyor: `D03 d03-v-13`, `D04 d04-v-02/d04-v-03/d04-v-05`, `D05 d05-v-08`, `D08 d08-v-31`, `D11 d11-v-28`.
- Kanit: `d03-asili-yanyana.png`, `d04-asili-yanyana.png`, `d05-asili-yanyana.png`, `d08-asili-yanyana.png`, `d11-asili-yanyana.png` 1280x720 BEFORE=`5bdb306`, AFTER=yeni dal.

## Testler

| Kabul satiri | Sonuc |
|---|---|
| `node 03-test/d09-logic-audit.cjs` | PASS: D09=0, D18=0; diger yeni FLAG listesi D14 `d14-slide-01/02`, D15 `d15-slide-02` |
| 5bdb306 negatif audit | PASS: D09 `slide-04`, D18 `slide-02/04` FLAG |
| `node 03-test/record-chief-paths.cjs D18` | PASS: finish, deaths=0, retries=0; `js/chief-paths.js` D18 basarili kosudan yazildi |
| `chiefPathStatus` D01-D18,F01-F04 | PASS: 22/22 valid |
| D18 `O-1 B-5 ideal keyboard route` | PASS: finish, deaths=0, retries=0; coin 14/14 sart degil |
| D01-D18 dogus sonrasi girdisiz yakalanma | PASS: AFTER tum rotalar >=2.45s |
| Gercek oyun 1280x720 yan yana kareler | PASS: D09, D18 x~1650, D18 x~3500, D03/D04/D05/D08/D11 uretildi |
| `python 03-test/refresh-rate-audit.py` | PASS: script exit 0, 60/120/144/165 deterministic satirlari raporlandi |
| `hermes-tum-oyun.spec.cjs` | PASS: 1 passed |
| `ios-tamekran.spec.cjs` | PASS: 2 passed, 2 skipped |
| `dokunmatik-input.spec.cjs` | PARTIAL: default run PASS; `--project=chromium --project=webkit` mevcut Playwright config'inde proje tanimli olmadigi icin desteklenmedi |
| `chief-runner.spec.cjs` | PASS: combined kosuda gecti |
| `d09-sarkan.spec.cjs` | PASS: 4 passed; console icindeki eski `pass` etiketi threshold nedeniyle stale olabilir, assertionlar gecti |
| `host-lock.spec.cjs` | PASS: combined kosuda gecti |
| Tam `O-1 B-5` matris | FAIL: yeni dalda 9 passed / 19 failed; fail'ler agirlikla coin baseline ve D07/M02 stuck. 5bdb306 tam baseline karsilastirmasi bu turda tamamlanmadi |

## Artefaktlar

- `respawn-before.json` ve `respawn-after.json`: D01-D18 dogus olcum ham verisi.
- `evidence-shots.json`: BEFORE/AFTER ekran goruntusu hedefleri.
- Yan yana PNG'ler: `03-test/manager-preview/video-bulgu/` altinda.

## Notlar

- Push yapilmadi.
- `index.html` degismedi; UTF-8/TR-RU metin riski yok.
- Yalniz hash yenileme yapilmadi; D18 kaydi basarili 0-retry kosudan uretildi.
