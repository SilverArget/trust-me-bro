const {test,expect}=require('playwright/test');
const fs=require('fs'),http=require('http'),path=require('path');
let server,base;

const bridgeMock=`
window.__bridgeMessages=[];window.__bridgeEvents={};window.__hidden=false;
Object.defineProperty(Document.prototype,'hidden',{configurable:true,get:()=>window.__hidden});
window.bridge={
 EVENT_NAME:{PAUSE_STATE_CHANGED:'pause',AUDIO_STATE_CHANGED:'audio',INTERSTITIAL_STATE_CHANGED:'interstitial',REWARDED_STATE_CHANGED:'rewarded'},
 initialize:async()=>{},storage:{get:async()=>[''],set:async()=>{}},
 platform:{language:'en',isAudioEnabled:true,on:(name,cb)=>{(window.__bridgeEvents[name]??=[]).push(cb)},sendMessage:(name,data)=>window.__bridgeMessages.push({name,data})},
 advertisement:{isInterstitialSupported:false,isRewardedSupported:false,on:()=>{},showInterstitial:()=>{},showRewarded:()=>{}}
};
window.__setHidden=value=>{window.__hidden=value;document.dispatchEvent(new Event('visibilitychange'))};
`;

test.beforeAll(async()=>{server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://local').pathname.slice(1)||'index.html';if(rel==='playgama-bridge.js'){res.setHeader('Content-Type','text/javascript');return res.end(bridgeMock)}fs.readFile(path.join(__dirname,'..',rel),(e,b)=>{res.statusCode=e?404:200;res.end(e?'missing':b)})});await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`});
test.afterAll(async()=>{await new Promise(r=>server.close(r))});

test('Bridge v2 gameplay lifecycle is ordered and deduplicated',async({page})=>{
 await page.goto(base+'/#debug');
 await page.waitForFunction(()=>window.__tmb&&window.__tmb.platform.initialized);
 await page.evaluate(()=>document.querySelector('.characterChoice').click());
 await page.waitForFunction(()=>window.__bridgeMessages.some(m=>m.name==='level_started'));
 await page.evaluate(()=>{__setHidden(true);__setHidden(true)});
 await page.waitForTimeout(260);
 await page.evaluate(()=>{__setHidden(false);__setHidden(false)});
 await page.waitForFunction(()=>window.__bridgeMessages.some(m=>m.name==='level_resumed'));
 await page.evaluate(()=>{__tmbGateTestSetup(1,1,true);for(let i=0;i<5;i++)__tmbGateTestStep(.1);__tmbGateTestReach();for(let i=0;i<8;i++)__tmbGateTestStep(.1)});
 const messages=await page.evaluate(()=>window.__bridgeMessages.filter(m=>m.name.startsWith('level_')));
 expect(messages.map(m=>m.name)).toEqual(['level_started','level_paused','level_resumed','level_completed','level_started']);
 expect(messages.filter(m=>m.name==='level_paused')).toHaveLength(1);
 expect(messages.filter(m=>m.name==='level_resumed')).toHaveLength(1);
 expect(messages.filter(m=>m.name==='level_completed')).toHaveLength(1);
 expect(messages[0].data).toEqual({level:'1'});
 expect(messages[3].data).toEqual({level:'1'});
});
