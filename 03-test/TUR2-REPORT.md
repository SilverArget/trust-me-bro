# Tur 2 verification

Game source SHA-256: fe2283337a0b8b10de1533370a8216fa3808e39b53c1f0fadea52211dfd3aa1a

## Dilim 0
- 198 raw part-2 candidates; 185 rejected; 13 selected pads across 12 sectors.
- Three sectors use an alternative outside the former sampled candidates: 2, 3, 27.
- Enemy shifts: 0. Ramp-free sectors: 4, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 28, 29, 30.
- S12.2: original x=436 flight rejected; no safe alternative or valid <=40 px shift; no pad remains.
- pad-flight: 34 tests PASS; 104 natural-contact flights, 60/120 Hz, four upgrade combinations, zero deaths through boost and landing.

## Gates
- validate-186: 186 reports, zero errors; all original geometry/enemy projections match HEAD.
- trap-window-scan: 36 rows; active minimum 306.482 ms, zero active violations. Passive S30.5 remains 249.719 ms.
- parkour-tur1: 25/25; informed bot: 62 segments x 5 = 310/310; blind sign response: 93/93 blocked/stunned without death through 400 ms recovery.
- 4 characters x 2 directions x 3 frame rates x 4 movements = 96 fixture cases PASS.
- Combined Playwright runner: 63 tests PASS.
- difficulty-ramp: inherited 1 passed / 1 failed, same death-tier assertion.
- Save migration: 18/18; validSave/applySave/snapshotSave unchanged; locked symbol diff zero.
- Main runtime active: {"N/A":5760,"PASS":936}; passive: {"FAIL-UNMEASURED":1026,"N/A":756,"PASS":666,"FAIL-WINDOW":108,"FAIL-DEATH":36}.
- Production movement/cancellation/stun runtime: {"N/A":156,"PASS":30}; zero active failures.
- Active pad branch: {"N/A":2160,"PASS":72}.
- Runtime minima: S14.1 253-254 ms; S8.1 and S14.2 353-354 ms (additional equal minima exist).
- Movement-path minimum: S4.1 stun 603-604 ms.
- N/A denotes absence of the measured timed overhead/memory family, pad, or applicable stun penalty; it is not a generic label for an unmeasured present target.

## Placement and assumptions
See [31-sector placement table](TUR2-PLACEMENT.md) and [machine-readable placement](tur2-placement.json).
- Primary sectors: vault 9, slide 8, wall-run 7, roll 7; S2 also introduces wall-run before its slide.
- Lie signs: 0/20, 8/40, 21/60, 2/4. Sector-seeded ranking; vault is excluded from lying JUMP signs because jumping is a valid vault alternative.
- Static obstacle-to-main-trigger spacing: minimum 745 ms at 400 px/s; this is distinct from measured escape windows.
- First encounters: vault S1, slide/wall-run S2, roll S4. Their early teaching corridors contain no traps. Existing later traps remain in those sectors to preserve the locked trap baseline; whole sectors are NOT trap-free.
- Runtime movement replays use 60 Hz/base upgrades; independent main matrix covers 30/60/120 Hz, four upgrade combinations and death tiers 0/2/4. This is not a full cross-product of all movement variants.
- TRAP-AUDIT.txt and tasarim.md were not found in the searched project tree; supplied sector themes were used.
- No commit, tag, push, graph update, asset edits, or changes to pre-existing untracked files/test-results.
