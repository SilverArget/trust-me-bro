from pathlib import Path
import hashlib,json,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'03-test/a5a1-evidence'
def sha(b):return hashlib.sha256(b).hexdigest()
rows=[]
for a in json.loads((OUT/'baseline.json').read_text()):rows.append({'name':a['path'],'pass':sha((ROOT/a['path']).read_bytes())==a['sha256']})
s=(ROOT/'index.html').read_text(encoding='utf-8');m=list(re.finditer(r'^(?:async )?function (\w+)\(',s,re.M))
for a in json.loads((OUT/'index-protected-functions.json').read_text())['functions']:
 i=next(i for i,x in enumerate(m) if x[1]==a['symbol']);end=m[i+1].start() if i+1<len(m) else len(s)
 rows.append({'name':a['symbol'],'pass':sha(s[m[i].start():end].encode())==a['sha256']})
result={'checks':len(rows),'failed':[x for x in rows if not x['pass']],'rows':rows}
(OUT/'integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps({'checks':len(rows),'failed':result['failed']}));assert not result['failed']
