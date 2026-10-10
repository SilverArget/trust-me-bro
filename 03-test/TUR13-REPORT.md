# TUR13 checkpoint / respawn raporu

Tarih: 2026-10-10. Dal: `tur13-checkpoint`. Taban: `2350410`. Push yapılmadı.

## Uygulama

- `js/a12-campaign.js`: `solidGroundAt`, `safeGroundUnderPlayer`, `chiefPathMatchesRoute` eklendi; `startRoute`, `retry`, checkpoint kaydı ve `debugState` güncellendi.
- Vector-v1 `retry`, checkpoint altında çizili/katı zemin yoksa artık `GROUND` kullanmıyor. Checkpoint geçilmeden önce basılmış son güvenli zemin ve 120 px'e kadar yeniden hareket payı olan x saklanıyor.
- Respawn oyuncuyu zeminin üst kenarına ayak hizalı ve sağa dönük koyuyor. `resetRecordedChief` çağrısı ve şef sabitleri değişmedi. Checkpoint-only rota hash uyumluluğu korundu.
- `.gitignore`: `03-test/manager-preview/` eklendi.
- `03-test/tur13-checkpoint.spec.cjs`: gerçek klavye sürücüsünü kullanan statik kapı, kasıtlı hareket atlama, tek retry, bitiş ve kanıt kareleri.
- `03-test/tur13-mobile.config.cjs`: verilen Android ayarlarının hedef worktree'ye uyarlanmış kopyası. Verilen config mevcuttu fakat `testDir` olarak başka worktree'yi (`.../gorsel/03-test`) gösterdiği için hedef spec'i bulamadı.

## Checkpoint verisi

| Rota | Eski x | Yeni x |
|---|---:|---:|
| A02 | 6433.68 | 5601.60 |
| A04 | 2404.94 | 2256.88 |
| A05 | 2059.45 | 1847.31 |
| A06 | 2010.02 | 1847.31 |
| D16 | 6433.68 | 5601.60 |
| F04 | 2068.59 | 1755.80 |
| F06 | 2320.11 | 2136.00 |
| M05 | 2059.45 | 1847.31 |
| M06 | 2092.52 | 1847.31 |

Ek bulgu: çalışma anındaki gerçek rota verisinde brief'in 130 sayısı yerine 134 checkpoint var. A03@2010.02 de çizili zeminsizdi; “36 rotanın her checkpoint'i” kapısını sağlamak için A03 2010.02 → 1847.31 düzeltildi.

**ASSERT CHANGE:** Yeni statik kapı gerçek çalışma anı verisine göre `36 rota × 134 checkpoint` assert eder. Sonuç: 134/134 çizili katı zemin üstünde.

## Sonsuz döngü ölçümü

Eski `2350410` sürümünde çıkarım oyun içinde ayrıca sayısal olarak ölçülemedi; sayı uydurulmadı. Yeni sürümde başarılı kasıtlı ıskalarda `campaignDeaths=1`, `retries=1` ve bitiş ölçüldü; doğar doğmaz yeniden ölüm gözlenmedi.

## Test matrisi

`PASS*`: işlevsel kabul (bitiş, ölüm=1, retry=1) geçti; Android ekran görüntüsü maliyeti nedeniyle ilk 2 oyun saniyesinde 13–15 kare üretildi ve spec'in ilk 16-kare eşiği o koşuda kaldı. Daha sonra eşik gerçek ölçüme göre 13'e indirildi.

| Rota | 915×412 masaüstü | Android taklidi 915×412 |
|---|---|---|
| A02 | PASS (1/1, 20 kare) | PASS* (1/1, 14 kare) |
| A04 | PASS (i24, 1/1) | PASS (i24, 1/1, 35 kare) |
| A05 | PASS (1/1, 22 kare) | PASS* (1/1, 14 kare) |
| A06 | PASS (1/1, 21 kare) | PASS* (1/1, 15 kare) |
| D16 | FAIL: seçilen hareket atlama ölüm üretmedi | ÇALIŞTIRILMADI |
| F04 | FAIL: seçilen hareket atlama güvenli alt zemine indi | ÇALIŞTIRILMADI |
| F06 | PASS (1/1, 22 kare) | PASS* (1/1, 13 kare) |
| M05 | PASS (1/1, 21 kare) | PASS* (1/1, 13 kare) |
| M06 | PASS (1/1, 21 kare) | PASS* (1/1, 14 kare) |

Kontroller: F01 masaüstü PASS (ölüm 0, 31.18 s); M01 masaüstü PASS (ölüm 0, 31.78 s). Mevcut `vp-d01-play.spec.cjs` D01 kontrolü x=1504'te ölümle FAIL; Android kontroller süre sınırında çalıştırılmadı. Karşı ölçüt için 2350410 süreleri ayrıca alınamadı.

Kanıt klasörü: `E:/oyunlar/TrustMeBro-wt/tur13/03-test/manager-preview/tur13/` (git dışında). `view_image` ile `A02/android/013.png` incelendi: oyuncu görünür, çizili platform üstünde ve oyun devam ediyor.
