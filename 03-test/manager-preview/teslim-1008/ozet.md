# Teslim 1008 Ozet

## Birlesenler
- `bb1595e` video-bulgu ustune `dunyalar-1007` (`e771c61`) merge edildi.
- `js/chief-paths.js` anahtar bazli birlesti: D01-D18 video-bulgu, F/M/A 01-06 dunyalar.
- `applyD09LogicRulesToRoutes` iki kapsami da koruyor: video-bulgu D duzeltmeleri ve F/M/A 6'li audit kapsami.
- `vp-dock-play.spec.cjs` 36 rota kapsamini korurken eski checkpoint tabanli retry algisina geri alindi.
- D11 askili halat ciziminde, dikey halat baska bir ground segmentini kesiyorsa o halat cizgisi cizilmiyor.

## Gorseller
- Menu/worlds: `menu-worlds-390x844.png`
- Yeni rota kareleri: `F05-1280x720.png`, `F06-1280x720.png`, `M05-1280x720.png`, `M06-1280x720.png`, `A03-1280x720.png`, `A04-1280x720.png`, `A05-1280x720.png`, `A06-1280x720.png`

## Kabul Tablosu
| Kapi | Sonuc |
|---|---|
| Merge conflict | PASS: yalniz `js/chief-paths.js`, anahtar bazli cozuldu |
| 36/36 benzersiz geometri | PASS |
| Chief hash/status | PASS: `chief-runner.spec.cjs` 23 passed, 36 hash PASS |
| F/M/A chief yeniden kayit | PASS: `record-chief-paths.cjs F01...A06` 18 passed, 36 rota yazildi |
| D18 snapback/ideal | PASS: O-1 D18 retries=0, deaths=0, chief catches=0 |
| D09 logic audit | PASS: 36 rotada issues=0 |
| D09 sarkan | PASS: 4 passed |
| Hermes | PASS: `hermes-tum-oyun.spec.cjs` 1 passed |
| Host lock | PASS: 5 passed |
| iOS | PASS: 2 passed, 2 skipped |
| Refresh-rate audit | PASS: komut exit 0 |
| Touch Chromium yeni 8 rota | PASS: 16 passed |
| Touch WebKit yeni 8 rota | FAIL: A03 390x844 ve A06 390x844 death before finish; 14 passed |

## Kalan Kirmizi
- WebKit 390x844 touch:
  - A03: rota sonu civari `x≈7652`, chief `x≈7630`, checkpoint reset/death.
  - A06: rota sonu civari `x≈7628`, chief `x≈7620`, checkpoint reset/death.
- 844x390 WebKit ve Chromium iki viewport geciyor.
