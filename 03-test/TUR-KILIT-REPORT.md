# TUR KİLİT RAPORU — v69 çalışma ağacı
Base: v68. Commit/push yok; kilitli zorluk, rota, save ve sprite dosyaları değişmedi.

| Kasa ölçümü | Sonuç |
|---|---|
| 62 aktif segment | Vault katmanı bulunan 18 segmentte 18 kasa; min/maks/ortalama 48/48/48 px |
| Yerleşim | S21.1 kasa 920→500 px; diğer 17 kasa taşınmadı |
| Vault sözleşmesi | 40–56 px kabul, 48 px üretim, 32 px genişlik, 4 px açıklık, 280 ms |

Kasa büyümesi sonrası S21.1 düşman zarfına girdi; 500 px güvenli konumda statik ve gerçek rota teması sıfırlandı.
Vault yatay hız kaybetmiyor; normal zıplama alternatif olarak kaldı. Sprite ayak tabanı engel üstünde: anim gerçek-sheet ayak hizası PASS; `evidence/*-vault-50.png` yenilendi.
Amir artık oyuncu izini/y konumunu okumuyor: bağımsız `{x,y,vy,onGround}` fiziği, 1450 yerçekimi, −560 sıçrama ve 20 px geometri bakışı kullanıyor.
Yakalama: yatay fark ≤16 px ve düşey fark ≤48 px. Tuzak/düşman etkileşimi yok; sprite yürüyüş sheet'i havada da korunuyor.

PASS chief.spec 12/12: oyuncu yerinde zıplarken amir y sabit; düşey yakalama eşiği; grace/pause/reklam/reset sözleşmeleri.
PASS bekçi botu 62/62; 52 aktif rotada kendi boşluk/engel sinyaliyle en az bir sıçrama yaptı, düşmedi.
PASS parkour-enemy-clear 62/62; büyüyen kasa sonrası düşman teması 0.
PASS bilgili bot 310/310; kör bot 93/93, ölüm 0.
PASS tereddüt botu 10/62 yakalanma, ölüm 0; S4.1 önceki ölçüm açık noktası, amir kapalı.
PASS parkour-tur1 25/25; 30/60/120 Hz yüksek kasa inişi ve penetrasyonsuzluk.
PASS anim 26/26; gerçek vault sheet, oran ve ayak hizası; console/pageerror 0.
PASS validate-186 186/0; özgün yüzey geometrisi değişmedi.
PASS trap-window: aktif minimum 306.482 ms, aktif ihlal 0.
PASS runtime-window: aktif FAIL 0, minimum 253 ms; runtime-parkour 30 PASS / 156 N/A.
PASS kilit diff: warnScale/MIN_ABS/rage/ROUTE_PARTS/PART_COUNT/SCENE_COUNT/save değişmedi.

v69 ZIP: 27 dosya, 4,211,209 B açılmış / 3,767,819 B ZIP; index çalışma ağacıyla birebir; `/` yolları.
SHA-256: `656e17c1de20c2bee058dcbccce8f47add2c0a3e858ee485d3a7d68435b9533c`
