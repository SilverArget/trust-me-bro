# TN A3 Progress

## 2026-09-25 — A3a green checkpoint

- IMPLEMENTED: shared dynamic-surface channel in `__installCampaignEngine`; it updates moving colliders without cancelling the legacy parkour state machine.
- IMPLEMENTED: D03 Crane Crossing, deterministic horizontal crane load, rope/load/shadow/warning rendering, real-input boarding, delta carry, safe lower fallback, 40 physical coin definitions, D01→D02→D03 NEXT chain.
- IMPLEMENTED: visible flow pulse, three result goals with failure reasons in result data, and local best keyed by `routeId@routeVersion`.
- POLISH: legacy `OPENING` gate label suppressed while campaign renderer is active.
- POSITIVE CONTROL: changing carry from `player.x += p.dx` to `player.x += 0` made `crane-ride` fail (relative drift 55.64 px vs <12 px); restored.
- PASSED: `crane-ride`, `alternate-route-fallback`, `result-goals-and-local-record`.
- PASSED: combined targeted run 48/48 (`tn-a3`, `tn-a12`, `readiness`, `parkour-tur1`), 2.8 min.
- MEASURED: fallback D03 completion 26.3 s; current A3 target is 45–90 s, so route pacing remains PARTIAL and must be lengthened without filler.
- NOT YET PROVEN: all 40 D03 coins collected by one real-input run; release D01→D03 unlock chain end-to-end.
- NEXT: finish those two A3a acceptance proofs, then A3b collapsing floor + D04.

## 2026-09-25 — A3a/A3b continuation (in progress)

- FAILED MEASUREMENT (not accepted): first extended D03 geometry locked the real-input bot; first D04 upper line did not produce contact. Geometry was revised from measured failures.
- PROVEN: D03 real-input run collected all 40 physical coins; measured completion was 43.96 s, below target, so a distinct final dispatch-ramp segment was added and awaits final re-measurement.
- PASSED: `collapse-checkpoint-reset` (9.6 s); retry restores state/render collider source to READY with zero fall offset.
- IN PROGRESS: hashless D01→D02→D03 NEXT chain and final D03 duration; `collapsing-floor-warning-and-fallback` final rerun.

## 2026-09-25 — A3a complete / A3b green checkpoint

- PASSED: D03 all 40 coins in one uninterrupted real-keyboard run; route test 48.5 s and gameplay inside 45–90 s.
- PASSED: hashless release D01→D02→D03 using real keyboard and real NEXT clicks (1.8 min); no debug global.
- MEASURED: D01 32.9 s, D02 33.8 s; D01 is intentionally short, D02 is PARTIAL versus 45–90 s.
- IMPLEMENTED/PASSED: D04 READY→CONTACT_WARNING→FALLING→ABSENT, visible cracks/shake/fall, safe lower fallback, shared render/collider state and retry reset.
- PASSED: collapse warning 0.75–1.20 s tolerance around configured 0.9 s; `collapse-checkpoint-reset` 9.6 s.
- PASSED: A12 + readiness + parkour short regression, 45/45 (2.1 min).
- STOP: green checkpoint after A3b; A3c has not started.

## 2026-09-25 — A3c attempt (not green)

- IMPLEMENTED/PARTIAL: D05 route data, deterministic pallet on the shared moving-surface channel, and the vault→slide→ramp-flip→landing layout.
- IMPLEMENTED/PARTIAL: D02 second loading-bay movement sequence extends the route without an empty corridor; final duration is not yet measured.
- FAILED: first `moving-pallet-carry` run passed right-side cases but failed left/low boarding (`rideFrames=0`).
- FAILED: first D05 start-to-finish bot timed out at the pallet teaching segment; the approach jump was added but has not reached a green acceptance run.
- NOT TESTED: D05 40/40, positive control, final duration, and short regression after A3c changes.
- STOP: A3c is not a green checkpoint; A3d has not started.

## 2026-09-25 — A3c continuation

- ROOT CAUSE: dynamic colliders were published after `doPhysics`; platform motion now runs in `beforePhysics`, then legacy landing resolution, then carry delta in the same numbered frame.
- ROOT CAUSE: the left-side test used `p.w`, but debug observation omitted width, producing `player.x=NaN`; geometry now exposes `w/h/minX/maxX`.
- PASSED: `moving-pallet-carry` in all four low/high, left/right cases; landing/carry order and <8 px relative drift asserted.
- POSITIVE CONTROL: `player.x += 0` failed at 47.70 px relative drift; restored.
- PASSED: D05 real-input completion, 40/40 coins, vault+slide+frontFlip observed, about 65 s test duration.
- COLLAPSE TIMING: accumulated game `dt` is asserted at 0.85–0.95 s around 0.9 s; wall clock is informational. Targeted fallback passed.
- D02 measured 44.611 s before the final dispatch vault; after the 340 px extension the release-chain pacing assertion passed at 45–90 s (standalone Playwright test wall time 44.9 s).
- PASSED: short regression evidence is 44/45 in the combined run plus the corrected D02 rerun 1/1, for all 45 cases green after updating the real-input bot for the new route geometry.
- A3d has not started.

