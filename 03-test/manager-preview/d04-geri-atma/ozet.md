# D04 Geri Atma Ozeti

- Kok neden: D04 uzun inen merdiven `d04-long-*` solid dikdortgen basamaklardan olusuyordu. Yatay collision, oyuncu alt basamaga inmeden once bir sonraki basamagin sol yuzune carptirip ~91-96 px geriye snapliyordu. Reset/checkpoint, chief/searchlight veya wall-catch degildi.
- Baseline: `42d92ee` ve `fc8cccf` ayni noktada passable degildi; bug bugunku 21-route kural degisikliginden once de vardi.
- Kabul duzeltmesi: D04 uzun merdiven gorseli tekrar eski gibi basamakli ve destekli. `d04-long-1..8` ekranda gorunen ama `solid:false` olan basamak govdeleri olarak duruyor. Fizik icin yalnizca gorunmez `d04-long-run` slope collision kullaniliyor; slope yuzeyi cizilmiyor.
- Hermes karsilastirma: `a2e3e66` uzerinde `hermes-tum-oyun` full PASS ve `d09-hermes-opening-gap` PASS. Branch uzerinde de full PASS; D09 regresyonu yok.
- Chief path: D04 routeHash degistigi icin D04 chief path yeniden kaydedildi. Hermes routeHash'e girmiyor.
- Commit: `9c7ae7d`.

## Test Sonuclari

- `playwright.cmd test 03-test/d04-geri-atma.spec.cjs --workers=1 --reporter=line` (`NODE_PATH` global npm): PASS 2/2. D04 uzun merdiven: `maxBack=0`, `stuckFrames=0`, `deaths=0`, `chiefCaught=false`.
- `node 03-test/d09-logic-audit.cjs`: PASS, 22 route icin `issues=0`.
- `playwright.cmd test 03-test/chief-runner.spec.cjs --workers=1 --reporter=line` (`NODE_PATH` global npm): PASS 23/23.
- `playwright.cmd test 03-test/hermes-tum-oyun.spec.cjs --workers=1 --reporter=line` (`NODE_PATH` global npm): PASS 1/1 full suite.
- Baseline proof: `TMB_ROOT=E:/oyunlar/TrustMeBro-wt/d04-base-a2e3e66 playwright.cmd test 03-test/hermes-tum-oyun.spec.cjs --workers=1 --reporter=line`: PASS 1/1 full suite.
