# TUR15 — D04 basamak ve şef teması

## Sonuç

- Taban: `e953200`; uygulama commit'i: `15bef00`.
- D04 geri atma kök nedeni `index.html:doPhysics()` içindeki yatay çarpışma sırasıydı. Oyuncu basamağın üstünde dururken kayan nokta örtüşmesi, taşıyan `ground` dikdörtgenini yan duvar gibi çözüyor ve oyuncuyu `s.x-player.w` konumuna atıyordu (`index.html:740`). Çözüm yalnızca zeminin üst yüzeyinde duran oyuncu için bu yatay yan çözümünü atlıyor; basamakların tamamı görünür ve `solid` kaldı.
- Şefin temasta yakalamamasının kök nedeni `js/a12-campaign.js:updateIntegrated()` içindeki `liveChiefCatch` koşulunun `catchExposureT>=2.15` beklemesiydi. Yakalama artık 4 px temas toleransında doğrudan gerçekleşiyor (`js/a12-campaign.js:1946`). Durmuş oyuncuya fiziksel yaklaşma 54 px/sn; ölçülen yakalama süresi 2.367 sn.
- Yeniden doğuşta `resetRecordedChief()` şefi tam rota gecikmesine (`D=2.5`, `F=1.2`, `M=1.0`, `A=0.8`) geri kuruyor. İz dışı örnekler oyuncuya projekte edilmiyor (`chiefTraceSampleAtX()`), bu yüzden checkpoint yeniden doğuşunda üst üste binme yok.

## Değişen dosyalar ve semboller

- `index.html`: `doPhysics()` — basamak üst yüzeyini yan çarpışmadan ayıran genel düzeltme.
- `js/a12-campaign.js`: `chiefTraceSampleAtX()`, `resetRecordedChief()`, `updateIntegrated()` — iz sınırı, tam gecikmeli yeniden doğuş, durana fiziksel yaklaşma ve temasta yakalama.
- `03-test/tur15-stairs-chief.spec.cjs`: rota/görünüm/basamak, şef teması ve yeniden doğuş regresyonları.
- `03-test/TUR15-REPORT.md`: bu rapor.

## Test sonuçları

Odaklı basamak matrisi her hücrede `right-only` ve `jumps` olmak üzere iki koşu içerir. Tüm koşularda ölüm `0`, geri adım `0 px`, takılma karesi `0` oldu.

| Rota | Görünüm | Geçti/Kaldı |
|---|---|---:|
| D02 | 915×412 | 2/0 |
| D02 | 412×915 | 2/0 |
| D04 | 915×412 | 2/0 |
| D04 | 412×915 | 2/0 |
| F05 | 915×412 | 2/0 |
| F05 | 412×915 | 2/0 |
| F06 | 915×412 | 2/0 |
| F06 | 412×915 | 2/0 |

Şef/regresyon sonuçları:

| Senaryo | Görünüm | Sonuç | Ölüm / Retry / Catch |
|---|---|---|---:|
| D04 temas ve 1 sn güvenli tampon | 915×412 | geçti; 1 sn catch=0, temas catch=1 | 0 / 0 / 1 |
| D04 checkpoint yeniden doğuş | 915×412 | geçti; 2.5 sn geri, ilk 2 sn catch=0 | 0 / 1 / 0 |
| A02 checkpoint yeniden doğuş | 915×412 | geçti; 0.8 sn geri, ilk 2 sn catch=0 | 0 / 1 / 0 |
| D01 tam rota | 915×412 | geçti | 0 / 0 / 0 |
| D04 tam rota | 915×412 | geçti | 0 / 0 / 0 |
| F05 tam rota | 915×412 | geçti | 0 / 0 / 0 |
| A01 tam rota | 915×412 | geçti | 0 / 0 / 0 |

- Yeni odaklı spec: `5/5` test geçti (`21.9 sn`); basamak alt koşulları toplam `16/16` geçti.
- Mevcut D04/D02 basamak spec'leri: `4/4` geçti (`25.9 sn`). D02'nin eski right-only teşhis yerleşimi rota içi geometriye gömülü başlıyor; yeni gerçek iniş matrisi bunu ayrı ve doğru başlangıçla kapsıyor.
- Mevcut şef durma kontratı: `1/1` geçti (`9.1 sn`).
- 915×412 gerçek klavye tam rota: `4/4` geçti (`2.2 dk`); D01 `11/12`, D04 `12/12`, F05 `13/14`, A01 `14/14` coin.
- Ek D04 412×915 koşusunda oynanış tamamlandı (`ölüm=0`, `retry=0`, `catch=0`, `12/12` coin), fakat kapsam dışı görünürlük eşikleri nedeniyle spec `0/1`: player-forward `%98.858 < %99`, chief-in-frame `%6.85 < %90`.
- `node --check js/a12-campaign.js` ve `git diff --check` geçti.
- Brief uyarısına uygun olarak 72 koşuluk tam regresyon çalıştırılmadı.

`ASSERT CHANGE`: Var olan assertion'lar değiştirilmedi; yalnızca TUR15 için yeni regresyon assertion'ları eklendi.

## Kanıt

- Klasör: `03-test/manager-preview/tur15/` (`17` PNG + `2` JSONL).
- D04 yatay ve Android kareleri görsel olarak kontrol edildi; basamaklar görünür/katı ve oyuncu iniş hattında.
- `03-test/manager-preview/` `.gitignore` kapsamında; kanıtlar commit'e girmez.
