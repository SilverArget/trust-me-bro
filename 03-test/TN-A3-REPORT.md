# TN A3 Acceptance Report

## Architecture

Moving platforms remain inside the existing Canvas2D engine. `index.html::__installCampaignEngine` owns a static geometry snapshot plus `setDynamicSurfaces()`, so moving colliders are refreshed without `parkourCancel()`. `js/a12-campaign.js::updateIntegrated` advances deterministic platform state and applies the platform delta to a rider in the single legacy physics loop.

## A3a matrix

| Requirement | Implementation | Test | Status |
|---|---|---|---|
| MovingPlatform + crane carry | `index.html::setDynamicSurfaces`; `updateIntegrated` | `crane-ride` | IMPLEMENTED / PASSED |
| Safe lower fallback | D03 ground route under elevated load | `alternate-route-fallback` | IMPLEMENTED / PASSED |
| Flow feedback | `addFlow`, `flowFlash`, HUD pulse | `crane-ride` flow assertion | IMPLEMENTED / PASSED |
| Goals + local record | `bankRun().goals`, `bestRunsByRouteVersion` | `result-goals-and-local-record` | IMPLEMENTED / PASSED |
| D03 40 physical coins | `ROUTES.D03.coins` (25+15) | `d03-all-40-coins-real-input` | IMPLEMENTED / PASSED |
| D03 release unlock chain | NEXT order includes D03 | `release-d01-d02-d03-next-chain-and-durations` | IMPLEMENTED / PASSED |

## A3b matrix

| Requirement | Implementation | Test | Status |
|---|---|---|---|
| Collapse states + visible warning | `collapsing`, `updateIntegrated`, `drawWorldIntegrated` | `collapsing-floor-warning-and-fallback` | IMPLEMENTED / PASSED |
| 0.9 s warning | `D04.d04-collapse.warning=.9` | real contact, 0.75–1.20 s tolerance | IMPLEMENTED / PASSED |
| Safe lower fallback + finish | D04 continuous lower route | `collapsing-floor-warning-and-fallback` | IMPLEMENTED / PASSED |
| Retry reset | `retry()` rebuilds READY state and geometry | `collapse-checkpoint-reset` | IMPLEMENTED / PASSED |

## Commands

`NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test --workers=1 03-test/tn-a3.spec.cjs 03-test/tn-a12.spec.cjs 03-test/readiness.spec.cjs 03-test/parkour-tur1.spec.cjs` → 48/48 PASSED.

## Remaining

A3a and A3b are green. A3c/A3d are NOT_IMPLEMENTED. Measured routes: D01 32.9 s (short first route), D02 33.8 s (PARTIAL versus 45–90 s), D03 48.5 s test / within target, D04 fallback test 46.5 s. A12 + readiness + parkour short regression: 45/45 PASSED. No commit, push, publish, or full regression was performed.
# Continuation status — A3c

- D05 / moving pallet: **PARTIAL / FAILED**. Shared moving-surface implementation and route geometry exist, but left/low boarding and full-route acceptance are not green.
- D02 pacing extension: **IMPLEMENTED / NOT_TESTED**. A second loading-bay vault/slide/ramp sequence was added; final 45–90 s measurement is pending.
- A3d door/chase/hazard combination: **NOT_IMPLEMENTED / NOT_TESTED**.

## A3c continuation

- Moving-platform order is `beforePhysics collider update → legacy landPlatform → same-frame delta carry`; `moving-pallet-carry` passes all four direction/speed cases.
- Positive control with carry disabled failed at 47.70 px relative drift and was restored.
- D05 real-input full run passed with 40/40 coins and vault/slide/frontFlip; measured test duration was about 65 s.
- Collapse warning now uses game-clock transition stamps and passes 0.9 s ±0.05; wall clock is informational.
- D02 extended run measured 44.611 s, then received a final dispatch vault/340 px extension; the release-chain 45–90 s assertion passed (standalone test wall time 44.9 s).
- Short regression: 44/45 passed initially; the sole D02 bot failed because its input zones predated the new geometry. After updating those real-input zones, the D02 rerun passed, leaving all 45 short-regression cases green.

## A3-FIX — crane ride + D05 vault

