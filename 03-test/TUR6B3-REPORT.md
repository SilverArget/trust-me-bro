# TUR6B3 ? completed; visual review remains
| Sheet | Character scale | Natural width px | KiB | Result |
|---|---:|---:|---:|---|
| chief.png | 100.00% | 123.85 | 29.05 | PASS |
| courier-roll.png | 100.00% | 184.62 | 37.46 | PASS |
| courier-slide.png | 100.00% | 195.76 | 36.46 | PASS |
| courier-vault.png | 100.00% | 183.57 | 40.76 | PASS |
| courier-wallrun.png | 100.00% | 130.09 | 31.61 | PASS |
| forklift-roll.png | 100.00% | 181.84 | 31.47 | PASS |
| forklift-slide.png | 100.00% | 198.30 | 32.21 | PASS |
| forklift-vault.png | 100.00% | 136.76 | 27.54 | PASS |
| forklift-wallrun.png | 100.00% | 141.60 | 27.99 | PASS |
| guard-roll.png | 100.00% | 179.79 | 42.28 | PASS |
| guard-slide.png | 100.00% | 204.59 | 44.02 | PASS |
| guard-vault.png | 100.00% | 171.68 | 41.76 | PASS |
| guard-wallrun.png | 100.00% | 155.22 | 32.18 | PASS |
| picker-roll.png | 100.00% | 158.95 | 38.02 | PASS |
| picker-slide.png | 87.18% | 243.16 | 31.27 | PASS |
| picker-vault.png | 100.00% | 163.10 | 35.27 | PASS |
| picker-wallrun.png | 100.00% | 155.57 | 30.71 | PASS |
Normalization: 848x192, four212x192 cells; center106, bottom192; snap then resize, per-character palette/N retained.
Alpha cleanup: protected >32 RGBA lost0; 68/68 bottom pixels y191; original4 sprites unchanged.
picker-slide: 243.16px ->212px, 87.18%; all17 meet >=85%; other16 at100%.
Draw diff: index.html +2/-2, optionalSheet accepts848x192; drawCourier uses actual frame width; physics/locks unchanged.
PASS anim26/26; real160 frame/flip/feet/ratio/height asserts +96 Hz combinations; fallback canvas equality retained.
Evidence: evidence/*-50.png (17), courier-comparison-0.png and courier-comparison-0.5.png (normal left/vault right, same2x scale).
PASS validate186/0; geometry186/186 equalHEAD.
PASS full suite119/119 (anim26/26, parkour25, pad34/432 flights, chief9, bots310+93, matrix96, difficulty2).
PASS v65 save9/9; locked functions/constants unchanged; git diff --check.
PASS readiness3/3: first movement1550.2/1654.8ms, game_ready after overlay; viewport0 recovery.
PASS monitored pageerror0/console error0/external requests0; real sheets requested without404.
PASS package27 files,4367093B total,ZIP3928208B; index byte-identical; / separators.
ZIP SHA256 d2cc02ab0a0c9e6809c0d96985de36c85774c4dccc0f3654228ed9130503a04e.
PASS all sheets<512KiB; unchanged soundtrack2606255B SHOULD warning; see TUR6B3-PACKAGE.md.
PASS runtime active1044 PASS/5652 N/A/0FAIL; minimum253ms; source hash matched.
PASS runtime-parkour {"N/A":156,"PASS":30}; active threshold unchanged.
PASS trap-window36 rows; active unsafe0,min306.482ms; passive30.5=249.719ms retained outside gate.
Open: main-session visual review of picker-slide split/contours and19 evidence images; Playgama QA/device tests.
No commit/push/tag or graphify update; no automatic image opening.
