# A5 Asset Manifest

## A5c2a audio

All outputs below are original project-owned synthesis from `tools/a5/synthesize_sfx.py` (source SHA256 `754f6d6a82376282914025cf4a95f0fe11a446998383928edc7c58f257497691`), generated 2026-09-28, mono 48 kHz Ogg Vorbis. License: project owner. Recipe: `python tools/a5/synthesize_sfx.py`; ffmpeg equivalent `ffmpeg -i input.wav -ac 1 -ar 48000 -c:a libvorbis -q:a 4 output.ogg`. No Sonniss source was copied.

| Event / output | Bytes | Output SHA256 |
|---|---:|---|
| barrel / `audio/sfx/barrel.ogg` | 6138 | `7e411f383673b637b4b79b23a4bcf040f1db828cd00b19d2b2c38e4848234a4e` |
| checkpoint / `audio/sfx/checkpoint.ogg` | 4486 | `57456f922c65d6aff604924699f2fec0494ff75afa5079d4790e014c25edf356` |
| coin / `audio/sfx/coin.ogg` | 4278 | `53b9e99608e4cd324069b829cbe5982bf16a26c7575cd33490950e4003e08c71` |
| collapse fall / `audio/sfx/collapse-fall.ogg` | 7390 | `8e5e8fe4d71b1638d7fbda59b8917bf5739bee6f42ad7f9ee941446420f691c5` |
| collapse warning / `audio/sfx/collapse-warning.ogg` | 4977 | `012f304dead471886911648362a24bd91a49dd2d7753eadccec0c8a4254da2f7` |
| crane / `audio/sfx/crane.ogg` | 7025 | `d6dece63237a0f35a8a0b9b5494d0286773610cd5f4a57d685e0cbf794811971` |
| door / `audio/sfx/door.ogg` | 6853 | `425f080107605ce8f952e7adbd37994206efa1a889bd0cd7a7800251532c16be` |
| equip / `audio/sfx/equip.ogg` | 4380 | `699eb02cdbeea9bb587b4e4d3e0ff5aabefe8efaaa7acb4b317c8b1c213cf0b8` |
| finish / `audio/sfx/finish.ogg` | 5352 | `83a7dd91891711405d3647da07b3ebeda0fcc3ba10a78c6cd28f6b518b180a72` |
| flip / `audio/sfx/flip.ogg` | 4327 | `bd610ec0d4097ff48c2a5afe8f940aebb52ced88c7ee8bba22380c58ca91df4f` |
| land / `audio/sfx/land.ogg` | 5262 | `082b18b93d9991f295347e6f6719e57a847d38c68773850d18c19516b2f077d2` |
| pallet / `audio/sfx/pallet.ogg` | 6314 | `a9fe2228d3e0fb3cb469d36ac9c3a0602c544069c495bdd7a7aaded359011070` |
| purchase / `audio/sfx/purchase.ogg` | 4557 | `e3e329504c8fb07d2b196fe68b77e3047871ad62ea34b72d763cf6aefec577e2` |
| ramp / `audio/sfx/ramp.ogg` | 4115 | `d110570175ad874da64e5e913056b8e5c91b67d787cfa52fa9fef2307c8a95b5` |

## A5c2b music — YÖNETİCİ MÜZİK SÜRÜMÜ (2026-09-29)

Final music acceptance requires manager listening. Tarihçe: SENTEZ SÜRÜM (synthesize_music.py, seed 50202) 2026-09-29 dinlemede reddedildi ("komple uğultu"; 4/5 parçada spektral rolloff 229–356 Hz; yedek `01-tasarim/a5c2b-sentez-yedek-2026-09-29/`); Sonniss ambiyans denemesi de reddedildi (dünyalarla alakasız). Kaynak: yöneticinin indirdiği müzik paketi, ham MP3'ler `01-tasarim/a5c2b-muzik-kaynak-2026-09-29/` (11 dosya; stage1-5, altstage4/5, boss, altboss, *_nointro, gameover). License: **CC0 1.0** — "Platformer Chiptunes" by Guy G. Gamerson, OpenGameArt (https://opengameart.org/content/platformer-chiptunes, gönderim 2026-01-30, sayfa 2026-09-29 doğrulandı); atıf gerekmez, ticari kullanım serbest. Recipe (her satır): mono 48 kHz; baş/son sessizlik `silenceremove` (−45 dB); döngü noktası: son `X` s ile ilk `X` s `acrossfade` (tri) → kusursuz `L` s loop (L = kırpılmış süre − X); sabit kazanç (`volume`) ile −16 LUFS + `alimiter` (−2 dBTP); baş/son 0.384 s sessiz dolgu (`adelay=384`,`apad=0.384`); `-c:a libvorbis -q:a 3`. P is encoded padding and L is the played loop length. Seam kontrolü: `tools/a5/music_loop_check.py --p 0.384 --l L` 5/5 PASS (2026-09-29). Alternatifler (dinleme için, teslimde silinir): `audio/music-alt/alt-stage3|4|5.ogg`.

