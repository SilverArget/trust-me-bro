# TUR17 REPORT

## Durum

- Üretilen atlas: **32/32**
- Eksik kaynak: **0**
- Push yapılmadı.

## Ölçüm tablosu

| Atlas | Byte | Yeşil | Boş | Kopuk ≥10 px | Kenar alfa | Maks. boy farkı | Maks. ayak farkı | Maks. merkez farkı |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `tall-dockCrew` | 294812 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 3.5px |
| `tall-nightShift` | 298378 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 3.0px |
| `tall-hazardRunner` | 298134 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 3.0px |
| `tall-ronin` | 322251 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 4.0px |
| `tall-shadowNinja` | 292980 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 4.0px |
| `tall-orbitAstronaut` | 334402 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 2.5px |
| `tall-northRaider` | 306630 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 3.5px |
| `tall-mechaPilot` | 336051 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 4.0px |
| `compact-dockCrew` | 226319 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-nightShift` | 227004 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-hazardRunner` | 229181 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-ronin` | 224155 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-shadowNinja` | 233814 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-orbitAstronaut` | 241209 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-northRaider` | 236851 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `compact-mechaPilot` | 238884 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-dockCrew` | 302736 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-nightShift` | 323139 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-hazardRunner` | 322924 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-ronin` | 325290 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-shadowNinja` | 298847 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-orbitAstronaut` | 350599 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-northRaider` | 318952 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `bruiser-mechaPilot` | 347585 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 0.5px |
| `athlete-dockCrew` | 271881 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-nightShift` | 268264 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-hazardRunner` | 274591 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-ronin` | 272610 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-shadowNinja` | 257267 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-orbitAstronaut` | 298193 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-northRaider` | 279412 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |
| `athlete-mechaPilot` | 292835 | 0 | 0 | 0 | 0 | 0.00% | 0.0px | 5.0px |

## Kontak sayfaları

- `03-test/manager-preview/tur17/contact-tall.png`
- `03-test/manager-preview/tur17/contact-compact.png`
- `03-test/manager-preview/tur17/contact-bruiser.png`
- `03-test/manager-preview/tur17/contact-athlete.png`

## Eksik kaynaklar

- Yok.

## Kalan dosyalar için tek komut

`python tools/a5/import_ai_sheets.py --runner-outfits-source "C:\Users\Arget\Desktop\Çalışma Alanı\scratch\tmb-gpt2\out" --skip-missing`

Komut dış klasörde bulunanları ham kaynak klasörüne eşler, bulunmayanları atlar, mevcut tüm Tur 17 kaynaklarını yeniden doğrular, atlasları/sözleşmeyi/raporu/kontak sayfalarını günceller.

## Doğrulama

- `python 03-test/tur17-integrity.py`: PASS — 32 atlas, 88 sözleşme girdisi; fizik/şef/rota/ekonomi ve male/female koruma kapıları.
- `npx playwright test 03-test/tur17-outfits.spec.cjs 03-test/tur14-test-mode.spec.cjs 03-test/a5-live.spec.cjs --workers=1`: PASS — 12/12.
- Gerçek girdi kanıtı: `03-test/manager-preview/tur17/bruiser-shadowNinja-d01-keyboard.png` (390×844, mağazada satın alma + kuşanma + D01 sağ ok).
- Özellik commit'i: commit sonrasında bu rapora kaydedilecek.
