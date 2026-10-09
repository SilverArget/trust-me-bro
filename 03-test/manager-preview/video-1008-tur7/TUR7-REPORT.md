# Trust Me Bro — Tur 7 D11 raporu

- Ürün/test aracı commit'i: `5ef95d9e4f7798d98e3a717455653011b1b5a555`
- Dal: `gorsel-1008`
- Taban: `38d9914ce0850ed3b0a1d648b2d4c2b2f840539b`
- Push: yapılmadı

## Teşhis

**Sorun oyundaydı (çıkmaz cep), yalnız bot zamanlaması değildi.** 915×412'de rota başından beş ayrı takılma olayı üretildi; `tutunma-10` basışı kasıtlı atlandıktan sonra oyuncu her seferinde `x=2432.80` konumunda `normal` durumda durdu. Botun kullandığı `jump()` yolu üzerinden tek gerçek `ArrowUp` basışı gönderildi. 1,017–1,117 sn gözlem sonunda beşinde de `Δx=0`, kaçış 0/5 ve bitiş 0/5 oldu; ölüm 0, şef yakalaması 0. Koşular ışınlama/state yazımı kullanmadı, sentetik değildi.

Kök neden: `03-test/dock18-generated/transitions-D11.json` Vector geçişinde `d11-v-11` genişliği 12 px iken ürün rotasında 121,2 px idi. Fazla 109,2 px, üç 36 px basamağın altında saçak/cep oluşturuyordu. `d11-v-11` 12 px'e döndürüldü; basamakların x/y/36 px üst geometrisi korunup yükseklikleri ortak alt zemine kadar 141,18 / 211,68 / 282,05 px yapıldı. Böylece basamaklar havada asılı değil ve altta çıkmaz cep yok. Geometri değiştiği için D11 şef yolu `03-test/record-chief-paths.cjs D11` ile gerçek koşudan yeniden kaydedildi.

## Kabul ölçümleri

- **D11 915×412 ideal:** ölçülen 10/10 bitiş, ölüm 0, yakalama 0; beklenen 10/10, ölüm 0, yakalama 0; koşu 10; girdi kaynağı gerçek klavye (`ArrowRight` + `ArrowUp`), sentetik değil; viewport 915×412.
- **D11 1280×720 ideal:** ölçülen 5/5 bitiş, ölüm 0, yakalama 0; beklenen 5/5, ölüm 0, yakalama 0; koşu 5; girdi kaynağı gerçek klavye, sentetik değil; viewport 1280×720.
- **Tutunma kaçırma → yeniden basış:** ölçülen 5/5 çıkış ve rota bitişi, ölüm 0, yakalama 0; beklenen 5/5, ölüm 0 ve ≥2,15 sn duruş olmadan yakalama 0; koşu 5 gerçek duvar olayı; girdi kaynağı rota başından gerçek klavye, `tutunma-10` bot basışı kasıtlı atlandı, ışınlama/state yazımı yok; viewport 915×412. Duvar konumu `x=2396.80`; gerçek `ArrowUp` sonrası ölçülen kaçış 0,416–0,450 sn (beklenen ≤1,000 sn). Momentumla duvara hiç takılmadan geçen atlama denemeleri bu beş duvar olayına dahil edilmedi.
- **Gerileme:** ölçülen 72/72 bitiş, ölüm 0, yakalama 0; beklenen 72/72, ölüm 0, yakalama 0; koşu 72 (36 rota × 2 viewport); girdi kaynağı gerçek klavye, sentetik değil; viewportlar 915×412: 36/36 ve 1280×720: 36/36.

## Kanıt

- `d11-runs.jsonl`: teşhis, ideal ve kaçırma/yeniden basış koşuları; her koşu bir satır.
- `d11-stairs-915x412-NN.png`: rota başından 4 fps merdiven serisi.
- `d11-miss-recover-915x412-NN.png`: kasıtlı tutunma kaçırma ve gerçek tuşla çıkış serisi.
- Görsel olarak açılıp kontrol edilen örnekler: `d11-stairs-915x412-110.png`, `d11-stairs-915x412-116.png`, `d11-miss-recover-915x412-177.png`, `d11-miss-recover-915x412-179.png`.

## Çalıştırılan hedefli komutlar

- `node 03-test/record-chief-paths.cjs D11`
- `npx playwright test 03-test/vp-dock-play.spec.cjs -g "D11 ideal keyboard route" --repeat-each=10 --workers=1` (915×412)
- Aynı hedef, `--repeat-each=5 --workers=1` (1280×720)
- Aynı hedef, kasıtlı `tutunma-10` atlama + gerçek yeniden basış ölçümü (915×412)
- `npx playwright test 03-test/vp-dock-play.spec.cjs -g "ideal keyboard route" --fully-parallel --workers=4 --reporter=line` (915×412 ve 1280×720 ayrı koşular; her biri 36 passed)
