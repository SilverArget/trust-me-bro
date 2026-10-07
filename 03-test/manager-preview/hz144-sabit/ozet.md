# hz144-sabit-1007 raporu

Karar: "Fizik 60 Hz adımla" uygulandı. `index.html` RAF döngüsünde hızlı ekran algısı (`dt <= 1/90` ardışık 3 kare) sonrası oyun mantığı `1/60` birikimli adımlarla ilerliyor; 60 Hz/jitter/yavaş cihaz yolu eski `updateDispatch(dt)` yolunda kalıyor. `__tmbCampaignStep(dt)` ve `__tmbParkour.step(dt)` aynı birikimli adımdan geçiyor; audit'e özel fizik bayrağı yok.

Kök neden: önceki yamalar yörünge parçalarını düzeltmeye çalışıyordu, fakat vector-v1 rotalarda oyuncu, şef, coin, kampanya state'i ve bot girdileri aynı RAF `dt` örneğinde birlikte ilerliyordu. Yüksek Hz'de `doPhysics(dt)` daha küçük adımlarla, route/bot girdisi ise farklı gözlem karelerinde çalıştığı için zıplama, iniş ve coin toplama 60 Hz ayrık davranışından ayrışıyordu. Yeni yaklaşım tüm oyun mantığını yüksek Hz'de 60 Hz mantık adımına topluyor; çizim her RAF'ta son durumu çiziyor.

## Değişen dosyalar

- `index.html`: `loop(t)` artık `stepRefreshMode(dt)` kullanıyor; hızlı ekranlarda `acc += dt` ve `while(acc >= 1/60) updateDispatch(1/60)` çalışıyor. `acc` üst sınırı `.25`, çıkışta reset var.
- `03-test/refresh-rate-audit.py`: raw/vector ölçümler genişletildi; audit simülasyon zamanını `__tmbCampaignStep(dt)` dönüşünden okuyor.
- `03-test/vp-dock-play.spec.cjs`: rota filtresi ve 144 Hz rAF test desteği alındı; 144 Hz harness'te bot beklemesi oyun saati adımına bağlandı.
- `03-test/vp-dock-play-144hz.cjs`: D01-D07 için `TMB_RAF_HZ=144` wrapper.

## Refresh-rate audit

`python 03-test/refresh-rate-audit.py`

| Hz | raw apex | raw air | raw gap | jump apex | jump air | land X | gap | run px | Hermes dx | wall rise | wall frames | dive X |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 60 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 120 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 144 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |
| 165 | 103.50 | 0.77 | 163.50 | 58.15 | 0.57 | 244.15 | 92.15 | 1166 | 0.00 | 86 | 133 | 2208.31 |

Not: `oneFrameHorizontalPx` doğal olarak Hz'e bağlı kaldı: 60=4.25, 120=2.13, 144=1.77, 165=1.55.

## Regresyonlar

- `chief-runner/hermes-tum-oyun/d09-sarkan/ios-tamekran/host-lock`: `35 passed, 2 skipped`.
- `dokunmatik-input` WebKit: `1 passed`.
- `dokunmatik-input` Chromium: `1 passed`.
- `node 03-test/d09-logic-audit.cjs`: tabloda rota `issues` değerleri 0.

## O-1 B-5 full 28

Komut: `TMB_ROUTE_IDS=D01..A02 npx playwright test 03-test/vp-dock-play.spec.cjs -g "O-1 B-5" --workers=1 --reporter=line`

- After: `8 passed, 20 failed`.
- Beklenen baseline fail kümesi: `D01,D02,D04,D05,D06,D07,D08,D10,D11,D12,D13,D14,D15,D16,D17,D18,F01,F02,F04,M02`.
- Ölçülen log özetinde `20 failed / 8 passed`; ancak log parser `F04` için PASS satırı gördüğü için fail kimliği birebirliği bu turda tam doğrulanmış kabul olarak işaretlenmedi.

## 144 Hz D01-D07

| Rota | 60 Hz sonuç | 144 Hz ölçülen |
|---|---|---|
| D01 | FAIL 10/12 | FAIL 10/12 |
| D02 | FAIL 9/10 | FAIL 9/10 |
| D03 | PASS 13/13 | FAIL 11/13 |
| D04 | FAIL 9/12 | FAIL 9/12 |
| D05 | FAIL 10/13 | FAIL 10/13 |
| D06 | FAIL 10/13 | koşu bu raporda tamamlanmadan durduruldu |
| D07 | FAIL | koşu bu raporda tamamlanmadan durduruldu |

Ek D03 probe (`TMB_RAF_HZ=144`, oyun saati beklemeli harness): `FAIL 11/13`. Açık kalan kabul maddesi budur.

## Durum

Refresh-rate fizik hedefi geçti; ana regresyonlar geçti. 144 Hz D03 coin sonucu hâlâ 60 Hz D03 ile birebir değil, bu nedenle yönetici kabulü tamam değil. Commit bu ölçülen durumla alınacak; push yapılmayacak.
