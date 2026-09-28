# A5 Asset Manifest

## A5a1 placeholder contract

Runtime integration: IMPLEMENTED in A5a2. All 34 atlases are loaded by the campaign renderer. Art is PLACEHOLDER; visual acceptance DEFERRED. No final art approval is claimed.

Source: `tools/a5/generate_placeholders.py`, original procedural shapes; project-owner artwork, no third-party visual input. Generator dependency: installed Pillow 12.3.0. Reproduce: `python tools/a5/generate_placeholders.py`. Check: `python 03-test/a5-assets-check.py`.

Machine-readable contract: `sprites/a5/atlas-contract.json`. 512x512 RGBA atlas, 8x8 cells of 64x64; anchor (32,56); transparent padding >=4px. Standing reference hitbox (16,8,32,48); renderer must never modify player geometry. Existing slide/crouch geometry remains 32x24.

Right-facing source; mirror left around x=32. Layer order: body, bag, vest, helmet, eyewear. Draw cell at (player center x - 32, player feet y - 56). Flip/roll rotate artwork around cell center, not collision geometry. Frames already contain pose transforms: do not apply a second rotation in runtime.

Cache: load each atlas with `?v=<cacheVersion>` from the contract. Final-art replacement MUST regenerate SHA256/cacheVersion; same filename without updated content hash is invalid. Max 524288 bytes/file. Straight alpha; no opaque background.

Timing: idle/run use game time; action frames follow normalized existing mechanic phase (floor(progress*8), clamped 0..7). Durations below are authoring references only and cannot change physics. FrontFlip tuck frames 2..5 must be selected during the existing tuck phase; phase-local mapping is required in A5a2.

| Motion | Row | Frames | Reference duration / FPS | Loop |
|---|---:|---|---|---|
| idle | 0 | 0–7 | 1s / 8.000 | True |
| run | 1 | 0–7 | 0.5s / 16.000 | True |
| jump | 2 | 0–7 | 0.8s / 10.000 | False |
| vault | 3 | 0–7 | 0.42s / 19.048 | False |
| slide | 4 | 0–7 | 0.6s / 13.333 | False |
| wallRun | 5 | 0–7 | 0.9s / 8.889 | True |
| roll | 6 | 0–7 | 0.45s / 17.778 | False |
| frontFlip | 7 | 0–7 | 0.8s / 10.000 | False |

Every row: implementation=IMPLEMENTED (generated asset only); functional_test=PASSED (offline contract only); art=PLACEHOLDER; visual_acceptance=DEFERRED. Runtime functional acceptance PASSED: `03-test/a5a2-evidence/live-matrix.json`.