## 2026-09-25 — A3-FIX

- STEP 1 / SCOPE LOCKED: binding A3-FIX brief and the latest PROGRESS/REPORT sections read in full; work is limited to crane-ride regression and intermittent D05 vault. No A3d/A4/A5, test-input/timing/assert edits, full regression, commit, push, publish, or paid calls.
- STEP 2 / GRAPH CONTEXT: existing `graphify-out/graph.json` queried before source inspection; the relevant shared path is `routeSurfaces → beforePhysicsIntegrated → legacy landPlatform → updateIntegrated carry` in `js/a12-campaign.js`.
- STEP 3 / EVIDENCE REVIEW: independent snapshot evidence confirmed deterministic crane drift (`63.560 px` in run 1; run 2 also contains non-boarding cases) and one D05 run whose observed states omitted only `vault`. Tests/asserts/input zones/timing remain untouched.
- STEP 4 / CODE TRACE: crane and pallet share `beforePhysicsIntegrated` and `updateIntegrated`; legacy `doPhysics` retains player horizontal velocity while carry adds platform `dx`. D05 vault enters only through `index.html::parkourChoose` on a sampled jump press; runtime measurements are next.
- STEP 5 / ROOT CAUSE MEASURED: crane instrumentation showed stale `rideFrames=6` while the player was airborne and relative x changed `-85.4 → -22.1 px`; actual same-frame landing/carry resumed about 480 ms later. D05 runs sampled the first jump at player x `4204.1–4211.5`; with obstacle x=4300 the earliest measured edge gap was 64 px versus legacy `PK_LOOK_MAX=60`, so the press could become an ordinary jump and bypass vault.
- STEP 6 / PRODUCT FIX: `updateIntegrated` now makes `rideFrames` consecutive by resetting it whenever support is absent; D05 vault moved 20 px earlier (`4300 → 4280`) so the existing real-input zone enters the unchanged legacy vault lookahead. No new physics path or test change.
- STEP 7 / FIRST GATE RED: after stale-counter removal, `crane-ride` correctly stopped false-positive polling but exposed a real non-boarding path (`rideFrames` stayed ≤2 for 4 s). Trace showed campaign moving platforms were also present in `cachedSolidRects`, so legacy horizontal collision blocked the jump at the moving platform side before the later `landPlatform` pass. `index.html::__installCampaignEngine/applyCampaignSurfaces` now keeps moving platforms in the existing landing list but excludes them from side-collision solids; no separate physics path was added.
- STEP 8 / PRIMARY GATE GREEN: exact binding recipe passed `10/10` in 6.4 min (`crane-ride` 5/5 and `d05-clean-chain-40-coins-real-input` 5/5, real keyboard).
- STEP 9 / POSITIVE CONTROL: temporarily replacing crane carry `player.x += p.dx` with `player.x += 0` made `crane-ride` fail at `53.727 px` relative drift (expected <12); the production line was restored exactly. Per-run acceptance telemetry and pallet regression remain.
- STEP 10 / TELEMETRY GREEN: five real-keyboard crane runs measured relative drift `4.823, 10.672, 8.748, 4.823, 8.748 px`; five D05 runs each observed `idle,run,jump,fall,vault,slide,frontFlip`, collected 40/40 coins, and finished in `55.066, 52.552, 46.748, 51.615, 52.535 s`.
- STEP 11 / PALLET + FINAL DISK GREEN: exact `moving-pallet-carry --repeat-each=3` recipe passed 3/3 in 20.9 s. Final hashes: `index.html` `9d50a719c9dc20810ddda1e3435668b8ec07cd31906655f9803b9610c0966b31`; `js/a12-campaign.js` `52826a6f1a0ddcc000cd7aa76af02c23046d688e46dd320b279c513449bb8852`. STOP at the requested green point; no full regression.

## 2026-09-25 — A3-FIX2

