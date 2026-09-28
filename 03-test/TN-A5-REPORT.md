# A5a1 ? contract and placeholder production

DISK DURUMU: A5a1 assets/contract verified; runtime integration NOT_IMPLEMENTED in this package. A5a overall remains PARTIAL.

Split authorized by A5 rebase PAL 8. This package stops at production/contract; A5a2 owns live integration and acceptance. Runtime a12/index and route/coin/input data unchanged.

## Acceptance evidence (four fields)

| Gate | Expected / tolerance | Sample / input | Scope | Negative control |
|---|---|---|---|---|
| Asset contract | 34 RGBA atlases, 512x512, <=512KiB each, alpha padding >=4px | generator output + atlas-contract.json | Offline files only | dimensions, padding, blank layer rejected |
| Offline all-frame matrix | 128 combinations, 1024 frames, each of 5 layers visible in final composite | 2 runners x 4 sets x 8 motions x 2 directions x 8 frames | CPU composition; runtime acceptance NOT_RUN | missing frame/asset, wrong tuck/anchor/hitbox rejected |
| Female silhouette | alpha silhouette differs from male | base atlas alpha arrays | Placeholder silhouette only; art DEFERRED | no final art quality claim |
| Reproducibility | identical PNG SHA256 on second generation | 34 files | asset generator | content hashes validated |
| Preservation | 53/53 checks | 30 source/input baseline files + 23 function blocks | source bytes / LF-normalized function blocks | different SHA fails checker |

## Protected input/physics blocks

Extraction intentionally conservative: named function start through next named function, including intervening declarations/listeners. UTF-8 LF-normalized SHA256. Full-file baseline is an additional A5a1 check, not a replacement for function-level guard.

| Symbol | Baseline line | SHA256 |
|---|---:|---|
| `gameInput` | 292 | `2e1e34e8adf1d94d9947452df68acd199015d0f27cc20a3c072f36b7a70c4597` |
| `clearInputs` | 624 | `d780eba26b76e196e6aeb96954989260d4906eb67c3108061341a304443294e5` |
| `solidSurfaces` | 431 | `843b3663eb36d6527b5dbc5f4c20dd636ac209a7939ee0284bec915a2905cfc6` |
| `solidRects` | 654 | `b20763b9f04d84588e028cdf3c71e0c000b1e5d6c2f14107aaf61e173b9cc9ff` |
| `parkourBody` | 656 | `fa153289f0d383a24a4102ebec36b892a41ad506090e42971b721d072018b5b2` |
| `parkourClear` | 657 | `6b86acfbe125ce9549fac418ec170366a9b8497efd689a0df954937d3c4dbf07` |
| `parkourStand` | 658 | `3c00274174301a459acc3cbb858d8d1919bd0ee363d84c783fc9f38e737d4b81` |
| `parkourCancel` | 659 | `96a16284461153eb666762155d0d0895ca502074d56283135b4c85c88ccfe1d0` |
| `parkourPoint` | 660 | `1c7dc5c720a360e5680bd6231d67e35eab07191bd7ecc4028f3cea416ec25016` |
| `parkourSweep` | 661 | `e0c1ab9e1d48228da200bb0c07115ab83c6b08c579b573b6eb0b34675b41dc21` |
| `parkourChoose` | 662 | `0348985687354322c0b6106ae3953e07e859efc47eaf383eafa8c7d7240b8f8a` |
| `parkourTick` | 667 | `f29ec8747078a4a1e7b4a8420b10feefcfc4c20343ecf7f9521f189145cab2c8` |
| `parkourLanded` | 672 | `c78caca66ef589b5585c3f64c723ec21cafcf67c07d5e3662eceae767acb6722` |
| `doPhysics` | 673 | `c870283d50fd49d2b7ef5b16b2861a9e8b771114bfd668f5e259f4a6d8285a8e` |
| `campaignWallAssist` | 963 | `7972095117feabd40611d3e63c146d3201fa638c971fd81b4adbeac9a8bfb7c2` |
| `updateDispatch` | 964 | `e166ccecefd74440d2c8687c7f0c6b961072ba8ce60e24fe2624597a3f5bdf53` |
| `setJoystickXY` | 1083 | `4ba8807a72a24fe35fe2901e56396c51c6070bf5cdbb68e467f2cbd97e013b0b` |
| `releaseJoy` | 1084 | `1fb0cb83a30a3631248bc7daf6a8707ad4584cea5659e70624507cfb7ba0420a` |
| `jumpPress` | 1097 | `7ac59229936663954208e54c65b9ae07e444590b132cc67e494375a96d8e356c` |
| `jumpRelease` | 1098 | `acebcd710e49c9d17628dbaa7e8b0c7bf39683aec3f9ead8a4a5a0727b6a92cc` |
| `kill` | 647 | `ed5c98e8676ec453b91f07b4fa457bf0fb853e7b2cbf804620702736373b2d14` |
| `updateChief` | 636 | `6fdbec32df828c36e8e90f7b2cc068eb210835a029e8b30a9dcbf742f7c0ebee` |
| `resetChief` | 633 | `8885bd5d0802af307c46d5ebf6b7d6c771aedd10360340d7777a02744e215a18` |

