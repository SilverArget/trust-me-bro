# TUR 3 — Rampa filtresi ve vardiya amiri
Baz: aad57ea / v61. Commit, tag, push ve graphify güncellemesi yapılmadı.
Dilim 1: 26/31 sektörde 27 seçili pad; 198 ham adaydan 101'i yay çarpışması nedeniyle elendi (S2–S31).
Alternatif seçilen sektörler: 2,3,7,8,13,14,15,16,17,18,19,20,22,24,27,28,29,31 (18 sektör).
Daraltma: 0; S11/S12/S23/S26/S30 için sol/sağ, tam piksel, tek düşman, en fazla %30 araması çözüm bulmadı; pad-patrol-audit.cjs ile yeniden üretilebilir.
S11: boşlukta biten yay kabul ediliyor; girişsiz iniş + 250 ms çıkış açıklığı sağlayan aday yok (varil/düşman koridoru).
S12: eski x=436 kasa çarpışması elendi; kalan adaylarda walker/kiriş kesişimi; %30 daraltma yetmedi.
S23: x=591 inişi sağ; iniş sonrası sağ giriş sahte ödüle götürüyor; diğer adaylar düşman/iniş açıklığı nedeniyle seçilmedi.
S26: spring/tuzak koridoru içinde güvenli iniş sonrası açıklık sağlayan aday yok.
S30: x=1091 yayı üst bloğun gövdesini kesiyor; diğer adaylar boşluk/düşman; girişsiz güvenli iniş seçeneği yok.
Boşluk, launchArcClear güvenlik filtresinde tek başına red değildir; seçili padler girişsiz iniş kapısını ayrıca sağlar. Bu tercih yukarıdaki beş sektörü rampasız bırakır.
PASS pad-flight: 34/34 test; 27 pad × 60/120 Hz × 4 upgrade × 2 giriş = 432 deneme, ölüm 0; doğal temas, boost, iniş ve inişten sonraki 250 ms kapsanır.

| Sabit | Değer | Gerekçe / ölçüm |
|---|---:|---|
| CHIEF_BASE_SPEED | 255 px/s | Oyuncu taban hızı |
| CHIEF_SPEED_EARLY | .80 / 204 px/s | S3–15; bilgili bot kaçışı |
| CHIEF_SPEED_LATE | .85 / 216.75 px/s | S16–30; artan baskı |
| CHIEF_SPEED_FINAL | .90 / 229.5 px/s | S31; oyuncudan hâlâ yavaş |
| CHIEF_LEAD_PX | 320 px | 62 part başlangıcında doğrulandı |
| CHIEF_RESPAWN_MS | 820 ms | Mevcut yeniden başlama gecikmesi |
| PAD_PATROL_TRIM_MAX | .30 | Çevrimdışı sınır taraması; uygulanan değişiklik 0 |
| PAD_LANDING_INPUT_S | .25 s | İniş sonrası sağ giriş testi ve açıklık seçimi |

PASS validate-186: 186/0; özgün 186 geometri ve düşman yerleşimleri HEAD ile aynı.
PASS trap-window: 36 örnek, aktif ihlal 0, minimum 306.482 ms değişmedi; pasif 30.5=249.719 ms görünür.
PASS chief.spec: 9/9; hız sınırı 31/31, S1–S2 kapalı, başlangıç mesafesi 62/62.
PASS yakalanma: aynı part, deaths ve partDeaths sabit, incidents +1, lives sabit, 819 ms bekler / 820 ms döner.
PASS reklam/pause/reset: S8 reklamında durur ve dönüşte 320 px; reklam koşulu değişmedi; pause/resume ve ölüm dönüşü doğrulandı.
PASS kesintisiz geçiş: part değişiminde modal yok; kamera–oyuncu göreli mesafesi korunuyor; amir yeniden 320 px geride.
PASS bilgili bot: 310/310, yakalanma 0. PASS kör bot: 93/93 ölümsüz, yakalanma 0.
PASS parkour-tur1: 25/25; karakter/yön/Hz/hareket matrisi 96/96; birleşik regresyon 71/71 (son HUD testi ayrıca geçti).
PASS v61 save: 9 yükleme senaryosu; eski part 6 → aktif part 2; save fonksiyonları/şema ve kilit zorluk/rota değerleri aynı.
PASS runtime-window (son kaynak SHA256 eşleşti, çıkış 0): 9.288 satır, aktif 1044 PASS / 5652 N/A / 0 FAIL; hareket 30 PASS / 156 N/A / 0 FAIL.
Runtime en kötü üç farklı çift: 14.1=253–254 ms, 8.1=353–354 ms, 8.2=353–354 ms; minimum değişmedi.
Devralınan difficulty-ramp: aynı assert, 1 PASS / 1 FAIL; test değiştirilmedi.
Ölçülen durarak yakalanma: S3 1.575 s, S16 1.483 s, S31 1.400 s (120 Hz). 320/(255−204)=6.27 s, duran oyuncunun tamponu değildir; koşarken mesafe açılır.
Açık not: yakalanmalar oturum içi sayılır; save şeması korunması nedeniyle sayfa yenilenince bu ek sayaç sıfırlanır. Uçuş testi keyfi düşman fazlarını veya iniş sonrası sınırsız sağ yürüyüşü garanti etmez.
Tur 4 sprite listesi: mevcut dört karakterin parkur animasyonlarına ek olarak AMİR — 4 kare yürüyüş; geçici koyu siluet ve fener konisi kullanılıyor, sprite dosyaları değişmedi.
Diff: index.html +35/−23; pad-flight +3/−3, parkour-bot +4/−4, parkour-blind +1/−1; yeni chief.spec, pad-patrol-audit ve bu rapor.
Mevcut izlenmeyen medya ve test-results/ korundu; tüm test çıktıları TEMP altında. git diff --check temiz.