| Asset | Bytes | SHA256 | Cache version |
|---|---:|---|---|
| `sprites/a5/male-base-body.png` | 10929 | `3a5f0d849daacdc6e9a44abb8a341ff9b0733b0c28e00944c3197f054adf7403` | `3a5f0d849daacdc6` |
| `sprites/a5/male-default-bag.png` | 3961 | `039589eaeff13e68a51a13cb134869a863e4f1a19074ccdc81de42cc0f6072ae` | `039589eaeff13e68` |
| `sprites/a5/male-default-vest.png` | 4309 | `3a5f725b3c2375bfa93418696cf2e997b2f3ca87a025343042af621891ac3499` | `3a5f725b3c2375bf` |
| `sprites/a5/male-default-helmet.png` | 3007 | `3b6b6d2c854c1b7186139f43fa45ea1b65fadcc67c34a8dbe58f71ff1f96aaa2` | `3b6b6d2c854c1b71` |
| `sprites/a5/male-default-eyewear.png` | 2278 | `2961babe908b2c7ace28204ae1cb0162b5fdf02e149e04116f79950a88e9d005` | `2961babe908b2c7a` |
| `sprites/a5/male-dockCrew-bag.png` | 3952 | `4553d0ac2390cd6850f2e9d7079d6e2d5f444391fdc7c30320680840aa84bede` | `4553d0ac2390cd68` |
| `sprites/a5/male-dockCrew-vest.png` | 4288 | `dc28b4540af7832d8588c773b8094b5655352c9ad16d003eafcba6892591ea03` | `dc28b4540af7832d` |
| `sprites/a5/male-dockCrew-helmet.png` | 3023 | `f7ff259900bf36b1e6c80293a35c1a572a7c8247ab68ee957cc9c9b7d0a557d0` | `f7ff259900bf36b1` |
| `sprites/a5/male-dockCrew-eyewear.png` | 2285 | `dcc5560ed3cc081b424e954fc416ec507a71906925afb170abc27f5555a68063` | `dcc5560ed3cc081b` |
| `sprites/a5/male-nightShift-bag.png` | 3953 | `2083587d16268675371548a12ab5e836863c20c690e0eeadb336eae0a2f62830` | `2083587d16268675` |
| `sprites/a5/male-nightShift-vest.png` | 4268 | `bf3c548d31eee8815453a1e76f9ab4a457f31031d34c908a39daea8a0d3a9799` | `bf3c548d31eee881` |
| `sprites/a5/male-nightShift-helmet.png` | 3024 | `141a722adfda7a58f83d198bfa851aa121f9a4456d04c4e761e42f2df5f132e8` | `141a722adfda7a58` |
| `sprites/a5/male-nightShift-eyewear.png` | 2295 | `3130bdba6faa025f60f0bae8c4d9d645609c52cae4fc2cdfc017bb081b69e1b8` | `3130bdba6faa025f` |
| `sprites/a5/male-hazardRunner-bag.png` | 3957 | `33dcd1e038b65c5ce60bd3de78b1572e4f624c3f0201a222182c9ad0b4547189` | `33dcd1e038b65c5c` |
| `sprites/a5/male-hazardRunner-vest.png` | 4210 | `a476411fa6b842c05f302379e6309a95ffbf55f7beafb02ca8c8007b83768d90` | `a476411fa6b842c0` |
| `sprites/a5/male-hazardRunner-helmet.png` | 3667 | `003ec9b43b4dc2d63dc46271a447b1e5d17ce75984309985a0e4f43d61dc2938` | `003ec9b43b4dc2d6` |
| `sprites/a5/male-hazardRunner-eyewear.png` | 2292 | `b911f21d3dff3acb66af7bac2b6d251c065b4b787febd66d5a98f94c7bb14887` | `b911f21d3dff3acb` |
| `sprites/a5/female-base-body.png` | 11536 | `43a9438b5568f7923578cbc749c71b8c1ded8429afa71988a1ef125cf5360412` | `43a9438b5568f792` |
| `sprites/a5/female-default-bag.png` | 3961 | `039589eaeff13e68a51a13cb134869a863e4f1a19074ccdc81de42cc0f6072ae` | `039589eaeff13e68` |
| `sprites/a5/female-default-vest.png` | 4085 | `3e582eaa8aa4d132b99fefe62d256aa097f0116a63da70d760d6bf637c3eb691` | `3e582eaa8aa4d132` |
| `sprites/a5/female-default-helmet.png` | 3007 | `3b6b6d2c854c1b7186139f43fa45ea1b65fadcc67c34a8dbe58f71ff1f96aaa2` | `3b6b6d2c854c1b71` |
| `sprites/a5/female-default-eyewear.png` | 2278 | `2961babe908b2c7ace28204ae1cb0162b5fdf02e149e04116f79950a88e9d005` | `2961babe908b2c7a` |
| `sprites/a5/female-dockCrew-bag.png` | 3952 | `4553d0ac2390cd6850f2e9d7079d6e2d5f444391fdc7c30320680840aa84bede` | `4553d0ac2390cd68` |
| `sprites/a5/female-dockCrew-vest.png` | 4053 | `41bb61f53e356493446de3405597d1079af5b53d14370433445c984eb24a180e` | `41bb61f53e356493` |
| `sprites/a5/female-dockCrew-helmet.png` | 3023 | `f7ff259900bf36b1e6c80293a35c1a572a7c8247ab68ee957cc9c9b7d0a557d0` | `f7ff259900bf36b1` |
| `sprites/a5/female-dockCrew-eyewear.png` | 2285 | `dcc5560ed3cc081b424e954fc416ec507a71906925afb170abc27f5555a68063` | `dcc5560ed3cc081b` |
| `sprites/a5/female-nightShift-bag.png` | 3953 | `2083587d16268675371548a12ab5e836863c20c690e0eeadb336eae0a2f62830` | `2083587d16268675` |
| `sprites/a5/female-nightShift-vest.png` | 4054 | `eb4e4f3bc209f41fa08b86a979b26045111ce0cc7ee914ccdc0b83d6587fb0ab` | `eb4e4f3bc209f41f` |
| `sprites/a5/female-nightShift-helmet.png` | 3024 | `141a722adfda7a58f83d198bfa851aa121f9a4456d04c4e761e42f2df5f132e8` | `141a722adfda7a58` |
| `sprites/a5/female-nightShift-eyewear.png` | 2295 | `3130bdba6faa025f60f0bae8c4d9d645609c52cae4fc2cdfc017bb081b69e1b8` | `3130bdba6faa025f` |
| `sprites/a5/female-hazardRunner-bag.png` | 3957 | `33dcd1e038b65c5ce60bd3de78b1572e4f624c3f0201a222182c9ad0b4547189` | `33dcd1e038b65c5c` |
| `sprites/a5/female-hazardRunner-vest.png` | 3966 | `3ec4481de6f3c90aa2e065afac3d2d16d32c69b0d3223d71fb14ce3ce33e2745` | `3ec4481de6f3c90a` |
| `sprites/a5/female-hazardRunner-helmet.png` | 3667 | `003ec9b43b4dc2d63dc46271a447b1e5d17ce75984309985a0e4f43d61dc2938` | `003ec9b43b4dc2d6` |
| `sprites/a5/female-hazardRunner-eyewear.png` | 2292 | `b911f21d3dff3acb66af7bac2b6d251c065b4b787febd66d5a98f94c7bb14887` | `b911f21d3dff3acb` |

