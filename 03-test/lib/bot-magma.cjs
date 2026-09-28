const {runBot}=require('./bot-s-drive.cjs');
async function startMagma(page,id){
 if(!/^M0[1-4]$/.test(id))throw Error('Unimplemented MAGMA route '+id);
 return page.evaluate(async id=>{__tmbParkour.manual();const a=__TMB_A12__;
  if(!a.profile().ownedWorldIds.includes('magma')){await a.setWallet(200);await a.purchaseWorld('magma');}
  a.renderWorldOnRoute('magma',id);
  const s=a.getState();if(s.world.selectedWorldId!=='magma'||s.routeId!==id||!a.profile().ownedWorldIds.includes('magma'))throw Error('MAGMA route/ownership mismatch');return {world:s.world.selectedWorldId,routeId:s.routeId,coins:s.route.coins.length};
 },id);
}
async function runMagma(page,id,options={}){if(!options.resume)await startMagma(page,id);return runBot(page,id,{...options,resume:true});}
module.exports={startMagma,runMagma};
