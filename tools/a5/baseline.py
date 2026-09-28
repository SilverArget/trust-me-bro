from pathlib import Path
import hashlib,json,re,shutil,datetime
root=Path(__file__).resolve().parents[2]
out=root/'03-test/a5a1-evidence'
pre=root.parent/'01-tasarim/a5/pre-a5a1'
assert not pre.exists(), 'Backup exists; do not overwrite'
files=[root/'index.html',root/'js/a12-campaign.js',root/'03-test/tn-a4.spec.cjs',root/'03-test/t2-coins.spec.cjs']
files+=list((root/'03-test/lib').glob('*'))+list((root/'03-test/route-inputs').glob('*.json'))
rows=[]
for p in files:
 if not p.is_file():continue
 rel=p.relative_to(root); dest=pre/rel; dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
 rows.append({'path':rel.as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(out/'baseline.json').write_text(json.dumps(rows,indent=2))
s=(root/'index.html').read_text(encoding='utf-8')
# Conservative function blocks extend through declarations/listeners up to the next named function.
m=list(re.finditer(r'^(?:async )?function (\w+)\(',s,re.M))
names='gameInput clearInputs solidSurfaces solidRects parkourBody parkourClear parkourStand parkourCancel parkourPoint parkourSweep parkourChoose parkourTick parkourLanded doPhysics campaignWallAssist updateDispatch setJoystickXY releaseJoy jumpPress jumpRelease kill updateChief resetChief'.split()
guards=[]
for name in names:
 i=next(i for i,x in enumerate(m) if x[1]==name);start=m[i].start();end=m[i+1].start() if i+1<len(m) else len(s)
 guards.append({'symbol':name,'startLine':s[:start].count('\n')+1,'endLine':s[:end].count('\n'),'sha256':hashlib.sha256(s[start:end].encode()).hexdigest()})
(out/'index-protected-functions.json').write_text(json.dumps({'extraction':'UTF-8 LF-normalized; function start through next named function; includes intervening listeners/declarations','functions':guards},indent=2))
(root/'03-test/TN-A5-PROGRESS.md').write_text('# A5 progress\n\n## A5a1\n'+datetime.datetime.now().isoformat()+'\n\nScope: contract + reproducible placeholder production. Runtime integration and purchase/migration acceptance deferred to A5a2 (PAL 8).\nBudget: 5 min baseline/contract, 7 min generation + file matrix/negative controls, 10 min focused preservation gates, 3 min report. Hard limit 25 min.\nTests: asset matrix (all frames), reproducibility, deliberate malformed asset rejection, index/function and D/F/M/A input baseline hashes; parkour-tur1, tn-a12, t1b-bot-s, tn-a4 -g world, t2-coins static. No full regression.\n',encoding='utf-8')
print('Baseline files',len(rows),'protected function blocks',len(guards))
