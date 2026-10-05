# Frozen hard progress

- HEAD baseline: `cedfe7c`.
- `stash@{0}` was inspected read-only and was not popped.
- Draft plan uses unique halves: F01 D07+D13, F02 D08+D14, F03 D09+D15, F04 D10+D16, F05 D11+D17, F06 D12+D18.
- Removed obsolete fixed-speed chief generation; Frozen uses recorded ideal-runner paths at 1.2 s delay.
- Draft generation measured: F01 7918.8/24/11, F02 9279.6/30/14, F03 8164.86/18/5, F04 8914.08/25/11, F05 9801.6/33/13, F06 8036.4/28/10 (length/movements/added obstacles).
- Static gate stopped productization: geo `74 PASS / 6 FAIL`; transitions failed on catchable surface integrity, three-launch dive coins, and legacy peakY assumptions. Parity currently hard-codes 30 routes and rejected 32.
- Product `js/a12-campaign.js`, record/play tests, and tracked F01-F04 inputs were restored to `cedfe7c`; no chief recordings or commit were produced.

## 2026-10-04 turn 15 — n-part F01/F02 WIP

- Added `03-test/build-frozen-hard-pair.cjs`. It loads the committed
  `build-dock18.cjs` function prefix in a VM and calls its exact `compose()`;
  it does not execute Dock regeneration. Registry/flow remains unchanged.
- Current product WIP changes exactly the F01/F02 COINS and ROUTES lines;
  D01-D18 remain byte-equal to `cedfe7c`. No chief paths were recorded.
- F01 = D07 left half + D13 right half: length 9416.4, 27 movements,
  14 added hard obstacles, 14 coins.
- F02 = D08 left half + D14 right half: length 9638.4, 31 movements,
  14 added hard obstacles, 14 coins.
- Generator emits transported transitions to
  `03-test/frozen-hard-generated/transitions-F01.json` and `-F02.json`.

### Raw gates

- `node 03-test/vp-dock-geo.cjs`: `76 PASS / 4 FAIL`.
  - F01 IR expected 17, actual direct-ID match 0.
  - F02 IR expected 34, actual direct-ID match 0.
  - F02 legacy slope expected 5, actual direct-ID match 0.
  - Real data failure: F01 catchable `f01-p1-d07-v-02`, y=-28.62 is off
    the 1/8 px catchable grid.
  - The first three failures are old single-Vector-source assertions and need
    composite-aware transformed-source comparison, not relaxed counts.
- `node 03-test/vp-dock-transitions.cjs`: command exit 0 but mandatory output
  is red because the checker still loads original F01/F02 source transitions.
  - `F01 kod eşliği`: FAIL; F02 happens to report PASS against its legacy
    immutable exception and is not a valid hard-route gate.
  - Catchable FP guard: F01 `f01-p1-d07-v-02` y=-28.62 FAIL.
  - Fallback catchable list is legacy F01/F02 IDs and therefore not a valid
    comparison for composed IDs.
  - Three-launch dive coin output is INFO in the legacy checker; current hard
    candidates fail for multiple dive moves. Coin placement must be rebuilt
    from the generated transitions' suggested three-launch intersections.

### Next exact step

1. Snap/remove the off-grid F01 catchable according to the transported
   surface role while preserving fallback catchability.
2. Make geo/transitions read `frozen-hard-generated` for `mode:"hard"` and
   compare each transformed part against its declared source interval.
3. Promote the hard-route three-launch coin report to a mandatory gate and
   use its suggestions to select 14 distinct real moves (CJ8/CC4/CS2).
4. Only after both static gates are green: generate F01/F02 route inputs,
   record chief paths at delay 1.2, and run the requested Playwright matrix.

## 2026-10-04 turn 17 — composite/static gates green, dynamic gate red

- Generator now snaps every hard-route catchable surface to the 1/8 px grid
  when transport error is <=0.07 px. `f01-p1-d07-v-02` is now `-28.625`.
- Composite declarations use the D17/D18-style part metadata. Geo additionally
  verifies every part's source id, w/h and one uniform x/y transform.
