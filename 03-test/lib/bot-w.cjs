// Shared S imported for callers needing paired controls; W never invokes the S input core.
const {runBot}=require('./bot-s-drive.cjs');
async function runWalking(page,id){return page.evaluate(id=>{
 __TMB_A12__.renderWorldOnRoute(id[0]==='A'?'aftermath':id[0]==='M'?'magma':id[0]==='F'?'frozen':'dock31',id);__tmbParkour.manual();
 const def=__TMB_A12__.getState().route,origin=70,finish=def.finishX,segments=[],intervals=[],trace=[],coins=new Set();let start=origin;
 while(start<finish&&segments.length<100){
  const initial=__tmbSegmentStart(start),park=__tmbParkour.read();
  if(initial.player.vx!==0||initial.player.vy!==0||!initial.player.onGround||initial.player.y!==455-initial.hitbox.h||park.state!=='normal'||park.timer!==0||initial.frontFlip.active||initial.economy.collectedCoinIds.length||initial.gameClock!==0)throw Error('Bad segment fixture '+id);
  __tmbParkour.move(1);let last=initial,stalled=0,steps=0,reason='step-limit',blocker=null,rangeEnd=start,deathState=null;
  for(;steps<12000;steps++){
   __tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);const s=__TMB_A12__.getState();
   for(const c of s.economy.collectedCoinIds)coins.add(c);
   if(steps%1===0)trace.push({x:s.player.x,y:s.player.y,w:s.hitbox.w,h:s.hitbox.h});
   if(s.deaths>last.deaths||s.dead){reason='death';deathState={player:s.player,chief:s.chief,deaths:s.deaths,dead:s.dead,clock:s.gameClock};break;}
   const a=last.player.x,b=s.player.x;if(Math.abs(b-a)<30&&b!==a)intervals.push([Math.max(origin,Math.min(a,b)),Math.min(finish,Math.max(a,b))]);rangeEnd=Math.max(rangeEnd,b);
   stalled=Math.abs(b-a)<.05?stalled+1:0;last=s;
   if(s.result||b>=finish){reason='finish';break;}
   if(stalled>=30&&s.player.onGround){reason='blocked';break;}
  }
  const p=last.player;blocker=def.obstacles.filter(o=>o.x+o.w>=p.x-2&&o.x<=p.x+last.hitbox.w+100).sort((a,b)=>Math.abs(a.x-(p.x+last.hitbox.w))-Math.abs(b.x-(p.x+last.hitbox.w)))[0];
  if(reason==='step-limit'||reason==='death') {
   const moving=def.obstacles.filter(o=>o.minX!==undefined&&o.maxX!==undefined&&p.x+last.hitbox.w>=o.minX&&p.x<=o.maxX+o.w).sort((a,b)=>a.maxX+a.w-b.maxX-b.w)[0];
   if(moving){blocker=moving;if(reason==='step-limit')reason='impassable-moving-step-limit';}
  }
  const next=blocker?(blocker.maxX??blocker.x)+blocker.w+4:null;
  segments.push({startX:start,endX:p.x,walkedMax:rangeEnd,stopReason:reason,steps:Math.min(steps+1,12000),maxSteps:12000,deathState,endPlayer:last.player,blocker:blocker?.id,nextX:next,coinIds:[...last.economy.collectedCoinIds],initial:{player:initial.player,parkour:park,frontFlip:initial.frontFlip,gameClock:initial.gameClock}});
  if(reason==='finish')break;if(!next||next<=start){segments.at(-1).unresolved=true;break;}start=next;
 }
 intervals.sort((a,b)=>a[0]-b[0]);const union=[];for(const i of intervals){if(i[1]<=i[0])continue;const prev=union.at(-1);if(prev&&i[0]<=prev[1]+1e-6)prev[1]=Math.max(prev[1],i[1]);else union.push([...i]);}
 const walked=union.reduce((s,[a,b])=>s+b-a,0),reach=def.coins.map(c=>{
  const region=[Math.max(0,c.x-100),Math.min(finish,c.x+100)], parts=union.map(([a,b])=>[Math.max(a,region[0]),Math.min(b,region[1])]).filter(([a,b])=>b>a);
  const covered=parts.reduce((n,[a,b])=>n+b-a,0),missing=[];let cursor=region[0];for(const [a,b] of parts){if(a>cursor+1e-6)missing.push([cursor,a]);cursor=Math.max(cursor,b);}if(cursor<region[1]-1e-6)missing.push([cursor,region[1]]);
  return {id:c.id,region,walkedPx:covered,coverage:covered/(region[1]-region[0]),visited:missing.length===0,missing,status:missing.length?'W ?l??lemedi':'measured'};
 });
 const excluded=def.obstacles.filter(o=>['vault','slide','wall','wallRun'].includes(o.parkour||o.type)||o.minX!==undefined||segments.some(s=>s.blocker===o.id)).map(o=>({id:o.id,range:[Math.max(0,o.minX??o.x),Math.min(finish,(o.maxX??o.x)+o.w+4)]}));
 const ex=[];for(const {range:i} of excluded.sort((a,b)=>a.range[0]-b.range[0])){const prev=ex.at(-1);if(prev&&i[0]<=prev[1])prev[1]=Math.max(prev[1],i[1]);else ex.push([...i]);}
 const eligible=[];let cursor=0;for(const [a,b] of ex){if(a>cursor)eligible.push([cursor,a]);cursor=Math.max(cursor,b);}if(cursor<finish)eligible.push([cursor,finish]);
 const denominator=eligible.reduce((s,[a,b])=>s+b-a,0),eligibleWalked=eligible.reduce((s,[a,b])=>s+union.reduce((n,[c,d])=>n+Math.max(0,Math.min(b,d)-Math.max(a,c)),0),0);
 return {id,origin,finish,walked,trace,rawCoverage:walked/finish,excluded,excludedUnion:ex,eligible,denominator,eligibleWalked,coverage:eligibleWalked/denominator,segments,union,coinIds:[...coins],coinAccess:reach,obstacleInteriors:def.obstacles.map(o=>({id:o.id,range:[o.x,o.x+o.w]})),complete:segments.at(-1)?.stopReason==='finish'};
},id);}
module.exports={runWalking,runBot};