## A5a2 integration / save contract (implemented in A5a2)

- Keep PROFILE_KEY and schema v1: additive migration, no key rename or balance reset. Add ownedRunnerIds=[male,female]; both free. Preserve runnerId, walletBalance, world ownership, all route progress/pending/best/banked runs, legacy flags and existing settings. Normalize each runner equipped set to owned valid IDs, otherwise default. Migration must be idempotent.
- Shared ownedOutfitSetIds unlocks purchase for both runners; equippedOutfitByRunner remains independent. Default 0, Dock Crew 40, Night Shift 240, Hazard Runner 360. Add registry products and shop entries in A5a2. A repeated purchase charges zero; insufficient balance leaves data unchanged; persistence failure is tested against current persist rollback semantics.
- Existing settings.language remains unchanged. No new setting is required for A5a runner/outfit choice.
- Permitted index presentation points: drawCourier, drawDispatch renderer invocation, sprite loader/preview helpers; UI/sound/language presentation only in later scoped A5 packages. Input/physics functions and listeners are forbidden. Exact conservative block hashes are in 03-test/a5a1-evidence/index-protected-functions.json.
- Permitted a12 regions in A5a2: OUTFITS, baseProfile/normalizeProfile additive fields, outfit shop rendering/selection/purchase, runner render adapter; DEBUG-only test hooks. No route/coin/chief/physics changes.
- Runtime gates PASSED: all-frame outfit-animation-matrix (128 combinations / 1024 frames), independent layer visibility (4096), purchase once/shared unlock/per-runner wear, old save migration/reload, versioned asset requests, engine animation phase/anchor alignment. See `03-test/a5a2-evidence/`.

## Remaining inventory / art handoff

Existing sprites, soundtrack, logo: previous-version assets; license provenance not audited here. Full runtime manifest and audio provenance belong to A5c; do not infer license clearance. Female/base placeholders and all outfit layers need final art replacement and renewed visibility/performance acceptance. Existing world NPC art remains unchanged.

## A5a2 runtime wiring

`index.html:drawDispatch` calls `a12-campaign.js:drawRunnerIntegrated`; index input/physics blocks remain identical. Atlas cells are composited at feet anchor with no second rotation. Action frame selection uses existing parkour timer/duration; frontFlip elapsed maps 0?1 launch, 2?5 tuck, 6?7 extension; idle/run use existing gameClock; jump uses vertical velocity (-560 to +560 range, clamped). Drawing never changes collision geometry. Pending/failed asset load uses a local neutral silhouette; no legacy female sprite is used in campaign play. Shop idle preview shares the same compositor (A5b controls/layout remain deferred).

All female/base and outfit art: implementation=IMPLEMENTED; functional_test=PASSED; art=PLACEHOLDER; visual_acceptance=DEFERRED. Replacing final artwork requires content SHA/cacheVersion regeneration and renewed visibility/performance acceptance. Generator output intentionally resets functional_test to NOT_TESTED until checks rerun.

## A5b1 live shop and decorative NPC contract

Live shop reuses A5a's versioned atlases: 480x320 canvas, 3:2 aspect; idle/flip 8 FPS, run 16 FPS, eight looping frames. Preview runner/outfit/motion are transient. Only explicit purchase/wear persists an outfit for the previewed runner; gameplay runner selection stays unchanged.

`js/a12-campaign.js::presentationNpcs/drawNpcPresentation`: repository-authored procedural PLACEHOLDER, project-owner license. Carrier x=520; operator at each crane.x-90; elevated stations 125/145 px above ground; no collision bodies. Existing worker/chief/world drawing functions remain identical. Local station bounds x=-27..37/y=0..28, body x=-10..29/y=-46..0; anchor = station top. Reaction ellipse (0,-61-lift), radii 13x10. Layers: existing world, added role/station/reaction, existing player. Transparent surroundings; canvas save/restore. Four theme palettes; no RNG or simulation writes.

Worker/chief reactions only add a surprised face while an active flip is within 320 px; phase follows frontFlip.elapsed, ends with flip. Hazard warnings unchanged. Final art replacement retains anchors, role mapping and pure drawing contract. No new image file/cache dependency; runtime source SHA is tracked in `03-test/a5b1-evidence/output-sha256.json`.

implementation=IMPLEMENTED; functional_test=PASSED; art=PLACEHOLDER; visual_acceptance=DEFERRED. Final NPC design and final atlas aesthetic approval remain deferred.
