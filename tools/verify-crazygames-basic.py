import json
import os
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

from playwright.sync_api import sync_playwright


BUILD = r"E:\oyunlar\TrustMeBro\crazygames\build-dd4ec2e"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


os.chdir(BUILD)
server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_address[1]}"

crazygames_stub = r"""
window.__cgCalls=[];
const log=(name,data={})=>window.__cgCalls.push({name,...data});
const values=new Map(),listeners=[];
const game={
  settings:{muteAudio:false},
  addSettingsChangeListener(fn){listeners.push(fn);log('addSettingsChangeListener')},
  gameplayStart(){log('gameplayStart')},gameplayStop(){log('gameplayStop')},
  loadingStart(){log('loadingStart')},loadingStop(){log('loadingStop')},happytime(){log('happytime')}
};
window.__cgSetMute=value=>{game.settings.muteAudio=!!value;for(const fn of listeners)fn({muteAudio:!!value})};
window.CrazyGames={SDK:{
  init:async()=>{log('init')},game,
  user:{
    isUserAccountAvailable:true,
    systemInfo:{countryCode:'US',device:{type:'desktop'}},
    getUser:async()=>{log('getUser');return {username:'CrazyGames QA',profilePictureUrl:''}},
    getUserToken:async()=>{log('getUserToken');return 'qa-token'},
    showAuthPrompt:async()=>{}
  },
  data:{
    getItem:key=>{log('storageGet',{key});return values.get(key)||null},
    setItem:(key,value)=>{values.set(key,value);log('storageSet',{key})},
    removeItem:key=>{values.delete(key);log('storageRemove',{key})}
  },
  ad:{requestAd:kind=>log('requestAd',{kind}),hasAdblock:async()=>false},
  banner:{requestResponsiveBanner:async()=>{},clearAllBanners(){} }
}};
"""

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 832, "height": 424})
        page = context.new_page()
        console_errors, page_errors, failed, bad_status, external = [], [], [], [], []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: page_errors.append(str(exc)))
        page.on("requestfailed", lambda req: failed.append({"url": req.url, "error": req.failure}))
        page.on("response", lambda res: bad_status.append({"status": res.status, "url": res.url}) if res.status >= 400 else None)
        page.on("request", lambda req: external.append(req.url) if not req.url.startswith(origin) else None)
        page.route(
            "https://sdk.crazygames.com/crazygames-sdk-v3.js",
            lambda route: route.fulfill(status=200, content_type="application/javascript", body=crazygames_stub),
        )
        page.goto(
            origin + "/index.html?platform_id=crazy_games&debug=true#debug",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        page.wait_for_function(
            "window.__TMB_A12__ && window.__TMB_A12__.getState().routeId === 'D01'",
            timeout=60000,
        )
        page.wait_for_function(
            "window.__cgCalls && window.__cgCalls.some(x=>x.name==='gameplayStart')",
            timeout=10000,
        )
        initial = page.evaluate(
            """() => ({
              routeId:__TMB_A12__.getState().routeId,
              x:__TMB_A12__.getState().player.x,
              build:document.documentElement.dataset.tmbCrazyGamesBasic,
              bridge:__tmb.platform,
              fullscreen:document.querySelector('#fullscreenBtn').classList.contains('show'),
              iosCard:document.querySelector('#iosFullscreenHelp').classList.contains('show')
            })"""
        )
        page.keyboard.down("ArrowRight")
        page.wait_for_timeout(450)
        page.keyboard.up("ArrowRight")
        page.wait_for_timeout(150)
        moved_x = page.evaluate("__TMB_A12__.getState().player.x")
        page.click("#pauseBtn")
        page.wait_for_timeout(100)
        page.click("#pauseOverlay")
        page.wait_for_timeout(100)
        page.evaluate("window.__cgSetMute(true)")
        page.wait_for_timeout(50)
        muted = page.evaluate("__tmb.audio.outputMuted")
        page.evaluate("window.__cgSetMute(false)")
        page.wait_for_timeout(50)
        unmuted = page.evaluate("__tmb.audio.outputMuted")
        ad_result = page.evaluate(
            """async()=>{
              const rewarded={placement:'verify',promise:null};
              document.dispatchEvent(new CustomEvent('tmb:rewarded-request',{detail:rewarded}));
              const interstitial={placement:'verify',promise:null};
              document.dispatchEvent(new CustomEvent('tmb:interstitial-request',{detail:interstitial}));
              const rewardCapability={available:true};
              document.dispatchEvent(new CustomEvent('tmb:rewarded-capability',{detail:rewardCapability}));
              const interCapability={available:true};
              document.dispatchEvent(new CustomEvent('tmb:interstitial-capability',{detail:interCapability}));
              __TMB_A12__.finish();__TMB_A12__.syncRewardedButton();
              return {
                rewarded:await rewarded.promise,
                interstitial:await interstitial.promise,
                rewardCapability:rewardCapability.available,
                interCapability:interCapability.available,
                rewardButtonHidden:document.querySelector('#a12Actions [data-act="rewarded"]').hidden
              };
            }"""
        )
        calls = page.evaluate("window.__cgCalls")
        result = {
            "url": origin + "/index.html?platform_id=crazy_games&debug=true#debug",
            "initial": initial,
            "movedX": moved_x,
            "deltaX": round(moved_x - initial["x"], 3),
            "mute": {"muted": muted, "unmuted": unmuted},
            "adResult": ad_result,
            "calls": calls,
            "requestAdCount": sum(call["name"] == "requestAd" for call in calls),
            "gameplayStartCount": sum(call["name"] == "gameplayStart" for call in calls),
            "gameplayStopCount": sum(call["name"] == "gameplayStop" for call in calls),
            "storageGetCount": sum(call["name"] == "storageGet" for call in calls),
            "storageSetCount": sum(call["name"] == "storageSet" for call in calls),
            "getUserCount": sum(call["name"] == "getUser" for call in calls),
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
            "requestFailures": failed,
            "badStatuses": bad_status,
            "externalRequests": external,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        browser.close()
finally:
    server.shutdown()
