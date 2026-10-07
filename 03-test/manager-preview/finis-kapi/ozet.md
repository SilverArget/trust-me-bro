## Kapi + SONRAKI kabul ozeti

- Branch/worktree: `kapi-sonraki-1007` / `E:/oyunlar/TrustMeBro-wt/kapi-sonraki`
- Base: `a2e3e66` (`origin/master`, live)
- Onceki commit: `4b7511a`
- Akis commit: `75359d5`
- Yeni commit: bu dosyanin icindeki commit (`git log -1 --oneline`)

## Gorsel kabul fix

- Akis degismedi; sadece finish kapisi cizimi guncellendi.
- Acik kapi artik sicak sari/beyaz ic mekan isigi ve zeminde isik izi gosteriyor.
- Giris karesinde celik gri roll-up shutter yukaridan asagi kayiyor; yatay slat cizgileri ve alt kenarda sari-siyah ikaz seridi var.
- Kapali kapi artik acik halinden net farkli: shutter kapinin tamamini kapatiyor ve ust lamba kirmizi `KAPANDI` durumuna geciyor.

## Akis fix

- Kapi kapaninca artik result/grid ekrani acilmiyor; run yine ayni `bankRun()` ile yildiz, wallet, best, progress ve pending-run temizligini kaydediyor.
- Kapanis tamamlaninca result UI gizli kalirken `D01 TAMAMLANDI · +35` biciminde kisa banner gorunuyor.
- Banner sonrasi mevcut interstitial kurali aynen calisiyor; reklam gerekiyorsa bu transition icinde gosteriliyor, sonra siradaki rota basliyor.
- Son rota icin next rota yoksa eski final/result davranisi korunuyor.
- `SONRAKI` butonu kaldigi ekranlarda ayni; onceki `nextRouteInFlight` double tap/click guard korunuyor.

## Erisim kontrolu

- Result grid / `YENIDEN DENE` / `MAGAZA` tamamen silinmedi; final rota result davranisinda ve debug/manual finish akista duruyor.
- Magaza ayrica karakter secim ekranindaki `SHOP/MAGAZA` girisinden ulasilabilir.

## Preview dosyalari

- Desktop: `desktop-kapi-acik.png`, `desktop-kapi-giris.png`, `desktop-kapi-kapandi.png`, `desktop-tamamlandi-banner.png`
- iPhone landscape: `iphone-landscape-kapi-acik.png`, `iphone-landscape-kapi-giris.png`, `iphone-landscape-kapi-kapandi.png`
- Magma ornegi: `magma-kapi-acik.png`
- Eski ad uyumlulugu: `kapi-acik.png`, `kapi-kapandi.png`
- Karsilastirma: `kapi-acik-kapali-yanyana.png`
- NEXT: `sonraki-click-once.png`, `sonraki-click-after.png`

## Testler

- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/finish-door-next.spec.cjs --workers=1` -> 3 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/next-button-touch.spec.cjs --workers=1` -> 2 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/chief-runner.spec.cjs --workers=1` -> 23 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/hermes-tum-oyun.spec.cjs --workers=1` -> 1 passed
- `NODE_PATH=C:/Users/Arget/AppData/Roaming/npm/node_modules npx.cmd playwright test 03-test/dokunmatik-input.spec.cjs --workers=1` -> 1 passed
- `node 03-test/d09-logic-audit.cjs` -> 22/22 routes issues=0