## Deferred / not run

- A5a2: add Night Shift 240 / Hazard Runner 360 to live OUTFITS and shop (Dock Crew remains 40); profile migration implementation, both-runner ownership, independent equipped sets, purchase/reload/failure tests.
- A5a2: atlas loader and cache-version URL, female runner replacement, pose/phase mapping and live all-frame outfit-animation-matrix; gameplay/preview rendering integration.
- Art handoff: all 34 new files are PLACEHOLDER; visual_acceptance=DEFERRED. No final art was produced or visually approved.
- A5b/c/d: preview/NPC/ghost, language/audio/accessibility, full asset/licensing inventory, cross-world visual revalidation.
- Full regression not run. No screenshot/atlas/HTML opened. No network/install/paid generation/commit.

## Paths and tools

- Manifest: ASSET-MANIFEST.md; machine contract: sprites/a5/atlas-contract.json.
- Reproduce: python tools/a5/generate_placeholders.py; then python 03-test/a5-assets-check.py.
- Preservation: python 03-test/a5-integrity-check.py.
- Backup: ../01-tasarim/a5/pre-a5a1/.
- PowerShell, Python/Pillow, local Node/Playwright, graphify query/update. Graph update is AST-only, zero model/API calls; community labels may need refresh (177 saved labels vs 187 communities after final AST update).

## Baseline SHA256

| Path | SHA256 |
|---|---|
| `index.html` | `fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142` |
| `js/a12-campaign.js` | `4a85b9d741aecd2d5213b845c82dd2bb3a5073bb047dbe339039c3f225f862cd` |
| `03-test/tn-a4.spec.cjs` | `93d06279ad61012a0b0a6ec5a556997233069a1de1ac32661f4d833bc2cace06` |
| `03-test/t2-coins.spec.cjs` | `bba1f8bff28dd1017b3196f1d5f26613ca234b38493be3ce0c1c52a55de53792` |
| `03-test/lib/aftermath-b-probe.cjs` | `35d5558b877ee7f5fe201b6424933af1c1eae29b5e4cc9c296f577c92ce1d367` |
| `03-test/lib/aftermath-probe.cjs` | `fbbb707442686d909fe6b872ca81a3d3ddbe0b1a344bc90c66d8e4615c250bf2` |
| `03-test/lib/bot-aftermath.cjs` | `411cf684e5f7313e1b0c07f355237a1e2d8a9f9cf81aa1e8a525d67ea7c3c59d` |
| `03-test/lib/bot-magma.cjs` | `a61bfffa8f340e6ec23cff3f1793cfff80615a4896ad7780a7e42401eef82054` |
| `03-test/lib/bot-s-drive.cjs` | `c51cfb72d138c39454db637df27a30282236da1a548053f128b5b7f738699f1f` |
| `03-test/lib/bot-w.cjs` | `a65af5fb0ae42f1009a08bdc5f819b40c249799e2bf57a41dab30634ec7211da` |
| `03-test/lib/magma-b-probe.cjs` | `324961d51d2e6687b243fe0029ca37f046e889dc5e7c7fd23ccd1629a5913359` |
| `03-test/lib/magma-probe.cjs` | `90e895229025812dc9dfd2138749be3c7ec3f65771a7f4ef67a734703ea0df03` |
| `03-test/route-inputs/A01.json` | `ed1fd06852bba8e858bf2d4db0bd5677741d257c411b22547e37b49b67073111` |
| `03-test/route-inputs/A02.json` | `4b89569b24898998b1e0f87ad4d8a75b1f145fb686af619fb7ef5e93f92ef62b` |
| `03-test/route-inputs/A03.json` | `bbdd25d06b6ecad5c065f28f99391278187ddd4c5106e5aa7f1471119fc154a7` |
| `03-test/route-inputs/A04.json` | `d37f48475ff779097aa7c8c47790e18f5916f2a19b1a5d9adab6cfff17b3fbee` |
| `03-test/route-inputs/D01.json` | `b33d37b5a6cccf3ef425c0d1fe4bc559beb4a3f79664ecefe4ff882d079ffa3d` |
| `03-test/route-inputs/D02.json` | `1d3aa54a580dfc6f61f4a63796230d159bc667f4593d0657629793b9f265a7f5` |
| `03-test/route-inputs/D03.json` | `effbd227d1d20d3b899603889cbfdadf5ba8899af66bce3844b93acf855f5fad` |
| `03-test/route-inputs/D04.json` | `dcfb76cf64e06c9d3623db94274361a8570065f9c2791aea12e48d653efe3e5c` |
| `03-test/route-inputs/D05.json` | `d0dbe2c995288d6652309e24547827bf787728d732b03405ef03944dc4b93c16` |
| `03-test/route-inputs/D06.json` | `359437df9b5a0a1ae95cd39e940dde784201c80cdb403fdefa07ca9e11673fb2` |
| `03-test/route-inputs/F01.json` | `93c45367f0c57cac5464b304a385056ff685ee3d147bac68bd47a9a65f10e599` |
| `03-test/route-inputs/F02.json` | `4eaee23e869367413c4423a19d32acd8c944ffbde2744deeb1bf1837b535b17c` |
| `03-test/route-inputs/F03.json` | `dbde3548d6a189fd3b4e344a5736e1bf152292a58d94a9a197a850451287ef7f` |
| `03-test/route-inputs/F04.json` | `cb91849f19e85ca1b1bc27919607513f9e8c01ac54972df5b467505731ca84bd` |
| `03-test/route-inputs/M01.json` | `f37660cbe80c265798558fcbeab01cad3526ba0731cee8601203b0cd4885c095` |
| `03-test/route-inputs/M02.json` | `b17256abb64abf830978255135e62a770b6464a916d4ee9cd8511c678cafcdf9` |
| `03-test/route-inputs/M03.json` | `65a49bf350565e9cdaf38a603e7119bb0e02084897c8a5581f515603ebf1bd80` |
| `03-test/route-inputs/M04.json` | `36989b4ed79f9fe504254004591339500aed952d7f817acd240d4db00c3c462f` |