- Generated transition ids were corrected to retain the Dock source id
  (`f01-p1-d07-*`, etc.), so route surfaces and transported transitions agree.
- Coins are selected from 14 distinct obstacle movements (CJ8/CC4/CS2); no
  dive coin is selected, so the mandatory three-launch failure count is 0.

### Raw static gates

- `node 03-test/vp-dock-geo.cjs`: `80 PASS / 0 FAIL`.
- `node 03-test/vp-dock-transitions.cjs`: exit `0`; code parity F01/F02 PASS,
  fallback catchable `[]` PASS, dive coin guard `[]` PASS, all mandatory gates PASS.

### Dynamic recording gate (no product recording accepted)

- `node 03-test/record-chief-paths.cjs F01 F02`: `2 failed`.
- F01: stuck at x=298.00, 0.92s vault `f01-hard-7` then 1.03s catch
  transition 0; obstacle starts x=330. This is an R2/R3 interaction and must
  be removed/relocated by data before recording.
- F02: finish, death=0, retry=0, but coin `2/14`; missing c01,c02,c03,c04,
  c05,c07,c08,c09,c11,c12,c13,c14. Current obstacle-center coin placement
  (`baseY-24`) does not intersect the player's actual obstacle arcs and must be
  replaced by 60 Hz movement-arc candidate measurement, while preserving 14
  distinct move ids and CJ8/CC4/CS2.
- F02 also reports stun on the inherited D08 slide and `f02-hard-2`; INFO for
  the established chief model, not the current blocking condition.
- No chief-path product entry was accepted; temporary F01/F02 record files
  are removed before continuation.

### Next exact step

1. Extend hard obstacle placement to test R2 against the next transported
   catch/dive window and R3 against prior landing; relocate/remove
   `f01-hard-7`, then rerun F01 ideal.
2. Measure obstacle jump/slide arcs at 60 Hz and place one collectible at a
   >=3-frame intersection per distinct movement; report candidate counts by
   kind if fewer than 14.
3. Re-run static gates, then recording and the remaining Frozen matrix.

## 2026-10-04 turn 19 — R2/R3 gate added, proven coin pool insufficient

- `build-frozen-hard-pair.cjs` now checks every added obstacle against every
  transported transition launch (R2 >=128) and previous landing (R3 >=96),
  shifting candidates in 8 px increments or dropping them. This covers catch,
  dive and scripted transitions and removes the `f01-hard-7 @330` placement.
- `vp-dock-transitions.cjs` now independently recomputes the same hard-route
  R2/R3 facts and makes any violation a mandatory failure.
- The Dock compose helper's transported coin positions and original `move_id`
  values were inspected instead of accepting synthetic `mix-*` identities.
  This exposed that the source halves do not contain 14 distinct proven arcs:
  - F01 distinct proven pool: CJ 5 / CC 3 / CS 1; required 8 / 4 / 2.
    Missing: CJ 3 / CC 1 / CS 1.
  - F02 distinct proven pool: CJ 8 / CC 2 / CS 1; required 8 / 4 / 2.
    Missing: CC 2 / CS 1.
- Therefore the former obstacle-centre placement and duplicated source coins
  are both rejected. New 60 Hz ideal-path intersections must be measured for
  added vaults/slides and transported catch/climb moves; each selected coin
  needs >=3 intersecting frames using the engine `COIN_FILL_RADIUS` value.
- The product file remains the previous WIP because the generator stops before
  writing when the distinct movement pool is short. No chief recording was
  accepted and no dynamic tests or commit were run.

### Next exact step

1. Add a measurement-only recording pass that emits 60 Hz player rectangles
   per movement without requiring coin completion.
2. Fill only the shortages above from distinct hard movements, place the coin
   at the best >=3-frame intersection, and make the coin/move arc check a
   static mandatory gate (including the existing three-launch dive rule).
3. Generate F01/F02, run geo + transitions, then chief recording and the full
   Frozen pair matrix.

## 2026-10-04 turn 21 — measured coins and chief records green; final matrix pending

