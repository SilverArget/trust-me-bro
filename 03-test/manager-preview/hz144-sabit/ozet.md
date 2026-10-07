# hz144-sabit-1007 raporu

Karar: "Fizik 60 Hz adimla" korunuyor. Bu turda sabit moda tek dusen kare toleransi eklendi: hizli moddayken `dt > 1/90` olan tek/iki kare akumulatoru silmiyor; ancak `dt > 1/75` uc ardisk kare olursa eski degisken-dt yola cikiliyor.

## Degisen dosyalar

- `index.html`: `PHYSICS_FIXED_STAY_DT_MAX=1/75`, `PHYSICS_SLOW_EXIT_FRAMES=3`; tolerans icindeki yavas karelerde 60 Hz adim islenmeye devam ediyor. Ayrica debug input trace hook'u eklendi (`window.__tmbInputTrace` yoksa no-op).
- `03-test/refresh-rate-audit.py`: `144-stutter` satiri eklendi; stutter profili her 18. rAF'ta `1/72` dt veriyor.
- `03-test/vp-dock-play.spec.cjs`: opsiyonel `TMB_INPUT_TRACE` ile rota kosusunda fizik adimi basina tus/state izi yazabiliyor.
- `03-test/vp-dock-input-replay.cjs`: D03 input trace replay araci eklendi.

## Refresh-rate audit

Komut: `python 03-test/refresh-rate-audit.py`

| Satir | raw apex | raw air | raw gap | jump apex | jump air | land X | gap | run px | Hermes dx | wall rise | wall frames | dive X |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 60 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1170.25 | 0.00 | 86 | 133 | 2208.31 |
| 120 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 144 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 144-stutter | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 165 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |

Not: 60 Hz `run px` onceki auditlerde de 60 Hz degisken yol oldugu icin 1170.25; hizli mod satirlari 60 Hz sabit mantik adimiyla 1166.

## D03 girdi tekrar

Trace komutu: `TMB_ROUTE_IDS=D03 TMB_INPUT_TRACE=...input-trace.json npx.cmd playwright test 03-test/vp-dock-play.spec.cjs -g "O-1 B-5" --workers=1 --reporter=line`

- 60 Hz normal harness trace sonucu: `PASS`, `13/13`, 1513 fizik kaydi.
- Ayni tus dizisini 144 Hz step sayacina gore replay: ilk ayrisma step 0. Beklenen ilk kayit `x=71.213, vx=48.430`; replay `x=70.403, vx=24.167`.
- Kesinlestirme: mevcut "60 Hz normal" Playwright kosusu tam `1/60` adim izi degil; ilk RAF adimi daha buyuk/jitterli geliyor. Bu yuzden state-by-state replay, fizik kodu ayrismasini degil 60 Hz harness zamanlamasini yakaladi.
- Ek kontrol: rAF'i tam 60'a sabitleyince D03 bot kosusu `11/13 FAIL` oluyor. Yani D03 coin sonucu fizik yoresinden cok botun karar/press zamanlamasina hassas.

## D03 3'er kosu dagilimi

| Mod | Kosu 1 | Kosu 2 | Kosu 3 |
|---|---|---|---|
| 60 Hz normal harness | PASS 13/13 | PASS 12/13 | PASS 12/13 |
| 144 Hz rAF harness | FAIL 11/13 | FAIL 11/13 | FAIL 11/13 |

144 Hz kosularinda eksik coinler logda `D03-c07,D03-c11`. 60 Hz normal kosular da coin sayisi olarak oynuyor; kabul PASS esigi `>=12/13`.

## Regresyon

- `chief-runner/hermes-tum-oyun/d09-sarkan/ios-tamekran/host-lock`: `35 passed, 2 skipped`.
- `dokunmatik-input` WebKit: `1 passed`.
- `dokunmatik-input` Chromium: `1 passed`.
- `node 03-test/d09-logic-audit.cjs`: tum rota `issues=0`.
- D01-D07 60 Hz subset: D03 `PASS 13/13`; D01, D02, D04, D05, D06, D07 baseline-fail karakterinde kaldi.

## Durum

Stutter toleransi kabul edildi: `144-stutter` fizik audit satiri 144 satiriyla ayni. D03 icin yeni kanit, kalan farkin fizik sabit adimindan degil harness/bot karar zamanlamasindan geldigini gosteriyor; state replay ise mevcut 60 Hz normal kosunun tam `1/60` iz olmadigini step 0'da kanitladi.
