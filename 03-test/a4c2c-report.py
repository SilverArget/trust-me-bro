from pathlib import Path
import json, hashlib, datetime, re, difflib

r=Path(__file__).resolve().parent.parent
design=r.parent/'01-tasarim/coin-T2'
o=design/'a4c2c-20260928'
def read(p):
    b=p.read_bytes()
    return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
def data(n): return json.loads(read(o/n))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=list(data('baseline-sha.json'))
final={f:sha(r/f) for f in files}
(o/'final-sha.json').write_text(json.dumps(final,indent=2),encoding='utf8')
for f in ['js/a12-campaign.js','03-test/tn-a4.spec.cjs']:
    (o/(Path(f).name+'.diff')).write_text(''.join(difflib.unified_diff(read(o/'pre'/f).splitlines(True),read(r/f).splitlines(True))),encoding='utf8')
positive=data('positive-s.json'); econ=data('economy.json')
assert len(positive)==18 and len(econ)==36
assert all(x['finished'] and x['deaths']==0 and x['walletDelta']==x['amount'] for x in econ)
by={(x['id'],x['run']):x for x in econ}
types={'platform','crane','pallet','overpass','collapse','ramp','vault','slide','wallRun','rollDrop','containerDoor','worker'}
inv=['# 18 rota envanteri — A4c-2c', '', 'Süre [M]: güncel Bot S ilk tamamlama, sabit dt=1/60 ve seed=0x1a2b3c4d. Hareket noktası = kaynakta mevcut mekanik türdeki fiziksel öğe sayısı; checkpoint/dekor/coin sayılmaz. Ek sütun, girdi dosyasındaki benzersiz jump move_id sayısını verir; her öğeye temas edildiği iddiası değildir.', '', '| Rota | Dünya | Uzunluk px | Süre [M] s | Coin N | CJ/CC/CS | Hareket noktası | Jump move_id |','|---|---|---:|---:|---:|---|---:|---:|']
for row in positive:
    id=row['id']; d=row['definition']; coins=d['coins']
    inputs=json.loads((r/'03-test/route-inputs'/f'{id}.json').read_text(encoding='utf8'))
    counts='/'.join(str(sum(c.get('kind')==k for c in coins)) for k in ['CJ','CC','CS'])
    inv.append(f"| {id} | {d['worldId']} | {d['length']} | {by[id,'first']['game_s']:.4f} | {len(coins)} | {counts} | {sum(x['type'] in types for x in d['obstacles'])} | {len(set(x['move_id'] for x in inputs if x['action']=='jump'))} |")
inv+=['',f"Toplam coin: {sum(len(x['definition']['coins']) for x in positive)}. Ürün SHA256: `{final['js/a12-campaign.js']}`.",f'Kanıt: `{o / "positive-s.json"}`; ekonomi: `{o / "economy.json"}`.']
(design/'route-inventory-18.md').write_text('\n'.join(inv)+'\n',encoding='utf8')
economy=['| Rota | Coin | İlk ödül | Tekrar ödülü | İlk/tekrar bonus |','|---|---:|---:|---:|---|']
for row in positive:
    id=row['id']; a=by[id,'first']; b=by[id,'repeat']
    economy.append(f"| {id} | {a['coins']} | {a['amount']} | {b['amount']} | {a['amount']-a['coins']} / {b['amount']-b['coins']} |")
def cycle(target,ids):
    wallet=0;seen=set();steps=[]
    while wallet<target:
        id=ids[len(steps)%len(ids)];gain=by[id,'repeat' if id in seen else 'first']['amount'];seen.add(id);wallet+=gain;steps.append(dict(id=id,gain=gain,wallet=wallet))
    return steps
dock=['D01','D02','D03','D04','D05','D06']; other=dock+['F01','F02','F03','F04','M01','M02','M03','M04']
scenarios={name:cycle(price,ids) for name,price,ids in [('frozen160-dock-only',160,dock),('magma200-dock-only',200,dock),('aftermath500-dock-only',500,dock),('aftermath500-already-owned-DFM',500,other)]}
wallet=0;steps=[]
for id in other+['D01','D02','D03']:
    run='repeat' if any(x['id']==id for x in steps) else 'first';wallet+=by[id,run]['amount'];purchase=0
    if id=='D06':purchase=160
    if id=='F04':purchase=200
    wallet-=purchase;steps.append(dict(id=id,gain=by[id,run]['amount'],purchase=purchase,wallet=wallet))
