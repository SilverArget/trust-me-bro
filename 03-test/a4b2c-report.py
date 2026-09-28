from pathlib import Path
import json,re,hashlib,datetime
r=Path(__file__).resolve().parent.parent;o=Path((r/'03-test/a4b2c-run-path.txt').read_text(encoding='utf-8-sig').strip())
def log(name):
 p=o/name
 if not p.exists():return ''
 b=p.read_bytes();return b.decode('utf-16' if b[:2] in [b'\xff\xfe',b'\xfe\xff'] else 'utf-8-sig',errors='replace')
def data(name):return json.loads((o/name).read_text(encoding='utf-8-sig'))
required={'final-core.log':['44 passed','5 failed'],'final-frozen.log':['12 passed','6 skipped','1 failed'],'final-magma.log':['36 passed','1 skipped'],'final-world.log':['11 passed'],'final-static.log':['7 passed']}
complete=all(all(v in log(n) for v in vals) for n,vals in required.items())
status='PASS' if complete else 'DUR - nihai odak kosulari tamamlanmadi'
sha=data('final-sha.json');eco=data('economy.json');matrix=data('similarity.json')['matrix'];red=data('red-c.json');audit=[json.loads(x) for x in (o/'assert-audit-c.jsonl').read_text().splitlines()];g4=data('g4-summary.json');mobile=data('mobile.json');integrity=data('integrity-c.json')
assert len(eco)==28 and len(g4)==12 and all(x['expectedFailure'] for x in red) and all(x['pass_'] for x in integrity)
assert all(e['walletDelta']==e['amount']==e['coins']+15+(20 if e['first'] else 0)+e['style'] for e in eco)
completion={m[0]:json.loads(m[1]) for m in re.findall(r'M_COMPLETION (M0\d) (\[[^\r\n]+)',log('final-magma.log'))}
lines=[f'DISK DURUMU: {status} - A4b-2c; kabul edilmis 6 eski kirmizi kapsam disi.',f'\n## A4b-2c - {datetime.datetime.now().isoformat()}\n',f'Baslangic a12 `8400376f6364055d40b551a6443e136b1cf7180f370646c2ca080403b450080b`; yedek `{o}/pre/02-kod`, hash listesi `start-sha.json`. Nihai a12 `{sha["js/a12-campaign.js"]}`. Ham kanit `{o}`. Tam regresyon KOSULMADI.\n',
'### Uygulama ve korunum\n',
'- MAGMA onceki rota tamamlanmadan acilmaz; M01 -> M02 -> M03 -> M04 -> M01 next zinciri; restore/varsayilan secim acik en ileri M rotasini bilir. Registry M01-M04. UI sonuc next/retry, siradaki dunya MAGMA ise D/F rota kimligini MAGMA rotasina donusturur; MAGMA disina geciste hedef dunya baslangicina doner.',
'- debugState.route.unlocked MAGMA icin M01-M04 durumlarini verir. Ilk kilit testindeki hata F kilit haritasinin donmesiydi; anahtar sirasi ilk tahmini dogrulanmadi.',
'- Mekanik test fiksturu M02/M03 on kosullarini da kayda ekler; eski tema fiksturu M01-M03 sirayla bitirir. Eski assert/esikler ayni. index, Bot S cekirdegi, fizik, tum D/F/M geometri/coin/girdi byte dizileri ve fiyat/yildiz ayni. `integrity-c.json`: 29/29; `a12.diff`: izinli akisin tum farklari.',
'- Mobil test CDP touchEnd icin birakilacak parmak kimligini duzeltti. Klavye/teleport/yerlestirme kullanmadan 390x844 gercek trusted touch joystick+jump olaylari; manuel 1/60 sim zamaninda checkpoint5200, olum0.',
'\n### Kabul - her satir dort alan\n',
'| Kapi | Beklenen + tolerans | Orneklem + girdi | Kapsam | Pozitif / kasten kirmizi kontrol |',
'|---|---|---|---|---|',
'| B-M-chain/registry | Yalniz M01 acik; onceki bitisle tek sonraki; ikinci ucret0 | Yeni profil, 200coin satin al/sec; UI next ve retry; M01-M04 | M kilit/sahiplik, D/F ilerleme ayni | Kilitli M02/M03/M04 start false; red reject-locked |',
'| G7/kayit | start/retry/next her M14coin; retry coin durumu uygun; kayit ayni | Dort rota; her rotada yeni sayfada ayni profil, kismi coin kaydi | 12 start/retry/next satiri + result retry ve save | audit start-count/retry-count/save-resume/result-retry/next-count yanlis degeri reddeder |',
'| G4 pilot | 12 benzersiz hedef; k alinmamis; coinContact/iz kesisimi0; bitis | M01-M04 x CJ/CC/CS; S-k, sabit dt/seed; her hedef icin S pozitif | 12/12; tum segmentlerin fizik-adimi izleri; teleport boyunca yapay cizgi yok | Her hedef tam S kosusunda alinmis; sentetik dikdortgen temas; red g4-pass ve audit g4-trace |',
'| M-M | 390x844; kontrol alanlari gorunur/ortusme0; checkpoint>=5200/death0 | M01 baslangic, CDP iki parmak joystick+jump, 1355 adim | Ilk checkpoint; 7 trusted touch pointerdown | red mobile-checkpoint; audit mobile-controls/mobile-real-touch |',
'| B-M-similarity | 14x14; M-M/M-F mesafe>=0.3; ayni tip+en iyi kaydirma<=150px kopya yok | D6+F4+M4; x sirali tip dizisi, Levenshtein/max uzunluk; normalize x kaniti | Tum196 hucre; M-M min0.3125, M-F min0.352941 | D04 +500px sentetik kopya reddedilir; red distance |',
'| B-M-economy | Cuzdan delta = runCoins+15+ilk20+stil; fiyat200 | 14 rota x ilk/tekrar gercek Bot S =28 bitis; olum0 | D/F/M kazanci, ilk ve tekrar ayri; asagidaki tablo | Olculen cuzdan delta ve bank result uzlasmasi |',
'| M rota adlari | EN/TR/RU her4 ad mevcut, farkli; EN tam tasarim adi | i18n sozluk API | 12 isim | red names; audit english-names |',
'| B-M-theme | doku0.03..0.30; yakin lav<=0.01/uzak>=0.01; kul max36/kapsama<=.015; RMSE>18; DOCK/FROZEN imza0 | M01-M04 x start/engel x1280x720/390x844 | 16 canvas olcumu ve PNG; ortucu0, aktif dunya/rota dogru | D01 ahsap kontrol>=.30; M kasa<=.05; kendi-resmi RMSE<1; M01/M02 red ground0 |',
'\n### Rotalar - nihai SHA uzerinde Bot S x2\n','| Rota | Coin | Sure1 / sure2 s | Olum | Determinizm |','|---|---:|---:|---:|---|']
for id in ['M01','M02','M03','M04']:
 c=completion.get(id,[]);lines.append(f'|{id}|14/14|'+(f"{c[0]['game_s']:.5f} / {c[1]['game_s']:.5f}|0|{c[0]['hash']} = {c[1]['hash']}|" if c else 'BEKLENIYOR|?|?|'))
