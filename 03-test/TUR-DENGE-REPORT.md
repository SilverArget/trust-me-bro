# Acil denge — v68 çalışma ağacı
S5.2: kasa x=220, en yakın düşman devriyesi x=557; bu kasada doğrudan çakışma yok. Eski HUD 98, ölüm+yakalanma toplamıydı.
HEAD: duran picker bitişik kasada ▲ basınca vault aynı karede iptal; 40 px uzakta normal zıplama. Yeni kaynak: ikisinde de vault; S5.2 çıkış testi PASS.
Oyun diff +17/−16: parkur seçimi/iptali, düşman aralıkları, altı engelin konumu, amir, işaret vurgusu ve HUD. Sprite/save aynı.
[62 satırlık çakışma tablosu](TUR-DENGE-COLLISIONS.md): 24 segmentte eski risk → 0; 22 devriye daraltması, 6 engel taşıması; düşman hızları aynı.
Tarama: 400 px/s, giriş/çıkışta yarımşar saniye + 32 px gövde payı; tüm devriye zarfı. Ek runtime teması S4.2'de giderildi.
S8.1/S14.1 duvar 920→500; S11.2/S21.2/S25.2/S29.2 kasa 920→220. İlk iki duvarın 220 konumu gereksiz amir baskısı nedeniyle kullanılmadı.

| Sabit | Eski → yeni | Gerekçe |
|---|---|---|
| CHIEF_LEAD_PX | 220 → 320 px | Durma tamponu |
| CHIEF_SPEED_EARLY/LATE/FINAL | .80/.85/.90 → .72/.78/.84 | 183.6/198.9/214.2 px/s; hepsi <255 |
| Amir başlangıcı / CHIEF_GRACE_S | S3 / 0 → S6 / 1 s | S1–S5 öğretici; part başı bekleme |
| PK_LOOK_MIN / PK_MOVE_MIN | 24→40 px / yeni 200 px/s | Duran oyuncuda seçim; yön verilen slide minimumu |
| PK_VAULT_SPEED | yürüyüş limiti → 520 px/s tavan | 40 px yaklaşmada 68 px / 140 ms ≈486; toplam süre 280 ms aynı |
| PK_BLOCK_HINT_S | yeni .4 s | Mevcut işaret yanıp söner; yeni metin yok |
HUD: 💀 yalnız deaths, 👁 yalnız yakalanma. Save şeması ve hikâye aynı; yakalanma ölüm sayılmaz.
PASS bilgili bot 310/310: atanmış hareket kullanılır, gerçek update ve çıkış doğrulanır.
PASS kör bot 93/93 ölümsüz; yakalanma 0.
PASS tereddüt eşiği: 62 denemede 10 yakalanma ≤10, ölüm 0; 51 bölüm çıkışı. S4.1 probe'u çıkışı tamamlayamadı; amir kapalı, yakalanma 0. Tam oyun bitirme PASS'i değildir.
Tereddüt: başta 1.5 s, etiketli engel önünde 1 s giriş bırakma; gecikmeyle geçersizleşen rota yeniden aranır; S2 başarısız ilk sıçrama tekrar denenir. TUR-DENGE-HESITATION.json.
PASS parkour-enemy-clear 62/62: statik hacim + gerçek rota; hareketin ±500 ms çevresinde gövde/düşman teması 0; S5.2 picker özel testi PASS.
PASS mobil touch: joystick merkezde + ▲, vx=0 ve 40 px mesafe; 4 karakter × 2 yön. Fixture matrisi 96/96.
PASS tam spec 124/124: anim 26/26, chief 10/10, parkour-tur1 25/25, pad-flight 34/34, difficulty-ramp 2/2.
PASS validate-186 186/0; özgün geometri/yüzey/anchor 186/186 aynı. Düşman tür/boyut/yüzeyleri korunur; izinli konum/aralık değişir.
PASS trap-window: 36 örnek, aktif ihlal 0, minimum 306.482 ms; pasif 30.5=249.719 ms görünür, kapı dışı.
PASS son kaynak runtime-window: aktif 1044 PASS / 5652 N/A / 0 FAIL; parkur 30 PASS / 156 N/A / 0 FAIL. Kaynak hash'i paketle eşleşir.
En dar aktif üç: S14.1 253–254 ms; S8.1 353–354 ms; S8.2 353–354 ms. TUR-DENGE-RUNTIME.json ve TUR-DENGE-VALIDATION.json.
PASS kilitler: warnScale/MIN_ABS/rage/rota sabitleri, snapshotSave/validSave/applySave aynı; CRLF/LF normalize karşılaştırma.
PASS readiness 3/3: ilk hareket 1593.5–1638.6 ms; game_ready logo kalktıktan sonra; 0×0→390×844, dış istek/pageerror/console error 0.
Amir gerçek durarak yakalanma: S6 2.750 s, S16 2.617 s, S31 2.500 s; ilk 1 s grace dahil.
İkonlar icon-raw'dan Lanczos: oyun 64×64 / 9157 B; platform 256×256 / 75748 B, 512×512 / 237607 B. Kapaklar değişmedi.
v68 ZIP: 27 dosya; açılmış 4210124 B, ZIP 3767437 B; yollar /, paket index.html çalışma ağacıyla byte eşit. Döküm: TUR-DENGE-PACKAGE.json.
SHA256: 55b7b8f6188f425a3c20ec2191a0ea1830aa0b702580a4a476bebe195e55bfac
Paket: ../04-yayin/playgama/trust-me-bro-v68.zip. Sandbox yükleme ve gerçek telefon oynanışı bu tur yapılmadı.
Mevcut izlenmeyen dosyalar/test-results korundu; tarayıcı medya çıktıları TEMP kopyasında. Commit/tag/push ve graphify update yok.
