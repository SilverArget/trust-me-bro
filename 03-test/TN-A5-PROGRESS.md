# A5 progress

## A5a1
2026-09-28T05:04:08.245741

Scope: contract + reproducible placeholder production. Runtime integration and purchase/migration acceptance deferred to A5a2 (PAL 8).
Budget: 5 min baseline/contract, 7 min generation + file matrix/negative controls, 10 min focused preservation gates, 3 min report. Hard limit 25 min.
Tests: asset matrix (all frames), reproducibility, deliberate malformed asset rejection, index/function and D/F/M/A input baseline hashes; parkour-tur1, tn-a12, t1b-bot-s, tn-a4 -g world, t2-coins static. No full regression.

2026-09-28T05:06:45.900157 — 34 atlases generated; 128 combinations / 1024 frames / 5120 layer samples PASS; 8 negative controls rejected; regeneration SHA identical. Runtime source unchanged. Starting preservation gates.

2026-09-28T05:13:23.714924 Final: core 43 PASS / same 5 accepted old FAIL; world 12 PASS; static 9 PASS; preservation 53/53. A5a1 PASS, A5a PARTIAL. A5a2 integration deferred; no pending tests.

## A5a2
2026-09-28T05:16:28.996046
Budget: 5m integration, 7m live matrix/save gates, 10m focused regression, 3m report. Hard stop 25m. Tests: 128 combinations/all frames, migration/purchase/reload/failure, protected SHA, parkour-tur1/tn-a12/t1b-bot-s/world/static/anim. No full regression.

2026-09-28T05:22:49.653651 Live matrix PASS 128/1024/4096; purchase/migration PASS. World 12/12; coins 9/9. Anim 25 PASS + 1 failure under baseline investigation. Integrity 108/108.

2026-09-28T05:26:32.791420 Final live gates 4/4 PASS including actual old save load/reload + four-item shop UI. Negative controls 8/8 rejected. Anim lone chief-request FAIL reproduced on pre-A5a2 source. Final SHA core/world rerun underway after gameClock presentation correction.

2026-09-28T05:31:44.492049 A5a2 PASS functional / PLACEHOLDER art / DEFERRED visual. Live 5/5; world 12/12; static 9/9; integrity 144/144. Final core 43 PASS + same five old FAIL; anim 25 PASS + one pre-baseline-reproduced chief request FAIL. All requested packages complete. No full regression. Graph AST update completed with documented warnings.

## A5b1
2026-09-28T05:35:11.398263
Scope: preview + decorative NPC only; ghost A5b2 deferred. Budget 5m implementation, 7m acceptance, 10m preservation, 3m reporting; 25m stop. Tests: preview all frames/3 viewports/locked isolation/world selection; NPC roles/reactions/pixel presence and identical physics; A5a live matrix; parkour-tur1 + tn-a12 + t1b-bot-s + world + coin static + protected SHA. No full regression.

2026-09-28T05:42:47.234681 A5b1 acceptance 10/10 PASS; A5a live 5/5; world 12/12; static 9/9; integrity 150/150. Seven mutations rejected. Core final D02 test running. Product a12 6a2108c7; index unchanged. Ghost deferred A5b2.

2026-09-28T05:44:24.919172 A5b1 functional PASS; final 10/10; core 43 PASS/same 5 old FAIL. All focused tests complete; graphify AST refresh running. A5b overall PARTIAL; ghost A5b2 not implemented/tested.

2026-09-28T05:46:51.233694 CLOSED A5b1 PASS, A5b PARTIAL. Graphify refresh complete with documented extraction/label warnings. No pending task processes. a12 6a2108c7; index 4cc02ad4 unchanged. Next scope A5b2 ghost.
