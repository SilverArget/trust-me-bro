const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {load,source}=require('./phase3-verify.cjs');
const html=source('WORKTREE'),bot=fs.readFileSync(path.join(__dirname,'parkour-bot.spec.cjs'),'utf8').split('const bot=String.raw`')[1].split('`;')[0];
const plans=JSON.parse(fs.readFileSync(path.join(__dirname,'parkour-plans.json'),'utf8'));
// S26.2 route from the Tur 6a verified replay; revalidated below against unchanged v64.
plans.find(r=>r.level===26&&r.part===2).plan=[0,0,0,0,2,2,1,1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const blind=fs.readFileSync(path.join(__dirname,'parkour-blind.spec.cjs'),'utf8').split('p(`')[1].split('`));')[0];
const results=[];
for(const [name,lead,boost] of [['baseline',320,1],['a',220,1],['b',320,1.5],['a+b',220,1.5]]){
 let candidate=html.replace('CHIEF_LEAD_PX=320','CHIEF_LEAD_PX='+lead);
 if(boost!==1){candidate=candidate.replace('CHIEF_RESPAWN_MS=820;','CHIEF_RESPAWN_MS=820,CHIEF_STUN_BOOST=1.5;').replace('c.x+=c.speed*dt;',`const blocked=player.onGround&&Math.abs(player.vx)<.01&&(keys.right||keys.left)&&solidRects().some(s=>s.parkour&&player.y+player.h>s.y&&player.y<s.y+s.h&&(keys.right&&Math.abs(player.x+player.w-s.x)<.01||keys.left&&Math.abs(player.x-s.x-s.w)<.01));c.x+=c.speed*dt*((parkour.state==='stun'||blocked)?CHIEF_STUN_BOOST:1);`);}
 const p=load(candidate);p('bgm.pause=()=>{}');p(bot);const informed=[];
 for(const row of plans)for(let run=1;run<=5;run++)informed.push(JSON.parse(p(`JSON.stringify(parkourBot(${row.level},${row.part},60,false,48,${JSON.stringify(row.plan)}))`)));
 const b=load(candidate);b('bgm.pause=()=>{}');const blindRows=JSON.parse(b(blind));
 const q=load(candidate);q('bgm.pause=()=>{}');q(bot);q(`globalThis.baseUpdate=update;globalThis.waitEvents=[];globalThis.waitSeen=new Set();update=function(dt){baseUpdate(dt);const kind=rt.mind?.stage===1?'mind':rt.mind?.stage===4&&rt.mind.finishFlash>0?'finish':rt.warning>0?'warning':null;if(!kind||dead)return;const k=currentLevel+'.'+currentPart+':'+kind;if(waitSeen.has(k))return;waitSeen.add(k);const seconds=kind==='mind'?rt.mind.timer:kind==='finish'?rt.mind.finishFlash:rt.warning;waitEvents.push({level:currentLevel,part:currentPart,kind,seconds});const inputs={...keys};keys.left=keys.right=keys.jump=false;for(let t=0;t<seconds&&!dead;t+=dt)baseUpdate(Math.min(dt,seconds-t));Object.assign(keys,inputs);};`);
 const waiting=[];for(const row of plans){q('waitEvents=[];waitSeen=new Set()');waiting.push(JSON.parse(q(`JSON.stringify(parkourBot(${row.level},${row.part},60,false,48,${JSON.stringify(row.plan)}))`)));}
 const summary={name,lead,boost,informedPass:informed.filter(r=>r.clear&&!r.dead&&r.used).length,informedTotal:informed.length,blindTotal:blindRows.length,blindDeaths:blindRows.filter(r=>r.dead).length,blindCatches:blindRows.reduce((n,r)=>n+r.catches,0),waitingCatches:waiting.reduce((n,r)=>n+r.catches,0),waitingDeaths:waiting.filter(r=>r.dead&&!r.catches).length,waitingCaughtSegments:waiting.filter(r=>r.catches).map(r=>r.level+'.'+r.part)};
 const compact=rows=>rows.map(({plan,...r})=>r);results.push({summary,informed:compact(informed),blind:blindRows,waiting:compact(waiting)});
 fs.writeFileSync(path.join(__dirname,'TUR6B1-CHIEF-MEASUREMENTS.json'),JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(html).digest('hex'),results},null,2));console.log(JSON.stringify(summary));
}
