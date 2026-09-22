# TUR6A — Denge ve tam kapı
Baz: f2caf66 / v63. SONUÇ: ana hata düzeltildi; tam yayın kapısı FAIL (10 tarihsel spec hatası açık).
Diff: index.html +2/-0 (boot ready); difficulty-ramp.spec.cjs +3/-2; yeni readiness.spec.cjs (3 test), bu rapor ve TUR6A-MEASUREMENTS.json.
Kök neden: v56 update() başına if(systemPaused)return ekledi; harness pauseGame sonrası 180 adımı paused çalıştırıyordu. Anchor kayması yok.
v55/v63 ragePatterns(1,1,0)=[coinBite]; g.anchors.trap birebir aynı, trigger=1242. v63 frame 0/30/60/90/120/150: x=1242.01,y=317,vy=0,onGround=true; v55 frame30 x=1373.76,vy=189.167.
İkinci harness hatası: platform.initialized sonrasında karakter seçimini koşullu kontrol etmek seçim ekranını açılmadan atlayabiliyordu. Artık ekran/ seçim bekleniyor; manuel adımlamada unpause, sonunda pause.
Rage kalıntıları havuzda seçilebilir; updateRageLayer ve drawRageLayer boş olduğundan saldırı/çarpışma davranışları etkin değil. Silinmedi; test ana tuzak kaçışını sınar, aktif rage saldırısı kanıtı değildir.
Gerçek uyum düzeltmesi: game_ready logo giriş örtüsü kalkmadan 189 ms’de gidiyordu; boot DOM kaldırılmasını bekliyor. Son ölçüm 945 ms, intro=false; fizik değişmedi.
| Uyum maddesi | Ölçüm | Karar |
| Başlangıç varlık üst sınırı | 8,002,734 byte = 7.63 MiB (ikon dahil, 4 sprite) <30 MiB; sıkıştırılmış portal ölçümü değil | PASS yerel ön kontrol |
| Büyük dosyalar | index 214,076 B; logo 2,144,707 B ve favicon 2,351,006 B HTML’de; soundtrack 2,606,255 B yükleniyor; cover 2,231,826 B referanssız | UYARI: logo/ikon küçült, ses bit hızını değerlendir; SHOULD <512 KiB |
| Eski dist | index.html, intro.mp4, soundtrack.mp3, playgama-bridge.js, config.json, 4 sprite: 9 dosya / 4,275,775 B | FAIL güncel paket değil |
| Build betiği | ../04-yayin/playgama/build-playgama.mjs eski YouTube script etiketini bekliyor; v63 yerel Bridge kullanıyor; logo/ikon kopyalanmıyor, kullanılmayan intro.mp4 kopyalanıyor | FAIL; 6b manifest düzeltmesi |
| Ağ / dış bağlantı | Üç başlangıç oturumunda dış-origin istek 0; CDN/font/uzak analytics yok; debug fetch yerel sheet; kaynakta native-only Google Play URL’si 1 | PASS web ağı; statik URL=0 iddiası YANLIŞ |
| İlk etkileşim | normal seçim 1,606 ms, hareket 2,025 ms; zero 1,756 ms; mock Bridge 1,604 ms; yerel Chromium, ağ kısıtlamasız | PASS <5 sn; cihaz/portal testi 6b |
| Viewport / ready | gerçek iframe 0×0 →390×844; simüle zero dahil 3/3 readiness; game_ready tek çağrı, intro kalkmış | PASS |
| Hatalar | başlangıç 3 oturum pageerror=0 / console error=0; tam test S4’te eksik optional sprite HTTP404 console error var | FAIL tam console=0; sprite sonrası tekrar |
| İçerik | depo mağaza metni 13+ / çocuklara yönelik değil; kodda kan/gore yok; panel sınıflandırması ve son sprite moderasyonu ölçülmedi | UYARI, sertifikasyon değil |
Denge: 62/62 doğrulanmış upgradesiz bölüm replay toplamı 551.2 sn (9:11.2); kesintisiz tek save koşusu değil, menü/retry/reklam süreleri hariç.
Sektör süreleri (part1+2, sn): S1=17.7; S2=22.4; S3=16.5; S4=18.5; S5=17.9; S6=17.4; S7=17.2; S8=17.8; S9=18.5; S10=17.4; S11=18.5; S12=17.5; S13=17.2; S14=18.2; S15=18.5; S16=18.0; S17=17.2; S18=18.5; S19=17.2; S20=17.2; S21=18.5; S22=18.0; S23=17.2; S24=17.2; S25=17.6; S26=17.2; S27=16.6; S28=17.2; S29=18.6; S30=17.2; S31=16.6
Reklam noktaları S8/12/16/20/24/28 = 6; ortalama 91.87 sn oyun/reklam. Reklam süresi sağlayıcıya bağlı, ölçülmedi; süre yüzdesi çıkarılmadı.
Duraksayan bot: 62 replay, 39 pozitif uyarı olayı; 0 yakalanma (sektör yok), 40 geçiş /21 tuzak ölümü /1 bitiremedi (11.1). Bekleme riski amirden önce tuzağa yansıyor; sıfır yakalanma amirin etkisizliğini kanıtlamaz.
Kör bot tüm 62 segment ×2 işaret ×3 Hz=372 gözlem: blocked=66, stun=153, ceza gözlenmedi=153; tuzak ölümü=141. Bu tam-oyun solver değil; yeni engel cezası ile sonraki tuzak ölümü ayrıdır.
Kör dağılım (blocked/stun/cezasız; tüm Hz): S1–5 24/9/27; S6–15 6/54/60; S16–30 30/90/60; S31 6/0/6. Yalancı işaret alt kümesi 93/93 ölümsüz, 30 blocked /63 stun, yakalanma 0.
PASS save zinciri: v55/v56/v57/v60/v63 × (1.1,16.2,31.2) =15/15 snapshot validSave/applySave; konum, deaths=7, damga korunuyor.
PASS difficulty-ramp: 2/2; 36 çift ×3 ölüm kademesi ×5 tekrar =540/540 clear, ölüm artışı 0; yoğunluk testi 186 satır.
PASS validate-186: 186/0; HEAD ile 186/186 geometri eşit; sözdizimi PASS.
PASS trap-window: 36 örnek, aktif ihlal 0, min 306.482 ms; pasif 30.5=249.719 ms kapı dışı görünür.
PASS runtime-window: 9,288 varyant, aktif 1,044 PASS /5,652 N/A /0 FAIL, min 253 ms; son index SHA256 eşleşiyor.
Runtime en kötü üç farklı aktif çift: 14.1=253–254 ms; 8.1=353–354 ms; 14.2=353–354 ms (son güvenli–ilk güvensiz).
PASS runtime-parkour: 30 PASS /156 N/A /0 FAIL; runtime-window tarafından aynı final kaynakta koşuldu.
PASS anim 24/24; parkour-tur1 25/25; pad-flight 34/34 (432 uçuş/iniş, ölüm0).
PASS parkour-bot 310/310 ve oran testi; blind 93/93; matrix 96 kombinasyon; chief 9/9.
PASS kilitler: 8 fonksiyon/save sözleşmesi (satır sonu normalize) +5 sabit birebir; git diff --check temiz.
FAIL bütün tarihsel spec seti: 117 testte 107 PASS /10 FAIL; ardından ek gerçek-zero iframe testi 1 PASS (toplam 118 test,108 PASS/10 FAIL). Hiçbiri skip edilmedi.
FAIL vc4-tarayici: 7 PASS/3 FAIL — S4 optional sheet404; S7 eski dist Bridge timeout (doğru dist yoluyla tekrarlandı); S8 PART yerine mevcut SECTOR metni.
FAIL l2p4-exitdrop: 0/1, kapalı part4/etkisiz exitDrop uyarısını bekliyor. FAIL top-block-window: 0/1, eski L1 pencere harness’i; güncel runtime kapısı ayrı PASS.
FAIL playgama-storage-object: 0/2; test part4 bekliyor, kabul edilen rota clamp’i part2 yüklüyor. Save verisi reddedilmiyor.
FAIL tmb-diagnostic: 0/3 — mute/unmute assert, pasif part3→4 geçiş beklentisi, eski crumble kimliği yerine jumpBait. Ses hatası kökeni bu tur çözülmedi.
Tur 6b: 17 gerçek sheet sonrası anim/fallback/boyut + bütün runtime/bot/console kapıları; kalan 10 tarihsel testin sözleşme/açılış/ses ayrımı çözülmeden yayın PASS yok.
Tur 6b: build script ve manifesti güncelle; logo/ikon optimize ve paketle, kullanılmayan intro kararını ver, soundtrack SHOULD boyut kararı; yeni ZIP ve Playgama QA Tool/cihaz-ağ ölçümü.
Kanıt: TUR6A-MEASUREMENTS.json (sürüm karşılaştırması, zaman serileri, 62 süre/bekleme, 372 kör gözlem, tarayıcı ağ logları ve FAIL ayrıntıları).
Kaynak eşikleri: https://developers.google.com/youtube/gaming/playables/certification/requirements_stability?hl=en (30 MiB MUST, 512 KiB ve 5 sn SHOULD).
Commit/tag/push ve graphify update yok. Mevcut sprites/, izlenmeyen medya ve test-results/ değiştirilmedi; tarihsel test çıktılarını TEMP kopyası aldı.