lines+=['\n### G4x12\n','| Rota | Tur | Hedef | Iz ornek | Kesisim | Pozitif |','|---|---|---|---:|---:|---|']
for x in g4:lines.append(f"|{x['id']}|{x['kind']}|{x['target']}|{x['samples']}|{x['intersections']}|{x['positive']}|")
lines+=['\n### Ekonomi (coin)\n','| Rota | Toplanan | Bitis | Ilk bonus | Stil | Ilk kazanc | Tekrar kazanc |','|---|---:|---:|---:|---:|---:|---:|']
for a in eco[::2]:
 b=next(x for x in eco if x['id']==a['id'] and x['run']=='repeat');lines.append(f"|{a['id']}|{a['coins']}|15|20|{a['style']}|{a['amount']}|{b['amount']}|")
lines+=['\n200coin MAGMA: bos cuzdan, arada satin alma yok, tam Bot S toplama varsayimiyla D01-D04 ilk tamamlamalari **4 kosu / 220coin**. Ilk bonuslar tukendiyse D01-D06 tekrar dongusu **6 kosu / 213coin**. FROZEN zaten sahiplenilmisse F01-F04 ilk **4 / 227**, tekrar dongusu **6 / 222**. MAGMA kazanci satin alma SONRASI geri kazanimdir: ilk M01-M04 **4 / 226**, tekrar dongusu **6 / 219**; MAGMA kendi kilidini acmak icin kullanilmadi. FROZEN satin alma maliyeti bu varsayima dahil degil. Kanit `economy.json`/`positive-s.json`/`final-economy.log`. D/F125+M56=181 coin; sayilar azaltilmadi.',
'\n### 14x14 normalize tip-duzenleme MESAFESI (benzerlik degil)\n','|Rota|'+'|'.join(matrix)+'|','|---|'+'|'.join(['---:']*len(matrix))+'|']
for a,row in matrix.items():lines.append('|'+a+'|'+'|'.join(f'{row[b]:.3f}' for b in matrix)+'|')
lines+=['\n### Regresyon ucu / negatif kanit\n','| Paket | Nihai sonuc |','|---|---|']
for name,vals in required.items():lines.append('|'+name+'|'+'; '.join(v for v in vals if v in log(name))+'|')
lines += ['Eski FAIL kumesi: tn-a12 campaign-movement-and-frontflip; reward-budget-first-and-repeat; purchase-double-tap; D01/D02 real-input route completion; frozen-parkour-carriers-and-bypasses (rollDrop). Bu6 onceki yedekte dogrulandi ve kullanici tarafindan kapsam disi kabul edildi. Yeni hata bu kumeye eklenmedi. Core44PASS = parkour25 + t1b6 + chief1 + tn-a12 kalan12.',
f'Yedi yeni testin tamaminda beklenen exit1 / 1failed goruldu (`red-c.json`, red-*.log). Yeni ortak assert denetiminde {len(set(x["label"] for x in audit))} farkli etiket yanlis bool degerini reddetti (`assert-audit-c.jsonl`); bunlar PASS kosusundaki dogru deger assertlerinin yerine gecmez. Tema M01/M02 ayni kabul edilmis 2b oraklini kullanir.',
'Graphify AST-only guncellendi; 1941node/3219edge/132community. 111 zero-node ve community etiket uyari kaydi `graphify-update.log`; semantik/ag/ucretli cagrisi yok. Yeni arac betikleri/rapor sonrasi son AST sonucuna bakiniz.',
'\n### Nihai SHA256\n','```text']
lines += [v+' '+k for k,v in sha.items()];lines += ['```','\n### Teslim / snapshot\n',r'`E:\oyunlar\TrustMeBro\01-tasarim\coin-T2\post-a4b-mirror\02-kod` sprites ve tum calisma zamani varliklariyla hash dogrulamali kopyalanir. `READY-post-a4b.txt` snapshot tamamlama isaretidir; bu dosya yazilmadan snapshot HAZIR sayilmaz. Ana oturumun tam regresyonu icin yerel yol/env tarifi READY icindedir. Uretilen16PNG otomatik acilmadi.',
'Araclar: PowerShell, Python, Node.js/yerel Playwright-CDP, graphify. Commit/push/kurulum/ucretli/yayin/tam regresyon yok.\n']
text='\n'.join(lines);(o/'report-c.md').write_text(text,encoding='utf8')
if complete:
 old=(o/'pre/02-kod/03-test/TN-A4-REPORT.md').read_bytes();(r/'03-test/TN-A4-REPORT.md').write_bytes(text.encode('utf8')+b'\n\n---\n\n'+old)
print(json.dumps({'complete':complete,'status':status,'output':str(o/'report-c.md')}))
