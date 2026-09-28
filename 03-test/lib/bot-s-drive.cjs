const fs = require("fs");
const path = require("path");

// One input core: manual ticks and real-time pre-loop callbacks share this function.
function stepBot(state) {
  const {moves,fired,releases,steps,surfaceFires,deathReasons,deathSamples} = state;
  const fire = type => document.dispatchEvent(new KeyboardEvent(type,{key:' ',code:'Space',bubbles:true}));
  if (state.after) {
    const s=state.after, before=state.before, p0=before.player;
        if (s.deaths > state.lastDeaths) {
          const reason = s.chief?.caughtT
            ? "chief"
            : before.player.y > 520
              ? "fall"
              : "hazard";
          deathReasons[reason]++;
          if (deathSamples.length < 3) deathSamples.push({ x: p0.x, reason });
          state.lastDeaths = s.deaths;
          fired.clear();
          releases.length = 0;
          fire("keyup");
        }

    return;
  }
      const before = state.before,
        p0 = before.player,
        pw = before.hitbox.w,
        obstacles = before.route.obstacles;
      const coveredVault = obstacles.find(
        (v) =>
          v.type === "vault" &&
          !fired.has(v.id) &&
          before.movingPlatforms.some(
            (m) =>
              m.minX < v.x &&
              m.maxX + m.w > v.x + v.w &&
              m.x <= v.x + v.w,
          ),
      );
      if (coveredVault && p0.x >= 1000 && p0.x < coveredVault.x - 300)
        __tmbParkour.move(0);
      else __tmbParkour.move(1);
        for (let i = releases.length - 1; i >= 0; i--)
          if (releases[i].step <= steps) {
            fire("keyup");
            releases.splice(i, 1);
          }
        for (const input of moves) {
          if (fired.has(input.move_id)) continue;
          const o = obstacles.find((v) => v.id === input.move_id),
            kind = o && (o.parkour || o.type);
          let trigger = p0.x >= input.x;
          if (o && (kind === "vault" || kind === "slide")) {
            const look = Math.max(40, Math.min(60, Math.abs(p0.vx) * 0.15)),
              gap = o.x - (p0.x + pw);
            trigger = gap >= -0.001 && gap <= look;
        } else if (o && (kind === "platform" || kind === "pallet")) {
          trigger = false;
          if (p0.onGround) {
            const live =
                kind === "pallet"
                  ? before.movingPlatforms.find((v) => v.id === o.id)
                  : o,
              target = live || o,
              dy = target.y - (p0.y + before.hitbox.h),
              disc = 560 * 560 + 2 * 1450 * dy,
              t = disc >= 0 ? (560 + Math.sqrt(disc)) / 1450 : NaN,
              landing = p0.x + pw / 2 + Math.max(0, p0.vx) * t,
              futureX =
                kind === "pallet"
                  ? Math.max(
                      target.minX,
                      Math.min(
                        target.maxX,
                        target.x + (target.dx || 0) * 60 * t,
                      ),
                    )
                  : target.x;
            trigger =
              Number.isFinite(t) &&
              t <= 1 &&
              (kind !== "pallet" || p0.x >= o.minX - 40) &&
              landing >= futureX + 16 &&
              landing <= futureX + target.w - 16;
          }
          }
          if (trigger) {
            if (kind === "platform" || kind === "pallet")
              surfaceFires.push({
                id: o.id,
                step: steps,
                playerX: p0.x,
                playerVx: p0.vx,
                targetX: kind === "pallet" ? before.movingPlatforms.find((v) => v.id === o.id)?.x : o.x,
              });
            fire("keydown");
            fired.add(input.move_id);
            releases.push({
              move_id: input.move_id,
              step: steps + Math.max(1, Math.ceil((input.holdMs / 1000) * 60)),
            });
          }
        }

}

async function installCore(page) {
  await page.evaluate(source => { window.__tmbStepBot = (0,eval)('('+source+')'); },stepBot.toString());
}