### Root cause and product fix

- `index.html::__installCampaignEngine/applyCampaignSurfaces` (line 967): dynamic platforms were copied both into `cachedStaticPlatforms` and `cachedSolidRects`. In the frame order `beforePhysicsIntegrated → doPhysics horizontal collision → landPlatform → updateIntegrated carry`, the crane side collision could zero horizontal velocity before the later landing pass. Moving platforms now remain in the existing `staticPlatforms()/landPlatform` channel but are excluded from side-collision solids.
- `js/a12-campaign.js::updateIntegrated` (line 698): `rideFrames` was cumulative, so an earlier 6-frame contact survived while airborne; the acceptance poll could pass before real re-landing, during measured relative movement `-85.4 → -22.1 px`. It now resets off-support and therefore represents consecutive supported frames.
- `js/a12-campaign.js::ROUTES.D05` (line 223): the first sampled real-input jump occurred at player x `4204.1–4211.5`; with vault x=4300 the earliest measured player-edge gap was 64 px, outside unchanged `PK_LOOK_MAX=60`, so the press could become a normal jump. Moving the D05 vault to x=4280 places the same input in the legacy vault lookahead without changing input zones, timing, asserts, or the movement state machine.

### Acceptance measurements

| Acceptance | Measured + expected | Sample + input | Scope | Positive/control result |
|---|---|---|---|---|
| `crane-ride` | **5/5 PASS**; max−min relative x per run: **4.823, 10.672, 8.748, 4.823, 8.748 px**; expected `<12 px` | `--repeat-each=5`; real keyboard | D03 crane, shared moving-surface channel | Carry delta temporarily disabled: **FAIL, 53.727 px**; restored |
| `d05-clean-chain-40-coins-real-input` | **5/5 PASS**; every run observed **idle, run, jump, fall, vault, slide, frontFlip**; 40/40 coins; elapsed **55.066, 52.552, 46.748, 51.615, 52.535 s** (expected 45–90 s) | `--repeat-each=5`; real keyboard | D05 clean chain only | Vault x measurement: earliest old gap 64 px > 60 px lookahead; fixed gap is within lookahead |
| `moving-pallet-carry` | **3/3 PASS**; existing test enforces each direction/pace case `<8 px` and collider=landing=carry frame | `--repeat-each=3`; real keyboard | D05 pallet regression | Shared landing/carry path remained green |

Primary binding gate: `10 passed (6.4m)`. Pallet gate: `3 passed (20.9s)`. A preliminary post-fix crane check also passed `1/1 (23.8s)`. No full regression was run.

### Changed lines and final hashes

- `index.html:967` — moving platforms excluded from horizontal solid rectangles while retained for legacy `landPlatform`.
- `js/a12-campaign.js:223` — D05 vault x `4300 → 4280`.
- `js/a12-campaign.js:698` — reset `rideFrames` whenever support is absent.
- SHA-256 `index.html`: `9d50a719c9dc20810ddda1e3435668b8ec07cd31906655f9803b9610c0966b31`
- SHA-256 `js/a12-campaign.js`: `52826a6f1a0ddcc000cd7aa76af02c23046d688e46dd320b279c513449bb8852`

## A3-FIX2 — moving-platform side collision

### Root cause and changed lines

- `index.html:967` (`applyCampaignSurfaces`): A3-FIX correctly kept moving platforms out of the general vertical/parkour solids channel for crane boarding, but this also removed their horizontal side collision. Moving surfaces now remain in `cachedStaticPlatforms`/legacy `landPlatform` and are additionally published to `cachedMovingSideRects`, used only by the existing horizontal phase.
- `index.html:680` (`doPhysics`): grounded and ascending side contacts are separated at the platform edge, including the previously unhandled `player.vx===0` case. Airborne descent is capped to 2 px overlap so the unchanged landing solver can board; an existing rider whose center is already over the footprint returns to support without being ejected sideways.
- `index.html:185,651`: the moving-side cache is declared and cleared when returning to legacy scene geometry.
- `03-test/tn-a3.spec.cjs:27`: appended `moving-platform-side-block`; no existing test was changed.
- `js/a12-campaign.js`: unchanged; A3-FIX D05 vault position and off-support `rideFrames` reset are preserved.

