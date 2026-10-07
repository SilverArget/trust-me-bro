# CrazyGames sart 1007 kabul ozeti

Final code commit: `fcfebcb` (`Finalize CrazyGames acceptance check`)
Branch/worktree: `crazy-sart-1007` / `E:/oyunlar/TrustMeBro-wt/crazy-sart`

## Karar

Fixed-step fizik denendi fakat `O-1 B-5 ideal keyboard route` kosusunda rota zamanlamasi/coin toplama regresyonlari urettigi icin geri alindi. Final kodda fizik yine mevcut degisken RAF `dt` ile calisir: `Math.min(.033, (t-last)/1000 || 0)`. CrazyGames icin final runtime degisikligi yalniz host-lock platform listesine `app.crazygames.com` eklenmesidir.

## Refresh-rate olcumu

Komut: `python 03-test/refresh-rate-audit.py`
Ham sonuc: `03-test/manager-preview/crazy-sart/refresh-rate-results.json`

### BEFORE - `a2e3e66`

| Hz | jump landing X | run distance | Hermes landing delta | wall jump | dive |
|---:|---:|---:|---:|---|---|
| 60 | 244.15 | 1166.00 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 120 | 238.89 | 1166.00 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 144 | 238.35 | 1167.06 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 165 | 238.99 | 1164.45 | 0.00 | top, deaths=0 | timeout, deaths=0 |

### AFTER - final

| Hz | jump landing X | run distance | Hermes landing delta | wall jump | dive |
|---:|---:|---:|---:|---|---|
| 60 | 244.15 | 1166.00 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 120 | 238.89 | 1166.00 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 144 | 238.35 | 1167.06 | 0.00 | top, deaths=0 | timeout, deaths=0 |
| 165 | 238.99 | 1164.45 | 0.00 | top, deaths=0 | timeout, deaths=0 |

Not: D02 direct dive-zone probe outcome-stable kaldi ama `diveSeen=false`; harness dive animasyonunu tetiklemedi. Olum farki yok. Jump landing 60-120 Hz farki 5.26 px oldugu icin fixed-step denendi, ancak rota regresyonlari nedeniyle uygulanmadi.

## Escape

Kodda tek `Escape` kullanimi `index.html` keyboard handler icinde; sadece `characterSelectOpen && characterChosen` durumunda karakter secim ekranini kapatiyor. Pause veya oynanis Escape'e bagli degil. Karar: Escape ikincil ve zararsiz kapatma kisayolu olarak birakildi.

## CrazyGames app origin

Resmi kaynaklar:
- Technical: https://docs.crazygames.com/requirements/technical/
- Sitelock: https://docs.crazygames.com/resources/html5/sitelock/

Dogrulanan liste:
- General: `*.crazygames.com`
- Video ads: `games.crazygames.com`
- Android app origin: `https://app.crazygames.com`
- iOS app origin: `capacitor://app.crazygames.com`

Host-lock host bazli oldugu icin eklenen platform host'u: `app.crazygames.com`. `games.crazygames.com` zaten `*.crazygames.com` ile kapsaniyor. Deprecated domain eklenmedi.

## Kabul kosulari

- PASS: `cmd /c "set NODE_PATH=C:\Users\Arget\AppData\Roaming\npm\node_modules&& npx.cmd playwright test 03-test/chief-runner.spec.cjs 03-test/hermes-tum-oyun.spec.cjs 03-test/d09-sarkan.spec.cjs 03-test/ios-tamekran.spec.cjs 03-test/host-lock.spec.cjs --workers=1 --reporter=line"` -> 33 passed, 2 skipped; chief hash 22/22 fresh, chief tests 23/23, Hermes full reset/death 0, host-lock PASS.
- PASS: `cmd /c "set NODE_PATH=C:\Users\Arget\AppData\Roaming\npm\node_modules&& npx.cmd playwright test 03-test/dokunmatik-input.spec.cjs --browser=webkit --workers=1 --reporter=line"` -> 1/1.
- PASS: `cmd /c "set NODE_PATH=C:\Users\Arget\AppData\Roaming\npm\node_modules&& npx.cmd playwright test 03-test/dokunmatik-input.spec.cjs --browser=chromium --workers=1 --reporter=line"` -> 1/1.
- PASS: `node 03-test/d09-logic-audit.cjs` -> 22 route, issues=0.
- PASS: `python 03-test/refresh-rate-audit.py`.
- PASS: `python -m py_compile 03-test/refresh-rate-audit.py`.
- PARTIAL/BASELINE-FAIL: `O-1 B-5 ideal keyboard route` matrix was checked through D07 on final code and on detached baseline `a2e3e66`. Same early failing IDs reproduced on baseline: D01, D02, D04, D05, D06, D07; D03 passed. No new fail was observed in this checked subset. Full 28-route matrix was not completed after the fixed-step rollback.

Push yapilmadi.
