# CrazyGames sart 1007 ozeti

Uygulama commit'i: `ad04ed4` (`Fix CrazyGames refresh and app origin`)
Branch/worktree: `crazy-sart-1007` / `E:/oyunlar/TrustMeBro-wt/crazy-sart`

## 3. Refresh rate

Karar: degisken RAF dt yerine sabit fizik accumulator eklendi. Fizik `1/60` sabit adimla calisir; render RAF'ta kalir. Debug `__tmbCampaignStep(dt)` de ayni accumulator yolunu kullanir.

Olcum komutu: `python 03-test/refresh-rate-audit.py`
Ham sonuc: `03-test/manager-preview/crazy-sart/refresh-rate-results.json`

| Hz | run distance | jump landing X | Hermes landing delta | wall jump | dive probe |
|---:|---:|---:|---:|---|---|
| 60 | 1166 px | 244.15 | 0 px | top, deaths=0 | timeout, deaths=0 |
| 120 | 1166 px | 244.15 | 0 px | top, deaths=0 | timeout, deaths=0 |
| 144 | 1166 px | 244.15 | 0 px | top, deaths=0 | timeout, deaths=0 |
| 165 | 1166 px | 244.15 | 0 px | top, deaths=0 | timeout, deaths=0 |

Not: D02 direct dive-zone probe outcome-stable kaldi ama `diveSeen=false`; bu harness dive animasyonunu tetiklemedi. Olum/geri sarma farki yok. Run, jump, Hermes landing ve wall-jump sonuc farki 0 px / ayni outcome.

## 4a. Escape

Kodda tek `Escape` kullanimi var: `index.html` keyboard handler, sadece `characterSelectOpen && characterChosen` ise karakter secim ekranini kapatiyor. Pause/oynanis Escape'e bagli degil; pause butonu zaten var. Karar: Escape ikincil ve zararsiz bir kapatma kisayolu olarak birakildi, yeni gameplay bagimliligi eklenmedi.

## 4b. CrazyGames app origin

Resmi kaynaklar:
- Technical: https://docs.crazygames.com/requirements/technical/
- Sitelock: https://docs.crazygames.com/resources/html5/sitelock/

Dokumandaki dogrulanmis liste:
- General: `*.crazygames.com`
- Video ads: `games.crazygames.com`
- Android app origin: `https://app.crazygames.com`
- iOS app origin: `capacitor://app.crazygames.com`

Host-lock host bazli calistigi icin eklenen platform host'u: `app.crazygames.com`. `games.crazygames.com` zaten `*.crazygames.com` ile kapsaniyor. Deprecated domainler eklenmedi.

## Testler

- PASS: `python 03-test/refresh-rate-audit.py`
- PASS: `python -m py_compile 03-test/refresh-rate-audit.py`
- PASS: commit hook (`KARDINALITE ... SONUC: PASS`)
- BLOCKED: `npx.cmd playwright test 03-test/host-lock.spec.cjs --list` -> ortamda `playwright/test` modulu yok. Bu nedenle `chief-runner`, `hermes-tum-oyun`, `d09-logic-audit` Playwright kosulari bu worktree'de calistirilamadi.

Push yapilmadi.