### Acceptance measurements

| Acceptance | Measured + expected | Sample + input | Scope | Positive/control result |
|---|---|---|---|---|
| `moving-platform-side-block` pallet | **3/3 PASS**; all three phases contacted; max upward frame **0 px** (`<=4`), penetration **0 px** (`<=2`), contact y error **0 px** (`<=1`) | `--repeat-each=3`; D05 `placePlayer(820,407)`, real ArrowRight for 1.6 s, no jump | Moving-pallet side only | A3-FIX exclusion temporarily restored: **FAIL, 50 px** jump-less rise; restored |
| `moving-platform-side-block` crane | Final telemetry: real airborne side contact **measured**, max penetration **1.941 px** (`<=2`) | Real ArrowRight + Space; 3/3 gate plus telemetry run | D03 first crane side | No-contact exploratory samples were not reported as measurements |
| `crane-ride` | **3/3 PASS** in final primary gate; existing `<12 px` drift and flow assertions green | `--repeat-each=3`; real keyboard | D03 crane regression | Top-down/descent boarding preserved |
| `moving-pallet-carry` | **3/3 PASS**; four direction/pace cases per repeat, existing `<8 px` and frame-order assertions green | `--repeat-each=3`; real keyboard | D05 pallet regression | Existing rider footprint exemption preserves return-to-support |
| `d05-clean-chain-40-coins-real-input` | **3/3 PASS**; existing 40/40, vault+slide+frontFlip, 45–90 s assertions green | `--repeat-each=3`; real keyboard | D05 chain regression | A3-FIX vault correction preserved |

Primary binding gate: `9 passed (4.8m)`. New side-block gate: `3 passed (1.7m)`. Pallet focused gate: `3 passed (21.1s)`. No full regression was run.

### Final hashes

- SHA-256 `index.html`: `84d2fb4d7e606d26bbcd831fbc4b09f30fe82a12cb1530cfe32ffd9642141d65`
- SHA-256 `js/a12-campaign.js`: `52826a6f1a0ddcc000cd7aa76af02c23046d688e46dd320b279c513449bb8852`
- SHA-256 `03-test/tn-a3.spec.cjs`: `7eddd03df892b56a5d0f173605063fb7f808e5bfd35c1c7972383ba10a225762`

## A3d-1 — container door

## A3d-1-FIX — deterministic overpass + centered D02 pacing

| Requirement | Product location | Test / measured result | Positive control |
|---|---|---|---|
| Closed-door alternate route never stalls | `js/a12-campaign.js::ROUTES.D06`, `routeSurfaces`; overpass remains `kind:"movingPlatform"` | `container-door-alternate-route` 5/5; each crossed in `CLOSED`; `closedMinY=153.017/88.570/88.829/153.017/88.499 px`; PREPARING `1.0167/1.0167/1.0001/1.0166/1.0167 s`; every push=1, y=407, `dead=false`; fix was route geometry, not removal from the moving-side list | Replacing the ramp line with the former first step timed out at `x=915.662, y=320.992`; restored |
| D01→D03 release pacing | `js/a12-campaign.js::ROUTES.D02` | 3/3. D01 `29.804/29.337/27.799 s`; D02 `51.492/66.030/56.679 s`; D03 `53.392/53.379/53.376 s` | Independent baseline had D02 below threshold at `42.718 s` |
| Existing moving-surface and D05 behavior | unchanged shared `doPhysics → landPlatform → carry` | Targeted edge `crane-ride`, `moving-pallet-carry`, D05 clean chain, moving-side block: 4/4 in 2.1 min | n/a |

Root causes: the three fixed D06 stair surfaces were represented as moving-platform surfaces, so their vertical faces entered moving-side collision and made successive jumps timing-dependent; D02's prior 9200 px finish was calibrated against the 45 s lower boundary instead of the requested band center. Geometry now uses an existing ramp/front-flip launch onto one uninterrupted visible overpass, while D02 adds a 2500 px two-ramp dispatch parkour and checkpoint. No test, bot region, or physics path changed. A3d-2/A3d-3 were not started.

