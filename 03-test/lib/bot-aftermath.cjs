const {runBot}=require('./bot-s-drive.cjs');
async function startAftermath(page,id){
 if(!/^A0[1-4]$/.test(id))throw Error('Unimplemented AFTERMATH route '+id);
 return page.evaluate(async id=>{__tmbParkour.manual();const a=__TMB_A12__;
  if(!a.profile().ownedWorldIds.includes('aftermath')){await a.setWallet(500);await a.purchaseWorld('aftermath');}
  a.renderWorldOnRoute('aftermath',id);
  const s=a.getState();if(s.world.selectedWorldId!=='aftermath'||s.routeId!==id||!a.profile().ownedWorldIds.includes('aftermath'))throw Error('AFTERMATH route/ownership mismatch');return {world:s.world.selectedWorldId,routeId:s.routeId,coins:s.route.coins.length};
 },id);
}
async function runAftermath(page,id,options={}){if(!options.resume)await startAftermath(page,id);return runBot(page,id,{...options,resume:true});}
module.exports={startAftermath,runAftermath};
