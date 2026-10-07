# D04 Geri Atma Ozeti

- Kok neden: D04 uzun inen merdiven `d04-long-*` ayri solid dikdortgenlerden olusuyordu. Yatay collision cozumleyici, oyuncu alt basamaga dusmeden once bir sonraki basamagin sol yuzune carptirip yaklasik 91-96 px geriye snapliyordu. Olcum: `x=5758 -> x=5663`, `deaths=0`, `chiefCaught=false`, `edgeClimb=null`; yani reset/checkpoint, chief/searchlight veya wall-catch degil.
- Baseline: `42d92ee` ve `fc8cccf` ayni noktada passable degildi (`maxBack` sirasiyla ~93 px ve ~96 px). Bu bug bugunku 21-route kural degisikliginin regresyonu degil; zaten vardi.
- Fix: sadece D04 uzun merdivenin kok nedeni degisti. `d04-long-1..8` solid basamak govdeleri kaldirildi, yerlerine `d04-long-run` slope collision eklendi. D04 erken kisa basamaklar ve diger rotalar degistirilmedi.
- Chief path: D04 routeHash degistigi icin D04 chief path yeniden kaydedildi; Hermes routeHash'e girmedi.
- Commit: `10b52ce` (`Fix D04 stair pushback`).

## Test Sonuclari

- `npx.cmd playwright test 03-test/d04-geri-atma.spec.cjs --workers=1 --reporter=line`: PASS 2/2. D04 uzun merdiven: `maxBack=0`, `stuckFrames=0`, `deaths=0`, `chiefCaught=false`.
- `node 03-test/d09-logic-audit.cjs`: PASS, 22 route icin `issues=0`.
- `npx.cmd playwright test 03-test/chief-runner.spec.cjs --workers=1 --reporter=line`: PASS 23/23.
- `npx.cmd playwright test 03-test/hermes-tum-oyun.spec.cjs --workers=1 --reporter=line`: FAIL, D09 `d09-hermes-opening-gap landed` mevcut problemi. D04 Hermes satirlari PASS.
