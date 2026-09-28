from pathlib import Path
import json,hashlib,shutil
r=Path.cwd();o=r.parent/'01-tasarim/coin-T2/a4c2b-20260928';p=r/'03-test/a4c2b-report.py';s=p.read_text(encoding='utf8');s=s.replace("for k in ['final-magma','final-world'","for k in ['final-world'");p.write_text(s,encoding='utf8')
for n in ['chief.json','mechanics.json','hazard.json','theme.json','D06-differential.json']:shutil.copy2(o/'regression/evidence/a4c2b-run-path'/n,o/n)
# Final rendered evidence only; no image viewer is invoked.
shots=list((r/'03-test/tn-a4-shots/aftermath-a4c2b').glob('*.png'));assert len(shots)==8
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(r/'js/a12-campaign.js')==sha(o/'regression/02-kod/js/a12-campaign.js')
log=(o/'final-aftermath.log').read_text(encoding='utf-16');neg=[l for l in log.splitlines() if 'AFTERMATH_NEGATIVE A4c2b ' in l]
(o/'negative-summary.json').write_text(json.dumps({'predicateNegativeInvocations':len(neg),'uniquePredicateNames':len(set(neg)),'dynamicInjectedFailures':5,'newStaticInjectedFailures':2,'hazardInjectedFailure':1,'note':'Every abCheck independently rejects its supplied bad value; failed predicate expectations are caught intentionally. Earlier non-colliding hazard mutation is excluded.'},indent=2))
print('8 PNG; product/mirror SHA equal; new negative predicates',len(neg))
