# TN A1 Damga / İlerleme / Cüzdan Bağlantı Haritası

## Legacy v36 (korunan arşiv)

| Bağ | Güncel sembol | Etki |
|---|---|---|
| Damga snapshot | `index.html:snapshotSave()` | 31×6 bitmask ve `v:36` üretir. |
| Damga yükleme | `index.html:applySave()` | `collected` setini doldurur, ardından `coins=activeStampCount()` yapar. |
| Damga doğrulama | `index.html:validSave()` | v36 alanlarını ve 31 maskeyi doğrular. |
| Eski migration | `index.html:migrateV35()` / `loadProgress()` | v35→v36 ve `legacyV35` envelope. |
| Kapı/ilerleme | `index.html:collectCoin()`, `gate`, `finishGateEntry()` | Bir clearance stamp kapıyı açar; eski `coins` artar. |
| Upgrade | `index.html:dueUpgrade()` | Eski `coins` eşikleri 10/20 ile jump/speed açar. |
| Hard restart | `index.html:hardRestart()` | Eski damga `coins` ve legacy ilerlemeyi sıfırlar. |

## Yeni kampanya (ayrılmış sınır)

| Sorumluluk | Sembol/dosya | Ayrım garantisi |
|---|---|---|
| Profil/migration | `js/a12-campaign.js:baseProfile`, `normalizeProfile`, `migrateV36` | v36 tam envelope `legacyProgress` altında korunur; damga coin'e çevrilmez; tekrar migration `migrationFlags.v36` ile idempotent. |
| Koşu defteri | `freshRun`, `restoreRun`, `saveRun` | `economyRunId`, `attemptId`, `runCoins`, `collectedCoinIds` legacy `coins` değişkeninden bağımsız. |
| Banka | `bankRun` | `bankedRunIds` ile idempotent; fiziksel +15 bitiş +20 ilk +0..10 stil. |
| Retry/checkpoint | `retry`, `saveRun` | `collectedCoinIds` ve `runCoins` korunur; cüzdan değişmez. |
| Mağaza | `purchaseOrWear` | Yalnız `walletBalance`; çift işlem `purchaseBusy`; kayıt başarısızsa snapshot geri alınır. |
| Legacy restart | `index.html:hardRestart()` | Yeni profil farklı storage key (`trust_me_bro_campaign_profile_v1`) kullandığı için cüzdan/envantere erişmez. |

Cache sınırı yeni rota çiziminde `worldId + routeId + version` veri kimliğiyle kurulmuştur; A1+A2 Canvas çizimi stateless olduğundan legacy `backdropKey/sceneLayerKey` kullanılmaz.

