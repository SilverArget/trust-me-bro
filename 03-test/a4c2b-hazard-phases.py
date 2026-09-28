from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();start=s.index("test('aftermath-hazard-A01-A04-");a=s[:start];b=s[start:]
b=b.replace("await startAftermath(q,id);\n const phases=",'''await startAftermath(q,id);
 if(hazards.some(o=>o.type==='collapse')){
 await q.evaluate(()=>{window.__abHazardOrig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const v=__abHazardOrig(dt);if(__TMB_A12__.getState().collapsing.some(c=>c.state==='CONTACT_WARNING'))throw Error('A_COLLAPSE_PHASE_START');return v;};});
 try{await runAftermath(q,id,{resume:true});}catch(e){if(!String(e).includes('A_COLLAPSE_PHASE_START'))throw e;}
 await q.evaluate(()=>{window.__tmbCampaignStep=window.__abHazardOrig;__tmbParkour.move(0);});
 }
 const phases=''',1)
needle="abCheck(id+' real phases',new Set(phases.map(p=>p.clock)).size,x=>x===20,1);"
replace=needle+"\n if(hazards.some(o=>o.type==='collapse'))abCheck(id+' live collapse phases',new Set(phases.flatMap(p=>p.collapse.map(c=>c.state))).size,x=>x>1,1);\n if(hazards.some(o=>o.type==='containerDoor'))abCheck(id+' live door phases',new Set(phases.flatMap(p=>p.doors.map(d=>d.state))).size,x=>x>2,1);\n if(hazards.some(o=>o.type==='worker'))abCheck(id+' live barrel positions',new Set(phases.flatMap(p=>p.barrels.map(b=>b.x))).size,x=>x>2,1);"
assert needle in b;b=b.replace(needle,replace,1);p.write_bytes((a+b).encode())
