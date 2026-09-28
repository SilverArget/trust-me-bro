from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();a=s.index('// A4c-1:');old=s[:a];n=s[a:];n=n.replace("s.route.obstacles.find(o=>o.type==='vault');","s.route.obstacles.find(o=>o.type==='vault'&&o.x>=__tmb.cam&&o.x<__tmb.cam+l.W);")
n=n.replace("if(route!=='D01')aftermathCheck('shot target in frame'","aftermathCheck('shot target in frame'")
n=n.replace('const v=fit(all[world][region],all.aftermath[region]);aftermathCheck',"const v=fit(all[world][region],all.aftermath[region]);console.log('AFTERMATH_ROI',route,world,region,v);aftermathCheck")
p.write_bytes((old+n).encode())