## Final focused results

| Package | Result | Native exit | Evidence |
|---|---|---:|---|
| parkour-tur1 + t1b-bot-s + tn-a12 | 43 PASS / 5 accepted old FAIL | 1 | a5a1-evidence/core.log |
| tn-a4 -g world | 12 PASS | 0 | a5a1-evidence/world.log |
| t2-coins -g static | 9 PASS | 0 | a5a1-evidence/coins.log |
| Offline asset matrix | 128 combinations / 1024 frames PASS | 0 | a5a1-evidence/asset-matrix.json |
| Preservation | 53/53 PASS | 0 | a5a1-evidence/integrity.json |

The five failure names exactly match accepted A4c2c core.log: campaign-movement-and-frontflip, reward-budget-first-and-repeat, purchase-double-tap, D01 real-input route completion, D02 real-input route completion. Product source is byte-identical to the accepted baseline. No new failures.

A5a1 contract/production: PASS. A5a overall: PARTIAL. A5a2 runtime integration/purchase/migration/live matrix deferred. All tests from this invocation completed. Output hashes: a5a1-evidence/output-sha256.json. Runtime a12 SHA256 unchanged: `4a85b9d741aecd2d5213b845c82dd2bb3a5073bb047dbe339039c3f225f862cd`.

## A5a2 ? live integration

Date: 2026-09-28T05:29:26.210962

Status: implementation=IMPLEMENTED; functional_test=PASSED (live targeted gates); art=PLACEHOLDER; visual_acceptance=DEFERRED. A5a2 functional acceptance PASS; A5b/c/d not included.

### Scope and immutable baseline

Baseline a12: `4a85b9d741aecd2d5213b845c82dd2bb3a5073bb047dbe339039c3f225f862cd`; index: `fa5f956aefadf5aa96f00b375ef5f39b0ee4302e1725f513d69dbde8f772c142`. Exact backups: `a5a2-evidence/pre/`. All 23 index input/physics function blocks from `a5a1-evidence/index-protected-functions.json` remain equal. Index changes ONLY `drawDispatch` runner-render invocation; entire source outside that function is identical. No input listener/API/physics changes.

Permitted a12 changes: OUTFITS + names; additive ownedRunnerIds and equipped-set validation; shop products/static atlas preview; purchase/wear rollback; atlas loader/compositor/phase selector and engine drawRunner registration. Existing drawWorldIntegrated actual function, route/coin source, economy prices for worlds, motion/chief/controller functions and 18 route-inputs unchanged. Test evaluation hooks are inserted by local test HTTP server only behind DEBUG; none shipped in product. Source diff: `a5a2-evidence/source.diff`.

### Acceptance matrix (expected/tolerance ? sample/input ? scope ? positive/negative control)

| Item | Implementation | Functional test | Art | Visual acceptance | Expected / tolerance; sample + input; scope; control / evidence |
|---|---|---|---|---|---|
| Female and male atlas rendering | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | 2 runners ? 4 sets ? 8 motions ? 2 facings ? 8 frames = 1024; actual compositor on game canvas, exact RGBA equality to independently assembled atlas cells, zero tolerance; production drawDispatch observed 5 versioned atlas draws; shifted anchor/wrong mirror/frame mutations rejected; `live-matrix.json`, `live-final.log` |
| Outfit persistence in all frames | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | 4096 garment omission comparisons, each causes nonzero pixel change; feet anchor (32,56), width 32 / height 48 or slide 24 unchanged after every draw; no overlay at canvas center (ancestors excluded); removed helmet and geometry mutation rejected; `live-matrix.json`, `negative-controls.json` |
| FrontFlip tuck / phase selection | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | 0?1 launch, 2?5 tuck, 6?7 extension, pretransformed atlas cells without second rotation; all frames both directions; wrong frame mutation rejected; same matrix |
| Four products / shared ownership | IMPLEMENTED | PASSED | N/A | N/A | Default 0, Dock Crew 40, Night Shift 240, Hazard Runner 360; simultaneous API purchase and actual UI double click charge once; both runners own purchase, separate equipped set; insufficient funds and failed save do not buy; price mutation rejected; `live-final.log` |
| Additive migration / reload | IMPLEMENTED | PASSED | N/A | N/A | Old schema/invalid outfit/null input normalize idempotently, both runner IDs; wallet, worlds, route stars/coin records, pending/best/banked runs, legacy/settings preserved; actual stored old profile load, UI purchase and reload preserve progress/worlds; runner ownership and wallet-reset mutations rejected; `migration.json`, `live-final.log` |
| Same-name asset replacement cache | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | SHA/cache version validated for all 34 files; test serves changed PNG content/hash under same filename and reload requests new version only; no old version request; `live-final.log`, `integrity.json` |
| Protected code/data | IMPLEMENTED | PASSED | N/A | N/A | 144 checks, including 23 protected index blocks, index outside drawDispatch, 18 inputs, route/coin registry, unchanged functions, sprite hashes/cache versions; exact equality; `integrity.json` |

