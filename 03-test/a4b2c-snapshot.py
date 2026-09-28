from pathlib import Path
import hashlib,json,shutil,struct,datetime
r=Path(__file__).resolve().parent.parent;design=r.parent/'01-tasarim/coin-T2';o=Path((r/'03-test/a4b2c-run-path.txt').read_text(encoding='utf-8-sig').strip());mirror=design/'post-a4b-mirror';dest=mirror/'02-kod'
assert not mirror.exists(),'Refuse overwriting existing snapshot'
sha=json.loads((o/'final-sha.json').read_text())
for f,h in sha.items():assert hashlib.sha256((r/f).read_bytes()).hexdigest()==h,f
shots=[]
for id in ['M01','M02','M03','M04']:
 for pos in ['start','obstacle']:
  for wh in [(1280,720),(390,844)]:
   name=f'{id}-{pos}-{wh[0]}x{wh[1]}.png';p=o/'final/02-kod/03-test/tn-a4-shots'/name;raw=p.read_bytes();assert struct.unpack('>II',raw[16:24])==wh,name;shutil.copy2(p,r/'03-test/tn-a4-shots'/name);shots.append({'name':name,'dimensions':wh,'sha256':hashlib.sha256(raw).hexdigest()})
(o/'shots-final.json').write_text(json.dumps(shots,indent=2),encoding='utf8')
shutil.copytree(r,dest,ignore=shutil.ignore_patterns('.git','test-results*','results-*','__pycache__'))
shutil.copytree(r.parent/'01-tasarim/coin-T1b1',mirror/'01-tasarim/coin-T1b1')
support=mirror/'01-tasarim/coin-T2';support.mkdir(parents=True,exist_ok=True);shutil.copy2(design/'m-manifest.json',support/'m-manifest.json')
evidence=support/'a4b2c-evidence';evidence.mkdir()
for p in o.iterdir():
 if p.is_file():shutil.copy2(p,evidence/p.name)
for id in ['M01','M02','M03','M04']:shutil.copytree(o/id,evidence/id)
manifest={}
for p in dest.rglob('*'):
 if p.is_file():
  f=p.relative_to(dest).as_posix();h=hashlib.sha256(p.read_bytes()).hexdigest();assert h==hashlib.sha256((r/f).read_bytes()).hexdigest(),f;manifest[f]=h
for f,h in sha.items():assert manifest[f]==h,f
sprites=[f for f in manifest if f.startswith('sprites/')];assert sprites,'Runtime sprites missing'
for f in ['index.html','js/a12-campaign.js','playgama-bridge.js','soundtrack.mp3','intro.mp4']:assert f in manifest,f
(mirror/'snapshot-sha256.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
summary={'files':len(manifest),'sprites':len(sprites),'png':len(shots),'a12':sha['js/a12-campaign.js'],'snapshot':str(dest),'verified':datetime.datetime.now().isoformat()};(o/'snapshot-verification.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
ready=f'''READY-post-A4b - {datetime.datetime.now().isoformat()}
A4b-2c PASS. Six accepted old failures remain (tn-a12 x5; frozen rollDrop x1).
Snapshot: {dest}
SHA256 a12: {sha['js/a12-campaign.js']}
Verified {len(manifest)} files byte-for-byte, including {len(sprites)} runtime sprite files; 16 PNG dimensions/hashes verified.
Manifest: {mirror/'snapshot-sha256.json'}
Evidence copy: {evidence}
Source evidence: {o}
Report: {dest/'03-test/TN-A4-REPORT.md'}
Final scoped results: magma36PASS+1skip; core44PASS+5oldFAIL; frozen12PASS+6skip+1oldFAIL; world11PASS; t2-coins7PASS. G4x12 PASS; mobile trusted touch PASS; similarity14x14 PASS; economy28 completed runs/death0.
Full regression NOT run by this agent. The main session can run it here:

Set-Location -LiteralPath '{dest}'
$env:NODE_PATH='C:/Users/Arget/AppData/Roaming/npm/node_modules'
$env:M_C_OUT='{evidence}'
$env:M_B_OUT='{evidence}'
$env:T2_OUT='{evidence}'
Remove-Item Env:M_RED,Env:M_C_RED,Env:M_C_AUDIT -ErrorAction SilentlyContinue
npx.cmd --no-install playwright test --workers=1 --reporter=line

coin-T1b1 fixtures and coin-T2/m-manifest.json included in mirror parent to preserve relative fixture paths. No browser/media was opened for preview. No commit/push/install/paid/deployment action.
'''
# READY is written only after source/mirror/required runtime hashes all agree.
(design/'READY-post-a4b.txt').write_text(ready,encoding='utf8');(mirror/'READY-post-a4b.txt').write_text(ready,encoding='utf8')
print(json.dumps(summary))