- Added measurement-only `TMB_MEASURE_HARD_TRACE=1`: coin acceptance is
  disabled while the normal finish/death/retry gates remain active. Raw 60 Hz
  player rectangles and parkour states are written to
  `frozen-hard-generated/F01-60hz-trace.json` and `F02-60hz-trace.json`.
- The first measurement exposed consecutive-obstacle collisions beyond the
  transition-only R2/R3 check. The hard generator now preserves R2 >=128 and
  R3 >=96 and also keeps a conservative 220 px pose-recovery runway between
  consecutive obstacles. Final additions: F01 7, F02 4.
- Measurement runs: F01 33.95 s, F02 37.37 s; both finish, death=0, retry=0.
- Each final coin uses a distinct movement and a measured position with at
  least three 60 Hz contacts against the engine's 8 px fill radius. Straight
  running samples are not candidates.
- Final kinds: F01 `CJ 8 / CC 4 / CS 2`; F02 `CJ 7 / CC 5 / CS 2`.
  F02 deviation: the eighth CJ was a dive without the independent
  three-launch proof, so it shifted to a fifth proven CC as authorized.
- Static gates: geo `80 PASS / 0 FAIL`; fallback catchable `[]` PASS; hard
  R2/R3 `[]` PASS; dive coin guard `[]` PASS; F01/F02 code parity PASS.
- Final coin runs: F01 14/14 in 33.90 s; F02 14/14 in 37.47 s; both finish,
  death=0, retry=0.
- `record-chief-paths.cjs F01 F02`: `2 passed`; wrote 20 routes to
  `js/chief-paths.js`, Frozen delay 1.2 s. F02 stun remains INFO only
  (11.633–12.716 s sparse samples), per the accepted ideal-runner policy.
- Not yet run: active-chief F01/F02 min-gap pass, F01 keyboard x2 and touch
  x2, fatal-void and missed-dive negatives, F01 pause negative, updated
  20-route stale guard, D01/D05/D11/D17 regressions, parity, byte guards.
- `chief-runner.spec.cjs` still contains the obsolete F01 null-chief assertion
  and must be updated before that suite is run. No commit/push was made.

## 2026-10-04 turn 25 — F03/F04 dense-half WIP

- HEAD baseline: `c3707e3`; no commit/push.
- Measured unused source halves (movements/1000 px): D09 left 5.999,
  right 5.217; D15 left 4.858, right 3.470; D10 left 6.387, right
  4.405; D16 left 3.246, right 3.746.
- Selected densest halves: F03 = D09 left + D15 left; F04 = D10 left +
  D16 right. No F01/F02 interval is reused.
- Added `build-frozen-hard-f03f04.cjs`, which executes the accepted n-part
  F01/F02 hardening pipeline with the selected sources. Composite geo,
  transitions, trace and density test routing now includes F03/F04.
- Measurement-stage products: F03 length 4705.20, 21 movements, 2 added
  obstacles; F04 length 10248.48, 20 movements, 5 added obstacles. These do
  not yet meet the new density gate (required respectively >=6.599 and
  >=7.026 movements/1000 px), and are not eligible for chief recording.
- Coin-independent 60 Hz measurement is dynamically red before traces can be
  accepted:
  - F03 stuck x=277.76 after `tutunma-1` and inherited
    `f03-p2-d15-vault-04`.
  - F04 stuck x=374.00 after inherited `f04-p1-d10-vault-04` and dive-0.
- The WIP is intentionally retained. Next: make inherited obstacle placement
  participate in the same R2/R3/recovery corridor gate (currently only added
  hard obstacles do), then add only corridor-safe vault/slides until both
  density thresholds and manual-input/1000 thresholds pass. After successful
  coin-independent traces, rebuild 14 distinct measured coins and continue
  with chief recording/tests.

## 2026-10-04 turn 27 — length/transport accounting corrected, density WIP

- Full-route thresholds: F03 `max(D09 3.521,D15 3.123)*1.10 = 3.873/1000`;
  F04 `max(D10 3.414,D16 2.123)*1.10 = 3.755/1000`.
- F03's old 4705 px was not dropped geometry: a noninitial left piece overlaps
  backward at the compose cursor. Current three-part F03 is D09 left .50 +
  D15 left .50 + D11 right .56: length 9591.84, 41 moves, 4.274/1000 PASS.