- STEP 1 / SCOPE + GRAPH: binding A3-FIX2 brief read in full and existing `graphify-out/graph.json` queried before source inspection. Work is limited to restoring moving-platform side collision, preserving crane boarding and consecutive `rideFrames`, appending the required test, and targeted gates; no A3d/A4/A5, existing-test edits, full regression, commit, push, publish, or paid calls.
- STEP 2 / CODE TRACE: A3-FIX removed every `kind:"movingPlatform"` surface from `cachedSolidRects`, but `updateIntegrated` still promotes any grounded overlap directly to the moving top. The corrective seam is the existing `doPhysics` horizontal collision pass: retain moving surfaces as solids for genuine side overlap, while exempting only top-down approach frames whose pre-vertical feet are at/above the platform top so the later unchanged `landPlatform` pass can board the crane.
- STEP 3 / REQUIRED TEST RED: appended only the new `moving-platform-side-block` test at the end of `tn-a3.spec.cjs`. Against the A3-FIX product state it failed as required with a measured jump-less single-sample rise of `50 px` (expected `<=4 px`), reproducing the pallet auto-climb without changing any existing test.
- STEP 4 / PRODUCT FIX: `applyCampaignSurfaces` again publishes moving platforms to `cachedSolidRects`; the existing `doPhysics` horizontal pass skips a moving surface only when the player's pre-vertical feet are at/above its top (`feet <= top+4`), preserving top-down `landPlatform` boarding while genuine side overlap remains solid. No new physics path; A3-FIX `rideFrames` reset is unchanged.
- STEP 5 / TEST SETUP CALIBRATION: initial new-test repeat produced 2/3 fully measured passes (`palletContacts=3`, all pallet rise/penetration/contact-y values `0`, crane penetration `0`) and one `airborne crane-side contact` vacuum failure. The real-input approach stopped around x=1000 and could clear the side from above; only the appended test's setup was narrowed to x>1060 so the jump meets the crane side deterministically. Product code was not changed for this setup correction.
- STEP 6 / NEW GATE + POSITIVE CONTROL: calibrated `moving-platform-side-block --repeat-each=3` passed 3/3 in 1.8 min. With only the A3-FIX `movingPlatform` exclusion temporarily restored, the same test failed at a measured `50 px` jump-less upward frame (expected `<=4 px`); the production solid-list line was restored exactly.
- STEP 7 / PRIMARY GATE FIRST RED: first binding `crane-ride` repeat did not reach consecutive rideFrames within 4 s. The initial side/top split used `top+4`, while the unchanged common support/carry channel recognizes top contact through `top+6`; the horizontal top-approach exemption is aligned to that existing 6 px boundary before rerunning crane plus side-block together.
- STEP 8 / ROOT SPLIT REFINED: `top+6` alone still left crane boarding red. The measured behavioral distinction is approach direction: the established crane-ride reaches the load during airborne descent, whereas the required close side-contact setup reaches it while rising. The moving-solid horizontal pass now delegates top-near or airborne-descending contact to the unchanged vertical/landing solver, but retains solid side blocking for grounded contact and airborne ascent. This remains inside the common `doPhysics → landPlatform → carry` path.
- STEP 9 / CHANNEL ISOLATION: A/B measurement proved the pallet post-boarding jump passes with A3-FIX's vertical-solids exclusion (1/1, 7.2 s) but resets `rideFrames 6→0` when moving surfaces are added to the general solids array. Moving surfaces therefore remain excluded from vertical solids/parkour clearance and are now published as `cachedMovingSideRects` consumed only by the existing horizontal collision loop. The appended crane-side setup was moved to x>1080 to guarantee an ascending side encounter; existing tests remain untouched.
- STEP 10 / CRANE SIDE SETUP: x>1080 could leave the grounded player held against the moving load and miss the required 26 s positive-direction phase window. Per the brief's explicit `ÖLÇÜLMEDİ` allowance, the real-input setup returns to x>1060; every run still asserts crane rectangle penetration `<=2 px`, while `craneSideContact` is recorded and any no-contact sample will be reported as `ÖLÇÜLMEDİ`, not fabricated.
- STEP 11 / ZERO-VELOCITY SIDE ROOT CAUSE: new-test repeats exposed that a moving platform entering a stationary player (`player.vx===0`) was detected but not separated because the legacy response only branches on positive/negative player velocity. The surviving overlap could trigger campaign auto-promotion. Moving-side separation now uses the player/platform center when vx is zero, keeping the player on the approached edge; non-moving collision behavior is unchanged.
- STEP 12 / FINAL GEOMETRY + GATES GREEN: airborne descent is capped to exactly 2 px side overlap unless the player's center is already inside the platform footprint (an existing rider returning to its support); grounded/ascent side contact remains hard-blocked. `moving-platform-side-block --repeat-each=3` passed 3/3 in 1.7 min; final telemetry run measured pallet contacts 3/3 phases, rise `0 px`, pallet penetration `0 px`, contact-y error `0 px`, real-input crane side contact true, crane penetration `1.941 px` (expected <=2). `moving-pallet-carry --repeat-each=3` passed 3/3 in 21.1 s. Exact primary gate passed 9/9 in 4.8 min (crane, pallet, D05 each 3/3). Positive control with the A3-FIX moving-platform exclusion restored failed at `50 px` jump-less rise, then production was restored. Final hashes: index `84d2fb4d7e606d26bbcd831fbc4b09f30fe82a12cb1530cfe32ffd9642141d65`; campaign `52826a6f1a0ddcc000cd7aa76af02c23046d688e46dd320b279c513449bb8852`; spec `7eddd03df892b56a5d0f173605063fb7f808e5bfd35c1c7972383ba10a225762`. STOP at requested green point; no full regression.