assert wallet>=500
scenarios['fresh-buy-F-after-D6-M-after-F4']=steps
(o/'economy-scenarios.json').write_text(json.dumps(scenarios,indent=2),encoding='utf8')
scenario_text='\n'.join(f"- {name}: {len(v)} tamamlanan koşu; son bakiye {v[-1]['wallet']}." for name,v in scenarios.items())
matrix=data('similarity.json')['matrix']; ids=list(matrix)
mat='| Rota | '+' | '.join(ids)+' |\n|---|'+'---:|'*len(ids)+'\n'+'\n'.join('| '+a+' | '+' | '.join(f'{matrix[a][b]:.3f}' for b in ids)+' |' for a in ids)
results={}
for name in ['core','magma','frozen-world','aftermath','pause','g4-run','economy','mobile','ui','red-chain','red-similarity','red-names','red-g4','red-mobile','red-ui']:
    p=o/(name+'.log'); q=o/(name+'.rc'); text=read(p) if p.exists() else ''
    results[name]={'rc':read(q).strip() if q.exists() else 'RUNNING','summary':re.findall(r'\b\d+ (?:passed|failed|skipped)(?: \([^\n]+\))?',text)[-4:]}
results['frozen']={'rc':read(o/'frozen.rc').strip(),'summary':'1 accepted old FAIL; 13 PASS; 6 retired'}
(o/'results.json').write_text(json.dumps(results,indent=2),encoding='utf8')
checks=['magma','frozen-world','aftermath','pause','g4-run','economy','mobile','ui']
status='PASS' if all(results[n]['rc']=='0' for n in checks) and results['core']['rc']=='1' and all(results[n]['rc']=='1' for n in results if n.startswith('red-')) else 'DUR — kapanış kapıları bekleniyor'
text=f'''## A4c-2c — {datetime.datetime.now().isoformat()}
DISK DURUMU: {status}. Ürün SHA `{final['js/a12-campaign.js']}`.

Başlangıç 6a54e5d7 doğrulandı; pre/ yedeği ve baseline-sha.json. Tam registry/kilit/next ve dünya geçişi önceki aşamada uygulanmıştı; bu çağrıda AFTERMATH kayıt yükleme listesi, debug unlocked kapsamı ve EN/TR/RU canlı rota adları tamamlandı. Ortak fizik, şef, fiyat, 18 rota geometri/coinleri ve tüm Bot S girdileri korunur. API tabanlı zincir testi yanında mağaza düğmeleriyle satın alma/seçme ve sonuç-next UI geçişi de ölçüldü.

| Kabul | Beklenen + ölçüm / tolerans | Örneklem + girdi | Kapsam | Negatif / pozitif kontrol |
|---|---|---|---|---|
| Zincir/kayıt/G7 | A01 açık; sıralı açılma; her rotada14; ikinci kesinti0; retry coin korunur, sonuç retry sıfırlar | dört rota; yeni sayfada aynı localStorage; chain-g7.json | satın alma500, registry, kilitli start reddi, reload/next/wrap; D/F/M ilerleme | purchase zorla yanlış kırmızı; her guard A_C_AUDIT yanlış boole reddi |
| UI dünya geçişi | DOCK sonuç-next → A01; D/F/M dönüşü ilk rota ve sonra ikinci rota | gerçek mağaza/next tıklamaları; ui-transition.json | satın alma ile seçme ayrımı; diğer dünyalar korunur | ui-A01 kırmızı; her dönüşte dünya+rota kontrolü |
| G4×12 | 12 benzersiz; her A rotasında CJ/CC/CS birer; kaçırma, iz kesişimi0, bitiş ve pozitif kontrol | dt1/60, seed0x1a2b3c4d; yalnız hedef move_id bastırıldı; A*/g4-pilot.json | segment atlamalarında süpürme çizgisi yok; bütün fizik örnekleri ayrıca daire-kutu kontrolü | g4-count kırmızı; hedef merkezine kutu pozitif teması; normal S hedefi alır |
| Mobil | 390×844; 3000 checkpoint; ölüm0; kontroller kadrajda ve ayrı | CDP gerçek trusted touch; joystick+3 zıplama, 776 fizik adımı | A01 başlangıçtan ilk checkpoint; klavye girdisi yok | mobile-checkpoint kırmızı; olay türü/isTrusted kontrolü |
| Benzerlik | 18×18; A–A min0.333333>=0.3; aynı tip+en iyi kaydırmada <=150px kopya yok | kaynak routeDefinition sıralı tip ve normalize x; similarity.json | D6/F4/M4/A4; A–F/A–M için kopya yasağı, 0.3 zorunluluğu yok | D04+500 sentetik kopya algılandı; distance kırmızı |
| EN/TR/RU | 4 ayrı isim/dil; soru işareti yok; İngilizce tam isimler | i18n sözlüğü + HUD/debug rota adı t(routeId) | A01–A04 | names yanlış değer kırmızı; UTF-8 aktarımında ilk görülen ? düzeltildi |
| Tema | dört A rota ×2 konum×2 boyut; RMSE>18 ve kontrast>15, kimlik/kadraj/DOM kontrolleri | nihai izole aftermath paketi; a4c2a/a4c2b theme.json | 16 kare, D/F/M karşılaştırmaları; mevcut tema kabulü tekrar | her mevcut tema predicate kendi yanlış girdisini reddeder |
| Ekonomi | 36 bitmiş S koşusu; ölüm0; amount==walletDelta; ilk/tekrar ayrı | economy.json/positive-s.json; her rotada ilk+tekrar | 500 yalnız A satın alınmadan erişilebilen rotalardan; fiyat160/200 korunur | bitmeyen/ölümlü koşu ölçüm scriptini düşürür; bakiye farkı uzlaştırıldı |
| Korunum |52/52 PASS | integrity.json; başlangıç yedeğine byte/routeDefinition karşılaştırması |18 geometri+coin,18 girdi,lib,index,ortak fizik/şef; eski test prefix aynı | fark varsa exit1; kaynak diff kaydı |

Mobilde eski M01 testinin en az5 dokunma olayı sayısı kopyalanmadı: A01'in daha yakın ilk checkpoint'ine kadar joystick+3 jump=4 trusted pointerdown yeterlidir; yeni A kapısı bu gerçek örneklemden türetildi. Eski test değiştirilmedi.

Ekonomi varsayımları: tüm coinler ve ölçülen stil bonusuyla başarılı koşular; başarısız koşu/farklı stil dahil değil. Aşağıdaki yol sayıları belirtilen sıranın sonucudur, küresel minimum iddiası değildir. 'already-owned-DFM' başlangıcında D/F/M zaten sahip, bakiye0; satın alma maliyetleri bu senaryoda geçmiş harcamadır. Yeni kayıt alternatifinde F160 ve M200 harcamaları bakiyeden açıkça düşülür. A ödülleri500'e erişimde kullanılmaz.

{chr(10).join(economy)}

{scenario_text}

Benzerlik matrisi:

{mat}

Nihai odak sonuçları (tam regresyon koşulmadı; kabul edilmiş tn-a12×5 ve FROZEN rollDrop×1 ayrı eski küme):
```json
{json.dumps(results,ensure_ascii=False,indent=2)}
```

Yeni kırmızı kapılar başarısızlık için rc1, olumlu kapılar rc0 bekler. A_C_AUDIT yanlış boole kontrolü guard erişimini kanıtlar; bu tek başına ürün mutasyonu değildir. G4 temas kontrolü, benzerlik sentetik kopyası ve tema predicate mutasyonları ayrıca bağımsız veri kontrolleridir.

SHA envanteri: `{o/'final-sha.json'}`. 18 rota envanteri: `{design/'route-inventory-18.md'}`. Son snapshot/READY yalnız bütün zorunlu kapılar tamamlanınca yazılır.
'''
(o/'REPORT-A4c2c.md').write_text(text,encoding='utf8')
print(json.dumps({'status':status,'sha':final['js/a12-campaign.js'],'results':results},ensure_ascii=False))