- F03 transported accounting (obstacle/dive/scripted): D09 `0/6/7=13`, D15
  `3/4/6=13`, D11 `1/3/3=7`, plus 8 hard obstacles = 41.
- Inherited obstacles now use the same R2>=128, R3>=96 and 220 px recovery
  gate; they shift in 8 px increments or are omitted, with deviations in
  `frozen-hard-meta.json`. Invalid synthetic composite seams are discarded.
- Corrected source transition maps: D15<-A01 and D16<-A02. This removed the
  five fallback-catchable failures. Current geo `78 PASS / 0 FAIL`; F03/F04
  parity PASS; fallback `[]` PASS; hard R2/R3 `[]` PASS.
- Current F04 is D10 left .50 + D16 right .80 + D09 right .68, length 9428.88
  but 29 moves = 3.076/1000 FAIL. Accounting: D10 `1/4/11=16`, D16
  `0/0/0=0`, D09 `1/4/1=6`, plus 7 hard obstacles. The D16 cut transports
  geometry but no movements, so it must be replaced/re-cut before tracing.
- Dive-coin guard remains expected RED for measurement-stage placeholder
  coins. No chief recording, dynamic matrix, commit, or push this turn.

### Next exact step

1. Replace/re-cut F04 p2 with an unused movement-bearing interval; retain
   8–10k length and meet >=3.755/1000 plus manual-input density.
2. Then run coin-disabled traces, measured coins, delay-1.2 recording and the
   requested matrix.

## 2026-10-04 turn 29 — F04 replacement candidate audit

- F03 remains static-ready: 9591.84 px, 41 movements, 4.274/1000 >= 3.873.
- Removed zero-movement D16 interval from the F04 plan. Unused replacement trials:
  - D12 right .62: 10792.56 px / 38 moves (length FAIL).
  - D12 right .86 + D09 right .75: 9924.96 px / 33 moves = 3.325/1000 (density FAIL).
  - D17 right .50: 12070.08 px / 42 moves (length FAIL).
  - D17 right .80 + D09 right .75: 9199.68 px / 32 moves = 3.478/1000 (density FAIL).
  - Current WIP D17 right .70 + D09 right .86: 9472.08 px / 35 moves = 3.695/1000, below required 3.755 (density FAIL).
- Current F04 uses D10 left .50 + D17 right .70 + D09 right .86. D17 transports movements, unlike D16, but the composition needs one additional corridor-safe movement or a denser unused interval.
- No 60 Hz trace, measured coins, chief recording, dynamic matrix, commit, or push was accepted because the mandatory density gate is red.
- Next: choose a part whose interval density is >= its full source route density and whose final composition is >=3.755/1000; then continue trace -> coins -> chief -> matrix.

## 2026-10-04 turn 31 -- F04 density green, 60 Hz composition gate red

- F04 retained plan D10 left .50 + D17 right .70 + D09 right .86.
- Full 220 px recovery was restored; the prior 208 px F04 exception was removed.
- Added candidate audit to frozen-hard-meta.json. Rejected positions record raw R2, R3, previous-obstacle and next-obstacle distances.
- Alternate 8 px phase selected one nominally legal movement: f04-hard-10, slide at x=3928 on f04-p1-d10-v-21. Static density became 36 / 9472.08 = 3.801/1000, above 3.755.
- Coin-disabled 60 Hz run is RED before traces are accepted:
  - F04 stops at x=3890.48 after vault-f04-hard-1 then slide-f04-hard-10. The placement gate does not reject rectangle overlap because previous/next calculations ignore an obstacle intersecting the candidate. Fix: require occupied.every(non-overlap) in both primary and alternate-phase placement, then re-audit density.
  - F03 stops at x=277.76 after tutunma-0. Product route shows p2 D15 left surfaces beginning at x=70 while p1 D09 still occupies the same x range. Thus the reported 9591.84 length is not proof of sequential geometry: the second left part overlaps the first. Fix composition/cursor transport before any coin trace.
