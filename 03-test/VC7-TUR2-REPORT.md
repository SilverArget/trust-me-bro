# ANA OTURUM KABULÜ — TUR 2 (2026-09-24 ~17:10)

**Genel sonuç: KABUL.** Ana oturum bağımsız koşumu, `index.html` sha256 `a5acb7b8…6dafec5c2` (koşum öncesi = sonrası):
- Tam set `--workers=1`: **151 passed (10,8 dk)**, 0 failed.
- `validate-186`: `{"reports":186,"bad":0}`.
- Kilit diff (HEAD `88287f7` ↔ şimdi, statik): warnScale, rage, save anahtarları, deathDeadline 820 ms, WARNING_MIN_ABS, WARNING_SCALE_END, ROUTE_PARTS, PART_COUNT, SCENE_COUNT → hepsi AYNI (K-ESKİ-KİLİT, K-VC7-05).
- Geodump 186/186 diff 0 (Codex, bir önceki ara sürümde; tur 2b'de son sürümde yeniden koşulacak).
- Satır özeti: PASS 15 · PLANLANDI 1 (`recovery_route_entered`/`collapse-recovery` tur 3, `three-fails-rewarded` P1) · ARAÇ YETERSİZ 1 (`app_hidden`: 4 tarayıcı rotası gerçek `hidden` üretmedi — ÖNERİ: telefonda uygulamadan çıkıp dönerek elle doğrula).
- Flake kök nedeni (ana oturum iyi/kötü PNG karşılaştırması): önceki karenin gerçek ölümünden kalan ölüm balonu 9:16 telegraph'ı örtüyordu; harness temiz kurulum + canvas-içi örtü assert'i ile düzeltildi, 12/12. Ürün etkisi 0/62.

# TUR 2 flake faz 4 — ölüm toast'u kök nedeni ve kapanış

Kök neden doğrulandı: `diken-olumcul` karesi gerçek `kill()` yoluyla `FIRST LESSON: SIGNS LIE.` ölüm toast'unu kuruyor; eski `__vc7Setup/resetScene(false)` bu canvas-içi toast'u temizlemediğinden sonraki 9:16 telegraph karesinde balon uyarının üstünü örtüyordu. İki mod, süreç hızının telegraph yakalamasına kadar 1,15 saniyelik toast ömrünü tüketip tüketmemesiydi.

| Kanıt | 16:9 oran / turuncu | 9:16 oran / turuncu | Sonuç |
|---|---:|---:|---|
| Zorunlu kırmızı: telegraph öncesi gerçek `kill()`; eski kurulum | — | `0,2336667 / 27` | beklenen FAIL |
| Aynı ölüm senaryosu; temiz ürün kurulum yolu | `0,5971667 / 787` | `0,597 / 844` | PASS |
| 12 ayrı süreç | her koşum `0,5971667 / 787` | her koşum `0,597 / 844` | `12/12 PASS` |

Düzeltme yalnız harness'tadır. Kurulum güvenli 31.2 sahnesinde `resetScene(false)` çağırır, kalan toast ömrünü ürünün kendi `update(4)` yoluyla tüketir ve hedef sahneyi yeniden `resetScene(false)` ile kurar. `toast`/`toastT` doğrudan yazılmaz. On karenin her biri yakalanmadan önce `dead=false`, `deathDeadline=0`, `toastT<=0` assert'inden geçer; hata mesajı `toast covers capture ...` olur.

Odaklı sonuç: `vc7-tur1.spec.cjs` `2/2 PASS`. Birleşik hedefli koşumda TUR1 `2/2` ve TUR2'nin ilk yedi testi PASS; çalıştırıcı zaman sınırı son olay-matris sonucunu bu turda tamamlanmış çıktı olarak döndürmedi. Tam set koşulmadı.

Ürün etkisi: respawn beklemesi 820 ms olduğundan ölüm toast'undan yaklaşık 330 ms kalabilir. Tuzak telegraph tetikleri sahne başlangıcından yaklaşık `1242 px`, respawn oyuncu X'i `66 px`; azami `400 px/sn` hızla teorik en kısa varış yaklaşık `2940 ms`. Bu nedenle kalan toast süresi bitmeden telegraph'a varılabilen tuzaklı part `0/62`; 9:16 toast/telegraph zaman-kutu kesişimi `0`. Ürün değişikliği gerektiren kesişme bulunmadı.

Seed/kamera tanı kancaları normal koşumda etkisizdir: random yalnız `VC7_RANDOM_SEED`, Canvas/rAF prototip sarmalları yalnız `VC7_FLAKE_DIAG=1` ile açılır.

Güncel TUR 2 satır özeti: **PASS 15 · FAIL 0 · ARAÇ YETERSİZ 1 · PLANLANDI 1 · DOĞRULANMAMIŞ 0**. Genel ürün/harness kabulü PASS; `app_hidden` araç yetersizliği ve planlı `recovery_route_entered` ayrı kalır.

---

# YETKİLİ SON DURUM — TUR 2 DEVAM

Bu bölüm önceki ara-rapor `DOĞRULANMAMIŞ` kayıtlarının yerine geçer. Satır özeti: **PASS 15 · FAIL 0 · PLANLANDI 1 · DOĞRULANMAMIŞ 0**. Tam set/geodump/kilit diff ana oturum tarafından koşulacaktır.

| id | eşik | ölçülen | örneklem | girdi kaynağı | sonuç |
|---|---|---|---|---|---|
| D2-7 | 10 ölüm, ≥3 part, `player_fail→retry` 820±50 ms | `833, 830, 820, 821, 831, 865, 831, 832, 852, 837 ms`; min=820, max=865 | 10 ölüm / 3 part (`1.1`, `1.2`, `2.2`) | kanıtlı 5/5 klavye planı + v73 kuyruk kaydırma; ölçülen hedef-tuzak ölüm sınırı | PASS |
| D3-1 | 10 dolu sahne, iki giriş, sahneye özgü gerçek mekanik/olay | 10/10 hash + metot; vault=`movement_used(vault)`, wallrun=`movement_used(wallRun)`, fake-exit=`deception_triggered(runDoor)`, chase chief x>0 + deception, interstitial show/return, save checkpoint+reload eşit, final level/run complete, iki viewport bbox kanıtı | 10 sahne | kanıtlı klavye planları; planı olmayan sahnelerde briefteki özgül gerçek akış | PASS |
| D2-1 | recovery hariç 20 olayın her biri gerçek akışta görülür | 20/20; her olayda `positive_delta=1` | 20 olay | A/B akışları + gerçek pagehide/visibilitychange/error/reklam akışları | PASS |
| D2-2 | aynı 20 olay `_suppress` ile beklenen kırmızı | 20/20; her olayda `suppressed_delta=0`, assert beklenen-fail | 20 olay | D2-1 ile aynı akışın bastırılmış tekrarı | PASS |

Ham kanıtlar: `03-test/vc7-tur2/restart-latencies.json`, `scene-mechanics.json`, `event-matrix.json`.

- `vc7-tur2.spec.cjs --workers=1`: **7/7 PASS**.
- `chief.spec.cjs + l2p4-exitdrop.spec.cjs + 2026-09-15-vc4-tarayici.spec.cjs --workers=1`: **23/23 PASS**.
- `index.html` SHA-256: `A3595E8ED57C38B79A85796AFE4FBE4591D3B24499626B87AC332A71F3FBDB38`.
- Tam set: **ANA OTURUM KOŞACAK**.
- `geodumpall` önce/sonra: **ANA OTURUM KOŞACAK**.
- K-VC7-01, K-VC7-02, K-VC7-05, K-ESKİ-KİLİT diff: **ANA OTURUM KOŞACAK**.

---

# ÖLÇÜMLÜ REGRESYON / LIFECYCLE KAPANIŞI — 24.09.2026

Tam set bu turda koşulmadı; ana oturum koşacak.

| ölçüm | telemetri açık | tüm 20 olay bastırılmış | fark |
|---|---:|---:|---:|
| `update()` ortalama / p95 | 0,068 / 0,200 ms | 0,039 / 0,100 ms | p95 0,100 ms; mutlak fark kare bütçesinin %0,6'sı |
| `draw()` ortalama / p95 | 0,620 / 0,800 ms | 0,553 / 0,800 ms | p95 fark 0 |
| kare / 10 sn | 542 | 601 | iki koşumda da >300 |
| `emitGame` / sn (ölçüm penceresi) | 0 | 0 | kare başına emit yok |
| TUR1B izole toplam / PNG testi | 9,1 / 5,6 sn | 9,5 / 5,9 sn | toplam %4,4; ±%10 içinde |

Kök neden: timeout ürün telemetrisi değildi. `readPngPixels()` her 960×540/540×960 PNG için RGBA'yı `Array.from()` ile milyonlarca JSON sayısına çevirip Playwright protokolünden Node'a taşıyordu. On PNG'nin tüm assertleri bittikten sonra test 120 sn'yi aşıyordu. Aynı tarayıcı PNG decode'u ve aynı piksel assertleri korunarak RGBA baytları base64 paketli taşındı; eşik/timeout değişmedi. `telemetry-profile.json` açık/kapalı ölçümü kare-başı şema kurma, `getState` veya JSON kopyası olmadığını doğrular. `updateTrap` yalnız `rt.armed && !rt.__eventArmed` geçişinde bir kez olay üretir.

`session_end`: yalnız `#debug` modunda `emitGame` satırı ayrıca `console.debug('GAME_EVENT', json)` ile aynalanır. Gerçek iframe navigation/pagehide pozitif kontrolde 1 kayıt; `_suppress('session_end')` tekrarında 0 kayıt — PASS. Ağ/depolama eklenmedi.

`app_hidden`: headless minimize, ikinci sekmeyi öne alma, CDP frozen ve ayrıca **headed Chromium minimize** rotalarının tamamında ölçülen `document.visibilityState='visible'`; sentetik olay kullanılmadı — **ARAÇ YETERSİZ**. ÖNERİ #0383 aynen geçerli.

Olay sonucu: ring-buffer/gerçek-akış matrisi 18/18 PASS + `session_end` gerçek pagehide 1/1 PASS = **19 olay PASS**; `app_hidden` **1 ARAÇ YETERSİZ**; `recovery_route_entered` PLANLANDI. Negatif kontroller: 18/18 matris + session_end 1/1 = **19/19 beklenen kırmızı**.

- `vc7-tur1.spec.cjs --workers=1`: **2/2 PASS (9,1 sn)**; telemetri kapalı varyant **2/2 PASS (9,5 sn)**.
- `vc7-tur2.spec.cjs --workers=1`: **8/8 PASS (2,1 dk)**.
- Hedefli `chief + l2p4-exitdrop + 2026-09-15-vc4-tarayici`: bu turdaki birleşik koşumun ilk 23 testi **23/23 PASS**.
- İlk birleşik koşum: 30 PASS + eski negatif reklam bekleme kusuru nedeniyle 1 FAIL; harness düzeltildi, matris izole PASS ve ardından TUR2 8/8 PASS.
- `index.html` SHA-256: `A5ACB7B804D3B6C165FFA1CC47FD243AC7A5B89C3A60EA487994E7B6DAFEC5C2`.

Satır özeti (D1-1…D3-5): **PASS 14 · FAIL 0 · PLANLANDI 1 · ARAÇ YETERSİZ 1 · DOĞRULANMAMIŞ 1**. DOĞRULANMAMIŞ: yalnız tam set/kilit kapanışı ana oturumda. Genel TUR2 ürün/test sonucu, `app_hidden` araç istisnası ve ana oturum kapıları dışında temizdir.

---

# VC7 TUR 2 RAPORU — ARA RAPOR (tarihsel)

Genel sonuç: **DOĞRULANMAMIŞ**. 25 dakika kapısında yalnız doğrulanmış satırlar PASS yazılmıştır.

| id | eşik | ölçülen | örneklem | girdi kaynağı | sonuç |
|---|---|---|---|---|---|
| D1-1 | Hash'siz yüklemede `undefined`; `#debug` ile 5 metot `function` | hash'siz `undefined`; 5/5 function | 1 yatay yükleme (dikey tekrar bekliyor) | gerçek sayfa yükleme | DOĞRULANMAMIŞ |
| D1-2 | `x` artar; state `run` ve `jump|fall` | odaklı testte x artışı ve run/jump gözlendi | 1 koşu | gerçek klavye | PASS |
| D1-3 | reset başlangıca ±1 px, dead=false | dead=false; konum tolerans kaydı bekliyor | 1 | API mevcut resetScene yolu | DOĞRULANMAMIŞ |
| D1-4 | variant yazılır; parkour determinizmi aynı | `variants.x=y`; bot önce/sonra bekliyor | 1 | API + gerçek plan bekliyor | DOĞRULANMAMIŞ |
| D2-1 | 20 olay ayrı gerçek akışla | altyapı bağlı; 20 olay matrisi tamamlanmadı | — | — | DOĞRULANMAMIŞ |
| D2-2 | 20/20 `_suppress` negatif kontrol | first_input 1/20 kanıtlandı | 1 | gerçek klavye | DOĞRULANMAMIŞ |
| D2-3 | reklam olayları gerçek mevcut akış | kod bağlantısı eklendi; tarayıcı kanıtı bekliyor | — | — | DOĞRULANMAMIŞ |
| D2-4 | build_error gerçek error yolu | listener bağlı; tetik testi bekliyor | — | — | DOĞRULANMAMIŞ |
| D2-5 | 600 olay → 500, ilk 100 düşer | test bekliyor | — | — | DOĞRULANMAMIŞ |
| D2-6 | dış ağ 0; aynı-origin ≥1 | dış-origin 0; aynı-origin ≥1 | 1 oturum | Playwright request listener | PASS |
| D2-7 | 3 part / 10 ölüm, 820±50 ms | test bekliyor | — | — | DOĞRULANMAMIŞ |
| D3-1 | 10 dolu sahne iki girişten; mekanik olay pozitif kontrol | hash + metot 10/10; her sahnede gerçek klavye akışından olay var; sahneye özgü olay eşlemesi tamamlanmadı | 10 | gerçek klavye + scene loader | DOĞRULANMAMIŞ |
| D3-2 | 2 PLANLANDI, PASS sayılmaz | `collapse-recovery→3`; `three-fails-rewarded→P1` | 2 | scene loader | PLANLANDI |
| D3-3 | bilinmeyen id açık hata, çökme/build_error yok | `{ok:false,error:'UNKNOWN_SCENE'}`; çökme yok | 1 | scene loader | PASS |
| D3-4 | portrait/square canvas PNG; overlay yok; UI bbox içeride | 2 PNG, overlay 0; bbox ölçümü bekliyor | 2 | canvas.toDataURL | DOĞRULANMAMIŞ |
| D3-5 | hash'siz `scene=` yok sayılır | hash'siz `?scene=final-run`: `__GAME_DEBUG__` undefined, normal boot | 1 | gerçek sayfa yükleme | PASS |

## Olay eşleme (uygulanan çekirdek)

`game_ready→boot`, `first_input→gameInput`, `session_end→pagehide`, `level_start→notifyLevelStarted`, `movement_used→observeGameMovement`, `deception_triggered/telegraph_exposed→updateTrap`, `player_fail→trackTmb(death)`, `retry→resetScene(fromDeath)`, `checkpoint→collectCoin`, `level_complete→notifyLevelCompleted`, `rewarded_offer/rewarded_start/rewarded_complete/reward_granted/interstitial_show/interstitial_return→showFullscreenAd`, `app_hidden→visibilitychange`, `build_error→error/unhandledrejection`.

Henüz bağlantı/kanıt tamamlanmadı: `recovery_route_entered` (PLANLANDI tur 3), `run_complete` ve ayrı tam olay matrisi.

## Sahne eşleme

`onboarding→1.1`, `movement-vault-slide→1.1`, `wallrun-chain→3.1`, `fake-exit→6.1`, `supervisor-chase→6.1`, `interstitial-pause→6.1`, `save-restore→7.1`, `mobile-portrait→1.1`, `square-viewport→1.1`, `final-run→31.2`; `collapse-recovery→PLANLANDI tur 3`; `three-fails-rewarded→PLANLANDI P1`.

## Kilitler

K-VC7-01, K-VC7-02, K-VC7-05, K-ESKİ-KİLİT: nihai diff/geodump kapanışı bekliyor. `index.html` başlangıç SHA-256: `92DC29751138D38E035F1999E49232D744F0313847F1F7C65DDCCB359DE7B8A8`.

## Devam turu — 24.09.2026

- Gerçek süre: 23,51 dk; 25 dk kapısında duruldu.
- Odaklı TUR 2: 4 testten D1/D3 temel, D2-3, D2-4 ve D2-5 PASS. D2-3 ölçümü: `interstitial_show`, `interstitial_return`, `rewarded_offer`, `rewarded_start`, `rewarded_complete`, `reward_granted`; `reward_granted(skip_sector)=1`.
- D2-4/D2-5: gerçek `error` yolu; bastırılmış örnek beklenen kırmızı (sayı artmadı); 600 olay sonrası uzunluk 500, ilk `ring-100`, son `ring-599`, kopya izolasyonu 500.
- D2-1/D2-2: 20 olayın ayrı gerçek-akış + ayrı negatif kontrol matrisi tamamlanmadı — **DOĞRULANMAMIŞ**.
- D2-7: yön tuşuyla üç partta gerçek ölüm üretme denemesi zaman aşımına uğradı; debug ölüm kısayolu kullanılmadı. 3 part / 10 ölüm ölçümü tamamlanmadı — **DOĞRULANMAMIŞ**.
- D3-1: hash ve metot girişleri 10/10; her sahnede gerçek klavye akışından olay görüldü. Ancak sahneye özgü olay eşlemesi (özellikle vault/slide/wallRun ve chase) tamamlanmadı — **DOĞRULANMAMIŞ**. Ham kanıt: `03-test/vc7-tur2/scene-mechanics.json`.
- Tam set koşum 1: ürün boot hatası nedeniyle erken hatalar; kök neden düzeltildi. Hedefli regresyon `chief + l2p4 = 13/13 PASS`.
- Tam set koşum 2: test 1–139 PASS; `trap-fairness-v73` sürerken süre kapısında kontrollü durduruldu — **DOĞRULANMAMIŞ**.
- `validate-186`: `{"reports":186,"bad":0,"examples":[]}`.
- Yeni `index.html` SHA-256: `A3595E8ED57C38B79A85796AFE4FBE4591D3B24499626B87AC332A71F3FBDB38`.
- Kilit kaynak değerleri: `SCENE_COUNT=31`, `PART_COUNT=6`, `ROUTE_PARTS=2`, `WARNING_SCALE_END=.70`, `WARNING_MIN_ABS=.67`, `CHIEF_RESPAWN_MS=820`, normal ölüm `+820`; değer değişikliği yok. `geodumpall` önce/sonra hash kapanışı süre nedeniyle **DOĞRULANMAMIŞ**.
- PLANLANDI: `recovery_route_entered/collapse-recovery → tur 3`; `three-fails-rewarded → P1`.

Durum özeti (D1-1…D3-5, 17 satır): **PASS 7 · FAIL 0 · PLANLANDI 1 · DOĞRULANMAMIŞ 9**. Genel sonuç: **DOĞRULANMAMIŞ** (PLANLANDI dışındaki tüm satırlar henüz PASS değil).

## Ana oturum kapanış kapıları

- Tam Playwright seti: **ANA OTURUM KOŞACAK**.
- `geodumpall` önce/sonra: **ANA OTURUM KOŞACAK**.
- K-VC7-01, K-VC7-02, K-VC7-05, K-ESKİ-KİLİT diff tablosu: **ANA OTURUM KOŞACAK**.

## Bu devam turunun kapanışı

- Odaklı/hedefli komut: `vc7-tur2 + chief + l2p4-exitdrop + 2026-09-15-vc4-tarayici`, `--workers=1` → **28 passed, 1 skipped (2.0m)**. Skip: yalnız D2-7 DOĞRULANMAMIŞ satırı.
- TUR 2 spec bileşeni: **5 passed, 1 skipped**; reklam/out_of_lives ve yerel platform akışı PASS.
- `graphify update .`: **1432 node / 2547 edge / 96 community**; 28 JSON kaynağı için sıfır-node uyarısı verdi.
- `index.html` SHA-256: `a3595e8ed57c38b79a85796afe4fbe4591d3b24499626b87ac332a71f3fbdb38`.
- Bu devam turunda değişen görev dosyaları: `03-test/vc7-tur2.spec.cjs`, `03-test/VC7-TUR2-REPORT.md`, `03-test/vc7-tur2/scene-mechanics.json`, `graphify-out/*`.
# ANA OTURUM BAĞIMSIZ DOĞRULAMA DÜZELTME TURU — 24.09.2026

Genel sonuç: **KABUL EDİLMEDİ**. Tam set bu turda koşulmadı.

| satır | ölçülen | sonuç |
|---|---|---|
| TUR1B regresyon | `vc7-tur1.spec.cjs --workers=1`: 1 PASS, 1 FAIL; PNG testi 120000 ms sınırında `page.evaluate(setup)` sırasında bitti | FAIL |
| D2-3 reklam | `debugLives=1` başlangıcı + kanıtlı planın pencere dışı gerçek tuzak ölümü + gerçek `out_of_lives` + görünür `#watchAdBtn` tıklaması; izole 1/1 PASS; `reward_granted=1` | PASS |
| D2-1/D2-2 reklam olayları | doğrudan `__vc7Ad/showFullscreenAd` kaldırıldı; aynı UI akışı pozitif ve `_suppress` tekrarlarında kullanılıyor | tam matris kapanışı bekliyor |
| `session_end` | gerçek navigation/pagehide iki rota; history restore sonrasında tampon korunmadı (`0/0`), sentetik event kullanılmadı | ARAÇ YETERSİZ |
| `app_hidden` | CDP pencere minimize=`visible`; ikinci sekme öne alma=`visible`; CDP lifecycle frozen=`visible` | ARAÇ YETERSİZ |
| GEODUMPALL | `git show 88287f7:index.html` ve güncel kaynak: 186/186 satır, diff=0 | PASS |

Kök neden notu: TUR 2 ayrıştırıcısı yalnız bağımsız `#debug` jetonunu tanıdığı için `debugLives=1&scene=…` yerel reklam adaptörüne giremiyordu; ortak `GAME_DEBUG_MATCH` ayrıştırıcısı ve debug başlangıç-canının reset yolunda korunmasıyla düzeltildi. TUR1B timeout regresyonu bununla kapanmadı: test bütün görsel kurulumları bitirmeden 120 saniyeyi dolduruyor; eşik/timeout değiştirilmedi.

ÖNERİ #0383: `app_hidden/session_end` için headed, gerçek OS pencere odağı ve lifecycle kalıcılığı olan entegrasyon koşucusu kullanılsın.

- Güncel `index.html` SHA-256: `E7E98A6E5A91584BC6BD1282B98A62F1DAF1F19324E32B3FDAC1759E676883F1`.
- Tam set ve hedefli kapanış: **ANA OTURUM KOŞACAK**.
- Yeni kanıtlar: `03-test/vc7-tur2/geodumpall-diff.json`, `lifecycle-events.json`, `ad-events.json`.

---
## TUR 2 flake devam — 35 tick sabit örneklem (ara rapor)

Ürün ve kabul eşikleri değiştirilmedi; tam set koşulmadı. `index.html` SHA-256 `a5acb7b804d3b6c165ffa1cc47fd243ac7a5b89c3a60ea487994e7b6dafec5c2`.

| Koşul | harness | 16:9 değişim / turuncu | 9:16 değişim / turuncu | Sonuç |
|---|---|---:|---:|---|
| normal | eski, duvar saati | tarihsel `0,589 / 789` | tarihsel `0,669 / 1022` | referans |
| 4× | eski | raporlu turuncu `42` | raporlu turuncu `42` | FAIL |
| 6× | eski | raporlu turuncu `24` | raporlu turuncu `24` | FAIL |
| normal | yeni, tick `35`, görsel saat `25 ms` | `0,5972 / 787` | `0,5970 / 844` | PASS; dört değer tarihsel referansın ±%20 bandında |
| 6× | yeni, tick `35`, görsel saat `25 ms` | ilk tek koşum `0,5972 / 787` | ilk tek koşum `0,5970 / 844` | tek koşum PASS |
| 6× × 3 | yeni, aynı tick/saat | dikey sonuca ulaşmadan yatay geçti | her koşum `0,2337 / 27` | FAIL |

Seçim gerekçesi: tick `35`, TUR1B'nin gözle onaylanmış örneklemidir. Normal duvar-saatli kalibrasyonda pulse ailesinin tarihsel piksel değerlerini yeniden üreten temsilci faz `25 ms` olarak ölçüldü; sabit örneklemde `0,5972/787` ve `0,5970/844` elde edildi.

Kök neden (mevcut kanıt): eski flake, ayrı yakalama görevleri arasındaki duvar-saati/rAF ilerlemesine duyarlıydı; ancak 6× üçlü tekrarda oyun tick'i, `rt.warning` ve görsel saat aynı kaldığı halde Chromium canvas raster çıktısı değiştiği için yükten bağımsızlık henüz kanıtlanamadı.

Durum: **DOĞRULANMAMIŞ**. İstenen 6× `3/3`, normal `3/3` ve tüm dosya PASS tamamlanmadı; eşik/timeout değiştirilmedi.

---
## TUR 2 flake son sınırlı tur

Ürün, eşik (`0,15`, `150 px`) ve timeout değişmedi; tam set koşulmadı. Tick `35`, `rt.warning=0,3783333333333336` ve sabit görsel saat `25 ms` korundu.

| Koşul | Koşum | 16:9 değişim / turuncu | 9:16 değişim / turuncu | Sonuç |
|---|---:|---:|---:|---|
| normal | pozitif kontrol | `0,5972 / 787` | `0,5970 / 844` | PASS |
| normal ardışık | 1 | `0,5972 / 787` | `0,5970 / 844` | PASS |
| normal ardışık | 2 | `0,5972 / 787` | `0,5970 / 844` | PASS |
| normal ardışık | 3 | yatay PASS | `0,2337 / 27` | FAIL |
| 4× throttling | bilgi koşumu | `0,5972 / 787` | `0,5970 / 844` | PASS (`2/2`, 16,8 sn) |

Kök neden: önceki yarım değişiklik beş PNG'yi tek uzun `page.evaluate` görevinde rasterize etti; kare-başı atomiklik uygulanmadı ve dikey telegraph rasteri kimi Chromium süreçlerinde `27 px` çıktı. Kareler ayrı senkron evaluate'lere ayrıldı ve `__tmbWarningDraw=true` son çizimden hemen önce sabitlendi; buna rağmen üçüncü normal süreçte aynı alternatif raster sonucu yeniden görüldü.

Sonuç: normal hızda tarihsel pozitif kontrol geri geldi ve iki ardışık tam-spec koşumu PASS oldu, fakat istenen `3/3` sağlanmadı (`2/3`). Bu nedenle flake satırı **FAIL**, TUR 2 genel sonucu **KABUL EDİLMEDİ** olarak kalır.

Güncel satır özeti: **PASS 14 · FAIL 1 · ARAÇ YETERSİZ 1 · PLANLANDI 1 · DOĞRULANMAMIŞ 0**.

---
## TUR 2 flake teşhis turu — düzeltme uygulanmadı

Normal hızda `vc7-tur1.spec.cjs:242` ayrı Playwright/Chromium süreçlerinde 12 kez tanı modunda koşuldu: **7 iyi / 5 kötü**. Ham veri `03-test/vc7-tur2/flake-diag.json`; kötü PNG'ler `03-test/vc7-tur2/flake-runs/bad-9x16-*.png`.

| Alan | İyi mod | Kötü mod |
|---|---:|---:|
| 9:16 test bölgesi turuncu | 844 | 27 |
| 9:16 senkron tarayıcı-içi bölge turuncu | 760 | 27 |
| 9:16 tüm canvas turuncu | 938 | 106 |
| 9:16 değişim oranı | 0,5970 | 0,2337 |
| Context `fillStyle` (yakalama öncesi/sonrası) | `#18dc18` | `#ffffff` |

Diğer istenen alanlarda fark **yoktu**: dört oyuncu PNG'si `loaded=true/failed=false/naturalWidth=424`; diken yolu `procedural-canvas-no-Image`; canvas/CSS `540×960`; DPR/viewScale `1`; offset `0/0`; portrait `true`; `W/H=540/960`; `worldY=402`; piksel bölgesi `202,809,150,48`; font `loaded`; loop/systemPaused `false/false`; `armed=true`; `warning=0,3783333333333336`; `spikeX=28602`; `rt.t=0,29166666666666674`. Ek context sayacında iyi/kötü için `save/restore depth=0`, `clip=0`, `restore underflow=0`; görünür context alpha/composite/filter/transform da aynıydı.

Tek hipotez: **kök neden `draw()` içindeki henüz aşama bazında izlenmeyen deterministik çizim dalı/cache durumudur; çünkü oyun, viewport, asset ve görünür Canvas state girdileri aynıyken hem tüm-canvas telegraph pikselleri iki sabit kümeye ayrılıyor hem de son `fillStyle` farklı bir draw traversal'ını kanıtlıyor.** Kırpma hipotezi çürüdü (`orangeFull` da 938→106); sprite yükleme ve save/clip kaçağı da çürüdü. Önerilen sonraki enstrümantasyon: `drawBackdrop → drawSceneLayer → draw trap → foreground/HUD` aşamalarından hemen sonra aynı bölgenin hash/piksel sayısını ve cache anahtarlarını kaydedip ilk ayrışan aşamayı bulmak. Bu turda düzeltme uygulanmadı.

Genel TUR 2 özeti değişmedi: **PASS 14 · FAIL 1 · ARAÇ YETERSİZ 1 · PLANLANDI 1 · DOĞRULANMAMIŞ 0**; genel sonuç **KABUL EDİLMEDİ**.
# TUR 2 flake hipotez testi — systematic-debugging faz 3

> Düzeltme uygulanmadı. Ürün, kabul eşikleri ve timeout değiştirilmedi.

## Sabit tohum matrisi

`page.addInitScript` içinde Mulberry32 tabanlı PRNG kullanıldı. İkinci ve belirleyici matris aynı tohumdan hem `Math.random` hem `crypto.getRandomValues/randomUUID` üretti. Her hücre ayrı Chromium/Playwright sürecidir.

| Tohum | Süreç 1 | Süreç 2 | Süreç 3 | Tohum içi sonuç |
|---:|---|---|---|---|
| 1 | KÖTÜ `0,2337 / 27` | KÖTÜ `0,2337 / 27` | KÖTÜ `0,2337 / 27` | tek mod |
| 2 | İYİ `0,5970 / 844` | İYİ `0,5970 / 844` | İYİ `0,5970 / 844` | tek mod |
| 3 | İYİ `0,5970 / 844` | KÖTÜ `0,2337 / 27` | İYİ `0,5970 / 844` | **iki mod** |
| 4 | İYİ `0,5970 / 844` | İYİ `0,5970 / 844` | İYİ `0,5970 / 844` | tek mod |

Her süreç yakalamaya kadar aynı sayıda (`41`) deterministik random çağrısı yaptı. Tohum 3 içinde giriş dizisi ve çağrı sayısı aynıyken iki farklı raster modu üretildi. Bu nedenle “sayfa açılışındaki `Math.random`/`crypto` seçimi modu belirliyor” hipotezi **RED**. Hipotez doğrulanmadığı için iyi/kötü stack karşılaştırması çizim dalını belirleyen bir çağrı veremez; stack toplama koşulu uygulanmadı.

## Ürün/test ayrımı

İstenen “kötü tohumla gerçek oyun” kontrolünün öncülü oluşmadı: tohum 3 hem iyi hem kötü sonuç veriyor, yani deterministik bir kötü tohum yok. Tohum 1'in üç kötü sonucu korelasyondur; tohum-içi karşı örnek nedeniyle nedensel “kötü tohum” olarak kullanılamaz. Normal döngüde 13.1'e gerçek klavye planıyla ulaşan ürün kontrolü bu turda tamamlanmadı; ürün/test ayrımı **DOĞRULANMAMIŞ** bırakıldı.

## Tek hipotez ve öneri

Hipotez: iki mod random seçiminden değil, aynı deterministik state üzerinde Canvas raster komutlarının farklı bir çizim yaşam-döngüsü sırasına girmesinden kaynaklanır; kanıt, tam sabit random akışı olan seed 3'te hem `844` hem `27` üretilmesi ve önceki teşhiste tüm-canvas turuncunun da iki modlu olmasıdır.

ÖNERİ (uygulanmadı): sonraki teşhis katmanında `drawTrap()` içindeki yükselen diken telegraph'ının her alt aşamasından (glow, çatlak, stroke uçlar, toz, dolgu uçları) hemen sonra aynı canvas bölgesinin hash/turuncu sayısı alınmalı; ilk ayrışan alt aşama saptanmadan ürün veya harness değiştirilmemeli.

## TUR 2 flake hipotez 2 — kamera/rAF yarışı

> Yalnız test enstrümantasyonu eklendi. Ürün, eşik ve timeout değişmedi; hipotez reddedildiği için düzeltme uygulanmadı.

12 bağımsız Chromium/Playwright süreci Node `child_process` ile çalıştırıldı. Sonuç: **10 iyi / 2 kötü**. Ham özet `03-test/vc7-tur2/camera-hypothesis.json`, süreç günlüğü `camera-diag-runs.log`.

| Alan | İyi (10/10) | Kötü (2/2) | Ayırıyor mu? |
|---|---:|---:|---|
| 9:16 oran / turuncu | `0,5970 / 844` | `0,2337 / 27` | EVET, çıktı modu |
| `cam` | `28379,6` | `28379,6` | HAYIR |
| `rt.spikeX` / `X(T.trigger)` | `28602 / 28602` | `28602 / 28602` | HAYIR |
| Telegraph ekran X aralığı | `222,4–302,4` | `222,4–302,4` | HAYIR; tümü görünür |
| Görünür yatay aralık | `0–540` | `0–540` | HAYIR |
| `player.x` | `28547` | `28547` | HAYIR |
| `rafId` / `loopRunning` | `0 / false` | `0 / false` | HAYIR |
| Kamera hedefi | `28383,4596` | `28383,4607` | Hayır; `<0,0011 px` fark |
| Yakalama öncesi rAF sayısı | `200–211` | `204, 207` | HAYIR; iyi aralığının içinde |

Karar: **hipotez RED**. Kötü koşumların hiçbirinde telegraph kadraj dışında değildir; ekran aralığının tamamı görünür alanın ortasındadır. Ayrıca yakalama sırasında ana döngü durmuş (`rafId=0`, `loopRunning=false`) ve kamera iki modda birebir aynıdır. Bu nedenle kamera yerleştirme düzeltmesi ve 12/12 düzeltme doğrulaması koşulu uygulanmadı.

Ürün etkisi: mevcut kanıt gerçek oyun akışında oyuncu/diken kamera ilişkisinin bozuk olduğunu göstermiyor; hatta kötü harness çıktısında bile telegraph geometrisi 9:16 kadrajın içindedir, ancak gerçek-klavye ürün karesiyle nihai ürün/test ayrımı hâlâ doğrulanmamıştır.

Genel TUR 2 özeti değişmedi: **PASS 14 · FAIL 1 · ARAÇ YETERSİZ 1 · PLANLANDI 1 · DOĞRULANMAMIŞ 0**; genel sonuç **KABUL EDİLMEDİ**.
