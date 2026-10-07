# video-bulgu-1007 ozet

Baz: `5bdb306`. Dal: `video-bulgu-1007`. Onceki RET sonrasi ikinci commit kapsamidir.

## Bulgular

### 1. D09 05:33-07:14 ezici/cukur
- Degisenler: oyunun gordugu runtime rotada `d09-ir-slide-04` artik cukur/alcaltilmis `d09-ir-25` ustunde degil; `d09-ir-26` duz zemini ustune `x=4156`, `baseY=277.375` tasindi. `d09-ir-slide-01/02/03` korunuyor.
- Kok neden: onceki commit kaynak rotadaki/yanlis hedefteki degisimi raporladi; RET karsilastirmasi `__TMB_A12__.routeDefinition("D09")` icinde asil problemli `slide-04`un yerinde kaldigini gosterdi.
- Audit: yeni dal `node 03-test/d09-logic-audit.cjs D09 D18 --json` -> D09 `issues=0`.
- Negatif kontrol: `5bdb306` runtime audit D09 icin `d09-ir-slide-04` FLAG verdi.
- Kare: BİTMEDİ + neden: gercek 1280x720 BEFORE/AFTER oyundan yeniden yakalanmadi; eski PNG'ler RET'e gore guvenilir degil.

### 2. D18 12:13-12:57 yakalanma dongusu
- Degisenler: oyunun gordugu runtime rotada yalniz hedef iki slide kaldirildi: `d18-p1-a01-slide-02` (vault/kenar sikismasi) ve `d18-p1-a01-slide-04` (v19->v20 ziplama inis yayina biniyordu). Baska D18 slide hedeflenmedi.
- Kok neden: onceki commit kaldirdigi slide'lar zaten runtime'da yoktu; RET karsilastirmasi asil iki slide'in `routeDefinition("D18")` icinde kaldigini gosterdi.
- Audit: yeni dal D18 `issues=0`; `5bdb306` negatif kontrolde `d18-p1-a01-slide-02` ve `d18-p1-a01-slide-04` FLAG.
- BİTMEDİ + neden: `record-chief-paths.cjs D18` basarili kosudan kayit uretemedi. Yeni dal `O-1 B-5 D18` finish yapiyor ama `retries=2`, `coin=10/14`; baseline `5bdb306` da FAIL (`retries=2`, `coin=9/14`). `chiefPathStatus("D18").valid=false` kaldi; yalniz hash yenileme yapilmadi.
- Kare: BİTMEDİ + neden: D18 x~1650/x~3500 gercek 1280x720 BEFORE/AFTER kareleri yeniden yakalanmadi.

### 3. D07 dogusta hizli yakalanma
- Degisenler: urun tarafinda Dock recorded-chief delay runtime'da en az `2.5s` olacak sekilde korunuyor (`js/a12-campaign.js`, `chiefDelay=Math.max(recordedDelay,2.5)`).
- Kok neden: `5bdb306` kayitli delay degeri D03,D04,D07,D08,D10,D11,D13,D15,D17,D18 icin `1.5s`; checkpoint dogusunda chef `t-delay` ile yerlestigi icin Dock 2.5 sn pay sozu dusuyordu.
- Tablo: BİTMEDİ + neden: cp>70 checkpoint'te yakalanma -> dogus -> girdisiz bekleme olcumu D01-D18 icin otomatik senaryo olarak kosulmadi. Statik/runtime beklenti: BEFORE sorunlu rotalar `1.5s`, AFTER runtime `2.5s`.
- Kare: BİTMEDİ + neden: gercek oyun D07 dogus karsilastirma karesi yeniden yakalanmadi.

### 4. Havada asili yapilar
- Durum: onceki committe eklenen `visualSupports` hedefleri korunuyor (`D03 d03-v-13`, `D04 d04-v-02/d04-v-03/d04-v-05`, `D05 d05-v-08`, `D08 d08-v-31`, `D11 d11-v-28`).
- Audit: hedef rotalar yeni runtime auditinde `issues=0`.
- Kare: BİTMEDİ + neden: D03/D04/D05/D08/D11 icin gercek 1280x720 BEFORE/AFTER kareler yeniden yakalanmadi.

## Testler

| Kabul satiri | Sonuc |
|---|---|
| `node 03-test/d09-logic-audit.cjs D09 D18 --json` | PASS: D09=0, D18=0 |
| `TMB_ROOT=<5bdb306 temp> node 03-test/d09-logic-audit.cjs D09 D18 --json` | PASS negatif kontrol: D09 `slide-04`, D18 `slide-02/04` FLAG |
| Tum D/F audit | FAIL/liste: D14 `d14-slide-01/02`, D15 `d15-slide-02` yeni FLAG; talimat geregi duzeltilmedi |
| `NODE_PATH=... node 03-test/record-chief-paths.cjs D09` | PASS; `js/chief-paths.js` D09 basarili kosudan yazildi |
| `NODE_PATH=... node 03-test/record-chief-paths.cjs D09 D18` | FAIL: D18 `retries=2`; D18 kaydi yazilmadi |
| `chiefPathStatus` D01-D18,F01-F04 | FAIL: yalniz D18 `valid=false`; digerleri valid |
| D18 baseline `5bdb306` O-1 B-5 | FAIL: `retries=2`, `coin=9/14`; yeni dalda yeni fail yok (`coin=10/14`) |
| D07 cp>70 dogus olcum tablosu | BİTMEDİ |
| Gercek oyun 1280x720 yanyana kareler | BİTMEDİ |
| `dokunmatik-input`, refresh-rate, hermes, ios, chief-runner, d09-sarkan, host-lock, tam O-1 B-5 matris | BİTMEDİ: sure icinde kosulmadi |

## Notlar

- Push yapilmadi.
- `index.html` degismedi; UTF-8/TR-RU metin riski yok.
- Test artigi commit'e alinmadi.