Final SHA-256: `index.html` `a01ebfe7bd705f321e03fdc3ad2b2e505ed4a8b6a85f444ad9bed5988665ee72`; `js/a12-campaign.js` `b835bbf226d97665c4d3ca318a06c306bc7bac2f2d883851f4c4c0bcfc8a76b2`; `03-test/tn-a3.spec.cjs` `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22` (unchanged).
| Requirement | Implementation | Test | Result |
|---|---|---|---|
| (a) Open passage reaches finish | `D06` ground lane; `containerDoors` starts OPEN | `container-door-alternate-route` | PASS 3/3; crossing state OPEN, result present · real ArrowRight · D06 teaching scene · overpass-independent |
| (b) Closed alternate route reaches finish | `routeSurfaces(overpass)` through existing one-way `landPlatform` channel | same | PASS 3/3; crossing state CLOSED, min y 198.833 px · real d+Space · all three overpass stages · disabled-collider control timed out at x919.919/y330.899 |
| (c) Visible PREPARING | `beforePhysicsIntegrated`, game-clock state machine; lamp + triangle + moving panel | same | 1.0166 s measured, expected >=0.8 s · debug state transition stamp · D06 door · configured 1.0 s |
| (d) No crushing/softlock | nearest-edge push + 0.28 s stagger; dynamic collider and render share `currentY` | same | pushes=1, player y=407, dead=false · closure-volume debug placement then natural transition · D06 door volume · overpass control separate |

State machine: `OPEN → PREPARING (1.0 s) → CLOSING (0.65 s) → CLOSED (20 s) → OPEN`, driven only by accumulated game `dt`. The teaching trigger waits for a stationary approach; running through an already-open gate does not close it invisibly on the player. `index.html::__installCampaignEngine` exposes only read-only `isDead()` for acceptance telemetry. D06 currently contains the A3d-1 teaching entry only; chase, supervisor, coins/duration completion, pause work, and hazard-combination scan remain A3d-2/A3d-3 and are not claimed.

Targeted gates: new test 3/3 (1.5 min); existing regression edge 4/4 (2.1 min). No full regression. Final SHA-256: `index.html` `a01ebfe7bd705f321e03fdc3ad2b2e505ed4a8b6a85f444ad9bed5988665ee72`; `js/a12-campaign.js` `e7ffac0af045703c3b4a4aeea23fb175f28b8c4e85e6fe62caa60fcf16f30fe2`; `03-test/tn-a3.spec.cjs` `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`.

## A3d-1-FIX2 — loaded vault window + D05 pacing + crane preparation audit

Root cause: `index.html::doPhysics/parkourChoose` consumed a Space sample immediately. Under load, the D05 bot's first x=4200-zone sample could occur before the unchanged 60 px vault selector window; the press became an ordinary jump and later samples arrived airborne, so `vault` was never entered. Edge queuing alone still lost vault in 2/4; the complete fix is a 0.35 s legacy `parkourBufferT` which, only while a tagged parkour obstacle is within 110 px, retries the existing selector and otherwise expires to the normal jump buffer. Positive control disabling this one branch lost vault in 1/4 loaded runs; restored.

D05 pacing: route `length/finishX` changed `12100/11960 → 10100/9960`, removing 2000 px of the mechanic-free tail after the x≈7010 landing. The same 25 physical main-line coins were redistributed from 420 px to 330 px spacing so all 40 remain reachable; obstacles, checkpoints, and test bot regions are unchanged.

Acceptance: D05 8/8 total (runs 1–4 unloaded, 5–8 with four concurrent PowerShell SHA-256 CPU loops). Every run observed `idle,run,jump,fall,vault,slide,frontFlip`, collected 40/40, and its asserted `result.elapsed` was within 45–90 s; the immutable test does not emit the individual elapsed values, so exact per-run values are not fabricated. Crane 8/8 (four loaded + four unloaded); no preparation-poll failure under load, separating the prior 1/6 as a scheduler/poll outlier rather than a crane phase-reset defect. Regression edge: release, moving-side, and door passed on the first run; pallet post-jump `rideFrames` was red once (`6→0`) and passed an immediate same-disk retry 1/1. No full regression.