async function runBot(page, id, options = {}) {
  const inputs = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "route-inputs", id + ".json"), "utf8"),
  );
  await installCore(page);
  let result, failure;
  try { result = await page.evaluate(
    ({ id, inputs, options }) => {
      let driveError, handoffRequired = false;
      try {
      if (options.live === true) {
        window.__tmbBotHandoff = null;
        if (typeof window.__tmbParkour?.pause !== "function")
          throw new Error("Bot S live handoff unavailable: pause hook missing");
        if (window.ytgame?.IN_PLAYABLES_ENV)
          throw new Error("Bot S live handoff unavailable: Playables environment");
        handoffRequired = true;
        if (!window.__tmbBotClock) {
          const origPerf = performance.now.bind(performance);
          const origDate = Date.now.bind(Date);
          const origRaf = window.requestAnimationFrame.bind(window);
          const perfBase = origPerf(), dateBase = origDate();
          let sim = 0, realAtHandoff = 0, live = false;
          const elapsed = () => sim + (live ? origPerf() - realAtHandoff : 0);
          const clock = {
            manual() { sim = elapsed(); live = false; },
            handoff() { sim = elapsed(); realAtHandoff = origPerf(); live = true; },
          };
          Object.defineProperty(performance, "now", {
            configurable: true, value: () => perfBase + elapsed(),
          });
          Date.now = () => dateBase + elapsed();
          window.__tmbAdvanceTime = (ms) => { sim += ms; };
          window.requestAnimationFrame = (callback) =>
            origRaf(() => { clock.frames = (clock.frames || 0) + 1; callback(performance.now()); });
          window.__tmbBotClock = clock;
        }
        window.__tmbBotClock.manual();
      }
      // Resume preserves the caller's route, economy and fullD06 flags.
      if (options.resume !== true) {
      if (id[0] === "F") __TMB_A12__.renderWorldOnRoute("frozen", id);
      else __TMB_A12__.renderWorldOnRoute("dock31", id);
      __TMB_A12__.startRoute(id);
      }
      if (window.__tmbRealtimeBot) throw new Error("Stop real-time Bot S before manual drive");
      if (options.resume === true && window.__tmbBotClock) window.__tmbBotClock.manual();
      __tmbParkour.manual();
      __tmbParkour.move(1);
      const moves = inputs.filter(
          (v) =>
            v.action === "jump" &&
            v.move_id !== window.__TMB_SKIP_MOVE_ID__,
        ),
        fired = new Set(),
        releases = [];
      let h = 2166136261,
        steps = 0,
        lastDeaths = 0;
      const usage = new Set(),
        positive = new Set(),
        deathSamples = [],
      deathReasons = { chief: 0, hazard: 0, fall: 0 },
      surfaceFires = [],
      parkourSamples = [],
        vxSamples = [];
      let chiefVxSum = 0,
        chiefFrames = 0;
      const fire = (type) =>
        document.dispatchEvent(
          new KeyboardEvent(type, { key: " ", code: "Space", bubbles: true }),
        );
      const botState = {moves,fired,releases,steps,lastDeaths,deathReasons,deathSamples,surfaceFires};
      for (; steps < 12000; steps++) {
      const before = __TMB_A12__.getState(), p0 = before.player;
      botState.before = before; botState.steps = steps;
      window.__tmbStepBot(botState);
        __tmbAdvanceTime(1000 / 60);
        __tmbCampaignStep(1 / 60);
      const s = __TMB_A12__.getState(),
          p = s.player,
          park = __tmbParkour.read(),
          w = s.hitbox.w,
        hgt = s.hitbox.h;
      if (
        (park.state === "vault" || park.state === "slide") &&
        !parkourSamples.some(
          (v) => v.state === park.state && Math.abs(v.x - p.x) < 100,
        )
      )
        parkourSamples.push({ state: park.state, x: p.x });
        vxSamples.push(p.vx);
        if (s.chief) {
          chiefVxSum += Math.abs(s.chief.vx || s.chief.speed || 0);
          chiefFrames++;
        }
        for (const o of s.route.obstacles) {
          const kind = o.parkour || o.type;
          if (
            (kind === "vault" || kind === "slide") &&
            p.x + w >= o.x - 80 &&
            p.x <= o.x + o.w + 80 &&
            park.state === kind
          ) {
            if (o.id.includes("-t1b-")) usage.add(o.id);
            if (o.id === "d01-vault" || o.id === "d01-slide")
              positive.add(o.id);
          }
          if (
            kind === "platform" &&
            p.x + w >= o.x &&
            p.x <= o.x + o.w &&
            Math.abs(p.y + hgt - o.y) <= 2
          ) {
            if (o.id.includes("-t1b-")) usage.add(o.id);
            if (o.id === "d01-t1b-platform-1") positive.add(o.id);
          }
          if (kind === "pallet") {
            const live = s.movingPlatforms.find((v) => v.id === o.id);
            if (
              live &&
              p.x + w >= live.x &&
              p.x <= live.x + live.w &&
              Math.abs(p.y + hgt - live.y) <= 2
            ) {
              if (o.id.includes("-t1b-")) usage.add(o.id);
              if (o.id === "d05-pallet") positive.add(o.id);
            }
          }
        }
        for (const v of [Math.round(p.x * 100), Math.round(p.y * 100)]) {
          h ^= v;
          h = Math.imul(h, 16777619);
        }
        botState.after = s; window.__tmbStepBot(botState); botState.after = null;
        const extra = {
          usage: [...usage],
          positive: [...positive],
          deathSamples,
          deathReasons,
          avgPlayerVx: vxSamples.reduce((a, b) => a + b, 0) / vxSamples.length,
          avgChiefVx: chiefFrames ? chiefVxSum / chiefFrames : 0,
          surfaceFires,
          parkourSamples,
        };
        if (options.handoffWhen) {
          const q=options.handoffWhen;
          if (p.x > q.maxX) throw new Error('Bot S no safe handoff in range: '+JSON.stringify({range:q,player:p,parkour:park.state}));
          if (p.x >= q.minX && p.x <= q.maxX && park.state === q.state && p.onGround === q.onGround)
            return {stopped:true,x:p.x,steps:steps+1,handoffWhen:q};
        }
        if (options.stopAtX != null && p.x >= options.stopAtX)
          return { stopped: true, x: p.x, steps: steps + 1 };
        if (s.result)
          return {
            finished: true,
            deaths: s.deaths,
            game_s: s.gameClock,
            steps: steps + 1,
            hash: (h >>> 0).toString(16),
            ...extra,
            x: p.x,
            route: s.route,
          };
      }
      const s = __TMB_A12__.getState();
      return {
        finished: false,
        deaths: s.deaths,
        game_s: s.gameClock,
        steps,
        hash: (h >>> 0).toString(16),
        usage: [...usage],
        positive: [...positive],
        deathSamples,
        deathReasons,
        avgPlayerVx: vxSamples.reduce((a, b) => a + b, 0) / vxSamples.length,
        avgChiefVx: chiefFrames ? chiefVxSum / chiefFrames : 0,
        surfaceFires,
        parkourSamples,
        x: s.player.x,
        route: s.route,
      };
      } catch (error) {
        driveError = error;
        throw error;
      } finally {
        if (options.live === true && handoffRequired) {
          try {
            const snapshot = () => {
              const s = __TMB_A12__.getState();
              return { routeId: s.routeId, routeVersion: s.routeVersion,
                route: s.route, economy: s.economy, result: s.result,
                shop: s.shop, player: s.player, campaignChief: s.chief,
                parkourState: __tmbParkour.read().state };
            };
            const initial = snapshot();
            if (initial.parkourState !== "normal")
              throw new Error("Bot S handoff requires normal parkour: " + JSON.stringify(initial));
            document.dispatchEvent(new KeyboardEvent("keyup", {
              key: " ", code: "Space", bubbles: true,
            }));
            __tmbParkour.pause();
            window.__tmbBotClock.handoff();
            const before = snapshot();
            window.dispatchEvent(new Event("pageshow"));
            const after = snapshot();
            if (JSON.stringify(initial) !== JSON.stringify(before) ||
                JSON.stringify(before) !== JSON.stringify(after))
              throw new Error("Bot S handoff changed scenario: " + JSON.stringify({initial,before,after}));
            const state = __TMB_A12__.getState();
            window.__tmbBotHandoff = { before, after, gameClock: state.gameClock,
              frames: window.__tmbBotClock.frames || 0,
              active: !state.result && !state.shop.open };
          } catch (error) {
            if (driveError) throw new AggregateError([driveError,error],
              driveError.message + "; handoff failed: " + error.message, {cause:driveError});
            throw error;
          }
        }
      }
    },
    { id, inputs, options },
  ); } catch (error) { failure = error; }
  if (options.live === true) {
    try {
      const started = process.hrtime.bigint();
      const handoff = await page.evaluate(() => window.__tmbBotHandoff);
      if (handoff) {
        let measured;
        do {
          measured = await page.evaluate(() => ({
            gameClock: __TMB_A12__.getState().gameClock,
            frames: window.__tmbBotClock.frames || 0,
          }));
          const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
          const progressed = handoff.active ? measured.gameClock > handoff.gameClock : measured.frames > handoff.frames;
          if (progressed && elapsedMs <= 500) {
            console.log('BOT_S_HANDOFF ' + JSON.stringify({id, elapsedMs, handoff, measured}));
            break;
          }
          if (elapsedMs >= 500) throw new Error('Bot S handoff no progress within 500 ms: ' + JSON.stringify({handoff,measured,elapsedMs}));
          await new Promise(resolve => setTimeout(resolve, 5));
        } while (true);
      }
    } catch (error) {
      failure = failure ? new AggregateError([failure,error], failure.message + '; ' + error.message, {cause:failure}) : error;
    }
  }
  if (failure) throw failure;
  return result;
}