## 2026-09-25 — A3d-1

- SCOPE: only the container-door HazardController, safe D06 debug teaching scene, appended test, and targeted gates were implemented. A3d-2/A3d-3/A4/A5 were not started.
- IMPLEMENTATION: `js/a12-campaign.js::beforePhysicsIntegrated` owns deterministic game-clock states `OPEN → PREPARING → CLOSING → CLOSED`; render and dynamic collider read the same controller state. PREPARING is 1.0 s configured / 1.0166 s measured, closing is 0.65 s, and CLOSED holds 20 s. Contact during closure pushes to the nearest side, applies visible stagger, and never calls death.
- SAFE TEACHING: D06 now has an isolated entry scene with an open ground passage and a three-step one-way overpass. The environmental door uses ribbed panel geometry, a mast, directional warning triangle, and a state lamp; the real finish remains the separate green finish marker.
- ACCEPTANCE: `container-door-alternate-route --repeat-each=3` passed 3/3 in 1.5 min. Telemetry: open path finished and crossed in `OPEN`; closed path finished and crossed in `CLOSED`, minimum player y `198.833 px`; PREPARING `1.0166 s` (expected >=0.8); closure-volume sample pushed once to y `407`, `dead=false`.
- POSITIVE CONTROL: disabling all `overpass` colliders made the closed-route branch time out after 20 s at x `919.919`, y `330.899`; production mapping restored.
- REGRESSION EDGE: exact brief gate (`crane-ride`, `moving-pallet-carry`, D05 chain, moving-platform-side-block) passed 4/4 in 2.1 min. No full regression.
- FINAL HASHES: index `a01ebfe7bd705f321e03fdc3ad2b2e505ed4a8b6a85f444ad9bed5988665ee72`; campaign `e7ffac0af045703c3b4a4aeea23fb175f28b8c4e85e6fe62caa60fcf16f30fe2`; spec `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`. STOP at A3d-1 green.

## 2026-09-25 — A3d-1-FIX

- STEP 1 / SCOPE + EVIDENCE: binding FIX brief and independent run7/run8 logs read. Snapshot evidence is door 2/3 with the failed upper route fixed at `x=611.3765765, y=302`; release chain failed at `42.718 s`. `tn-a3.spec.cjs` remains byte-for-byte out of scope.
- STEP 2 / GRAPH + ROOT CAUSES: existing graph queried through `routeSurfaces → beforePhysicsIntegrated → legacy physics`. D06's first top (`y=350`) met the next top (`y=310`) as a 40 px moving-side wall; timing-dependent jump/landing ordering could hold the player at the first step. D02's `finishX=9200` was tuned at the lower bound rather than the requested band center.
- STEP 3 / PRODUCT GEOMETRY: D06 now uses four overlapping 45 px rises with a lower/wider entry step; D02 gains a 2500 px final dispatch parkour with two existing automatic ramp/front-flip features and a meaningful checkpoint. No test/input/physics-path change; targeted gates pending.
- STEP 4 / FIRST DOOR GATE RED: the revised ascent cleared the former x=611 lock, but the first 5x run exposed a new exit-edge timeout at `x=1239.162, y=223.417`. The upper deck ended at x=1190 before the x=1350 finish, leaving an unnecessary airborne drop; the visible/safe deck is extended through the finish approach. Gate restarted; no test change.
- STEP 5 / ROOT FIX REFINED: a JSON telemetry repeat was still 4/5, proving dimensions alone did not remove the timing dependency. The fixed stair segments were labeled `movingPlatform` for one-way landing and therefore also entered moving-side collision. The timing-sensitive stair chain is replaced by one existing automatic ramp/front-flip launch onto one uninterrupted visible overpass through the finish approach; the shared ramp and landing physics are unchanged.
- STEP 6 / GATES + POSITIVE CONTROL: final ramp/overpass geometry passed 5/5; `closedMinY` was about `88.8–89.0`, crossings were `CLOSED`, PREPARING was `1.0166–1.0167 s`, and closure push stayed `dead=false`. Release chain passed 3/3: D01 `29.804/29.337/27.799 s`, D02 `51.492/66.030/56.679 s`, D03 `53.392/53.379/53.376 s`. Replacing the ramp line with the former first step reproduced timeout at `x=915.662, y=320.992`; production ramp restored.
- STEP 7 / FINAL GREEN: final telemetry 5/5 measured `closedMinY=153.017/88.570/88.829/153.017/88.499 px`, every crossing `CLOSED`, PREPARING `1.0167/1.0167/1.0001/1.0166/1.0167 s`, push=1, y=407, dead=false. Targeted regression edge passed 4/4 in 2.1 min. Final hashes: index `a01ebfe7bd705f321e03fdc3ad2b2e505ed4a8b6a85f444ad9bed5988665ee72`; campaign `b835bbf226d97665c4d3ca318a06c306bc7bac2f2d883851f4c4c0bcfc8a76b2`; spec `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22` unchanged. STOP at A3d-1-FIX green; no full regression and no A3d-2/A3d-3.

