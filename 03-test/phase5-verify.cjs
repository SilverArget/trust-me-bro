const assert=require('node:assert/strict');
const {load,source,projection}=require('./phase3-verify.cjs');
const ref=process.argv[2]||'WORKTREE',html=source(ref),game=load(html),base=load(source('4471b66'));
const calls=[];
// Balanced call scan, preserving strings and ternary expressions (no dependencies).
for(const m of html.matchAll(/\bkill\s*\(/g)){
 if(/function\s+$/.test(html.slice(Math.max(0,m.index-12),m.index)))continue;
 let i=m.index+m[0].length,start=i,depth=1,quote='',escape=false;
 for(;i<html.length;i++){const c=html[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue}if(c==='\''||c==='"'||c==='`'){quote=c;continue}if(c==='(')depth++;if(c===')'&&!--depth)break;else if(c!==')'){} }
 calls.push({line:html.slice(0,m.index).split('\n').length,args:html.slice(start,i)});
}
assert(calls.length>20);assert(calls.every(c=>c.args.trim()));
let cases=0;
for(const call of calls){
 const variants=call.args.includes('e.type')?["const e={type:'crate'};","const e={type:'walker'};"]:call.args.startsWith('msg,')?["const msg='Warehouse policy applied.';","const msg='Checkpoint checked you.';","const msg='Trust had overhead costs.';"]:[''];
 for(const prefix of variants){game(`(()=>{${prefix}dead=won=false;spawnGrace=0;lives=10;kill(${call.args});assert(dead);assert.equal(toast,deathToast);assert(toast.length>0);assert.equal(deathDeadline-performance.now(),2500);const expected=toast;toast='later same-frame warning';const texts=[];const orig=ctx.fillText;ctx.fillText=(t)=>texts.push(t);draw();ctx.fillText=orig;assert(texts.includes(expected));assert.equal(toast,expected);kill('second collision');assert.equal(deathToast,expected);})()`);cases++;}
}
const missingMessages=calls.filter(c=>!c.args.trim());
game(`dead=won=false;spawnGrace=0;kill();assert.equal(toast,'Delivery failed. Permanently.');dead=false;spawnGrace=1;kill('protected');assert(!dead);spawnGrace=0;`);
assert.equal(game(projection),base(projection),'Geometries/enemies changed');
const errors=JSON.parse(game('JSON.stringify(validateAllScenes().filter(r=>r.errors.length).map(r=>({scene:r.level+"."+r.part,errors:r.errors})))'));
assert.equal(errors.length,0);
console.log(JSON.stringify({ref,killCallSites:calls.length,messageCases:cases,missingMessages,deathToast:'draw mock: every message rendered despite later toast; 2500ms hold; first death wins',geometryEqual:186,validatorErrors:errors,calls},null,2));
