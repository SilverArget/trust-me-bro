# D02 Basamak

- Kok neden: D02 basindaki `d02-roof1-*` ve `d02-roof2-*` gorsel basamak bloklari solid govdeydi. Oyuncu saga kosarken bir sonraki basamagin sol yuzune carpiyor, `vx=0` ile yerinde kosuyordu. Bu olum, chief yakalamasi, checkpoint/reset veya vault/catch degil; D04 ile ayni sinif step-face collision idi.
- Olcum: eski davranista ilk kilit `x=188` civarinda `d02-roof1-3` sol yuzunde goruldu. Yeni `03-test/d02-basamak.spec.cjs` kosusunda bitis ornegi `x=1163.154`, `maxBack=0`, `stuckFrames=0`, `chiefCaught=false`, `deaths=0`.
- Fix: `d02-roof1-*` ve `d02-roof2-*` bloklari gorsel/support olarak kaldi ama `solid:false` yapildi. Oyuncu carpisma yuzeyi icin gorunmez `d02-roof1-up/flat/down` ve `d02-roof2-up/flat/down` slope yuzeyleri eklendi; slope yuzeyi cizilmiyor.
- Diger rota taramasi: ayni statik risk sinifi F04 icindeki `f04-p1-d02-roof*` kopyasinda da aday olarak gorunuyor. Bu komitte dokunulmadi; composite route/chief zamanlamasi riski nedeniyle ayri olcumlu is olmali. Diger eski `*-slope/down/up/step*` bloklari da statik adaydir, fakat bu video icin dinamik repro D02 baslangicidir.
- Chief path: D02 yeniden kaydedildi, route hash `7cfa1beabca7071a55b094b277d27f06f8a579bfd63f08d88d4158cc97a57fa9`. Dock lead 2.5 s ve chief 15% ladder davranisi degismedi.
- Commit: `2733c3d` (`Fix D02 opening step collision`).

## Testler

- `npx.cmd playwright test 03-test/d02-basamak.spec.cjs --workers=1 --reporter=line` -> PASS 2/2
- `node 03-test/d09-logic-audit.cjs` -> PASS, 22 rota, 0 issue
- `npx.cmd playwright test 03-test/chief-runner.spec.cjs --workers=1 --reporter=line` -> PASS 23/23
- `npx.cmd playwright test 03-test/hermes-tum-oyun.spec.cjs --workers=1 --reporter=line` -> PASS 1/1 full