Final SHA-256: `index.html` `2ee238dc1c9e1724b3a4ce197cf449c8c220ebfd1b832fa08b98bf65ce2a3a46`; `js/a12-campaign.js` `67a56ee6fddc6af473114562c643e4027e16d8565d10474504b2be85d1cf7e50`; unchanged `03-test/tn-a3.spec.cjs` `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`.

## A3d-1-FIX3 — same-frame legacy jump + deterministic D05 vault

- Root cause: `index.html::doPhysics` used `parkourBufferT` to suppress ordinary jump for 0.35 s near tagged geometry. Boost and invalid geometry therefore produced `vy=0` instead of the legacy same-frame jump. The timer/retry path is removed; full legacy parkour passed 25/25 in 10.5 s.
- Vault repair: keyboard/touch press edges are retained for one physics sample; D05's vault moved `x=4280→4240`. The unchanged immediate 60 px `parkourChoose` now sees the obstacle throughout the real-input zone. No jump is delayed. Four concurrent SHA-256 loops supplied CPU load; D05 passed 8/8 in 8.3 min, each with 40 coins, `vault/slide/frontFlip`, and elapsed in `[45,90]`. The immutable spec does not emit exact elapsed values, so none are invented.
- Pallet repair: `js/a12-campaign.js::updateIntegrated` preserves `rideFrames` during a rider's airborne hop while horizontal overlap remains and clears no-input residual vx on support. Pallet passed 8/8 in 55.7 s; crane passed 4/4 in 1.6 min.
- Positive control: restoring only D05 vault x=4280 under identical CPU load lost `vault` in the first run (1/1 red); x=4240 restored.
- Regression edge: release chain, moving-side block, container door, and readiness passed 6/6 in 3.4 min. Specs were unchanged.
- Final SHA-256: `index.html` `5b980b890831105ebf8f7b15b8631d93e2499e43e2954255bba1f769b4ed66a3`; `js/a12-campaign.js` `bab7cd0374eb7731b1485be49fbd47d1d82631ff340ac5cebe4e71890a630349`; `tn-a3.spec.cjs` `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`; `parkour-tur1.spec.cjs` `f16505033e001c0b091b5d46867405345c908caabcd57bef6ac65148b877eea9`.
## A3d-1-FIX4 — HEAD-equivalent input, campaign vault regression

### Root cause and fix

FIX3 added a second one-frame input latch (`jumpPressQueued`) beside legacy `keys.jump`, then consumed and cleared both in `doPhysics`. The additional edge-consumption path changed the frame on which A12's short real-input `Space` presses were evaluated: D01/D02 presses could be converted to ordinary jump before the tagged obstacle entered the 40–60 px legacy selection window, so no later vault state was observed. `index.html` now uses the exact HEAD `c4d9c12` keyboard/pointer/physics input statements again. No delayed jump or shared parkour lookahead was added. D05 retains only its route-local geometry adjustment (`d05-vault x=4240`).

### Legacy equivalence

| Synthetic input | HEAD c4d9c12 | Final code | Measured state/result |
|---|---|---|---|
| Press/hold 180 ms before tagged obstacle | `keys.jump`, one legacy consume | identical | A12 D01/D02 vault: 9/9 targeted PASS |
| Short press/release | no second latch | identical | same-frame normal jump fallbacks: parkour 125/125 across 5 repetitions |
| Boost + Space | `parkourChoose` rejects, normal jump fallback | identical | four-character boost fallback green in all 5 repetitions |
| Moving-platform rider, no horizontal input | not part of legacy route | `vx=0` only while overlapping a moving top, feet within 6 px, `vy>=0` | pallet 5/5; full legacy/A12 set green |

### Acceptance measurements

- Full four-spec gate: **56/56 PASS**, one worker, 9.7 min, same final disk. Readiness movement: 1511 / 1479.7 ms (<5 s).
- A12 targeted: `campaign-movement-and-frontflip`, D01 completion, D02 completion, each x3: **9/9 PASS**, 5.9 min; vault present in every run.
- D05: **6/6 PASS**, all six under four concurrent hidden PowerShell SHA-256 CPU loops (requirement >=3 loaded); each run passed 40 coins, `vault/slide/frontFlip`, and elapsed 45–90 s assertions.
- Pallet: **5/5 PASS**. Parkour suite was also repeated five times by the combined command: **125/125 PASS**.
- Positive control: restoring the FIX3 queue/take path made the first A12 movement run fail without vault; observed `idle,run,jump,fall,slide,frontFlip,frontFlipTuck`. The control was reverted before all final gates.
- Specs/bot regions/assertions/timing: unchanged.

