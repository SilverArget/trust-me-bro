from pathlib import Path
import subprocess,json,os
r=Path(__file__).resolve().parents[1];o=r/'03-test/a5b1-evidence';m=json.loads((o/'mutations.json').read_text());rows=[]
for name,mutation in m.items():
 env={**os.environ,'NODE_PATH':'C:/Users/Arget/AppData/Roaming/npm/node_modules','A5_MUTATION':name}
 p=subprocess.run(['npx.cmd','--no-install','playwright','test','03-test/a5b-preview.spec.cjs','--workers=1','--reporter=line','-g',mutation['grep']],cwd=r,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=65)
 (o/('negative-'+name+'.log')).write_bytes(p.stdout);text=p.stdout.decode('utf-8',errors='replace');rows.append({'name':name,'rc':p.returncode,'rejected':p.returncode!=0 and '1 failed' in text});print(name,rows[-1]['rejected'],flush=True)
(o/'negative-controls.json').write_text(json.dumps(rows,indent=2));assert all(x['rejected'] for x in rows)