All eight source mutations rejected by the appropriate tests; product source was never mutated for negative controls. First matrix attempt flagged the fixed canvas ancestor as an overlay; predicate corrected to exclude ancestors and still reject actual covering elements. No product acceptance threshold lowered.

### Focused preservation and limitations

- Live integration: 5/5 PASS, native rc 0 (`live-final.log`, `live-final.exit`).
- World: 12/12 PASS on final runtime SHA, native rc 0 (`world-final.log`).
- Coin static: 9/9 PASS on final runtime SHA, native rc 0 (`coins-final.log`, `coins-final.exit`).
- Core initial: 43 PASS / five accepted old tn-a12 failures (`core.log`). Final runtime SHA rerun: 43 PASS / identical five accepted old failures, native rc 1 (`core-final.log`, `core-final.exit`).
- Legacy anim: 25 PASS / 1 FAIL (`anim.log`). FAIL `absent optional sheets make zero PNG requests and zero console errors` observes chief.png request. Same failing request reproduced on exact pre-A5a2 index+a12 (`anim-baseline.log`, native rc 1). Existing CHIEF_SPRITE request is unchanged; not weakened/fixed here. Test-only source helper resolves the accepted on-disk baseline instead of forbidden git show. No git executed.
- Full regression NOT RUN (forbidden this call). A5b shop motion controls/layout, NPC/ghost, A5c localization/audio/accessibility/analytics, A5d four-world full theme/performance gates NOT RUN / deferred to their scopes.
- Final artwork NOT delivered: 34 base/outfit atlases remain PLACEHOLDER. Runtime success is not art approval. Final female/base and garment replacements must honor the drop-in contract and rerun visibility/performance.
- No paid/AI image generation, install, commit, publication or automatic media opening.

### Reproduce

From `02-kod`: `python 03-test/a5a2-integrity.py`; with `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules`, `npx.cmd --no-install playwright test 03-test/a5-live.spec.cjs --workers=1 --reporter=line`; `node 03-test/a5-negative-controls.cjs`. Existing core/world/static tests unchanged. All-frame matrix takes ~15 seconds including purchase/migration/cache tests on this machine.

Final SHA inventory: `a5a2-evidence/output-sha256.json`.

- `index.html`: `4cc02ad4caacb583bdcd9ca562dc43df0a235de2f3aad3cadd797780b73aead7`
- `js/a12-campaign.js`: `b98f98a5fb3d09679c8fe9bbf5958cf02e85c07403bdd5f818c63864c83c0bd7`
- `ASSET-MANIFEST.md`: `5ef6e38219833fedf524a057e3563e5ae6c28006807e6bad15bd209ea023c6e5`
- `sprites/a5/atlas-contract.json`: `99fad68499315ea5063107686c7ebead35b223c9cd2fee9576030f6258c44454`

### A5a2 closure

A5a2 PASS (functional, placeholder art). All requested focused test packages completed; no test process left running. Same five accepted core failures plus independently baseline-reproduced legacy anim chief-request failure; no new regression. Final renderer uses existing gameClock (the initial intermediate rt.t version was corrected before final core/world/live runs).

Graphify: `graphify update .` completed AST-only rebuild, 32771 nodes / 54648 edges. It warned that 1949 sources yielded no nodes (mostly JSON evidence), 3 Android Gradle files had partial syntax extraction, and community labels need refresh. These are graph completeness warnings; no LLM/network labeling invoked. PowerShell wrapper returned 1 on stderr warnings, but graph.json/GRAPH_REPORT.md update completion is explicit in `graphify-update.log`. No visualization opened. The isolated animation test copy now has `.fixture` suffix to avoid accidental rediscovery in future full regression; original `03-test/anim.spec.cjs` is unchanged.

Deferred art: all 34 female/male body/outfit atlases, final aesthetic approval and post-final-art visibility/performance. Deferred tests: full regression, A5b/A5c/A5d scoped gates, final-art visual acceptance. No required A5a2 focused test remains unrun. Next scope: A5b as defined in the rebase.

## A5b1 - live shop preview and decorative NPC

Date: 2026-09-28T05:44:24.918635. A5b1 functional acceptance PASS; A5b overall PARTIAL. User-authorized split: personal ghost is A5b2, NOT_IMPLEMENTED / NOT_TESTED in this invocation.

### Baseline and scope

