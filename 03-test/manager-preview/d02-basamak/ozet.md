# D02 Basamak

- Kök neden: D02 başlangıcındaki `d02-roof1-*` ve `d02-roof2-*` görsel basamak blokları solid gövdeydi. Oyuncu sağa koşarken bir sonraki basamağın sol yüzüne çarpıyor, `vx=0` ile yerinde koşuyordu; bu ölüm, chief yakalaması, checkpoint/reset veya vault/catch değil, D04 ile aynı sınıf step-face collision idi.
- Ölçüm: eski davranışta ilk kilit `x=188` civarında `d02-roof1-3` sol yüzünde görülüyordu. Yeni `03-test/d02-basamak.spec.cjs` koşusunda bitiş örneği `x=1163.154`, `maxBack=0`, `stuckFrames=0`, `chiefCaught=false`, `deaths=0`.
- Fix: `d02-roof1-*` ve `d02-roof2-*` blokları görsel/support olarak kaldı ama `solid:false` yapıldı. Oyuncu çarpışması için görünmez `d02-roof1-up/flat/down` ve `d02-roof2-up/flat/down` slope yüzeyleri eklendi; slope yüzeyi çizilmiyor.
- Diğer rota taraması: aynı statik risk sınıfı F04 içindeki `f04-p1-d02-roof*` kopyasında da aday olarak görünüyor. Bu komitte dokunulmadı; composite route/chief zamanlaması riski nedeniyle ayrı ölçümlü iş olmalı. Diğer eski `*-slope/down/up/step*` blokları da statik adaydır, fakat bu D02 videosundaki nokta için dinamik repro D02 başlangıcıdır.
- Chief path: D02 yeniden kaydedildi, route hash `7cfa1beabca7071a55b094b277d27f06f8a579bfd63f08d88d4158cc97a57fa9`. Dock lead 2.5 s ve chief 15% ladder davranışı değişmedi.
- Commit: ilk fix commitinden sonra doldurulacak.

## Testler

- `npx.cmd playwright test 03-test/d02-basamak.spec.cjs --workers=1 --reporter=line` -> PASS 2/2
- `node 03-test/d09-logic-audit.cjs` -> PASS, 22 rota, 0 issue
- `npx.cmd playwright test 03-test/chief-runner.spec.cjs --workers=1 --reporter=line` -> PASS 23/23
- `npx.cmd playwright test 03-test/hermes-tum-oyun.spec.cjs --workers=1 --reporter=line` -> PASS 1/1 full
