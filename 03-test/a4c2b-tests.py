from pathlib import Path
import json,re
p=Path('js/a12-campaign.js');s=p.read_bytes().decode()
for id in ['A03','A04']:
 pat=r'"'+id+r'":(\{.*?),"coins":makeCoins\("'+id+r'",COINS\.'+id+r'\)\},'
 match=re.search(pat,s);d=json.loads(match[1]+'}')
 for o in d['obstacles']:
  if o['type']=='containerDoor':o.pop('closedY',None);o.update(y=385,h=70,openY=250,prepare=1,close=.65,closed=80,open=4)
  if o['type']=='overpass':o['y']=370
 replacement='"'+id+'":'+json.dumps(d)[:-1]+',"coins":makeCoins("'+id+'",COINS.'+id+')},'
 s=s[:match.start()]+replacement+s[match.end():]
p.write_bytes(s.encode())
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();tail=s[s.index("for(const id of ['A01','A02'])test('aftermath-"):s.index('// A4c-2a route-specific')];tail=tail.replace("['A01','A02']","['A03','A04']").replace('aftermath-A02-carriers','aftermath-A04-carriers').replace("'a02-m-01','a02-m-07','a02-m-12'","'a04-m-04','a04-m-09'").replace("q,'A02'","q,'A04'").replace("r.route==='A02'","r.route==='A04'")
theme=s[s.index("test('aftermath-A01-A02-route-theme-and-frames'"):].replace('A01','A03').replace('A02','A04').replace('a4c2a','a4c2b').replace('aOut','abOut').replace('aCheck','abCheck')
s+='\r\n// A4c-2b independent route gates\r\nconst abOut=fs.readFileSync(path.join(__dirname,"a4c2b-run-path.txt"),"utf8").trim();\r\nfunction abCheck(name,value,predicate,bad){aftermathCheck("A4c2b "+name,value,predicate,bad);}\r\n'+tail+theme
p.write_bytes(s.encode())

