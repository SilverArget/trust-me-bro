# Dock birebir + hareket progress ? 2026-10-05 11:02

## Commit kapsam?
- `js/a12-campaign.js`: D07/D08 ?zg?n engel ve dive pencereleri; D09/D10/D13 kald?r?lm?? Vector engelleri; ekran d??? ?ef giri?i; Dock ?ef runner atlas animasyonu; catch/climb wallRun pozu; normal z?plamayla a??labilen y?zeyde catch engeli.
- `js/chief-paths.js`: geometri de?i?en D07/D08/D09/D10/D13 i?in mevcut kay?tlar?n rota hashleri yenilendi. Yol ?rnekleri yeniden ?retilemedi; ideal bot ?zg?n k???k engellerde tak?ld?.
- `03-test/manager-preview/`: 1280?720 ve 390?844 D01/D07 kareleri + durum JSON'lar?.

## IR fark ?zeti
| Rota | Geri al?nan sapma | Kalan sapma / sebep |
|---|---:|---|
| D01?D03 | 0 | K-RAMPA/K-EGIM; mevcut IR geometri testi D01/D02 tam, D03 tam |
| D04 | 0 | K-RAMPA/K-EGIM + K-D04-KUTU 72?48 |
| D05 | 0 | K-RAMPA/K-EGIM |
| D06 | 0 | K-RAMPA/K-EGIM + K-BOSLUK |
| D07 | 1 kald?r?lm?? slide + 4 b?y?t?lm?? vault + ?zg?n dive pencereleri | yaln?z K-RAMPA/K-EGIM |
| D08 | 2 kald?r?lm?? slide + 5 b?y?t?lm?? vault + ?zg?n dive pencereleri | yaln?z K-RAMPA/K-EGIM |
| D09 | 2 kald?r?lm?? vault | di?er R2/R3 sapmalar?n?n tam ?zg?n verisi ??kar?lmad? |
| D10 | 2 kald?r?lm?? slide + 1 kald?r?lm?? vault | di?er R2/R3 sapmalar?n?n tam ?zg?n verisi ??kar?lmad? |
| D11?D12 | 0 | K-RAMPA/K-EGIM; D12 ideal bot ?ef taraf?ndan yakaland? |
| D13 | 2 kald?r?lm?? slide | di?er R2/R3 sapmalar?n?n tam ?zg?n verisi ??kar?lmad?; ideal bot yakaland? |
| D14?D16 | 0 | K-RAMPA/K-EGIM |

## Hareket 2a?2e
- 2a: `js/a12-campaign.js:1323-1324,1483,1889` ? ba?lang?? x=-64; gecikme/yakalama kural? korunuyor.
- 2b: `js/a12-campaign.js:2921-2924` ? Dock ?efi runner atlas?na ba?land?; run 16 fps/8 kare, di?er pozlar 8 fps.
- 2c: `js/a12-campaign.js:3007` ? catch/climb wallRun sat?r? ve fps'i.
- 2d: `js/a12-campaign.js:1675-1676` ? yaln?z normal z?plama tepesinden y?ksek y?zey grounded catch kabul ediyor; e?ik fizik sabitinden t?retiliyor.
- 2e: mevcut vault/slide/roll/jump e?lemesi korundu; ?ef ?rnek pozlar? da atlas vault/wallRun/roll/jump'a e?lendi.

## Testler (kesilmeden sonu?)
- `node --check js/a12-campaign.js`: PASS.
- `node 03-test/vp-dock-geo.cjs`: 83 PASS / 2 FAIL (iki eski F04 par?a-transform beklentisi; g?rev d???).
- `node 03-test/vp-dock-transitions.cjs`: zorunlu kontroller PASS; bilgi sat?rlar? de?i?medi.
- chief + catch-climb paketi: 18 PASS / 2 FAIL; iki realtime piksel/timeout kan?t testi atlas piksel b?lgesi 0 ?l?t?. Mant?k testleri, invalid catch, fizik ve state-owner PASS.
- D01?D16 ideal klavye (geometri geri al?nmadan ?nce): 14 PASS / 2 FAIL; D12 ve D13 ?ef yakalamas?. D01?D11 (D12 hari?), D14?D16 ?l?m 0/yakalama 0/coin baseline PASS.
- ?zg?n D07/D08 engelleri geri al?nd?ktan sonra yeniden kay?t: D07 x=2447.20 ve D08 x=3023.20 noktalar?nda ideal bot stuck; brief uyar?nca harita tekrar de?i?tirilmedi.
- Chief hash testi: D01?D18 + F01?F04 tamam? PASS; negatif D01 mutasyonu RED-as-expected.
- Dokunmatik: chief paketi D01/D05 390?844 PASS; briefte istenen D07 tam dokunmatik ko?usu tamamlanmad?.

## G?rsel kan?t
- `03-test/manager-preview/d01-chief-run-{1,2,3}-{1280x720,390x844}.png`
- `03-test/manager-preview/d07-small-vault-{1280x720,390x844}.png`
- `03-test/manager-preview/d07-wallrun-climb-{1280x720,390x844}.png`

## Yeni kare gerektiren hareketler
- Atlas mevcut: run, jump, vault, slide, wallRun, roll, frontFlip.
- Ayr? atlas sat?r? olmayan Vector trick t?rleri: ReverseVault, RailFlipVault, SpinningVaultTrick, ThiefVault ve DivingKong/RocketVault'a ?zg? ayr? siluetler. ?imdilik vault/jump ile temsil edilir; birebir animasyon i?in yeni kare gerekir.

## Karar gerekiyor
- D07/D08 ?zg?n k???k vault ?l??lerinde mevcut ideal bot tak?l?yor. Haritay? de?i?tirmeden motor/bot ge?i?inin ayr?ca ele al?nmas? gerekiyor.
- D09/D10/D13 d???ndaki t?m D01?D16 sapmalar?n?n ham IR'den otomatik fark d?k?m? bu s?re penceresinde tamamlanmad?.
- D12/D13 ?ef yakalamas? ve D07 dokunmatik tam ko?u k?rm?z?; push yap?lmamal?.