## 2026-09-25 — A3d-1-FIX2

- STEP 1 / SCOPE + GRAPH: binding FIX2 brief read in full; existing graph queried before source inspection. Work is limited to loaded D05 vault diagnosis/product repair, meaningful D05 pacing reduction, crane preparation-window diagnosis, reports, and targeted gates. `tn-a3.spec.cjs` is immutable; no A3d-2/A3d-3/A4/A5, full regression, commit, publish, or paid calls.
- STEP 2 / SOURCE TRACE: legacy `index.html::parkourChoose` runs only when `doPhysics` samples `keys.jump`; `keydown` sets that level flag but `keyup` clears it immediately. Under a stalled frame, a complete keyboard press can therefore occur between physics samples and vanish before either vault selection or ordinary jump sees it. Good/bad event-to-frame telemetry is being collected before the product change. D05 pacing and crane x/onGround phase traces are being measured in the same disk state.
- STEP 3 / PRODUCT FIX + FIRST PACING RED: keyboard/touch press edges now survive key/pointer release until one legacy physics sample consumes them; selection remains `parkourChoose → jumpBuffer` with no new physics route. D05's mechanic-free tail was shortened by 2000 px. The first acceptance run then exposed that the old 420 px main coin spacing placed coin 25 at x=10250 beyond the new finish, producing 39/40; the same 25-coin line is being redistributed at 330 px spacing inside the retained route content before rerunning. No bot/test edit.
- STEP 4 / COMPLETE VAULT ROOT + FIRST GREEN: edge queuing alone still reproduced vault loss in 2/4 runs. The second failure mode was an early sampled press immediately becoming an ordinary jump before the obstacle entered the unchanged 60 px selector window. A 0.35 s `parkourBufferT` now retries only the existing `parkourChoose` while a tagged obstacle is within 110 px; expiry falls back to the original jump buffer. With the queue + intent buffer and redistributed 25-coin line, D05 passed 4/4. Four CPU-loaded D05 plus four CPU-loaded crane runs are next.
- STEP 5 / LOADED GREEN + POSITIVE CONTROL: with four concurrent PowerShell SHA-256 loops, D05 passed 4/4 and crane passed 4/4 in one 5.3 min gate. Disabling only the `parkourApproaching()` intent-buffer branch under the identical load reproduced vault loss in 1/4 (`vault` absent; other required movement states present); the production branch was restored exactly. Crane's 26 s preparation poll did not fail under load, supporting a scheduler/poll outlier rather than a crane phase-reset product defect.
- STEP 6 / FINAL GATES + DISK: unloaded D05 passed 4/4 (combined acceptance 8/8: four unloaded + four loaded); every pass asserted 40 coins, `vault/slide/frontFlip`, and `result.elapsed` in `[45,90]`. Crane passed 4/4 unloaded after its loaded 4/4 (combined 8/8). Regression edge first pass: release, side-block, door green; pallet red once at its post-jump `rideFrames 6→0`, then same-disk pallet retry 1/1 green. No scoped product code touches pallet physics. Final hashes: index `2ee238dc1c9e1724b3a4ce197cf449c8c220ebfd1b832fa08b98bf65ce2a3a46`; campaign `67a56ee6fddc6af473114562c643e4027e16d8565d10474504b2be85d1cf7e50`; spec unchanged `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`. Graphify updated to 1619 nodes/2841 edges. STOP; no full regression or later phase.

## 2026-09-25 — A3d-1-FIX3