Baseline a12 `b98f98a5fb3d09679c8fe9bbf5958cf02e85c07403bdd5f818c63864c83c0bd7`; index `4cc02ad4caacb583bdcd9ca562dc43df0a235de2f3aad3cadd797780b73aead7`. Backups: `a5b1-evidence/pre/`. Entire index remains byte-identical, and all 23 A5a1 protected index function SHA checks PASS. 150 preservation checks cover prior inputs/drivers, routes/coins/world registry, unchanged campaign functions, and atlas contents. Drawing wrappers added without changing existing world/worker/chief drawing bodies or physics/controllers. Full source diff: `a5b1-evidence/source.diff`.

Permitted source changes: shop-only transient runner/motion clock; shop controls and layout; compositor pose selection; explicit target runner parameter for purchase/wear (API default unchanged); additive pure NPC rendering functions and drawWorld registration wrapper. UI preview switching never calls selectRunner, changes gameplay runner, or writes profile. Explicit purchase/wear equips the previewed runner only and preserves shared ownership/pricing/rollback.

### Acceptance matrix (four evidence fields)

| Item | Implementation | Functional test | Art | Visual acceptance | Expected + tolerance | Sample + input | Scope | Positive / negative control and evidence |
|---|---|---|---|---|---|---|---|---|
| Responsive shop | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | Preview fixed during product scroll; no panel/control overlap; canvas 3:2 ratio within 0.05; visible canvas covering DOM=0 | 1080x540, 844x390, 390x844, real clicks and product scrolling | landscape side-by-side, portrait stacked | 900px portrait rows rejected; layout-*.json; final.log |
| Animated runner preview | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | Exact RGBA equality with atlas reference for every frame; each animation changes pixels | 2 runners x 3 motions x 8 frames x 3 screens = 144 frames; locked Hazard Runner selected via UI | idle/run/flip + runner controls | frozen frame mutation rejected; preview-*.json |
| Locked trial isolation | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | Profile and stored JSON unchanged during trial; after reload only existing profileRevision +1 allowed | all three viewports; locked outfit and four world scene selections | no free equip/purchase/world switch; four distinct scene pixel hashes | leaking trial into runnerId rejected; final.log |
| Explicit previewed-runner purchase | IMPLEMENTED | PASSED | N/A | N/A | 300->60 for Night Shift; only female equipped, male remains default; gameplay runner still male | real female preview and buy clicks | normal authorized purchase behavior | wrong equip target mutation rejected; final.log; A5a purchase/rollback/reload gates also PASS |
| NPC roles and brief reactions | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | Added carrier/operator visible; worker/chief retain old art with additive face reaction; reaction delta >0 | four theme palettes, 20 role samples using D03 crane fixture plus worker/chief fixtures, active flip at .3s | explicit decorative-only layer; no new hazard | absent reaction mutation rejected; minimum 1808 changed RGBA components; npc-roles.json |
| NPC physics and camera | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | Player/camera/hazard/coins identical at every sample, zero tolerance; draw does not mutate simulation | 180 campaign steps at 1/60, same D01 segment x400 with reactions enabled/disabled; local flip flag restored after draw | player continues moving; camera/control not paused | player.x mutation rejected by state-invariance gate; npc-physics.json |
| Live drawing integration | IMPLEMENTED | PASSED | PLACEHOLDER | DEFERRED | One NPC render invocation per engine drawDispatch | live campaign canvas draw | shipped drawWorld wrapper, test hook only injected by local DEBUG server | disconnected wrapper mutation rejected; final.log |

### Focused preservation results

- New A5b1 acceptance: 10/10 PASS, native rc 0 (`final.log`, `final.exit`).
- A5a live suite: 5/5 PASS (128 combinations, 1024 atlas frames, 4096 layer omissions; purchase/migration/reload/cache), separate evidence in `a5b1-evidence/a5a/`. Combined initial log `live-pass.log` has 13 PASS + one then-unfixed NPC test fixture failure; all five A5a tests passed there. NPC fixture was subsequently fixed and final A5b1 suite passed. The exact A5a copy is archived as `a5b1-a5a-preserve.fixture` to avoid duplicate discovery.
- world 12/12, rc 0 (`world.log`); static coins 9/9, rc 0 (`coins.log`).
- parkour-tur1 + tn-a12 + t1b-bot-s: 43 PASS / same five accepted tn-a12 FAIL, native rc 1 (`core.log`, `core.exit`). Names: campaign-movement-and-frontflip, reward-budget-first-and-repeat, purchase-double-tap, D01 and D02 real-input route completion. Compared with A5a2 core-final.log. No new regression failure.
- Integrity 150/150 (`integrity.json`); seven controlled source mutations rejected (`negative-controls.json`). Mutations served only by test HTTP server; product never mutated.

Test fixture corrections, not relaxed product criteria: elementsFromPoint now counts only elements above the preview canvas; reload checks account for pre-existing profileRevision increment; fixture initializes legacy migration flag to isolate preview; theme fixture starts D03 before changing theme (Frozen startRoute otherwise selects F01); trace uses __tmbCampaignStep rather than legacy __tmbParkour.step and resets both starting walkPhase/camera.

### Deferred work and reproducibility

