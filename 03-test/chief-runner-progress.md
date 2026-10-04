# Chief runner progress

- [x] Brief read; PAL scope and no-graphify rule confirmed.
- [x] Frozen partial work stashed as `frozen-partial-6bf95ef8`; no files deleted.
- [x] Existing chief lifecycle, catch/reset path, renderer, debug state, and canonical Dock Bot S inspected.
- [x] Add route hashing and ideal-path chief runtime; route hash is cached per route object.
- [x] Add recorder and generate D01-D18 paths.
  - 2026-10-04 continuation: pre-cache D02 x2 passed 10/10, 0 deaths/retries (24.63s, 24.74s); post-cache D02 x2 passed (24.61s, 24.61s).
  - `getState()` benchmark (500 synchronous calls): pre-cache 0.381600 ms/call; post-cache 0.062400 and 0.036000 ms/call.
  - Recording gate passed D01-D09: D01 12/12, D02 10/10, D03 baseline 12/13, D04 12/12, D05 13/13, D06 13/13, D07 14/14, D08 13/13, D09 13/13; all deaths=0/retries=0.
  - D10-D18 continuation passed 9/9 in 4.9 minutes, all deaths/retries 0 and coins at baseline. Product file now has 18 routes, 252263 bytes, 296-510 samples per route. D01-D09 temporary files removed with Node `fs.rmSync`.
- [x] Add chief-runner acceptance tests and byte guards.
  - Active-chief O-1: 17/18 first pass; D18 Bot S flaked at its first slide and was caught, then isolated rerun passed. All route raw minimum distances captured in console output.
  - Chief acceptance: initial run exposed D05 second catch inside 2 seconds; recorded-chief recatch protection fixed. Final `chief-runner.spec.cjs`: 9 passed.
  - Full touch runs D01/D05 390x844: 2 passed.
  - Hash freshness 18/18 passed; in-memory D01 coordinate mutation produced expected RED.
  - Geo: 80 PASS / 0 FAIL. Transitions exit 0. Parity: 30/30 GREEN.

## 2026-10-04 progress-catch / stun-free continuation

- [x] Implemented monotonic `playerT` matching over a forward 1.0 s sample window; XY nearest by default and x-only fallback when vertical separation exceeds 72 px.
- [x] Recorded-chief catch now compares `chiefT >= playerT - 0.05`; unrecorded routes retain overlap catch.
- [x] Split `.35 s` `caughtT` from `2 s` `regrabT`; debug `dead` remains tied to `.35 s` only.
- [x] Added recorder rejection for any `stun` sample and changed route-run reporting to raw minimum `playerT-chiefT` seconds.
- [x] Measured stun causes: D08 landing-to-slide gap 80.41 px violates R3 (>=96); D07 141.04 px and D13/D15/D18 exactly 96 px. Existing driver waits for `onGround` and a 36 px slide window, so the latter four collide before the sampled input opportunity.
- [ ] Stun-free route recording is not complete. Early-air slide input was rejected because D07 later stalled at x=5530.72. Moving D07 slides +60 removed stun but also missed the following dive and stalled at the same x. No partial recording was written to `chief-paths.js`.
- [ ] Current worktree is intentionally uncommitted. Before continuing: revert the experimental +60 slide positions for D07/D13/D15/D18, retain/evaluate D08 R3 correction (2791.2), then fix the driver with a narrowly queued slide input that does not alter the subsequent dive. Re-record D07/D08/D13/D15/D18, then run all requested acceptance/static/byte gates.
  - Mojibake 0; non-ASCII lines, COINS block, and ROUTES block byte-equal to 306082d after restoring LF endings.
- [x] Commit once if final staged-file audit is green: `3cdc069` (amended SHA reported at handoff).

## 2026-10-04 progress-catch completion

- [x] Reverted experimental D07/D13/D15/D18 slide shifts; ROUTES is byte-identical to `dc956ad`.
- [x] Evaluated D08 R3 `x=2791.2`: ideal run passed 13/13 coin and 0 death/retry, but stun remained, so the change and its recording were reverted per gate. All 18 path records are byte-identical to `dc956ad`.
- [x] Stun is INFO-only in the recorder; no early-slide queue was added.
- [x] Progress-based catch, monotonic 1 s forward matcher, vertical x fallback, and separate `.35 s` caught / `2.1 s` regrab guard implemented.
- [x] Active-chief run: 17/18 initial pass; D16 driver flake caught twice, isolated rerun passed 14/14, 0 death/retry/catch. Raw minimum gaps captured.
- [x] Chief acceptance 12/12; D15/D18 t~4, climb x-fallback, regrab, freshness/negative, touch, and F01 legacy passed.
- [x] Geo 80/0; transitions exit 0; parity 30/30 GREEN; mojibake 0; non-ASCII, COINS, ROUTES byte-equal to `dc956ad`.