- No F03/F04 trace, measured coin set, chief record, dynamic matrix, commit, or push was accepted. HEAD remains c3707e3.

## 2026-10-04 turn 33 - sequential cursor and overlap gates

- Fixed shared n-part compose cursor: every interval minimum x now starts at previous part maximum x, for both left and right cuts.
- Added explicit overlap rejection to normal and alternate hard-obstacle placement; `f04-hard-10` is no longer accepted over `f04-hard-1`.
- Added mandatory hard-route gates for sequential part bounds, obstacle/obstacle overlap, and obstacle/dive-or-catch-window overlap. Meta now records `partBounds`; F01-F04 were evaluated.
- New sequential measurements: F03 8960.64 px / 29 moves = 3.236 per 1000 (threshold 3.873 FAIL); F04 9472.08 px / 32 moves = 3.378 per 1000 (threshold 3.755 FAIL). The former F03 9591.84 / 4.274 result is invalid.
- Static raw: part order `[]` PASS; obstacle overlap `[]` PASS; transition overlap FAIL: F02 `f02-p1-d08-slide-01` vs dive 23 [2916.61,2956.61], F03 `f03-p2-d15-vault-05` vs dive 27 [6429.46,6469.46], F04 `f04-p1-d10-vault-04` vs dive 0 [213.22,253.22], F04 `f04-p3-d09-slide-04` vs dive 35 [7689.08,7729.08].
- F02 is committed in c3707e3 and the requested matrix preserves F01/F02 ROUTES/COINS byte equality. Fixing the newly exposed overlap would violate that guard; no exception or prior-route mutation was made.
- Geo raw: 83 PASS / 1 FAIL. Transitions remains red for F04 fallback catchable and placeholder/unmeasured coins.
- Density and static failures block 60 Hz traces, chief recording, dynamic matrix and commit. HEAD remains c3707e3; WIP retained.

## 2026-10-05 continuation — F02 overlap correction green

- 02-p1-d08-slide-01 is omitted by the transported-obstacle corridor gate because it intersects dive transition 23; added obstacles now use the same transition-window exclusion.
- F02: 9638.40 px / 52 movements = 5.395/1000; 14/14 measured coins; ideal 35.87 s; chief min pay 1.067 s, catches 0.
- Dynamic F02 matrix: ideal keyboard PASS, touch 390x844 PASS, touch 844x390 PASS (3 passed, 1.9m).
- Static F02 facts: part order PASS, obstacle overlap PASS, obstacle-transition overlap PASS, R2/R3 PASS, F02 code parity PASS. Suite remains red only in unfinished F03/F04 gates.
- F02 exemption hunks: route obstacles (source slide removed and hard obstacle layout regenerated), dependent 14 coin records, and F02 chief routeHash/samples. F01 must remain byte-identical before commit.
- Next exact step: restore generator-touched F01 bytes, make F03/F04 meet 3.873/3.755 density with zero overlap, then trace -> 14 measured coins -> 1.2 s chief records -> commit F02+F03+F04.

## 2026-10-05 continuation stop point — F03/F04 density red

- Rebuilt F03/F04 with the corrected corridor gate: geo is now 84 PASS / 0 FAIL; part order, obstacle overlap, and obstacle-transition overlap are all [] PASS.
- F03 remains 8960.64 px / 29 = 3.236/1000 < 3.873; F04 remains 9472.08 px / 32 = 3.378/1000 < 3.755. Their products are measurement-stage only and are not commit-eligible.
- F02 product is green and preserves exact CJ 8 / CC 4 / CS 2. F01 COINS and ROUTES were restored byte-identical to c3707e3 after generator measurement.
- No commit was made because the requested next commit is F03+F04 and its mandatory density gate is red. No Magma/Aftermath step was started; existing untracked producers/logs predate this continuation and remain untouched.
- Next exact step: replace F03/F04 source intervals with unused, movement-bearing D09+D15 and D10+D16 cuts that remain 8–10k and pass 3.873/3.755 while preserving the world-wide no-reused-part rule; then coinless 60 Hz trace, measured CJ8/CC4/CS2, 1.2 s chief records, matrix, and commit.

