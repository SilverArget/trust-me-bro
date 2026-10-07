# teslim-1007b kabul ozeti

Worktree: `E:/oyunlar/TrustMeBro-wt/teslim2`
Branch: `teslim-1007b`
Base: `origin/master` = `d0f9988`

## Merge

- `hud-arka-1007` (`d249224`) merge commit: `60e3dfa`
- `hz144-sabit-1007` (`a10eeab`) merge commit / birleşik merge HEAD: `9884397`
- Fast-forward degil; iki dal `origin/master` ustune merge commit olarak alindi.
- Push yapilmadi.

## Regresyon

- PASS: `npx.cmd playwright test 03-test/chief-runner.spec.cjs 03-test/hermes-tum-oyun.spec.cjs 03-test/d09-sarkan.spec.cjs 03-test/ios-tamekran.spec.cjs 03-test/host-lock.spec.cjs --workers=1 --reporter=line` -> `35 passed, 2 skipped`
- PASS: `npx.cmd playwright test 03-test/dokunmatik-input.spec.cjs --browser=webkit --workers=1 --reporter=line` -> `1 passed`
- PASS: `npx.cmd playwright test 03-test/dokunmatik-input.spec.cjs --browser=chromium --workers=1 --reporter=line` -> `1 passed`
- PASS: `node 03-test/d09-logic-audit.cjs` -> tum D/F rota ozetinde `issues=0`
- PASS: `python 03-test/refresh-rate-audit.py` -> `120`, `144`, `144-stutter`, `165` hizli satirlari esit; `60` satiri onceki rapordaki gibi yalniz `runSpeed.distancePx=1170.25`
- PASS: `npx.cmd playwright test 03-test/player-visible-ui.spec.cjs --workers=1 --reporter=line` -> `4 passed`
- PASS: `npx.cmd playwright test 03-test/tn-a12.spec.cjs -g campaign-i18n-complete --workers=1 --reporter=line` -> `1 passed`
- BASELINE: `npx.cmd playwright test 03-test/player-visible-mobile.spec.cjs --workers=1 --reporter=line` -> `4 passed, 2 failed`; bilinen fail'ler:
  - `fullscreen control is reachable in landscape without covering play UI`
  - `landscape campaign framing keeps the runner in the lower gameplay band`

## Kareler

- `03-test/manager-preview/teslim-1007b/d09-hud-1280x720.png`
- `03-test/manager-preview/teslim-1007b/d09-hud-390x844.png`

## Not

Dist/paket adimi icin `crazy-sart` / `hz144-sabit` ozetlerinde ayri build komutu bulunmadi; ilgili kabul kosullari host-lock, dokunmatik ve refresh-rate regresyonlariyla tekrarlandi. Test-run artefaktlari commit disi birakildi.
