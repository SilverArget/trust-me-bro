const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=fs.readFileSync(path.join(__dirname,'a4b2b-run-path.txt'),'utf8').trim(),baseline=path.join(out,'baseline/02-kod');
const read=(r,f)=>fs.readFileSync(path.join(r,f),'utf8');const src=read(root,'js/a12-campaign.js'),old=read(baseline,'js/a12-campaign.js');
const routes=s=>vm.runInNewContext(s.slice(s.indexOf('  function range('),s.indexOf('  function drawCoin('))+s.slice(s.indexOf('  const COINS ='),s.indexOf('  const CHIEF_SPRITE'))+'\nJSON.stringify(ROUTES)');
const a=JSON.parse(routes(src)),b=JSON.parse(routes(old)),checks=[];const check=(name,pass)=>{checks.push({name,pass});assert(pass,name);};
for(const id of Object.keys(b))check(id+' complete route/coins/checkpoints unchanged',JSON.stringify(a[id])===JSON.stringify(b[id]));
for(const f of ['index.html','03-test/lib/bot-s-drive.cjs','03-test/lib/bot-w.cjs','03-test/lib/magma-probe.cjs','03-test/t2-b-dynamic.cjs','03-test/parkour-tur1.spec.cjs','03-test/tn-a12.spec.cjs','03-test/t1b-bot-s.spec.cjs',...Object.keys(b).map(id=>'03-test/route-inputs/'+id+'.json')])check(f+' bytes',fs.readFileSync(path.join(root,f)).equals(fs.readFileSync(path.join(baseline,f))));
for(const [start,end] of [['  function beforePhysicsIntegrated(','  function rr('],['  function routeSurfaces(','  function freshRun('],['  function routeUnlocked(','  function startRoute('],['  function drawBackgroundIntegrated(','  function init(']]){
 check(start+' code unchanged',src.slice(src.indexOf(start),src.indexOf(end,src.indexOf(start)))===old.slice(old.indexOf(start),old.indexOf(end,old.indexOf(start))));
}
for(const f of ['03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs'])check(f+' old prefix unchanged',read(root,f).startsWith(read(baseline,f)));
const sha={};for(const f of ['index.html','js/a12-campaign.js','03-test/tn-a4.spec.cjs','03-test/t2-coins.spec.cjs','03-test/lib/bot-s-drive.cjs','03-test/lib/bot-magma.cjs','03-test/lib/magma-b-probe.cjs',...Object.keys(a).filter(id=>id.startsWith('M')).map(id=>'03-test/route-inputs/'+id+'.json')])sha[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
check('manifest bytes unchanged',fs.readFileSync(path.join(out,'m-manifest.json')).equals(fs.readFileSync(path.resolve(root,'../01-tasarim/coin-T2/m-manifest.json'))));
fs.writeFileSync(path.join(out,'integrity-b.json'),JSON.stringify(checks,null,2));fs.writeFileSync(path.join(out,'final-sha.json'),JSON.stringify(sha,null,2));console.log(JSON.stringify({checks:checks.length,pass:checks.every(c=>c.pass),sha},null,2));