| Output | Bytes | Output SHA256 | P | L | source / license |
|---|---:|---|---:|---:|---|
| `audio/music/menu.ogg` | 576924 | `eb5bfff9f8c7137ece9d3cec122e7ce35bb8cc21b3fba11c636e280873ae4142` | 0.384 s | 56.999333 s | yönetici paketi `stage1.mp3`; X 3 s; CC0 1.0 (OpenGameArt Platformer Chiptunes); q3 |
| `audio/music/dock31.ogg` | 533001 | `3f710df2ee3d7d9e719ce2a1b5edaf8064b947ac792bb4b385d1f2ec63eb8130` | 0.384 s | 53.697375 s | yönetici paketi `stage2.mp3`; X 1.5 s; CC0 1.0 (OpenGameArt Platformer Chiptunes); q3 |
| `audio/music/frozen.ogg` | 665433 | `5d232335566b5141f96d19878115584f6243532e48c071a3bf936eb52b0dd95c` | 0.384 s | 71.327563 s | yönetici paketi `stage5.mp3`; X 1.5 s; CC0 1.0 (OpenGameArt Platformer Chiptunes); q3 |
| `audio/music/magma.ogg` | 611281 | `c46e814926510d6601d785875d244eff1ea1ca65c615943c67e7cd612d092a57` | 0.384 s | 62.915083 s | yönetici paketi `boss_nointro.mp3`; X 3.5 s; CC0 1.0 (OpenGameArt Platformer Chiptunes); q3 |
| `audio/music/aftermath.ogg` | 446213 | `d483075b2094790179fb65211052210ac4eef635e3b416710fa69e3c6d92152e` | 0.384 s | 47.899646 s | yönetici paketi `altboss_nointro.mp3`; X 1.6 s; CC0 1.0 (OpenGameArt Platformer Chiptunes); q3 |

Legacy `soundtrack.mp3`: previous version, license record unavailable — retained; kampanya ve menüde kullanılmaz.

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

## A5c1 placeholder brand family

Generated locally by `tools/a5/generate_logo.py` with Pillow. License: project owner. The only embedded words are the protected game title. Final visual acceptance remains deferred.

| Path | Bytes | Dimensions | SHA256 | Four fields |
|---|---:|---:|---|---|
| `sprites/a5/brand/trust-me-bro-logo.png` | 19458 | 1024x384 | `9932126c213c16b66a469d7bcc3c36d8896ffb5591d1cec79bf789edad67b417` | implementation=IMPLEMENTED · functional_test=PASSED · art=PLACEHOLDER · visual_acceptance=DEFERRED |
| `sprites/a5/brand/trust-me-bro-icon-512.png` | 3796 | 512x512 | `c02eac8d33a92ce183fbeb380b28aba3370498e13fca62ed72fc6573432c4e46` | implementation=IMPLEMENTED · functional_test=PASSED · art=PLACEHOLDER · visual_acceptance=DEFERRED |
| `sprites/a5/brand/trust-me-bro-icon-48.png` | 521 | 48x48 | `6790aa3acf6bec1067c3796b8ff81670fb10f785f50b0acb3db55f025302644c` | implementation=IMPLEMENTED · functional_test=PASSED · art=PLACEHOLDER · visual_acceptance=DEFERRED |
| `sprites/a5/brand/trust-me-bro-store-cover.png` | 22729 | 1200x630 | `701d613c640a5ac2ff1aca0bb2ee9036e3bc62d71f2deb7fa55ef5c90e0418a6` | implementation=IMPLEMENTED · functional_test=PASSED · art=PLACEHOLDER · visual_acceptance=DEFERRED |

Previous-version assets, retained unchanged; license record unavailable: `trust-me-bro-logo.png` (86857 B, `cfb98cbe793d96844b2857fcb91a849c1bab8271bd79b3d94a302a9ec3f8abe3`), `game-icon.png` (9157 B, `5138d6ec728d5930d27b537bd421744f1907ca9bec77ef9620476bbc19fe3a3a`), `cover-art.png` (2231826 B, `6a268b49d40575ff685977499561bb01475a760dc39c7bad52d24131c5ba2ba3`).
