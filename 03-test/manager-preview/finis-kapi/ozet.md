## Kapi + SONRAKI ozeti

- Branch/worktree: `kapi-sonraki-1007` / `E:/oyunlar/TrustMeBro-wt/kapi-sonraki`
- Base: `a2e3e66` (`origin/master`, live)
- Commit: `194725d`

## SONRAKI root cause

- `73fc5c0`'in asil rota sirasi duzeltmesi live `a2e3e66` icinde var: `startNextRoute()` kilitli/uygunsuz rotayi yutmadan siradaki acik rotayi seciyor.
- Kalan problem hizli cift tik/dokunmada async `NEXT` handlerinin iki kez calisabilmesiydi. Interstitial gereken durumda ilk handler reklam promise'ini beklerken ikinci handler hemen rota baslatabiliyor, ilk handler reklam donusunde tekrar `startNextRoute()` cagirabiliyordu. Sonuc: tek kullanici niyeti bazen rota atlama / "calismadi" hissi.
- Fix: `nextRouteInFlight` guard eklendi. `SONRAKI` bir kez basildiginda interstitial + route start bitene kadar ikinci click/touch yok sayiliyor.

## Kapi fix

- Ortak kampanya finish render'i yesil `FINISH` levhasi yerine depo/konteyner cikis kapisi ciziyor: metal frame, shutter, EXIT isigi.
- Finish akisi `route.finishX` uzerinden korunuyor; geometri, chief/Hermes/coin verisi degismedi.
- Oyuncu finish'e girdiginde `finishGate.phase = closing`; inputlar temizleniyor, oyuncu kapinin icine cekiliyor, shutter ~0.52 sn kapaninca sonuc ekrani aciliyor.

## Testler

- `node --check js/a12-campaign.js`
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/finish-door-next.spec.cjs --reporter=line` -> 2 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/next-button-touch.spec.cjs --reporter=line` -> 2 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/chief-runner.spec.cjs --reporter=line` -> 23 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/hermes-tum-oyun.spec.cjs 03-test/dokunmatik-input.spec.cjs --reporter=line` -> 2 passed
- `node 03-test/d09-logic-audit.cjs` -> 22/22 routes issues=0

## Preview dosyalari

- `once.png`
- `kapi-acik.png`
- `kapi-kapandi.png`
- `sonraki-click-once.png`
- `sonraki-click-after.png`
