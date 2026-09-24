# VC7 TUR 1B RAPORU

## Sorun 4 — Revizyon 3 (nihai)

Revizyon 2 tek eylemi kaydırdığı için ürettiği 0–8 ms pencereler plan kırılganlığıydı ve geçersiz kılındı. Revizyon 3, kritik eylem ile sonraki bütün eylemleri tek kuyruk olarak 1/120 sn adımla ±3000 ms kaydırır. Test enjeksiyonu `kill(msg,type)` çağrısını kaydeder; hedef tuzağın bilinen ölüm mesajı/türü dışındaki düşman, düşme veya tamamlanamayan plan sonucu `PLAN KIRILDI` sayılır ve tuzak sınırı değildir.

| Revizyon 3 kabulü | Ölçülen | Sonuç |
|---|---|---|
| 51/51 Δ=0; iki yönde sınır tipi; ARAÇ YETERSİZ/null 0 | 51/51; 51/51; 0/0 | PASS |
| Satır sınıfları | 25 `TUZAK OLUMU SINIRLI`; 24 `PLAN KIRILDI SINIRLI`; 2 `KOMSU EYLEM SINIRLI`; 0 `TARAMA SONU` | PASS |
| En az 3 hedef-tuzak ölüm kontrolü | 1.1 crumble `fall` @ -16,667 ms; 1.2 crumble `fall` @ -8,333 ms; 2.2 jumpBait `Memory became a liability.` @ -58,333 ms | PASS |
| Hedef-tuzak penceresi <100 ms bilgi listesi | 6.2, 16.2, 18.2, 20.1, 23.1, 24.2, 27.2, 28.1, 28.2 | BİLGİ |
| Odaklı `vc7 + v73` | 3 passed (4.2m) | PASS |
| Tam set `--workers=1` | 141 passed; `parkour-matrix` mobil testinde bir defalık 30 sn timeout; izole tekrar 2/2 PASS | FAIL (flake; ikinci tam koşum yapılmadı) |

Bu Revizyon 3 tablosu aşağıdaki Revizyon 2 ve eski B4 ölçümlerinin yerini alır. Genel sonuç, tam set yeniden tamamen PASS olana kadar **FAIL** olarak kalır.

