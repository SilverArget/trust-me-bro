# video-bulgu-1007 ozet

Baz: `5bdb306` (`origin/master`). Dal: `video-bulgu-1007`.

## Bulgular

### 1. D09 05:33-07:14 ezici/cukur
- Degisenler: `D09` kaynak rotasinda `d09-ir-slide-01/02/03` duz zemin `d09-ir-26` ustune tasindi; `d09-ir-23` grounded kolon yapildi; `d09-ir-40/d09-ir-42` dar yarigi kapatildi.
- Kok neden: audit runtime duzeltmesini uyguladigi icin kaynak rotadaki sarkan/ezici-cukur hatasini gormuyordu.
- Kare: `03-test/manager-preview/video-bulgu/d09-cukur-yanyana.png`

### 2. D18 12:13-12:57 yakalanma dongusu
- Degisenler: `D18` kaynak rotasindan problemli slide objeleri `d18-p1-a01-slide-01`, `d18-p2-f03-slide-04`, `d18-p2-f03-slide-05` kaldirildi.
- Kok neden: slide engelleri dalis/basamak gecis bandina biniyordu; runtime kural bunu kaldiriyordu, kaynak rota ve audit bunu acik kanitlamiyordu.
- Kare: `03-test/manager-preview/video-bulgu/d18-dongu-yanyana.png`
- BİTMEDİ + neden: `record-chief-paths.cjs D09 D18` icinde `O-1 B-5 D18 ideal keyboard route` 2 retry ile FAIL verdi; bu nedenle D18 icin yeni chief kaydi yazdirilmadi.

### 3. D07 04:07-04:19 dogunca hizli yakalanma
- Degisenler: recorded chief kullanan Dock rotalarinda delay en az `2.5s`; yakalanma sonrasi `regrabT` artik `campaignChief.delay`.
- Kok neden: recorded path resetinde chef `t-delay` konumuna aliniyordu ama bazi Dock recorded delay/regrab akisi 2.5 sn sozunu garanti etmiyordu.
- Kare: `03-test/manager-preview/video-bulgu/d07-dogus-yanyana.png`

### 4. Havada asili yapilar
- Degisenler: hedefli destekler eklendi: `D04 d04-v-02/d04-v-03/d04-v-05`, `D08 d08-v-31`, `D11 d11-v-28`; supheli `D03 d03-v-13`, `D05 d05-v-08`.
- Kok neden: genel audit "support would cut path" durumlarini ok saydigi icin yonetici karesindeki hedefleri FLAG etmiyordu.
- Kare: `03-test/manager-preview/video-bulgu/asili-yapilar-yanyana.png`

## Testler

| Komut | Sonuc |
|---|---|
| `node --check js/a12-campaign.js` | PASS |
| `node --check 03-test/d09-logic-audit.cjs` | PASS |
| `node 03-test/d09-logic-audit.cjs D09 D18 D04 D08 D11 D03 D05` | PASS, tumu `issues=0` |
| `TMB_ROOT=<5bdb306 temp> node 03-test/d09-logic-audit.cjs D09 D04 D08 D11 D03 D05 --json` | PASS negatif kontrol: D09=3, D04=3, D08=1, D11=1, D03=1, D05=1 issue |
| `NODE_PATH=... node 03-test/record-chief-paths.cjs D09` | PASS; `O-1-D09`, `B-5-D09`; `js/chief-paths.js` yazildi |
| `NODE_PATH=... node 03-test/record-chief-paths.cjs D09 D18` | FAIL: D18 `retries=2`, `coin=9/14` |
| `playwright test chief-runner + d09-sarkan + host-lock` | PASS, 32/32 |

## Diff hunk listesi

- `git diff -U0 5bdb306 -- js/a12-campaign.js index.html` hunk satirlari:
  - `@@ -976 +976 @@`
  - `@@ -983 +983 @@`
  - `@@ -985 +985 @@`
  - `@@ -992,2 +992,2 @@`
  - `@@ -995 +995 @@`
  - `@@ -1002 +1002 @@`
  - `@@ -1770 +1770,2 @@ applyD09LogicRulesToRoutes();`
  - `@@ -2283 +2284 @@ applyD09LogicRulesToRoutes();`
- `index.html` degismedi.