### Final SHA-256

- `index.html`: `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`
- `js/a12-campaign.js`: `bab7cd0374eb7731b1485be49fbd47d1d82631ff340ac5cebe4e71890a630349`
- `tn-a3.spec.cjs`: `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`
- `tn-a12.spec.cjs`: `d89123e296c8afd60a71dd90e974681f05cf90e4fcd73338907154fdbed45d95`
- `readiness.spec.cjs`: `7a85b306f9b39996f6bb41642f5e2984f7c95c088a4e099bb4d2d4f079e47bf5`
- `parkour-tur1.spec.cjs`: `f16505033e001c0b091b5d46867405345c908caabcd57bef6ac65148b877eea9`

## A3d-2 — D06 Shift Supervisor, chase pause, readable finish

| Requirement | Product location | Test / four-field acceptance result | Positive control |
|---|---|---|---|
| D05 → NEXT → D06 completion | `ROUTES.D06`, `startRoute`, NEXT | PASS 1/1; D06 `result.elapsed` asserted `[45,90]`, isolated D06 Playwright wall `48.1 s` · real keyboard, real NEXT · release D05→D06/full D06 · immutable door test covers teaching mode | 120 px D06 pickup measured 38/40 red; 250 px production restored 40/40 |
| 40 physical coins | `ROUTES.D06.coins`, `collectPhysical` | `40/40`, expected 40 · one continuous real-keyboard run · 25 main + 15 skill coins/full D06 · 120 px control 38/40 | PASS after red control |
| Pause + visibility freeze | `campaignChief` in shared paused RAF | chief-x delta `0 px`, chief/player-distance delta `0 px`, expected <=1 px, for both 2 s button and 2 s visibility pause · debug placement then real pause/visibility events · active D06 chase; 3/3 · chase update outside paused RAF is the specified red control | PASS 3/3 |
| No unavoidable catch + checkpoint return | `updateIntegrated::campaignChief` | running catches `0`; stopped catches `1`, deaths `1`, return checkpoint matches, run coins retained · real ArrowRight + intentional 3 s stop · D06 main lane/chase · deliberate stop is positive catch control | PASS 3/3 |
| Readable finish marker | `drawWorldIntegrated` pole + flag + `t("finish")` | every D01–D06 row: pole pixels `>500`, text pixels `>0`, DOM overlays `0` · debug placement/canvas pixels · six routes separately; 3/3 · pre-fix integrated text absence was red | PASS 3/3 |
| Door OPEN upper route | D06 teaching overpass | OPEN crossing; min y `89.039/88.570/89.042 px`, pushes `0`, finish true · real ArrowRight + Space · door/overpass/finish; 3/3 · disabled-overpass control retained from A3d-1 | PASS 3/3 |

A3d-1-FIX correction: the overpass was not removed from the moving-side list; it remains `kind:"movingPlatform"`. Ramp + uninterrupted-overpass geometry fixed the timing-sensitive stair route.

Regression edge: parkour 25/25, selected A12 2/2, pallet/D05 2/2, and final immutable door 1/1 are green on the final product state. The combined 31-test run had only the pre-compatibility door red; that exact door then passed. No full four-spec run.

Final SHA-256: `index.html` `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js` `cd718a2a1ce73f70e4f64b0e72950392f978d2c397081ac71cd6dfe76612bdce`; `03-test/tn-a3.spec.cjs` `59e0d01d7be20ed178d9bd9d1ef0c55edadbe7acb967957227f8226bbabb5e92`.

## A3d-2-FIX — kısmi / D04 kapısında DUR