## 2026-10-05 continuation - F02 isolated commit gate

- F02-only staged product: overlapping source slide removed; dependent route, CJ 8 / CC 4 / CS 2 coins, and 1.2 s chief record regenerated.
- Ideal keyboard and both touch viewports passed (3/3). F01 and D01-D18 ROUTES/COINS remain byte-identical to c3707e3; existing non-ASCII lines remain byte-identical; product mojibake sentinels are zero.
- F03/F04 WIP remains outside this commit.
- Next exact step: exhaustive D01-D18 interval/composition search, reserve non-overlapping F03-F06 winners, then F03/F04 trace -> coins -> chief -> matrix.

## 2026-10-05 systematic search continuation

- F02 isolated commit: 0ce6024. Post-commit guard: F01 and D01-D18 ROUTES/COINS byte-equal to c3707e3; non-ASCII lines byte-equal; mojibake 0.
- Added search-hard-compositions.cjs. It scanned 120 interval pieces and 275 exact 8-10k compositions from the densest viable pool using production compose+harden gates. Full result: hard-composition-search.json.
- F03 selected D10 left .40 + D10 right .60: 9028.56 px / 35 static moves = 3.877, threshold 3.755; coinless 60 Hz PASS at 33.47 s, deaths=0, retries=0.
- F04 static candidates were dynamically rejected: D12 L.20 + D17 R.30 stuck x=3565.76; D17 L.30 + D11 L.50 reached x=6282.26 then repeated dive 34 until timeout; D12 L.20 + D17 L.60 + D09 L.20 stuck x=1829.60; D17 L.40 + D11 L.30 stuck x=374.00.
- Current WIP is the last candidate and is intentionally not commit-eligible. No rollback, push, or stash operation.
- Next exact step: add dynamic viability to the search evaluator (or pre-reject truncated source transitions whose transported A/B movement cannot complete), then select the next highest disjoint F04 candidate; after a coinless PASS rebuild measured CJ8/CC4/CS2, record 1.2 s chief, run matrix, and commit F03+F04.

## 2026-10-05 corrected mixed-source F03/F04 green

- Search gates now require 2-3 distinct Dock sources per route, <=50% from each source, no overlap with reserved world intervals, and cuts snapped to source transition boundaries. The 10% boundary search evaluated 119 unique pieces / 15,261 exact 8-10k compositions; static products were accepted only after coinless 60 Hz play.
- F03: D09 left to x=814.8 + D10 left to x=4440.48 + D12 left to x=2169.6; 8038.48 px, 34 static movements, 4.230/1000 >= source-max threshold 3.874. Coinless ideal 30.89 s; final 14/14 CJ8/CC4/CS2; chief min gap 0.750 s, catches 0.
- F04: D02 left to x=3118.38 + D03 left to x=1959.48 + D01 left to x=2424.72; 8414.38 px, 31 static movements, 3.684/1000 >= source-max threshold 3.236. Coinless ideal 32.04 s; final 14/14 CJ8/CC4/CS2; chief min gap 0.533 s, catches 0.
- Composite H seams use an 8 px horizontal runway, vertical alignment, and an explicit catch/jump transition. Shallow zero-gap dives that became timing-unstable under vertical composition are normalized to catch/jump and their stale dive windows are removed.
- Static mutable-route gates: part order [], obstacle overlap [], obstacle-transition overlap []; F03/F04 transition parity PASS; dive coin three-launch guard []. F01 remains byte-immutable and its pre-existing hard-5/source-vault overlap is reserved for the final review pass.
- Dynamic F03/F04 matrix: ideal keyboard x2, F03 missed-dive fallback, and touch 390x844 / 844x390 x4 = 7 passed. Chief records regenerated at 1.2 s.

### Next exact step

1. Stage only F03/F04 product, shared reproducible compose/search/hardening gates, generated transitions/meta, chief records, tests, and this progress entry; verify D01-D18 and F01 bytes, non-ASCII lines, mojibake, hunk list; commit F03+F04.
2. Generate F05/F06 from the next two disjoint search winners, trace -> measured coins -> chief -> matrix, then registry/menu and Frozen completion commit.