A5b2 ghost remains NOT_IMPLEMENTED / NOT_TESTED: 18-route version/seed/movementProfile compatibility, enable/disable, record/playback equivalence via Bot S, game-time pause/retry/checkpoint handling, incomplete-run exclusion, corrupt data/quota handling, main-profile isolation. No ghost acceptance is claimed. A5c/d and full regression not run. Final NPC art and all A5a atlases remain PLACEHOLDER; visual acceptance DEFERRED. Existing NPC art is preserved. No generated media was opened; no screenshots are claimed for this package (canvas/DOM numerical evidence).

Reproduce from 02-kod with NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules: `npx.cmd --no-install playwright test 03-test/a5b-preview.spec.cjs --workers=1 --reporter=line`; `python 03-test/a5b1-integrity.py`; `python 03-test/a5b-negative.py`.

Final a12 SHA256: `6a2108c75ac846f524d25ebc75f695eea594410daaa96d553a466be9225229a8`. Full output SHA list: `a5b1-evidence/output-sha256.json`. PowerShell/Python, local Playwright and graphify used. No network/install/git/paid generation/publication/full regression.

Graphify refresh warning details: 1949 source files (mostly JSON evidence) yielded no nodes; three existing Android Gradle files were partially extracted due to syntax errors. Community labels changed (2061 saved / 2063 current; 79 renamed by hub); no paid/network LLM label refresh was requested. See `a5b1-evidence/graphify-update.log`.

Graphify AST refresh completed: 32771 nodes / 54648 edges / 2063 communities; graph.json and GRAPH_REPORT.md updated. PowerShell wrapper exit 1 accompanied stderr warnings, while tool log explicitly confirms rebuild completion. Generated graph visualization was not opened. All task test and graphify processes have exited.

## A5b2 â€” personal ghost (25-minute stop, PARTIAL / NOT ACCEPTED)

Runtime implementation exists in `js/a12-campaign.js`: separate ghost storage/settings, game-clock samples, compatibility identity, pre-player alpha .38 drawing, retry/checkpoint playback, finished-better-only write, local-best result copy, DEBUG-only probes. `movementProfile` hashes movement constants and excludes runner/outfit; `obstacleSeed` hashes route length/finish/checkpoints/obstacles/ground/void geometry. Runner/outfit selection does not enter either physics identity.

New `tn-a5-ghost.spec.cjs` positive suite: 8/8 PASS in 11.8s; integrity: 141/141; protected index functions: 23/23 start/end. However acceptance is NOT granted: acceptance 1 used ghost injection on A01/A02/D01 rather than three real Bot-S completions (shortcut calls per row: 3,1,0,1,1,2,0,0), and required per-row temporary negative-control executions were not completed. Delivery grep for temporary mutation markers is 0. Full/legacy preservation gates and 18-route acceptance 1 remain main-session work per brief.

Evidence: `a5b2-evidence/ghost-final.log`, `integrity.json`, `protected-sha-start.json`, `protected-sha-end.json`, `source.diff`, `graphify-update.log`. Final SHA256: a12 `3167c2199f68e9c33308691cd3dc72f490b0cbcf8e25012a0d90880897831562`; index `4cc02ad4caacb583bdcd9ca562dc43df0a235de2f3aad3cadd797780b73aead7`.

### A5b2 Tur 2 â€” completed targeted acceptance

Acceptance 1 now uses the existing Bot-S keyboard-input driver with zero setup shortcuts: A01 65.32s/3919 steps/1306 samples/MAD .2455; crane route A02 65.10s/3906/1302/MAD .2455; checkpoint route D01 40.88s/2453/818/MAD .2495. Acceptances 2-8 rerun 7/7 PASS; checkpoint retry synchronized to 4.25s, a faster completed D01 replaced a 999s best, and a throwing ghost `setItem` set storageFailed while preserving the profile.

All eight temporary served-product mutations produced RED (`a5b2-evidence/neg-1.log` â€¦ `neg-8.log`) and were removed automatically; disk a12 SHA stayed `3167c2199f68e9c33308691cd3dc72f490b0cbcf8e25012a0d90880897831562`. Integrity 141/141, protected index functions 23/23, existing pre-backed spec diff count 0, temporary product marker grep 0. Shortcut-call counts acceptances 1-8: `0,0,0,1,0,2,0,0` (acceptance 4 checkpoint fixture; acceptance 6 permitted record/error injection).
## A5b2 Tur 3 â€” route-local ghost and complete movement profile

- Ghost storage is v2 `{routes:{routeId:record}}`; legacy v1 single records remain readable and are migrated on the next successful write. Route-local A01â†’A02â†’A01 and its single-key negative passed/red.
- Movement profile hashes `TMB_MOVEMENT_CONSTANTS` plus all campaign `engine.constants`; changing gravity invalidates playback, while the legacy narrow-profile negative stayed compatible and failed.
- Acceptance 1 default remains A01/A02/D01; `A5B2_ROUTES=all` selects all 18 routes. Real-frame on/off measurement covers world + runner and records region MAD/outside MAD.
- Protected functions 23/23 and A5b2 integrity 141/141 passed; existing spec diff 0. Full combined spec rerun deferred by the real 25-minute stop.

## A5b2 Tur 4 â€” source-derived movement identity and production globals

