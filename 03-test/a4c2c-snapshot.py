from pathlib import Path
import json, hashlib, shutil, datetime

r=Path(__file__).resolve().parent.parent
design=r.parent/'01-tasarim/coin-T2';o=design/'a4c2c-20260928'
mirror=design/'post-a4c-mirror';dest=mirror/'02-kod'
assert not mirror.exists(), 'Refuse overwriting an existing snapshot'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
final=json.loads((o/'final-sha.json').read_text())
for f,h in final.items():assert sha(r/f)==h,f
shutil.copytree(r,dest,ignore=shutil.ignore_patterns('.git','test-results*','__pycache__'))
# Include relative fixtures without copying historic pre-mirror trees.
for name in ['coin-T1b1','coin-T2']:
    target=mirror/'01-tasarim'/name;target.mkdir(parents=True,exist_ok=True)
    for f in (r.parent/'01-tasarim'/name).iterdir():
        if f.is_file():shutil.copy2(f,target/f.name)
evidence=mirror/'01-tasarim/coin-T2/evidence';evidence.mkdir()
redirects=[]
for f in (dest/'03-test').glob('*run-path.txt'):
    name=f.stem;target=evidence/name;target.mkdir()
    source=o if name=='a4c2c-run-path' else o/'regression/evidence'/name
    if source.exists():
        for p in source.iterdir():
            if p.is_file():shutil.copy2(p,target/p.name)
        for sub in ['A01','A02','A03','A04','M01','M02','M03','M04','pre']:
            if (source/sub).exists():shutil.copytree(source/sub,target/sub)
    f.write_text(str(target),encoding='utf8');redirects.append(str(f.relative_to(dest)).replace('\\','/'))
# Only evidence path sidecars change; runtime and every test assertion stay identical.
manifest={}
for p in dest.rglob('*'):
    if p.is_file():
        rel=p.relative_to(dest).as_posix();manifest[rel]=sha(p)
        if rel not in redirects:assert manifest[rel]==sha(r/rel),rel
for f,h in final.items():assert manifest[f]==h,f
sprites=[f for f in manifest if f.startswith('sprites/')];assert sprites
for f in ['index.html','js/a12-campaign.js','playgama-bridge.js','soundtrack.mp3','intro.mp4']:assert f in manifest
for name,prefix in [('a4b2c-run-path','M'),('a4c2c-run-path','A')]:
    rows=[]
    for i in range(1,5):rows+=json.loads((evidence/name/f'{prefix}0{i}'/'g4-pilot.json').read_text())
    assert len(rows)==12 and all(x['status']=='PASS' for x in rows)
assert (evidence/'a4c2b-run-path/pre/js/a12-campaign.js').exists()
(mirror/'snapshot-sha256.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
summary={'created':datetime.datetime.now().isoformat(),'files':len(manifest),'sprites':len(sprites),'a12':final['js/a12-campaign.js'],'snapshot':str(dest),'redirectedEvidenceSidecars':redirects,'testCodeIdentical':True,'ready':False}
(mirror/'snapshot-verification.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
(o/'snapshot-verification.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
print(json.dumps(summary))
