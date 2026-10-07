# HUD Arka Plan Kutusu

- Degisiklik: sol ust kampanya HUD panelindeki koyu dolgu/kose yuvarlama kutusu kaldirildi.
- Korunanlar: HUD yazilari ayni konum, font, boyut ve renklerle cizilmeye devam eder.
- Kapsam: `js/a12-campaign.js` icinde yalniz `drawHud()` arka plan cizimi degisti; sag ust dugmeler, alt ipucu, oyun fizigi ve rota verisi degismedi.

## Kareler

- `before-1280x720.png` / `after-1280x720.png`
- `before-800x450.png` / `after-800x450.png`
- `before-390x844.png` / `after-390x844.png`
- `before-844x390.png` / `after-844x390.png`
- `yanyana.png`

## Test

- PASS: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/player-visible-ui.spec.cjs` -> 4/4 passed.
- PASS: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/tn-a12.spec.cjs -g "campaign-i18n-complete"` -> 1/1 passed.
- FAIL (tekrarlandi): `03-test/player-visible-mobile.spec.cjs -g "fullscreen control"` -> fullscreen button portrait hide beklentisi; HUD kutusu degisikligiyle ilgili degil.
- FAIL (tekrarlandi): `03-test/player-visible-mobile.spec.cjs -g "landscape campaign framing"` -> D01 Bot S framing min ayagi `.25` altinda; HUD kutusu degisikligiyle ilgili degil.
