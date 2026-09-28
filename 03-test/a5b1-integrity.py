from pathlib import Path
import hashlib,json,re,difflib
R=Path(__file__).resolve().parents[1];O=R/'03-test/a5b1-evidence';sha=lambda b:hashlib.sha256(b).hexdigest();rows=[]
for x in json.loads((R/'03-test/a5a1-evidence/baseline.json').read_text()):
 if x['path'] not in ['index.html','js/a12-campaign.js']:rows.append({'name':x['path'],'pass':sha((R/x['path']).read_bytes())==x['sha256']})
s=(R/'index.html').read_text(encoding='utf-8');m=list(re.finditer(r'^(?:async )?function (\w+)\(',s,re.M))
for x in json.loads((R/'03-test/a5a1-evidence/index-protected-functions.json').read_text())['functions']:
 i=next(i for i,v in enumerate(m) if v[1]==x['symbol']);end=m[i+1].start() if i+1<len(m) else len(s);rows.append({'name':x['symbol'],'pass':sha(s[m[i].start():end].encode())==x['sha256']})
a=(O/'pre/js/a12-campaign.js').read_text(encoding='utf-8');b=(R/'js/a12-campaign.js').read_text(encoding='utf-8')
normalized=b[:b.index('  // A5b decorative layer:')]+b[b.index('  // A5 presentation only:'):]
normalized=normalized.replace('drawWorld: drawWorldWithNpcs,','drawWorld: drawWorldIntegrated,')
normalized=normalized.replace('    previewRunnerId = "male",\n    previewMotion = "idle",\n    previewStartedAt = 0,\n','')
def fn(s):
 ms=list(re.finditer(r'^  (?:async )?function (\w+)\(',s,re.M));return {m[1]:s[m.start():ms[i+1].start() if i+1<len(ms) else len(s)] for i,m in enumerate(ms)}
afs,bfs=fn(a),fn(normalized);allowed={'installUI','renderShop','drawShopPreview','openShop','purchaseOrWear'}
for name in afs:
 if name not in allowed:rows.append({'name':'a12:'+name,'pass':afs[name]==bfs.get(name)})
for begin,end in [('  const WORLD_REGISTRY','  let pendingWorldId'),('  const ROUTES','  const CHIEF_SPRITE')]:
 rows.append({'name':begin.strip(),'pass':a[a.index(begin):a.index(end)]==b[b.index(begin):b.index(end)]})
rows.append({'name':'index entire bytes','pass':(O/'pre/index.html').read_bytes()==(R/'index.html').read_bytes()})
for asset in json.loads((R/'sprites/a5/atlas-contract.json').read_text())['assets']:
 data=(R/asset['path']).read_bytes();rows.append({'name':asset['path'],'pass':sha(data)==asset['sha256']})
result={'checks':len(rows),'failed':[x for x in rows if not x['pass']],'rows':rows};(O/'integrity.json').write_text(json.dumps(result,indent=2));(O/'source.diff').write_text(''.join(difflib.unified_diff(a.splitlines(True),b.splitlines(True),fromfile='pre/a12',tofile='a12')),encoding='utf-8');print(json.dumps({'checks':len(rows),'failed':result['failed']}));assert not result['failed']
