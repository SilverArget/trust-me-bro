# HUD Arka Plan Kutusu RET Duzeltmesi

- Aktif kod kaniti: cache'siz Playwright kosusunda canvas `fillRect(14,14,360,54)` stack'i `Object.drawOverlayIntegrated [as drawOverlay] (js/a12-campaign.js:3778)` olarak yakalandi.
- Onceki commit `drawHud()` yolundaki kutuyu kaldirmisti; ekrandaki panel entegre overlay yolundan geliyordu.
- Duzeltme: `drawOverlayIntegrated()` icindeki `#07151dd9` dolgu ve `fillRect(14,14,360,54)` kaldirildi.
- Korunanlar: HUD yazilari ayni konum/font/boyut/renklerle cizilmeye devam ediyor.
- Cache onlemi: kareler yerel HTTP sunucusunda `Cache-Control: no-store` ve benzersiz `hud_cache_bust` query ile yeniden alindi.

## Piksel Kiyaslari

`before-390x844.png` -> `after-390x844.png`, y=40:

- x=20: `(18,32,39)` -> `(80,93,98)`; delta `(+62,+61,+59)`
- x=150: `(9,24,34)` -> `(22,45,61)`; delta `(+13,+21,+27)`
- x=250: `(9,24,34)` -> `(22,45,61)`; delta `(+13,+21,+27)`

Tum viewportun ayni olcum noktalarinda panel dolgusu artik yakalanmiyor; after runtime canvas logunda `#07151dd9` / `fillRect(14,14,360,54)` cagrisi `0`.

## Kareler

- `before-1280x720.png` / `after-1280x720.png`
- `before-800x450.png` / `after-800x450.png`
- `before-390x844.png` / `after-390x844.png`
- `before-844x390.png` / `after-844x390.png`
- `yanyana.png`

## Test

- PASS: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/player-visible-ui.spec.cjs` -> 4/4 passed.
- PASS: `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/tn-a12.spec.cjs -g "campaign-i18n-complete"` -> 1/1 passed.
- FAIL (oncekiyle ayni): `node C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js test --workers=1 --reporter=line 03-test/player-visible-mobile.spec.cjs` -> 4/6 passed, 2 failed.
- Mobil failure'lar: `fullscreen control is reachable in landscape without covering play UI`, `landscape campaign framing keeps the runner in the lower gameplay band`; HUD kutusu disi davranislar.