**Ek (ana oturum, 2026-09-24 ~11:45):** ikinci tam set `--workers=1` → **142/142 PASS** (8,6 dk), `index.html` sha256 `92DC2975…DE7B8A8`. Yukarıdaki FAIL koşulu karşılandı; Revizyon 3 genel sonucu **PASS** (yalnız pencere ölçümü: 25/51 ölçüldü, 26/51 tur 3'e devredildi — yönetici kararı "Tur 3'e girdi").

## Sorun 4 — Revizyon 2 (nihai)

Önceki 30 `ZAMANLAMA SERBEST` sonucu tek kenar kaydırma artefaktı olduğu için geçersiz kılındı. Revizyon 2 bas+bırak çiftini tek eylem olarak, süresini koruyarak 1/120 sn adımla ±3000 ms tarar; aynı tuşa ait komşu eylemle çakışma `CAKISMA` sınırıdır ve serbestlik kanıtı değildir.

| Kabul | Ölçülen | Sonuç |
|---|---|---|
| 51/51 Δ=0; ARAÇ YETERSİZ/null 0 | 51/51; 0/0 | PASS |
| Sonuç sınıfı: SINIRLI PENCERE / KOMSU EYLEM SINIRLI / geçerli ZAMANLAMA SERBEST | 51 / 0 / 0 | PASS |
| Her eylemde gerçek tarama aralığı ve iki yön sınır tipi | `TRAP-FAIRNESS-v73.{json,md}` içinde 51 satırın tüm eylemleri | PASS |
| Serbest eylem iki yönde en az 500 ms; kısa serbest otomatik FAIL | kısa serbest 0 | PASS |
| En az 3 elle bilinen ölümcül Δ; crumble 1.1 dahil | 1.1 @ -8,333 ms; 1.2 @ -8,333 ms; 2.2 @ -175 ms | PASS |

Bu tablo ve Revizyon 2 v73 çıktısı, aşağıdaki eski B4-1 ölçüm satırındaki `21 sınırlı / 30 ZAMANLAMA SERBEST` sonucunun yerini alır.

Tarih: 2026-09-24. Taban: `88287f7`. Genel sonuç: **PASS**.

## Brief revizyonu

Ana oturum revizyonu uygulandı: kanıtlı plandaki tetik sonrası her girdi değişimi 1/120 sn adımla komşu girdiye veya ±3000 ms sınırına kadar ayrı tarandı. Sınırlı pencere bulunmayan ve taranan bütün Δ değerlerinde ölüm üretmeyen satırlar `ZAMANLAMA SERBEST` olarak kabul edildi. Sınırlı pencerelerde pencere dışındaki ilk Δ'nın ölüm üretmesi zorunlu tutuldu.

## B kabul tablosu

| ID | Eşik | Ölçülen | Örneklem | Girdi kaynağı | Sonuç |
|---|---|---|---|---|---|
| B1-1 | 90×70 bölgede değişen piksel ≥900; negatif <50 | 16:9: 4762; çizim kapalı: 0 | 960×540 PNG | diskteki PNG decode | PASS |
| B1-2 | Aynı ölçüm 9:16 görünümde geçer | 2396; çizim kapalı: 0 | 540×960 PNG | diskteki PNG decode | PASS |
| B1-3 | A1-1…A1-4 yeniden PASS | 28/28; min 600 ms; pozitif piksel 4566/5400; negatif 0; landingX birebir | 28 pad | gerçek `update()` 120 Hz | PASS |
| B2-1 | 120×50 bölgede değişen oran ≥0,15; negatif <0,01 | 16:9: 0,611667; negatif 0 | 960×540 PNG | diskteki PNG decode | PASS |
| B2-2 | Turuncu-kırmızı piksel ≥150 | 745 | 960×540 PNG | R>200, G<150, B<110 | PASS |
| B2-3 | Aynı ölçüm 9:16 görünümde geçer | oran 0,520333; turuncu 321; negatif 0 | 540×960 PNG | diskteki PNG decode | PASS |
| B2-4 | Sarsıntı telegraph bitince 0; tam set etkilenmez | telegraph dışı kamera ofseti 0; 142/142 PASS | tam set | Playwright `--workers=1` | PASS |
| B2-5 | A2-1…A2-4 yeniden PASS | 666,667 ms; telegraph ölümü 0/10; bot 5/5 | 2 part × 5 | gerçek `update()` + kanıtlı bot | PASS |
| B3-1 | 255 ve 145 hareket hızı anlamında yalnız ortak sabit tanımında | `RUN_MAX_VX_BASE=255`, `RUN_MAX_VX_SPEED_BONUS=145`; hareket ve pad bu adları okuyor | kaynak grep | `rg -n "RUN_MAX_VX|255|145" index.html` | PASS |
| B3-2 | Hareket davranışı birebir; değerler eşit | önce/sonra 255/145; parkour ve hareket testleri PASS | tam set | Playwright | PASS |
| B4-1 | 51/51 sınırlı pencere veya ZAMANLAMA SERBEST; Δ=0 51/51; ARAÇ YETERSİZ/null 0 | 21 sınırlı, 30 ZAMANLAMA SERBEST; Δ=0 51/51; negatif sınır 51/51; ARAÇ YETERSİZ 0; null 0 | 51 ölümcül satır | `parkour-plans.json`, gerçek oyun fiziği | PASS |
| B4-2 | Gerekçesiz ŞÜPHELİ=0; aynı sonuçlar geometri/ikinci adımla doğrulanır | 0; eşit imzalar `YENIDEN DOGRULANDI`, ikinci adım 1/240 sn | 51 satır | v73 JSON | PASS |
| B4-3 | Görünür an→geç uç tepki payı; <250 ms ayrı liste | 51 satırda sütun; <250 ms: yok | 51 satır | görünür/trigger fizik tikleri | PASS |

Oyuncu kontrastı 10 karenin tamamında ≥2,530224 (eşik 1,5). Canvas'ı örten görünür modal/overlay/panel sayısı 0.

## TUR 1 yeniden koşum

| ID | Sonuç | Ölçüm |
|---|---|---|
| A1-1 | PASS | 28/28, minimum 600 ms |
| A1-2 | PASS | pozitif 4566/5400 piksel |
| A1-3 | PASS | çizim kapalı fark 0 |
| A1-4 | PASS | 28/28 landingX birebir |
| A2-1 | PASS | iki partta 666,667 ms |
| A2-2 | PASS | 0/10 ölüm |
| A2-3 | PASS | pozitif oran 0,682402; negatif 0 |
| A2-4 | PASS | iki part 5/5 |

## Ortak kabul ve kilitler

- Tam set: `142 passed (7.8m)`, `--workers=1`.
- `node 03-test/validate-186.cjs`: `{"reports":186,"bad":0,"examples":[]}`.

| Kilit | Taban | Son | Diff |
|---|---:|---:|---:|
| `warnScale` / `WARNING_MIN_ABS` / `WARNING_SCALE_END` | aynı | aynı | 0 |
| rage sabitleri | aynı | aynı | 0 |
| `ROUTE_PARTS` / `PART_COUNT` / `SCENE_COUNT` | 2 / 6 / 31 | 2 / 6 / 31 | 0 |
| save anahtarları/şeması | aynı | aynı | 0 |
| `CHIEF_RESPAWN_MS` | 820 | 820 | 0 |
| normal `deathDeadline + 820` | 820 | 820 | 0 |

Kaynak kanıtlar: `TRAP-FAIRNESS-v73.json`, `TRAP-FAIRNESS-v73.md`, `VC7-TUR1-MEASUREMENTS.json`, `VC7-TUR1B-PNG-MEASUREMENTS.json`.
