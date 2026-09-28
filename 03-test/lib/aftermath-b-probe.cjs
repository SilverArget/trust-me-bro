const {prepareAftermathPage}=require('./aftermath-probe.cjs');
async function prepareAftermathB(browser,url){
 const page=await prepareAftermathPage(browser,url);
 await page.evaluate(()=>{
  const step=__tmbCampaignStep;window.__mb={landings:[],doors:{},barrels:0,crossings:[],flipPhases:[],checkpoint:0};
  window.__tmbCampaignStep=dt=>{
   const before=__TMB_A12__.getState(),v=step(dt),s=__TMB_A12__.getState(),p=s.player;
   if(s.frontFlip.active&&!__mb.flipPhases.includes(s.frontFlip.phase))__mb.flipPhases.push(s.frontFlip.phase);
   if(before.frontFlip.active&&!s.frontFlip.active&&p.onGround)__mb.landings.push({x:p.x,y:p.y,w:s.hitbox.w,h:s.hitbox.h,t:s.gameClock});
   __mb.barrels=Math.max(__mb.barrels,s.barrels.length);__mb.checkpoint=s.checkpointX;
   for(const d of s.containerDoors){(__mb.doors[d.id]||=[]);if(!__mb.doors[d.id].includes(d.state))__mb.doors[d.id].push(d.state);if(before.player.x<=d.x+d.w&&p.x>d.x+d.w)__mb.crossings.push({id:d.id,state:d.state,pushes:d.pushes,x:p.x,bottom:p.y+s.hitbox.h,doorTop:d.y});}
   return v;
  };
 });return page;
}
async function idle(page,seconds){await page.evaluate(seconds=>{__tmbParkour.manual();__tmbParkour.move(0);for(let i=0;i<Math.round(seconds*60);i++){__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);}},seconds);}
module.exports={prepareAftermathB,idle};
