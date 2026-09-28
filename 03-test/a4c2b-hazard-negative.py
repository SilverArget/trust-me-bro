from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();needle='h:land.h};for(const phase of phases)';replace='h:land.h};if(process.env.A_HAZARD_RED){const h=hazards.find(o=>o.type==="collapse");zone.x=h.x;zone.y=h.y;zone.w=h.w;zone.h=h.h;}for(const phase of phases)';assert needle in s;s=s.replace(needle,replace);p.write_bytes(s.encode())
