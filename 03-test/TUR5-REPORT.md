# TUR 5 ? Animasyon ve sprite altyap?s?
Baz: c6a01db / v62. Oyun diff: index.html +7/?2; yeni anim.spec.cjs 22 sat?r, 17 fixture PNG ve bu rapor.
De?i?en: drawCourier/drawChief; yeni: optionalSheet/spriteAnimation/readySheet, ba??ms?z ACTION_SHEETS cache.
| Durum | S?re | Kare / ms | Fallback |
|---|---|---|---|
| normal | mevcut | idle/step/step2/jump, mevcut ritim | mevcut PNG/piksel karakter |
| vault | 280 ms | 4 / 70 | v62 ?ne e?im |
| slide | 320 ms | 4 / 80 | v62 yatay basma; tavan alt?nda kare 3 tutulur |
| roll | 240 ms | 4 / 60 | v62 d?n?? |
| wallRun | ?250 ms | 4 / 62.5 (250 ms s?reye g?re) | v62 normal sprite |
| stun | 120 ms | idle + ?1.2 px titreme | yeni sheet kullan?lmaz |
| chief | 400 ms d?ng? | 4 / 100 | v62 siluet + fener |
Kare=min(3,floor(elapsed/duration?4)); iptal an?nda normal. Mevcut hareket/fizik zamanlay?c?s? de?i?medi.
Y?kleme: ilk kullan?mda, sheet ba??na ba??ms?z Image loaded/failed; 17 dosya ilk oynanabilir ekran? bekletmez; beklerken fallback.
PASS anim.spec: 24/24; 80 kare s?n?r? piksel kontrol?, 32 v62 fallback Canvas e?itli?i + chief e?itli?i, 96 y?n/Hz/hareket kombinasyonu.
PASS anim ekleri: iptal/crouch, kar???k eksik sheet, stun, boyut uyar?s?, yanl?? boyut fallback; taray?c? pageerror 0.
PASS parkour-tur1: 25/25.
PASS pad-flight: 34/34; 432 u?u?/ini?, ?l?m 0.
PASS parkour-bot: 310/310; yerle?im/oran kap?s? dahil.
PASS parkour-blind: 93/93, ?l?m 0, yakalanma 0.
PASS parkour-matrix: 96/96; chief: 9/9; birle?ik mevcut regresyon 72/72.
PASS validate-186: reports=186, bad=0; ?zg?n geometri/d??manlar HEAD ile ayn?.
PASS trap-window: 36 ?rnek, aktif ihlal 0, min 306.482 ms; pasif 30.5=249.719 ms kap? d???, de?i?medi.
PASS runtime-window: 9288 varyant / 86 ?ift; aktif 1044 PASS, 5652 N/A, 0 FAIL; min 253?254 ms.
PASS runtime parkur sonras?: 30 PASS / 156 N/A / 0 FAIL; kaynak hash'i son index.html ile ayn?, ??k?? 0.
PASS kilit/save v62: HEAD kay?tlar? 9/9 kabul ve y?kleme; kilit fonksiyon/sabit/save 0 de?i?im; git diff --check temiz.
DEVral?nan difficulty-ramp: 1 PASS / 1 FAIL; ayn? death tiers remain escapable assert (sat?r 36), de?i?tirilmedi.
Boyut kap?s?: #debug/#debugParkour alt?nda y?klenince byte log'u; >524288 byte uyar?, ?izim s?rer (test edildi).
Fixture: her biri 2614 byte, toplam 44438 byte; yaln?z test sunucusu sprites/ yoluna e?ler; ?retim sprites/ de?i?medi.
A??k not: stun idle+titreme istenen kas?tl? g?rsel farkt?r; d?rt hareket ve chief eksik-sheet g?r?n?m? v62 ile birebir.
## Ana oturum i?in kesin sprite ?retim s?zle?mesi
Dosyalar: sprites/{courier,forklift,picker,guard}-{vault,slide,roll,wallrun}.png (16) ve sprites/chief.png (1); k???k harf, wallrun biti?ik.
Her PNG tam 424?192 RGBA; yatay 4 h?cre, her h?cre 106?192; kenarl?k, h?cre aras? bo?luk, trim veya atlas metadata yok.
Hareket kare s?ras? 0?3: ba?lang?? ? orta ? doruk ? ??k??; chief: d?ng?ye uygun d?rt y?r?y?? karesi.
Arka plan tamamen ?effaf; yer/g?lge/fener veya kare numaras? ?izme. Karakterler mevcut temel sheet ile ayn? sa?a bak??ta olsun; sola flip kodda.
H?cre ankraj? x=53, alt kenar y=192 (son piksel y=191); ayak/yer temas taban? kareler boyunca sabit; roll/slide pozu h?cre i?inde ?izilsin.
?l?ek mevcut karakterinki: courier 56/177, forklift 56/159, picker 56/181, guard 56/177; chief 56/177. Sheet ?l?eklenir, ayr?ca hareket transformu uygulanmaz.
Halo/ince kontur mevcut karakterlerle ayn? bi?imde g?rsele i?lenmeli; PNG yolu ek halo ?retmez. Slide temas taban? 32?24 g?vdenin alt?na hizalan?r.
Her sheet tercihen ~100 KB, SHOULD ?512 KiB; ?l?? uymazsa fallback. Dosyalar gelince yeni sayfa y?klemesinde otomatik kullan?l?r, kod de?i?mez.
Commit/tag/push ve graphify g?ncellemesi yok; ba?lang??taki izlenmeyen medya ve test-results/ korunuyor; test ??kt?lar? TEMP alt?nda.