| Madde | Dosya / fonksiyon | Test | Sonuç |
|---|---|---|---|
| D06 release retry | `js/a12-campaign.js` / `installUI`, resume seçimi | `d06-retry-keeps-full-route` (satır 38) | 1/1 yeşil; 40 coin, x=3000 sonuç yok |
| D06 beceri hattı | `ROUTES.D06.coins`, `collectPhysical` | `d06-skill-line-requires-skill` (satır 39) | 1/1 yeşil; radius 120, beceri ≤7/15 |
| D06 fiziksel coin | `ROUTES.D06.coins` | `d06-all-40-coins-real-input` | 40/40 yeşil |
| D04 aralıklı timeout | `drawWorldIntegrated` denemesi geri alındı | `collapsing-floor-warning-and-fallback` ×6 | 5/6; DUR, kök neden doğrulanmadı |

Regresyon ucu: `chief-no-unavoidable-catch` 1/1 yeşil; tam 4 spec ve kalan uçlar stop kapısı nedeniyle koşulmadı.

## A3d-3 — combination scan and D01→D06 chain
| Requirement | File / symbol | Test | Result |
|---|---|---|---|
| Every ramp landing × hazard phases | `ROUTES`; analytical 2D landing/hazard rectangles | `hazard-combination-safe-landing` | PASS — 14 ramps × 20 phases, 280 samples, 0 intersections |
| Closed door remains escapable | D06 overpass + `containerDoors` | `hazard-combination-safe-landing` | PASS — CLOSED door → finish with real keyboard |
| No checkpoint-top barrel/crane spawn | D01–D06 checkpoints; D02 worker; D03 cranes | `hazard-combination-safe-landing` | PASS — 18/18, minimum finite clearance 82 px |
| Scan model tracks route source | D02 worker/barrel origin | `hazard-scan-model-matches-route-source` | PASS; positive control 2482→3282 red, restored |
| Hashless release NEXT chain | `installUI` / NEXT order | `release-d01-to-d06-next-chain` | PASS — 25.02/53.71/53.40/45.13/57.77/45.75 s |

No route defect was found; `js/a12-campaign.js` geometry/hazard placement was not changed.

Final SHA-256: `index.html` `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js` `6278619355543cc4ab5f65b1763f7d4fcf6dab1acbb722ede296a480e47dc964`; `03-test/tn-a3.spec.cjs` `bbc608929548d40a2c0c181c3cf3b99d00330a5228a0e7d36241ec12035267c8`.

## A3d-3-STAB — intermittent red diagnosis

| Requirement | File / symbol | Test | Result |
|---|---|---|---|
| D04 intermittent fallback | `ROUTES.D04` (unchanged) | `tn-a3.spec.cjs:19` ×8 + retained trace on failure | PASS 8/8; failure not reproduced, no product change |
| D03 crane-side preparation | `ROUTES.D03.d03-crane` (unchanged) | `tn-a3.spec.cjs:27` ×8 + direct trace ZIP analysis | 6/8; test poll is phase-sensitive: 50 px / 92 px/s = ~0.54 s window versus stable 1 s poll interval. Recommendation only; spec/product unchanged |
| D01 vault observation | `ROUTES.D01` (unchanged) | `tn-a12.spec.cjs:14` ×8 + retained trace on failure | PASS 8/8; failure not reproduced, no product change |

No ROUTES correction was justified, so no geometry positive-control mutation was performed. D03 trace evidence records bad start state x=1073.89/y=407/run and crane x=1489.53/dx=+1.536 px per frame; the good diagnostic reached gap=30.74 px at 13.0 s with x=1093.83/y=407/idle.

Regression edge: `parkour-tur1.spec.cjs` 25/25 passed. No route/product line was changed; full four-spec regression was not run.

Final SHA-256: `index.html` `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js` `6278619355543cc4ab5f65b1763f7d4fcf6dab1acbb722ede296a480e47dc964`; `03-test/tn-a3.spec.cjs` `bbc608929548d40a2c0c181c3cf3b99d00330a5228a0e7d36241ec12035267c8`; `03-test/tn-a12.spec.cjs` `d89123e296c8afd60a71dd90e974681f05cf90e4fcd73338907154fdbed45d95`; `03-test/parkour-tur1.spec.cjs` `f16505033e001c0b091b5d46867405345c908caabcd57bef6ac65148b877eea9`.
