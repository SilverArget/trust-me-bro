from pathlib import Path
p=Path('03-test/tn-a4.spec.cjs');s=p.read_bytes().decode();old="await page.evaluate(()=>{__TMB_A12__.renderWorldOnRoute('aftermath','A03');__TMB_A12__.finish();});";new="await page.evaluate(()=>{for(const id of ['A01','A02','A03']){__TMB_A12__.renderWorldOnRoute('aftermath',id);__TMB_A12__.finish();}});";assert old in s;s=s.replace(old,new);p.write_bytes(s.encode())
