# Dokunmatik joystick raporu

Tarih: 2026-10-06
Dal: `dokunmatik-1006`
Baz: `09e358e`

## Kök nedenler

- `index.html` joystick'i axis/deadzone/knob ile yönetirken `js/a12-campaign.js` aynı `#joystick` için ikinci `pointerdown/move/up` bağlayıp axis'i farklı formülle yeniden yazıyordu.
- iPhone portrait'te görünen joystick 74 px; etkili basma alanı yalnız daire ve küçük pseudo genişlemesiydi. Dairenin kenarı/dışına basınca input hiç başlamıyordu.
- `pointercancel` eski kodda joystick'i hemen bırakıyordu; iOS iptal olayı parmak kalkmadan gelirse hareket ölü kalıyordu.
- Jump da yalnız görünen küçük butona bağlıydı; joystick ile aynı anda geniş sağ-alt dokunma alanı yoktu.

## Önce / sonra ölçüm özeti

| Ortam | Durum | Merkez drag | Kenar/dış drag | Yüzen sol bölge | `pointercancel` +80 ms | Joystick + jump |
|---|---|---:|---:|---:|---:|---:|
| WebKit iPhone portrait | önce | axis 1, 93 ms | axis 0, yok | axis 0, yok | axis 0, inactive | yok |
| WebKit iPhone portrait | sonra | axis 1, 91 ms | axis 1, 92 ms | axis 1, 76 ms | axis 1, active | axis 1, jump pressed, `vy=-390` |
| WebKit iPhone landscape | önce | axis .818, 83 ms | axis 0, yok | axis 0, yok | axis 0, inactive | yok |
| WebKit iPhone landscape | sonra | axis .88, 79 ms | axis .88, 48 ms | axis .88, 70 ms | axis .88, active | axis .953, jump pressed |
| Chromium Pixel 7 portrait | önce | axis 1, 51 ms | axis 0, yok | axis 0, yok | axis 0, inactive | yok |
| Chromium Pixel 7 portrait | sonra | axis 1, 50.5 ms | axis 1, 51.1 ms | axis 1, 50.7 ms | axis 1, active | axis 1, jump pressed, `vy=-317.5` |
| Chromium Pixel 7 landscape | önce | axis .803, 46.1 ms | axis 0, yok | axis 0, yok | axis 0, inactive | yok |
| Chromium Pixel 7 landscape | sonra | axis .88, 47.4 ms | axis .88, 48.3 ms | axis .88, 54 ms | axis .88, active | axis .953, jump pressed, `vy=-317.5` |

Ham ölçüm dosyaları:

- `before-webkit.json`
- `after-webkit.json`
- `before-chromium.json`
- `after-chromium.json`

Kanıt ekran görüntüleri:

- `webkit-iphone-portrait-zones.png`
- `webkit-iphone-landscape-zones.png`

## Değişen yerler

- `index.html`
  - Joystick tek input kaynağı oldu.
  - Sol alt %45 genişlik x alt %55 yükseklik joystick başlangıç bölgesi oldu.
  - Parmağın bastığı nokta joystick merkezi kabul ediliyor; görünen joystick yerinde kalıyor, knob yalnız yön/şiddet gösteriyor.
  - Sağ alt %40 genişlik x alt %55 yükseklik jump bölgesi oldu.
  - `pointercancel` joystick'i bırakmıyor; `pointerup`, `touchend`, `blur`, `pagehide` bırakıyor.
  - Sayfa callout/seçim/zoom engelleri korunup genişletildi.
- `js/a12-campaign.js`
  - İkinci joystick pointer listener'ları kaldırıldı.
  - İkinci jump `pointerdown` listener'ı kaldırıldı.
  - Klavye listener'larına dokunulmadı.

## Testler

- `cmd /c "set NODE_PATH=C:\Users\Arget\AppData\Roaming\npm\node_modules&& set TMB_LABEL=after&& set TMB_OUT=E:\oyunlar\TrustMeBro-wt\dokunmatik\03-test\manager-preview\dokunmatik&& npx playwright test ""03-test/dokunmatik-input.spec.cjs"" --browser=webkit --reporter=line"`: 1/1 geçti.
- Aynı ölçüm Chromium: 1/1 geçti.
- Önce ölçümü WebKit + Chromium, `TMB_ROOT=<HEAD geçici kopyası>` ile: 2/2 geçti.
- `cmd /c "set NODE_PATH=C:\Users\Arget\AppData\Roaming\npm\node_modules&& npx playwright test ""03-test/mobile-v70.spec.cjs"" ""03-test/player-visible-mobile.spec.cjs"" ""03-test/next-button-touch.spec.cjs"" ""03-test/chief-runner.spec.cjs"" --browser=chromium --reporter=line"`: 34/36 geçti.
  - Kalan 2 fail `player-visible-mobile.spec.cjs` içinde fullscreen portrait hide ve D01 framing min-foot beklentisi. Bu değişiklik input katmanında; fullscreen/camera geometrisine dokunulmadı.
  - `chief-runner.spec.cjs`: tüm chief testleri geçti.
  - `mobile-v70.spec.cjs` ve `next-button-touch.spec.cjs`: geçti.

## Ölçülemeyen

- Gerçek iPhone cihazda test yapılmadı. WebKit iPhone emülasyonu ve sentetik pointer/touch sırası kullanıldı.
