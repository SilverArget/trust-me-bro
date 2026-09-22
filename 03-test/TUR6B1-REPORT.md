# TUR6B1 — devam / sprite bağımsız kapılar
Baz: d5ba84f / v64. Önceki STOP: uyarıda bekleyen bot üç adayda 0 yakalanma/21 ölüm; eski ölçüm JSON'u korundu.
Yeni politika: her part başında 1.5 sn, etiketli engelin ön kenarından bir genişlik önce 1 sn girdisiz update; uyarıda ek bekleme yok.
| Aday | Bilgili | Kör ölüm/yakalanma | Tereddüt yakalanma/ölüm |
|---|---|---|---|
| 220 px | 310/310 | 0/0 (93) | 58/0 (62) |
| 320 px + ×1.5 | 310/310 | 0/0 (93) | 51/6 (62) |
| 220 px + ×1.5 | 310/310 | 0/0 (93) | 58/0 (62) |
Seçim: yalnız CHIEF_LEAD_PX=220; boost eklenmedi; 180 gerekmiyor. Tereddüt koşusu ilk yakalanma/ölümde biter, sonsuz retry değildir.
Baseline 320/1: 51 yakalanma/6 ölüm; beklenen 0 doğrulanmadı. 220'de yakalananlar S3–31 iki part; S1–2 amirsiz.
220 px duran oyuncu tamponu: S3 1.0833 sn /S16 1.0167 sn /S31 0.9667 sn (120 Hz, deaths=0).
Oyun diff: index.html +3/-2; CHIEF_LEAD_PX, availableOptionalSprites ve optionalSheet. Kilit oynanış fonksiyonları değişmedi.
Logo CSS en çok 760 px; 1774×887 /2,144,707 B →1520×760 /250,755 B (2×, PNG palette).
İkon yalnız favicon; 32 px tarayıcı hedefinin 2×'i: 1254×1254 /2,351,006 B →64×64 /4,238 B. Tarayıcı/OS gerçek favicon ölçeği değişebilir.
PASS boyut: logo/ikon ≤512 KiB. 390×844 ve1280×720 ekranlarında rect birebir; ortalama kanal farkı ≤1.062/255, piksel eşitliği iddiası yok.
Görsel kanıt ve sayılar: TUR6B1-ASSET-MEASUREMENTS.json; önce/sonra PNG'ler orada yazılı TEMP dizininde, otomatik açılmadı.
Optional sheet listesi playgama-bridge-config.json.optionalSprites; build PNG adlarından yeniler. Listede olmayan sheet sessiz failed, HTTP isteği yok.
Sprite eklenince build yeniden çalıştırılmalı; oyun kodu düzenlenmez. TEMP fixture denemesi:17/17 optional keşfi,21/21 PNG paketlendi.
Build: ../04-yayin/playgama/build-playgama.mjs; Bridge 2.2.0 paket sürümü ve kaynak byte eşitliği doğrulanır.
Manifest: index.html, playgama-bridge.js, playgama-bridge-config.json, soundtrack.mp3, logo, ikon, sprites/*.png (şimdi4) =10 dosya.
Dist manifest toplamı3,762,464 B; ZIP3,328,838 B: ../04-yayin/playgama/trust-me-bro-v64.zip (v64 tabanlı değişmiş çalışma ağacı).
ZIP SHA256: cd9748625a862c4f4733df1193767e340fceef50ef5d348b9cdd73eaf7cc1487
PASS ZIP:10/10 giriş, ters bölü0, kaynak index ile byte eşit. HEAD eşitliği beklenmez: bu tur yetkili index değişiklikleri var.
Cover/intro/privacy/README/TRAP-AUDIT/03-test ZIP dışında. Eski dist/intro.mp4 korunur; manifestte/ZIP'te yok (izlenmeyen dosya silmeme kuralı).
Tarihsel1 S4: optional-sheet404 → mevcut dosya manifesti; konsol hatası filtrelenmedi, eksik PNG isteği yapılmıyor.
Tarihsel2 S7: eski dist → yeni paket; ayrıca v56 öncesi save anahtarı → mevcut trust_me_bro_last_delivery_v2_save; ürün değişmedi.
Tarihsel3 S8: PART → SECTOR, mevcut UI sözleşmesi.
Tarihsel4 l2p4-exitdrop: pasif P4 saldırısı yerine eski save P4→P2 clamp + aktif L2.2→L3.1 gerçek update ile5/5.
Tarihsel5 storage object: eski currentPart=4 kabul, aktif yükleme=2; altı-bit collected maskeleri aynı.
Tarihsel6 storage string: aynı göç sözleşmesi; veri silme/reddetme yok.
Tarihsel7 diagnostic rota: pasif P3→P4 yerine aktif L1.2→L2.1 gerçek update rotası,5/5; parkur kullanımı ve ölüm0 korunur.
Tarihsel8 top-block: archive/top-block-window.legacy.cjs içeriği korundu, keşif dışı; eski L1 varsayımı yerine runtime-window gerçek aileleri ölçer.
Tarihsel9 ses: iki sentetik click250 ms debounce içinde; iki gerçek click arası270 ms + tekrar engelleme assert'i. Ses ürün hatası yok.
Tarihsel10 trap kimliği: pasif L2.4 crumble yerine aktif L2.2 jumpBait; kill debug kimliği doğrulanır.
PASS tam spec:118/118 (eski118 −arşiv1 +yeni eksik-sheet ağ/konsol testi1); skip/allowlist0. Log:TEMP/tmb-6b1-final.log.
PASS anim25/25; parkour-tur1 25/25; pad-flight34/34 (432 uçuş); chief9/9; matrix96; bilgili310/310; kör93/93 ölüm0.
PASS difficulty-ramp2/2 (540/540); readiness3/3; vc4 tarayıcı10/10; pageerror0/console error0 denetlenen tarayıcı akışlarında.
PASS validate-186:186/0; HEAD geometri186/186 eşit. Analitik36 örnek aktif ihlal0,min306.482 ms; pasif30.5=249.719 görünür.
PASS kilit:10 fonksiyon (save/parkur/işaret dahil) birebir +chief spec sabit kontrolleri; v64 save9/9. Kanıt:TUR6B1-VALIDATION.json.
PASS runtime son kaynak: aktif1044 PASS/5652 N/A/0 FAIL; parkur30 PASS/156 N/A/0 FAIL; kaynak SHA256 birebir (TUR6B1-RUNTIME.json).
Runtime araç düzeltmesi: S4 blok stage3'te biter; eski sabit2sn durma tehlike sonrasında amire yakalanmayı sayıyordu. Şimdi gerçek bitiş + yerde + blok dışında koşulu; L2 değişmedi.
Runtime en dar üç:14.1=253–254 ms;8.1=353–354 ms;8.2=353–354 ms. S4 altı odak senaryosu6/6,min610 ms; yakalanma ayrı raporlanır.
Kanıt: chief-hesitation.cjs v64'ü bellekte varyantlar; TUR6B1-HESITATION-MEASUREMENTS.json. Eski chief-balance ve ölçümleri değiştirilmedi.
Korunanlar:4 üretim sprite,soundtrack,cover byte eşit; assets/ değişmedi; mevcut izlenmeyen medya/test-results silinmedi/taşınmadı/yazılmadı.
6b-2:17 gerçek sheet sonrası build(manifest keşfi),anim/boyut/fallback/konsol,bot/runtime,cihaz/ağ ve Playgama QA Tool yeniden koşulacak.
Ses2,606,255 B korunuyor; SHOULD boyut uyarısı:128 kbps yaklaşık1.3 MB seçeneği yönetici kararı,bu tur dönüştürülmedi.
Commit/tag/push ve graphify update yok. Build betiği üst depodadır; oyun deposunun commit'i tek başına onu içermez.