Removed the manually copied `TMB_MOVEMENT_CONSTANTS` dictionary and its window export. `movementProfile` now hashes runtime `Function.prototype.toString` sources passed through the existing install closure for `solidSurfaces`, `solidRects`, `parkourBody`, `parkourClear`, `parkourStand`, `parkourCancel`, `parkourPoint`, `parkourSweep`, `parkourChoose`, `parkourTick`, `parkourLanded`, `doPhysics`, `campaignWallAssist`, and `updateDispatch`, plus all `engine.constants`. A served `doPhysics` literal mutation (1450â†’1451) invalidated the stored ghost; the copied-dictionary negative stayed compatible and failed. Production `Object.keys(window)` has zero additions versus the A5b2 pre backup; a served single-global mutation failed. Default three-route full ghost suite: 10/10 PASS; 18-route mode was not run. Protected functions 23/23, A5b2 integrity 141/141, existing backed-up specs diff 0. Final SHA256: a12 `96ebbb23506ca15ae61380e2d74df3202095ee0ba11844d1f41945b2471ed9d1`; index `d9d66a5c22e821769523ae2e7730bb906cbe45b8946131ba7931b003cbf1d359`. Evidence: `a5b2-evidence/turn4-full-final.log`, `neg-red1-source-profile.log`, `neg-red2-global.log`, `turn4-integrity.json`.
## A5c1 — dil, logo placeholder, yerel analitik, cila (28.09)

- B-L1 PASS — EN/TR/RU anahtar kümeleri eşit; `?`/U+FFFD yok; Türkçe/Kiril pozitif kontrolleri geçti.
- B-L2 PASS (brief tur kapsamı) — 1080x540 mağaza yüzeyi TR/RU literal kontrolü geçti; diğer çözünürlükler ana oturuma devredildi.
- B-L3 PASS — navigator ru-RU, TR ve unsupported→EN; kayıtlı seçimin reload önceliği doğrulandı. Playgama dili güvenli adaptör üzerinden; YT SDK'da dil API'si bulunmadı, navigator kullanılıyor.
- M-L4 PARTIAL — gerçek select tıklaması, anlık çeviri, reload ve profil alanları geçti; 390x844 + rota değişimi tam matrisi koşulmadı.
- M-L5 PASS (brief tur kapsamı) — 3 dil × 1080x540 DOM taşma 0; 844x390/390x844 ana oturuma devredildi.
- Y-G1 PASS — dört Pillow placeholder dosyası/boyut/manifest SHA ve yeni runtime yolları doğrulandı; görsel kabul ertelendi.
- B-A1 PARTIAL — tek şema, zorunlu alanlar, LOCAL_ONLY/NOT_CONFIGURED ve 100 getter→0 olay geçti; tam Bot S + satın alma/giyme dizisi koşulmadı.
- B-C1 PASS — kampanyada OPENING bastırma kaynağı ve mağaza başlığı/dil seçici kesişim 0 geçti; 18 rota × 3 çözünürlük matrisi koşulmadı.
- Y-D1 PASS — hash'siz yüklemede yeni `window.__tmb*`/test kancası 0.
- Testler: `tn-a5c-lang.spec.cjs` 9/9 PASS; `a5b-preview.spec.cjs` 10/10 PASS. `tn-a5-ghost.spec.cjs` ilk Bot S testi tamamlandıktan sonra süre kapısında durduruldu; kalan 9 test koşulmadı.
- Negatif kontroller: RU `???`, `t()`→literal ve getter emit mutasyonları in-memory kırmızı; teslimde kaldırıldı; kaynak grep 0.
- Dört alan: implementation=IMPLEMENTED · functional_test=PARTIAL · art=PLACEHOLDER · visual_acceptance=DEFERRED.
- Son SHA256: `index.html` `0816e6927f04f9f4e955379b26a60eb19fa3ca64a2ccb5a72ad5d42b3e0ac9d3`; `js/a12-campaign.js` `cb71e9ea66b5f688edfb58ae960e49a09ed2cabc10df9ee3ad138fe35d92d715`.
- Koşulmayanlar: parkour-tur1, t1b-bot-s, t2-coins, tn-a5, tn-a12, a5c1-integrity ve tam ghost 10/10; `a5b1-integrity.py` bilerek koşulmadı.

## A5c1 düzeltme turu (28.09)
- Yayın yüzeyi: `window.analytics` ve `window.tmbPlatformLanguage` kaldırıldı; index↔a12 bağı kapalı DOM olay köprüsünde, snapshot/export yalnız DEBUG. Hash'siz açık global listesi (`analytics`, `tmbPlatformLanguage`, `a5cProbe`, `__tmb*`) 0.
- Para birimi: TR `insufficient` yeniden `YETERSİZ COIN`; `[Ö]` yönetici kararıyla ileride “JETON” değerlendirilebilir.
- Ghost: açılış/geri yükleme `ghost_toggle` üretmiyor; gerçek kullanıcı tıklaması tam 1 olay.
- M-L4 PASS: 390×844 `page.tap`, UI seçimi, anlık dil, D02 rota değişimi, reload ve wallet/progress/outfit/world korunması.
- B-A1 PASS: gerçek D01 Bot S bitişi, UI mağaza satın alma+giyme, UI dil seçimi, kullanıcı ghost seçimi; olay sırası/alanları, 100 getter→0, dış ağ 0, LOCAL_ONLY doğrulandı. Satın alma ve giyme ayrı olaydır.
- B-C1 pozitif PASS: 18 rotanın başlangıç fillText kancasında OPENING 0; 1080×540/844×390/390×844 mağaza başlığı ve +N sonuç etiketi kesişimi 0; `a5c1-evidence/bc1-after-*.png`. Negatif kesişim mutasyonu koşulmadı.
- B-L2 FAIL/eksik: önceki dar mağaza testi henüz brief'in tüm canvas+DOM yüzeyleri, gerçek checkpoint+ölüm/retry ve İngilizce kelime taramasına genişletilmedi. Sabit legacy literaller yeni kampanya renderer'ında görünmez [M], ancak istenen kanca matrisi tamamlanmadığı için PASS verilmedi.

