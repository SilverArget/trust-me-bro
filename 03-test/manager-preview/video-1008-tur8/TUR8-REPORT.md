# Tur 8 raporu

- Uygulama commit'i: `6d28922dc37665fb19502aba191dfd6a7664692e`
- Dal: `gorsel-1008`
- Push: yapılmadı

## Değişen satırlar

- `js/a12-campaign.js:1885`: yalnız `innerHeight >= innerWidth` iken kayıtlı oyuncu izinden şefi görünür genişliğin `0,18W` gerisinde sınırlar.
- `js/a12-campaign.js:3768`: yalnız `innerHeight >= innerWidth` iken portrait kamera hedefini gerçek görünür genişlik ve oyuncu hızına göre öne alır.
- Rota verisi, şef gecikme/hız/yakalama sabitleri, bitiş şefi, assert ve yatay yol değiştirilmedi.

## Hedefli 390×844 koşuları

| Rota | Bitiş | Ölüm | Yakalama | Şef kadrajda | Oyuncu ekran-x p99 |
|---|---:|---:|---:|---:|---:|
| D09 | 1/1 | 0 | 0 | %100,0 | 181,4 px (`0,465W`) |
| M03 | 1/1 | 0 | 0 | %100,0 | 181,2 px (`0,465W`) |

Komut: `TMB_ROUTE_IDS=D09,M03`, `TMB_EVIDENCE_VIEWPORT=390x844`, `npx playwright test 03-test/vp-dock-play.spec.cjs --grep "O-1 B-5" --workers=1`.

Her iki rota bitiş/ölüm/yakalama, şef görünürlüğü ve Tur 8'in `p99 <= 0,5W` ölçütünü geçti. Test dosyasındaki eski `playerForward >= %99 @ <=0,45W` aserti sırasıyla `%98,92` ve `%98,89` ölçerek süreç çıkışını 1 yaptı; bu assert değiştirilmedi.

## Görsel kanıt

- `d09-390x844-01.png` … `d09-390x844-118.png`: 4 fps, rota başından başlatılan gerçek klavye koşusunda şef takibi başladıktan bitişe kadar; şef bütün ölçülen karelerde kadrajda.
- Ham sayılar: `tur8-runs.jsonl`.

Brief gereği 36 rota matrisi ve yatay gerileme çalıştırılmadı.
