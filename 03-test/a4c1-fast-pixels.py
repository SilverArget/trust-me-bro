from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();a=s.index('// A4c-1:');old=s[:a];n=s[a:]
n=n.replace("Array.from(ctx.getImageData(...r).data)","(()=>{const d=ctx.getImageData(...r).data;let b='';for(let i=0;i<d.length;i+=16384)b+=String.fromCharCode(...d.subarray(i,i+16384));return btoa(b);})()")
n=n.replace('all[world]=m.regions;',"all[world]=Object.fromEntries(Object.entries(m.regions).map(([k,v])=>[k,Buffer.from(v,'base64')]));")
# Include both moving component types, using the original same thresholds.
start=n.index('test("aftermath-moving-platform-visible"');end=n.index('test("aftermath-physics-identical"',start);block=n[start:end]
block=block.replace('  await aftermathScene(page,"D03",2400);','  for(const route of ["D03","D05"]){ await aftermathScene(page,route,2400);')
block=block.replace('test.info().annotations.push({type:"measure",description:JSON.stringify(m)});','test.info().annotations.push({type:"measure",description:JSON.stringify({route,...m})});}')
n=n[:start]+block+n[end:]
p.write_bytes((old+n).encode())
