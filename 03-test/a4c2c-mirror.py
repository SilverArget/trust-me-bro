from pathlib import Path
import shutil,re,json,hashlib
r=Path.cwd();o=r.parent/'01-tasarim/coin-T2/a4c2c-20260928';d=o/'regression/02-kod';d.mkdir(parents=True,exist_ok=True)
for f in r.iterdir():
 if f.is_file():shutil.copy2(f,d/f.name)
for sub in ['js','sprites','03-test/lib','03-test/route-inputs']:
 shutil.copytree(r/sub,d/sub,dirs_exist_ok=True)
for f in (r/'03-test').iterdir():
 if f.is_file():shutil.copy2(f,d/'03-test'/f.name)
for folder in ['coin-T1b1','coin-T2']:
 dest=d.parent/'01-tasarim'/folder;dest.mkdir(parents=True,exist_ok=True)
 for f in (r.parent/'01-tasarim'/folder).iterdir():
  if f.is_file():shutil.copy2(f,dest/f.name)
# Redirect old evidence writes in isolated test code only, without copying historic evidence trees.
changes=[]
for f in list((d/'03-test').glob('*.cjs'))+list((d/'03-test').glob('*run-path.txt')):
 s=f.read_text(encoding='utf-8-sig');old=s
 if f.suffix=='.txt':
  target=o/'regression/evidence'/f.stem;target.mkdir(parents=True,exist_ok=True);s=str(target)
 else:
  s=re.sub(r'E:[/\\\\]+oyunlar[/\\\\]+TrustMeBro[/\\\\]+01-tasarim[/\\\\]+coin-T2[/\\\\]+(a4[b-c][^\s\x27\x22]*)',lambda m:str(o/'regression/evidence'/m[1].replace('\\\\','/').replace('\\','/')).replace('\\','/'),s)
 if s!=old:f.write_text(s,encoding='utf8');changes.append(str(f.relative_to(d)))
# a4b2c has fixed directory computed from relative root, ensure parents.
for name in ['a4b2a-20260928','a4b2b-20260928','a4b2c-20260928','a4c2a-20260928','a4c2c-20260928']:(o/'regression/evidence'/name).mkdir(parents=True,exist_ok=True)
(o/'mirror-provenance.json').write_text(json.dumps({'productSHA':hashlib.sha256((d/'js/a12-campaign.js').read_bytes()).hexdigest(),'redirectedTestFiles':changes},indent=2))
print(d)

old=r.parent/"01-tasarim/coin-T2/a4b2c-20260928-031715"
for id in ["M01","M02","M03","M04"]:
 target=o/"regression/evidence/a4b2c-run-path"/id;target.mkdir(parents=True,exist_ok=True);shutil.copy2(old/id/"g4-pilot.json",target/"g4-pilot.json")