async function startBot(page,id,options={}) {
  const inputs=JSON.parse(fs.readFileSync(path.join(__dirname,'..','route-inputs',id+'.json'),'utf8'));
  await installCore(page);
  return page.evaluate(({id,inputs,options})=>{
    if(window.__tmbRealtimeBot) throw new Error('Bot S already active');
    if(options.resume!==true) {
      __TMB_A12__.renderWorldOnRoute(id[0]==='F'?'frozen':'dock31',id);
      __TMB_A12__.startRoute(id);
    }
    if(__TMB_A12__.getState().routeId!==id) throw new Error('Bot S resume route mismatch');
    const original=window.requestAnimationFrame;
    const state={moves:inputs.filter(v=>v.action==='jump'&&v.move_id!==window.__TMB_SKIP_MOVE_ID__),
      fired:new Set(),releases:[],steps:0,lastDeaths:__TMB_A12__.getState().deaths,
      deathReasons:{chief:0,hazard:0,fall:0},deathSamples:[],surfaceFires:[],frames:0,
      began:performance.now(),original};
    const release=()=>{
      __tmbParkour.stop();
      for(const [key,code] of [[' ','Space'],['ArrowRight','ArrowRight'],['ArrowLeft','ArrowLeft'],['ArrowDown','ArrowDown']])
        document.dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true}));
    };
    state.release=release;
    // The product callback is function loop(t) (index.html). No additional rAF or manual step.
    state.wrapper=function(callback){return original.call(window,function(t){
      if(window.__tmbRealtimeBot===state&&callback.name==='loop') {
        try {
          const current=__TMB_A12__.getState();
          if(state.before){state.after=current;window.__tmbStepBot(state);state.after=null;}
          state.before=current;state.steps=(performance.now()-state.began)*60/1000;
          if(!current.result&&!current.shop.open) window.__tmbStepBot(state); else release();
          state.frames++;
        } catch(error){state.error=String(error.stack||error);release();}
      }
      callback(t);
    });};
    window.__tmbRealtimeBot=state;
    window.requestAnimationFrame=state.wrapper;
    return {route:id,mode:'real-time',hook:'before loop callback'};
  },{id,inputs,options});
}

async function stopBot(page) {
  const result=await page.evaluate(()=>{
    const state=window.__tmbRealtimeBot;
    if(!state) {__tmbParkour.stop();document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));return null;}
    state.release();
    if(window.requestAnimationFrame===state.wrapper) window.requestAnimationFrame=state.original;
    window.__tmbRealtimeBot=null;
    return {frames:state.frames,fired:[...state.fired],deathReasons:state.deathReasons,error:state.error||null};
  });
  if(result?.error) throw new Error(result.error);
  return result;
}

module.exports = { runBot, startBot, stopBot };