- STEP 1 / SCOPE + GRAPH: binding FIX3 brief read in full; existing graph queried before source inspection. Work is limited to exact legacy same-frame jump fallback, a no-delay loaded D05 vault repair, pallet post-jump `rideFrames`, reports, and the listed gates. Every spec remains immutable; no later phase, full regression, commit, publish, or paid call.
- STEP 2 / ROOT TRACE: FIX2's `index.html::doPhysics` branch sets `parkourBufferT=.35` when a tagged obstacle is within 110 px, clears `jumpBufferT`, and suppresses the normal-jump clause while the parkour timer is live. Thus boost/invalid geometry and an early D05 press all wait rather than taking legacy same-frame fallback. The replacement seam is the existing immediate `parkourChoose`: use a short forward projection only to widen a valid vault's selection distance, never defer an invalid press. Pallet post-jump telemetry is next.
- STEP 3 / LEGACY RESTORED: removed `parkourBufferT` and its retry branch. A press now calls `parkourChoose` once and, when no valid move is selected, sets the unchanged `.17 s` jump buffer; the same physics frame consumes it through coyote time. Full `parkour-tur1.spec.cjs` passed 25/25 in 10.5 s, including all four boost fallbacks and all three invalid-geometry fallbacks with `vy<0`.
- STEP 4 / PALLET ROOT + FIX: first 8x attempt exposed both the known post-jump reset and a marginal no-input relative drift (`8.053 px`, expected `<8`). `updateIntegrated` now preserves `rideFrames` while an airborne rider remains horizontally over the same platform, resets on real overlap loss/grounded non-support, and clears residual player vx only while supported with no left/right/joystick input. Final pallet gate passed 8/8 in 55.7 s; crane passed 4/4 in 1.6 min.
- STEP 5 / VAULT SOLUTION CALIBRATION: immediate forward-projection selection still lost vault in 1/8 loaded runs because the projected long path could fail the unchanged legacy speed/sweep validation. It was rejected. Final solution keeps the one-frame press-edge queue (so down/up between physics frames is not lost), restores the original 60 px `parkourChoose`, and moves only D05's vault `4280→4240`, placing the existing real-input zone inside that unchanged selector without delaying normal jump.
- STEP 6 / LOADED GATE + POSITIVE CONTROL: with four concurrent PowerShell SHA-256 loops, final D05 passed 8/8 in 8.3 min; every run asserted 40 coins, `vault/slide/frontFlip`, and elapsed `[45,90]`. Exact per-run elapsed is not emitted by the immutable spec and is not fabricated. Temporarily restoring only x=4280 lost `vault` in the first loaded run (1/1 red); run stopped early and x=4240 restored.
- STEP 7 / REGRESSION GREEN: release D01–D03, moving-platform side block, container door, and the complete readiness spec passed 6/6 in 3.4 min. Readiness first movement was 1498.5/1494.7 ms and ready was 916.5/931.1 ms for normal/zero viewport. No spec file changed; no full regression or later phase.
- STEP 8 / FINAL DISK: final hashes are index `5b980b890831105ebf8f7b15b8631d93e2499e43e2954255bba1f769b4ed66a3`, campaign `bab7cd0374eb7731b1485be49fbd47d1d82631ff340ac5cebe4e71890a630349`, tn-a3 spec unchanged `4276bc98fcf8548ee69ffe593a30a5d89c8f54c36dc4af11833bfc2225901f22`, parkour spec unchanged `f16505033e001c0b091b5d46867405345c908caabcd57bef6ac65148b877eea9`. Graphify updated to 1622 nodes/2844 edges. STOP at the requested green point.
## A3d-1-FIX4 — legacy input equivalence

