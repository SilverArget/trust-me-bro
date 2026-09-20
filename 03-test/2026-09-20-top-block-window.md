# Tepeden blok kaçış penceresi — 2026-09-20

Tepe-blok tabanı: 0.8 sn; sahne ölçeği mutlak alt sınırı: 0.67 sn. Gerçek pencere, bloğun tetik anındaki hurtbox yüksekliğine erişmesi ile botun bloğu temizlemesi arasındaki süredir.

| Part | Tuzak | Eski model (ms) | Yeni model (ms) | Gerçek (ms) | Kaçış | Duran |
|---|---|---:|---:|---:|---:|---|
| L1 P1 | signDrop | -68 | 452 | 450 | 5/5 | öldü |
| L1 P2 | signDrop | -40 | 480 | 483 | 5/5 | öldü |
| L1 P3 | signDrop | -252 | 268 | 267 | 5/5 | öldü |
| L1 P4 | signDrop | -68 | 452 | 450 | 5/5 | öldü |
| L1 P5 | signDrop | -129 | 391 | 383 | 5/5 | öldü |
| L1 P6 | signDrop | -54 | 466 | 467 | 5/5 | öldü |
| L3 P1 | ceiling | 67 | 451 | 467 | 5/5 | öldü |
| L3 P2 | ceiling | 67 | 451 | 467 | 5/5 | öldü |
| L3 P3 | ceiling | 25 | 409 | 417 | 5/5 | öldü |
| L3 P4 | ceiling | -5 | 379 | 383 | 5/5 | öldü |
| L3 P5 | ceiling | -20 | 364 | 383 | 5/5 | öldü |
| L3 P6 | ceiling | 53 | 437 | 450 | 5/5 | öldü |
| L8 P1 | jumpBait | 10 | 354 | 350 | 5/5 | öldü |
| L8 P2 | jumpBait | 67 | 411 | 417 | 5/5 | öldü |
| L8 P3 | jumpBait | 25 | 369 | 367 | 5/5 | öldü |
| L8 P4 | jumpBait | 39 | 383 | 383 | 5/5 | öldü |
| L8 P5 | jumpBait | -20 | 324 | 333 | 5/5 | öldü |
| L8 P6 | jumpBait | 53 | 397 | 400 | 5/5 | öldü |
| L14 P1 | checkpointBetrayal | 10 | 306 | 300 | 5/5 | öldü |
| L14 P2 | checkpointBetrayal | 67 | 363 | 367 | 5/5 | öldü |
| L14 P3 | checkpointBetrayal | 25 | 321 | 317 | 5/5 | öldü |
| L14 P4 | checkpointBetrayal | 39 | 335 | 333 | 5/5 | öldü |
| L14 P5 | checkpointBetrayal | -20 | 276 | 283 | 5/5 | öldü |
| L14 P6 | checkpointBetrayal | 53 | 349 | 350 | 5/5 | öldü |
| L30 P1 | checkpointBetrayal | 67 | 337 | 350 | 5/5 | öldü |
| L30 P2 | checkpointBetrayal | 67 | 337 | 350 | 5/5 | öldü |
| L30 P3 | checkpointBetrayal | 25 | 295 | 300 | 5/5 | öldü |
| L30 P4 | checkpointBetrayal | 39 | 309 | 317 | 5/5 | öldü |
| L30 P5 | checkpointBetrayal | -20 | 250 | 267 | 5/5 | öldü |
| L30 P6 | checkpointBetrayal | 53 | 323 | 333 | 5/5 | öldü |
| L31 P1 | finale | 48 | 378 | 383 | 5/5 | öldü |
| L31 P2 | finale | 79 | 409 | 417 | 5/5 | öldü |
| L31 P3 | finale | 32 | 362 | 367 | 5/5 | öldü |
| L31 P4 | finale | 48 | 378 | 383 | 5/5 | öldü |
| L31 P5 | finale | -20 | 310 | 317 | 5/5 | öldü |
| L31 P6 | finale | 63 | 393 | 400 | 5/5 | öldü |

Özet: min/med/max 267/375/483 ms; kaçış 36/36; duran ölüm 36/36.
Karşı ölçüm: .50/.55/.56 başarısız, .57 başarılı.
Örnekleme: her koşuda tetikten sonra 200/500/800/1100/1400 ms; son örnek 1600 ms respawn sınırından öncedir.
