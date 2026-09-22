# TUR6B2 ? completed; visual/device review remains
Base: v65 / 938c4dd. Game index.html git diff0 (HEAD LF / worktree CRLF); chief included; no commit/tag/push.
| Sheet | Regions | Scale (width/base) | Snap N | KiB | Cleaned alpha | Result |
|---|---:|---:|---:|---:|---:|---|
| chief.png | 4 | 0.2345 (85.6%) | 1 | 21.13 | 57385 | PASS |
| courier-roll.png | 4 | 0.2573 (57.4%) | 1 | 15.40 | 26336 | PASS |
| courier-slide.png | 4 | 0.2208 (54.1%) | 1 | 14.31 | 39840 | PASS |
| courier-vault.png | 4 | 0.2371 (57.7%) | 1 | 17.23 | 40565 | PASS |
| courier-wallrun.png | 4 | 0.2404 (81.5%) | 1 | 21.78 | 62289 | PASS |
| forklift-roll.png | 4 | 0.2512 (58.3%) | 1 | 13.50 | 28362 | PASS |
| forklift-slide.png | 4 | 0.2387 (53.5%) | 1 | 12.13 | 20507 | PASS |
| forklift-vault.png | 4 | 0.2361 (77.5%) | 1 | 17.87 | 48682 | PASS |
| forklift-wallrun.png | 4 | 0.2004 (74.9%) | 1 | 17.00 | 76106 | PASS |
| guard-roll.png | 4 | 0.2350 (59.0%) | 1 | 18.17 | 37078 | PASS |
| guard-slide.png | 4 | 0.2199 (51.8%) | 1 | 15.32 | 45024 | PASS |
| guard-vault.png | 4 | 0.2345 (61.7%) | 1 | 18.90 | 59476 | PASS |
| guard-wallrun.png | 4 | 0.2066 (68.3%) | 1 | 16.84 | 48606 | PASS |
| picker-roll.png | 4 | 0.2371 (66.7%) | 1 | 19.63 | 53295 | PASS |
| picker-slide.png | 4 (split) | 0.1992 (43.6%) | 1 | 10.84 | 28022 | PASS |
| picker-vault.png | 4 | 0.2195 (65.0%) | 1 | 17.33 | 52582 | PASS |
| picker-wallrun.png | 4 | 0.1863 (68.1%) | 1 | 15.88 | 60710 | PASS |
Alpha: <=32 ->0; >32 RGBA unchanged during cleanup: lost 0; 68/68 output cells bottom y=191, no alpha1..32.
picker-slide: thresholded merged x60..949; strictly interior minimum x435, alpha sum4486; widths375/515. Split is first merged region (frames1|2 in x order), not an assumed equal division.
Snap: N=1 from modal equal-RGB horizontal run length; per-character 32 dominant color buckets use actual reference colors. Chief uses guard reference (177px), no original chief reference exists.
Snap comparison: before-resize lower RGBA L1 on16/17; chosen snap->resize; native snap output changes dimensions, restored to intended crop size; normalized alpha mask retained.
Scale: all17 width-limited; remaining scale43.6?85.6% of height target. Lowest: picker-slide; this is the authorized106px cell fit, not full reference height.
Outline: horizontal dark-edge median ref=courier.png:2,forklift.png:2,guard.png:4,picker.png:2px; output=3–22px; style equivalence unverified (no visual inspection).
B PASS: anim26/26 (25 existing + real) on final sheets; Real160 frame/flip/feet +96 Hz checks; fixtures remain isolated.
Evidence: evidence/{courier,forklift,picker,guard}-{vault,slide,roll,wallrun}-50.png + chief-50.png (17); 360x360 crops, game scene, 2x world scale; no preview opened.
C: 27 entries; 4052884 B uncompressed; ZIP 3614956 B; see TUR6B2-PACKAGE.md for every file/SHOULD result.
ZIP: ../04-yayin/playgama/trust-me-bro-v66.zip; SHA256 0f8de247d9204697be71e25c183ff924efd6a55c5d6cc8b85188065dd1c4816f
PASS package: / separators, manifest exact, HTML worktree cmp; Bridge2.2.0. build --version v66 names package without creating tag.
WARNING: soundtrack.mp3 remains2606255 B (>512KiB SHOULD); all other files below512KiB; startup total<30MiB.
PASS validate-186:186/0; original geometry186/186 identical (HEAD WORKTREE --geometry-only).
PASS trap-window:36 rows; active unsafe0; min306.482ms unchanged; passive30.5=249.719 remains informational.
PASS runtime:active 1044 PASS/5652 N/A/0FAIL,86 pairs/9288 variants; source hash matches.
PASS runtime-parkour:30 PASS/156 N/A/0FAIL (included in runtime-window command).
Runtime worst unique pairs: 14.1=253?254ms; 8.1=353?354ms; 8.2=353?354ms.
PASS locks: index.html normalized text identical/git diff0; original4sprites/audio/logo/icon HEAD byte-identical; save unchanged.
PASS full suite119/119 (118 existing +1 real integration); anim26/26. Log:TEMP/tmb-6b2-final.log.
PASS parkour-tur1:25/25; pad-flight:34/34,432 flights,0death; chief:9/9.
PASS informed bot310/310; blind93/93,0death; matrix96; difficulty-ramp2/2.
PASS v65 save9/9 (HEAD=v65; 3 sectors?parts1/2/6 with clamp); chief spec.
PASS readiness3/3: first movement 1607.9/1573.4ms; game_ready after overlay; viewport0 recovery.
PASS monitored browser paths: pageerror0,console error0,external requests0; optional real sheets loaded without404.
Open: visual review of picker-slide split and outline/scale; Playgama QA Tool/device tests belong to main session.
Preserved existing vc4 test edits, untracked media/test-results/raw. No graphify update. Raw ignored; build script lives in parent repository.

Reproduce normalization: NODE_PATH=%TEMP%/tmb-sheet-tools/node_modules node 03-test/sheet-normalize.cjs (sharp in TEMP); pixel-snapper1.0.0 on PATH.
