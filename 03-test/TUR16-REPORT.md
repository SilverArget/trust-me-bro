# TUR16 — dört şef yakalama hareketi

## Sonuç

- Uygulama commit'i: `37e2fca` (`Add chief grab animations`).
- Dört şef atlası 640×640 / 8 satırdan 640×720 / 9 satıra çıkarıldı. Yeni `grab` satırı 8 kare ve 80×80 hücre kullanıyor; sözleşme sürümü, byte, SHA-256 ve cache sürümleri güncellendi.
- Ham 1774×887 RGB sayfalar `sprites/raw/a5-ai/<şef>-grab.png` konumuna kopyalandı. `sprites/raw/` mevcut paketleme ve git dışlama kuralında kaldı.
- Kontak sayfası görsel olarak incelendi: dört şefin idle karesi ile sekiz grab karesi aynı ayak çizgisinde; uzanan eller korunuyor, yeşil hale/sızıntı ve boş kare yok.

## İçe aktarma ölçümleri

Boy sütunu `idle / grab 7–8 ortalaması` görünür alfa yüksekliğidir. Ayak farkı atlas ankrajı `[40,74]` değerine göre en yüksek mutlak farktır.

| Şef | Boy (px) | Fark | Ayak farkı | Yeşil piksel | Boş kare |
|---|---:|---:|---:|---:|---:|
| securityTall | 73 / 73.0 | %0.00 | 0 px | 0 | 0 |
| classicChief | 67 / 67.5 | %0.75 | 0 px | 0 | 0 |
| robotGuard | 74 / 74.0 | %0.00 | 0 px | 0 | 0 |
| bouncer | 73 / 73.0 | %0.00 | 0 px | 0 | 0 |

Atlas boyutları sırasıyla securityTall `479947`, classicChief `442923`, robotGuard `485495`, bouncer `499617` byte; tümü 512 KiB sınırının altında.

## Oynatma kuralı

- `CHIEF_GRAB_START_GAP_PX=28`: şefin sağ kenarı ile oyuncunun solu arasındaki mesafe 28 px'e indiğinde grab kareleri 1–3 mesafeye bağlı başlar. Oyuncu hızlanıp yakalanabilir durumdan çıkarsa `chiefGrabPose()` `null` döndürür ve ortak atlas yolu tekrar koşu hareketini seçer.
- Tur 15'in temas koşulu aynen korunur: kenar boşluğu `≤4 px` ve dikey temas oluştuğu güncellemede catch gerçekleşir ve `grab` karesi 4 (`frame=3`) atanır. Böylece kavrama karesi ile `chief-catch-reset` aynı simülasyon karesidir.
- Mevcut `caughtT=.35 s` süresi değiştirilmedi; bu süre beş eşit görsel dilime bölünerek temas karesi 4 ve tutuş kareleri 5–8 gösterilir. Hızlar, gecikmeler, 1 saniyelik duraksama güvenliği ve retry gecikmesi değişmedi.
- Dock, Frost, Magma ve After sahnelerinin tümü aynı `chiefPoseFromState()` → `drawChiefAtlas()` yolunu kullandığı için kural dört şef/dört dünyaya ortaktır. Sonuç ekranındaki idle şef ve öfke simgesi değiştirilmedi.

## Değişen dosyalar ve semboller

- `sprites/chiefs/{securityTall,classicChief,robotGuard,bouncer}-full.png`: 9. `grab` satırı.
- `sprites/chiefs/chief-contract.json`: `version`, atlas/row ölçüsü, `motions.grab`, varlık byte/SHA/cache alanları.
- `tools/a5/import_chief_grab.py`: `key_green()`, `split_sheet()`, görünür boy/ayak/yeşil/boş doğrulaması ve kontak sayfası üretimi.
- `js/a12-campaign.js`: `updateIntegrated()`, `chiefPoseFromState()`, yeni `chiefGrabPose()` ve 640×720 atlas yükleme kontrolü.
- `03-test/tur16-chief-grab.spec.cjs`: atlas sözleşmesi, D04 adım simülasyonu ve kaçış regresyonu.
- `03-test/tur16-chief-grab-proof.spec.cjs`: tek kısa gerçek zamanlı kanıt koşusu.

## Test sonuçları

- `python tools/a5/import_chief_grab.py`: geçti; 4×8 karede boş `0`, yeşil `0`, ayak farkı `0 px`, boy farkı en çok `%0.75`.
- `node --check js/a12-campaign.js`: geçti.
- `03-test/tur16-chief-grab.spec.cjs`: `3/3` geçti (`4.4 s`); temas öncesi 1–3, temas karesinde 4, `caughtT` içinde 4–8 ve kaçışta run dönüşü doğrulandı.
- `03-test/tur15-stairs-chief.spec.cjs`: `5/5` geçti (`23.5 s`); temas `≤4 px`, 1 sn güvenli tampon ve D04/A02 retry gecikmeleri korundu.
- Tam 36 rota × 2 görünüm gerçek zamanlı regresyon, brief uyarısına uygun olarak çalıştırılmadı.

`ASSERT CHANGE`: Var olan assertion'lar değiştirilmedi; TUR16 için yeni atlas/oynatma/kaçış assertion'ları eklendi.

## Kanıt

- Kontak sayfası: `03-test/manager-preview/tur16/chief-grab-contact.png`.
- İçe aktarma ayrıntıları: `03-test/manager-preview/tur16/import.json`.
- Kısa gerçek zamanlı D04 dizisi: `03-test/manager-preview/tur16/realtime-d04/`.
- `03-test/manager-preview/` `.gitignore` kapsamındadır ve kanıt dosyaları commit'e girmez.
