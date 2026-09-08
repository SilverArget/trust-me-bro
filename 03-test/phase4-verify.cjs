// Usage: node 03-test/phase4-verify.cjs WORKTREE|git-ref [--summary]
// Full JSON reports all 310 pairs. Pending pairs are measured, not gated.
// Rise overlap = intersection / union; zero-width identical ranges = 1.
// X distance pairs sorted solid-surface centers up to the shorter list; count difference is separate.
﻿const fs=require('node:fs'),assert=require('node:assert/strict');
const {load,source,projection}=require('./phase3-verify.cjs');
const ref=process.argv[2]||'WORKTREE',base=load(source('6124922')),game=load(source(ref));
const active=JSON.parse(game('JSON.stringify(ACTIVE_PART_TEMPLATES)'));
const rows=JSON.parse(game(projection)),old=JSON.parse(base(projection));
const stats=`JSON.stringify(Array.from({length:31},(_,l)=>[1,2,3,5,6].map(p=>{const g=buildScene(l+1,p),s=solidSurfaces(g.surfaces),r=s.filter(s=>s.kind==='platform').map(s=>GROUND-s.y);return{level:l+1,part:p,count:s.length,rise:[Math.min(...r),Math.max(...r)],centers:s.map(s=>s.x+s.w/2).sort((a,b)=>a-b)}})).flat())`;
function pairs(data){const out=[];for(let l=1;l<=31;l++){const a=data.filter(s=>s.level===l);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const x=a[i],y=a[j],union=Math.max(x.rise[1],y.rise[1])-Math.min(x.rise[0],y.rise[0]),intersection=Math.max(0,Math.min(x.rise[1],y.rise[1])-Math.max(x.rise[0],y.rise[0])),overlap=union?intersection/union:Number(x.rise[0]===y.rise[0]),n=Math.min(x.count,y.count),dx=x.centers.slice(0,n).reduce((sum,v,k)=>sum+Math.abs(v-y.centers[k]),0)/n,diff=Math.abs(x.count-y.count),pass=dx>=150||diff>=3||overlap<=.5;out.push({scene:l,parts:[x.part,y.part],counts:[x.count,y.count],rise:[x.rise,y.rise],overlap,meanX:dx,countDifference:diff,pass,status:active.includes(x.part)&&active.includes(y.part)?'required':'pending'})}}return out}
const all=pairs(JSON.parse(game(stats))),required=all.filter(r=>r.status==='required'),errors=JSON.parse(game('JSON.stringify(validateAllScenes().filter(r=>r.errors.length).map(r=>({scene:r.level+"."+r.part,errors:r.errors})))'));
const air=rows.filter(r=>r.scene.endsWith('.4')).filter(r=>JSON.stringify(r)!==JSON.stringify(old.find(o=>o.scene===r.scene)));
const theme=`JSON.stringify({regions:REGIONS,scenes:SCENES,archetypes:Object.fromEntries(Object.entries(SCENE_ARCHETYPES).map(([k,v])=>[k,[...v]]))})`;
const protectedFunctions=['validateScene','enemyValidationErrors','updateRageLayer','kill','ragePatterns'];
for(const f of protectedFunctions)assert.equal(game(f+'.toString()').replace(/\r\n/g,'\n'),base(f+'.toString()').replace(/\r\n/g,'\n'),'Protected function changed: '+f);
for(let l=1;l<=31;l++)assert.equal(game('JSON.stringify(selectLaunchPads('+l+',4))'),base('JSON.stringify(selectLaunchPads('+l+',4))'),'Part4 pads changed: '+l);
assert.deepEqual(active,[1,2,3,5,6].slice(0,active.length));
for(const p of active)assert.equal(game('buildScene(1,'+p+').templateMode'),'target');
const report={ref,active,protectedFunctions:'unchanged',part4PadsEqual:31,previousReportedBaselineMeanX:24,measured:all.length,required:required.length,passed:required.filter(r=>r.pass).length,pending:all.length-required.length,validatorErrors:errors,part4Equal:31-air.length,themeEqual:game(theme)===base(theme),baseline12_13:pairs(JSON.parse(base(stats))).find(r=>r.scene===1&&r.parts.join()=='2,3'),current12_13:all.find(r=>r.scene===1&&r.parts.join()=='2,3'),fallbacks:[],failedPairs:required.filter(r=>!r.pass).map(r=>r.scene+':'+r.parts.join('-')),pairs:all};
console.log(JSON.stringify({...report,pairs:process.argv.includes('--summary')?undefined:all},null,2));
assert.equal(all.length,310);assert.equal(report.passed,required.length);assert.equal(errors.length,0);assert.equal(air.length,0);assert(report.themeEqual);
