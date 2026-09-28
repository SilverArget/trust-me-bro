from pathlib import Path
import shutil
r=Path.cwd();o=r.parent/'01-tasarim/a4c1-20260928';d=o/'regression/02-kod'
shutil.copytree(r,d,ignore=shutil.ignore_patterns('.git','test-results*','results-*','graphify-out','tn-a4-shots','__pycache__'),dirs_exist_ok=True)
shutil.copytree(r.parent/'01-tasarim/coin-T1b1',o/'regression/01-tasarim/coin-T1b1',dirs_exist_ok=True)
q=o/'regression/01-tasarim/coin-T2';q.mkdir(exist_ok=True);shutil.copy2(r.parent/'01-tasarim/coin-T2/m-manifest.json',q/'m-manifest.json')
print(d)