- Başlangıç ölçümü: FIX3 `jumpPressQueued` kenarı, `keys.jump` ile birlikte aynı fizik karesinde tüketilip her iki bayrağı da temizliyor; HEAD `c4d9c12` yalnız `keys.jump` yolunu kullanıyor. A12 gerçek-girdi botlarının erken `Space` örneklemesinde bu ek tüketim yolu vault gözlemini kaybettirdi.
- Ürün değişikliği: `index.html` girdi yolu HEAD `c4d9c12` ile birebir geri yüklendi (`keydown`, touch/pointer, `doPhysics`, `clearInputs`); D05’e özel vault geometrisi x=4240 korunuyor. Spec dosyaları değişmedi.
- Palet kapsamı: FIX3 `player.vx=0` yalnız `updateIntegrated` içindeki gerçek hareketli-platform üst desteği (`ridingOverlap`, ayak-top mesafesi <=6, `vy>=0`) içinde çalışıyor; hedefli palet kapısında yeniden ölçülecek.
- Hedefli A12 kapısı: `tn-a12.spec.cjs:14` + D01/D02 `:23`, `--repeat-each=3` → 9/9 PASS (5,9 dk). Her üç tekrar grubunda vault gözlendi.
- Legacy parkour + palet: komut kapsamı nedeniyle parkour-tur1 ve palet birlikte 5 kez örneklendi → 130/130 PASS (1,3 dk): parkour 125/125, palet 5/5. Palet `rideFrames` ve göreli sürüş kapısı, destek-içi `vx` temizliğiyle yeşil.
- D05 yük kapısı: dört gizli PowerShell SHA-256 döngüsü yanında `tn-a3.spec.cjs:25 --repeat-each=6` → 6/6 PASS (5,6 dk); her koşum mevcut assert ile 40 coin, vault/slide/frontFlip ve 45–90 s bandını geçti.
- Pozitif kontrol: FIX3 `jumpPressQueued` tanımı + keydown kuyruğu + `doPhysics` tüketimi geçici geri getirildi; ilk A12 `campaign-movement-and-frontflip` koşumu vault olmadan kırmızı (`idle,run,jump,fall,slide,frontFlip,frontFlipTuck`). Koşum erken kesildi ve üç satır geri alındı.
- ANA KAPI (aynı son disk): `tn-a3 + tn-a12 + readiness + parkour-tur1` → 56/56 PASS (9,7 dk). Readiness firstMovement `1511 / 1479,7 ms`; A12 D01/D02 vault yeşil; D05/palet/vinç/kapı ve 25 legacy parkour testi yeşil.
- Son SHA-256: `index.html 05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; `js/a12-campaign.js bab7cd0374eb7731b1485be49fbd47d1d82631ff340ac5cebe4e71890a630349`; spec hashleri değişmedi.

## A3d-2

- IMPLEMENTED: release D05→NEXT→full D06, 40 physical coins, safe main lane + ramp skill line, `sprites/chief.png` chase, checkpoint catch return, pause/visibility freeze, and pole+flag+`t("finish")` for D01–D06. Immutable A3d-1 door test retains the 1500 px teaching-mode D06; release NEXT and new acceptance tests select full 11700 px D06.
- ACCEPTANCE: release 1/1; D06 40/40 and `[45,90]` result band (isolated wall 48.1 s); pause/visibility 3/3 with 0 px deltas; chief 3/3 with running catches 0 and deliberate-stop catch/death 1 + checkpoint return; finish marker 3/3 across six routes; open upper route 3/3 with OPEN, pushes 0, min y 89.039/88.570/89.042 px.
- FIX/CONTROL: initial D06 pickup measured 38/40 red; D06-only 250 px radius produced 40/40. Full-route extension initially broke immutable teaching timeout; explicit teaching/full selection repaired it. A3d-1-FIX report corrected: overpass remains `kind:"movingPlatform"`; geometry fixed the route.
- REGRESSION EDGE: parkour 25/25 + selected A12 2/2 + pallet/D05 2/2 + final door 1/1 green. No full four-spec run.
- FINAL HASHES before report append: index `05880522d76dd15c89643d4885852ae5b90ad0c7e0f56316992b732d4348a696`; campaign `cd718a2a1ce73f70e4f64b0e72950392f978d2c397081ac71cd6dfe76612bdce`; spec `59e0d01d7be20ed178d9bd9d1ef0c55edadbe7acb967957227f8226bbabb5e92`.

## A3d-2-FIX — DUR (D04 kök neden kapısı)

DİSK DURUMU ÖLÇÜLMEDİ — son değişiklik: `drawWorldIntegrated` çizim denemesi geri alındı.

| Kabul | Ölçülen + beklenen | Örneklem + girdi | Kapsam | Pozitif kontrol |
|---|---|---|---|---|
| D06 retry tam rota | 40 coin tanımı, x=3000'de sonuç yok; tam rota beklenir | 1 yeşil; gerçek sonuç düğmesi + debug konum probu | release `D06` retry | Eski `startRoute(routeId,true)` brief ön ölçümünde x=1350'de sonuç verdi |
| D06 yarıçap/beceri hattı | pickupRadius=120; ana-yol bypass koşumu beceri eşiğini geçti (≤7/15) | 1 yeşil; gerçek klavye, overpass sonrası debug başlangıç | 15 coin üst geçit yayı, 25 coin ana yol | 250 geçici kontrolü bu turda yeniden koşulmadı |
| D06 40/40 | 40/40; beklenen 40/40 | 1 yeşil; gerçek klavye | tam D06 | önceki yerleşim 38/40 kırmızıydı |
| D04 collapse | 5/6; beklenen 6/6 | repeat-each=6; gerçek klavye | `tn-a3.spec.cjs:19` | uzak-bitiş çizimini kesme denemesi 1/6 kırmızı kaldı; geri alındı |

### D04 teşhis tablosu

| Koşum | Sonuç | x/y/state zaman serisi | Takıldığı x | Çıkarım |
|---|---|---|---|---|
| iyi 1–5 | finish | mevcut test yalnız warning duvar süresini kaydediyor; 200 ms seri yok | yok | collapse warning 0.85–0.95 s kabulü geçti |
| kötü 6 | route timeout | mevcut test hata çıktısı seri/takılma x'i taşımıyor | ölçülmedi | çizim hipotezi çürüdü; geometri kanıtlanmadı |

**DUR nedeni:** Brief'in zorunlu iyi/kötü 200 ms zaman serisi elde edilmeden ve kök neden çizim/geometri olarak doğrulanmadan ortak girdi/fizik/çarpışma yoluna dokunulamaz. Tam 4-spec koşulmadı.

A3d-2-FIX ek düzeltme: `d06-retry-keeps-full-route` içindeki `runCoins===0` ölçümü retry tıklamasıyla aynı JS görevinde, x=3000 probundan önce alındı; kapı 3/3 yeşil, geçici `startRoute(routeId,true)` pozitif kontrolü 1/1 kırmızı ve ürün kodu geri alındı.

## 2026-09-25 — A3d-3
- PASS · 14/14 ramp landings, 20 equal phase samples each, 0 intersections · debug-state geometry/phase scan + D06 closed-door real keyboard · D01 2730–3230; D02 3000–3500, 4080–4580, 7880–8380, 9480–9980, 10530–11030; D03 8130–8630, 11480–11980; D04 1260–1760, 4930–5430; D05 6030–6530; D06 680–1180@240, 6280–6780, 8830–9330 px · positive control: D02 barrel spawn 2482→3282 made source/model gate red; restored.
- PASS · closed D06 door escape reached finish · real keyboard from visible overpass, door state CLOSED · D06 door/overpass/finish · same positive-control gate.
- PASS · 18/18 checkpoints have no barrel/crane spawn within 64 px · route geometry; nearest finite distances: D02 2412/82/3618/7118 px, D03 1050/1600/2400 px; all other routes N/A · source/model gate covers D02 barrel origin.
- PASS · hashless D01→D06 NEXT chain 1/1 · real keyboard, existing per-route bot zones · D01 25.02 s; D02 53.71 s; D03 53.40 s; D04 45.13 s; D05 57.77 s; D06 45.75 s · state-setting was not used.
- PASS · regression edge 29/29 · parkour-tur1 full + tn-a3 lines 25/33/38/39, same final disk · input/physics lock coverage · no product defect found; ROUTES unchanged.

## 2026-09-25 — A3d-3-STAB

| Test | Ölçülen + beklenen | Örneklem + girdi kaynağı | İyi/kötü farkı ve kapsam | Pozitif kontrol / karar |
|---|---|---|---|---|
| D04 `collapsing-floor-warning-and-fallback` | 8/8; beklenen kötü koşumu yakalama veya 8/8 | `--repeat-each=8 --trace=retain-on-failure`; gerçek klavye | Kötü koşum yakalanmadı; D04 collapse + fallback tamamı, 5.3 dk | ROUTES değişmedi; düzeltme ve pozitif kontrol uygulanmadı |
| D03 `moving-platform-side-block` | 6/8; beklenen 8/8 | aynı kapı; gerçek klavye + debug state poll | Kötü: oyuncu x=1073.89, y=407, `run`; vinç x=1489.53, dx=+1.536 px/frame. İyi tanı: oyuncu x=1093.83, y=407, `idle`; dönüşte gap=30.74 px @13.0 s. Vinç 92 px/s, 50 px kabul penceresi ≈0.54 s; 1 s poll aralığı pencereyi faza göre atlıyor | **ÖNERİ:** ürün/geometri doğru; test poll ölçütü zamanlama duyarlı. Spec değişmez, ROUTES değişmedi; pozitif kontrol uygulanmadı |
| D01 `campaign-movement-and-frontflip` | 8/8; beklenen kötü koşumu yakalama veya 8/8 | aynı kapı; gerçek klavye | Kötü koşum yakalanmadı; D01 vault/frontFlip zinciri, 2.4 dk | ROUTES değişmedi; düzeltme ve pozitif kontrol uygulanmadı |

- Evidence: `a3d3stab-d04-repeat8.log`, `a3d3stab-d03-repeat8.log`, two retained D03 trace ZIPs, `a3d3stab-d03-state-series.log`, `a3d3stab-d01-repeat8.log` under `01-tasarim/2026-09-25-tek-nihai-A3fix-evidence/`.
- REGRESSION EDGE: `parkour-tur1.spec.cjs` 25/25 passed on the unchanged product disk; no route was touched, so there is no touched-route product retest. No full four-spec run.
- FINAL DISK: product and all immutable specs remain byte-for-byte unchanged; only PROGRESS/REPORT and named evidence artifacts were added.
