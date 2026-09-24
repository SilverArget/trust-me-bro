# VC7 TUR 2B RAPORU

Tarih: 24.09.2026  
Başlangıç `index.html` SHA-256: `a5acb7b804d3b6c165ffa1cc47fd243ac7a5b89c3a60ea487994e7b6dafec5c2`  
Son `index.html` SHA-256: `c2458aad641d05cc8df154a0574b121ba5127d81defc54de30232ebb1850f8d8`

## Kabul

| Satır | Eşik | Ölçülen | Örneklem | Sonuç |
|---|---|---|---|---|
| E1 | Hash'siz tüm listeli global `undefined`; oyun kaynaklı listeli `__*` anahtar 0; `#debug` pozitif | 17/17 hash'siz `undefined`, 0 anahtar; debug altında 16/16 kalıcı global tanımlı, `__exitProbe` çağrı anında tanımlanıyor | 960×540 + 540×960 | PASS |
| E2 | En az 3 part hash'li/hash'siz birebir | 1.1, 13.1, 31.2: ölüm, bitiş tick'i ve son level/part birebir | 3 part × 2 hash | PASS |
| E3 | Değişen/etkilenen spec'ler + TUR1 + TUR2 PASS; validate 186/0 | Toplu odaklı koşum 95 PASS; yalnız ilk E4 gözlemci kurulumu FAIL. Düzeltilmiş TUR2B 4/4 PASS. `validate-186`: 186/0 | 16 spec, tek worker | PASS |
| E4 | `#validate`, `#geodump*`, `#padstat`, `#voiddump` çalışır | Beş araç hash'i temiz yüklemede HTTP OK + canvas görünür; yetkili geodump betiği 186/186 diff 0 | 5 hash | PASS |
| E5 | Her yakalama temiz yükleme/kurulum | E1 her görünümde yeni navigation; E2 her hash/part için yeni Page; E4 benzersiz query ile zorunlu reload | Tüm TUR2B akışları | PASS |

## Global tablosu — iki yönlü

| Global | Hash'siz | `#debug` |
|---|---|---|
| `__GAME_DEBUG__` | undefined | object |
| `__tmb` | undefined | object |
| `__tmbContinue` | undefined | function |
| `__tmbOutOfLives` | undefined | function |
| `__tmbPause` | undefined | function |
| `__tmbSetProgress` | undefined | function |
| `__tmbGateTestSetup/Step/Reach` | undefined | function |
| `__tmbExitTestSetup/Runtime/AfterCrumble/Stabilize/Stopped` | undefined | function |
| `__exitProbe` | undefined | setup çağrısından sonra object |
| `__tmbParkour` | undefined | object |
| `__tmbWarningDraw` | undefined | boolean |

Tek kapı: `const DEBUG=location.hash.includes('debug')`. TUR 2 telemetri/debug API'si, eski `__tmb*` yüzeyi, parkour ve warning draw kancaları bu sabiti okur.

## Spec envanteri ve odaklı sonuç

Kanca kullanan taramada 17 spec bulundu. Bunların 15'i önceki çalışma ağacında zaten `debug` içeren yükleme hash'ine sahipti; test mantığı veya eşiği değiştirilmedi. Yeni kabul spec'i `vc7-tur2b.spec.cjs` eklendi. Toplu koşulanlar: `2026-09-15-vc4-tarayici`, `anim`, `bridge-lifecycle-v71`, `difficulty-ramp`, `gate-v70`, `parkour-matrix`, `parkour-tur1`, `playgama-storage-object`, `readiness`, `tmb-diagnostic`, `trap-fairness-v71/v72/v73`, `vc7-tur1`, `vc7-tur2`, `vc7-tur2b`.

- Toplu odaklı: `95 passed, 1 failed (8.5m)`; tek FAIL ilk E4 testinin aynı sekmede yalnız fragment değiştirerek araç kodunu yeniden çalıştırmamasıydı.
- E4 temiz-yükleme düzeltmesi sonrası TUR2B: `4 passed (5.2s)`.
- `node 03-test/validate-186.cjs`: `{"reports":186,"bad":0,"examples":[]}`.
- `node 03-test/geodump-vc7.cjs`: `rows_before=186`, `rows_after=186`, `diff_count=0`.
- Tam set ve kilit diff: **ANA OTURUM KOŞACAK**.

## Değişen görev dosyaları

- `index.html`
- `03-test/vc7-tur2b.spec.cjs`
- `03-test/VC7-TUR2B-REPORT.md`
- `graphify-out/*` (artımlı güncelleme)

Genel sonuç: **PASS**.