### A5c1 tur 3 (#0431; 2026-09-28 18:23:41 +03:00 → 18:38:09 +03:00)

- B-L2 PASS: TR/RU; görünür DOM + `CanvasRenderingContext2D.fillText` kancası; karakter, kıyafet/dünya mağazası, dil/hayalet, HUD, checkpoint, bitiş kapısı ve sonuç. D01 Bot S gerçek bitiş; D06'da 5 sn gerçek sağ girdiyle doğal ölüm oluşmadı [M], gerçek `r` girdisi retry üretti. Kalıntı 0; açık izin listesi testte.
- #0429 kısayol sayısı: B-L2 bitiş/bankalama kısayolu 0; B-C1 geometri kurulumu mevcut `finish()` kancasını 3 kez (her viewport için bir) kullanır.
- 12 literal kanca tablosu: `CHECKPOINT` hayır; `FINISH →` hayır; `Restarting route in 3 seconds...` hayır; `PACKAGE DELIVERED.` hayır; `LOW CLEARANCE` hayır; `EXIT` hayır; `FREE` hayır; `SECTOR` hayır; `SHIELD` hayır; `Incidents` hayır; `DOCK 31 COMPLETE` hayır; `SCAN 31` hayır [M, yeni kampanya yüzeyleri]. Görünen `FLOW` sonuç satırı I18N'e taşındı; TR/RU `nightShift`/`hazardRunner` tamamlandı.
- Negatif kırmızılar: B-L2 `Received ... Same physics. Shared wallet. Your runner.`; B-C1 `Expected: 0 / Received: 9150`; Y-D1 `Received ... "analytics"`. Mutasyonlar yalnız servis belleğinde, teslim betiğinden kaldırıldı.
- Pozitif `tn-a5c-lang`: 9/9 PASS (25.2s). Korunma: `a5b-preview` 10/10 PASS (20.2s); `tn-a5-ghost` 9/10, test 7 FAIL: eski kaynak-literal beklentisi `drawResult.toString()` içinde `YEREL EN İYİ` arıyor; yeni tek I18N katmanı `t("localBest")` kullanıyor. #0418 gereği mevcut test değiştirilmedi.
- Dört alan: implementation=IMPLEMENTED · functional_test=PARTIAL · art=PLACEHOLDER · visual_acceptance=DEFERRED. #0429 bu tur kısayol: B-C1 rota hazırlığı DEBUG profil açma 18; B-A1 0.

### A5c1 tur 4 (2026-09-28 19:11:43 +03:00 → 19:20:18 +03:00)

- Yönetici istisnasıyla yalnız `tn-a5-ghost.spec.cjs` test 7 kaynak incelemesinden davranış testine çevrildi. Eski assertler: TR literal kaynakta var; imza ternary kaynakta var; `toFixed(2)` kaynakta var; kaynakta `online` yok. Yeni assertler: iki gerçek D01 Bot S bitişi; ilk TR kaydında `YEREL EN İYİ` + `YENİ`; ikinci sonuçta TR/EN/RU `localBest`; `[+-]\d+\.\d{2}s`; çizilen metinlerde online/rank/leaderboard 0.
- Negatifler KIRMIZI: precision `Expected /[+-]\d+\.\d{2}s/, Received "YEREL EN İYİ -0.0s"`; sign `Expected /[+-]\d+\.\d{2}s/, Received "YEREL EN İYİ 0.00s"`; language `Expected true, Received false` (TR ilk kayıt satırı).
- Pozitif: `tn-a5-ghost.spec.cjs` 10/10 PASS (4.4m, `A5B2_ROUTES` ayarlanmadı); `tn-a5c-lang.spec.cjs` 9/9 PASS (25.2s). Test 7 gerçek bitiş kısayolu 0; yalnız sonuç canvasını ölçmek için `drawResult()` 4 çağrı. Ürün kodu değişmedi; geçici ürün mutasyonu grep 0.
- SHA256: test `639d0f2230304fbed5a77052c0221ac9fa885d6f73d1160bfc104a0d48c81330`; index `70a41931fbe0a6780b7407e93a1efc7f4da82533d41d37f36ea8f8cf5b61eab9`; a12 `b6bede8c5ef21d8fbea630372f75fef0ea3033e25f5da07d39508188b89c8882`.
