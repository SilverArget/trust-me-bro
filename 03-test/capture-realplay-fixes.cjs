const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-realplay");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webm": "video/webm", ".json": "application/json; charset=utf-8" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => {
    if (err) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

const profile = {
  schema: 1,
  runnerId: "male",
  walletBalance: 3000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default", "ronin", "shadowNinja"],
  equippedOutfitByRunner: { male: "shadowNinja", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: "robotGuard",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language: "tr" },
};

const routeIds = ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14","D15","D16","D17","D18","F01","F02","F03","F04","F05","F06","M01","M02","M03","M04","M05","M06","A01","A02","A03","A04","A05","A06"];

function mojibakeReport() {
  const pattern = /Ã|â€|Å¸/g;
  const files = ["index.html", ...fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`)];
  const matches = {};
  for (const rel of files) matches[rel] = (fs.readFileSync(path.join(root, rel), "utf8").match(pattern) || []).length;
  const current = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const base = require("child_process").execFileSync("git", ["show", "37f63dd:index.html"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const set = s => Array.from(new Set([...s].filter(ch => ch.codePointAt(0) > 127))).sort().join("");
  const count = s => [...s].filter(ch => ch.codePointAt(0) > 127).length;
  return { matches, total: Object.values(matches).reduce((a, b) => a + b, 0), indexNonAsciiCount: count(current), base37f63ddNonAsciiCount: count(base), sameAs37f63dd: count(current) === count(base) && set(current) === set(base) };
}

async function newPage(browser, viewport = { width: 1280, height: 720 }, videoName = null) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    ...(videoName ? { recordVideo: { dir: out, size: viewport } } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push(err.message));
  await page.addInitScript(p => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), profile);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbCampaignDraw);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  if (await page.locator("#characterSelect.show").count()) await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  return { context, page, errors, videoName };
}

async function closePage(entry) {
  const video = entry.page.video();
  await entry.context.close();
  if (video && entry.videoName) {
    const src = await video.path();
    fs.renameSync(src, path.join(out, entry.videoName));
  }
}

async function startRouteAtBeginning(page, id) {
  await page.evaluate(id => {
    __TMB_A12__.startRoute(id);
    window.__realplaySamples = [];
    window.__realplayBackEvents = [];
    window.__realplayPoseMismatches = [];
    const old = window.__tmbCampaignStep;
    window.__tmbCampaignStep = dt => {
      const before = __TMB_A12__.getState();
      const bx = before.player.x;
      const rv = old(dt);
      const s = __TMB_A12__.getState();
      const p = s.player;
      const dx = p.x - bx;
      if (dx < -0.75) window.__realplayBackEvents.push({ t:+s.gameClock.toFixed(3), prevX:+bx.toFixed(2), x:+p.x.toFixed(2), dx:+dx.toFixed(2), state:s.parkour.state, deaths:s.deaths, catches:s.chief?.catches || 0 });
      if (s.chief?.active && s.chief.entryPhase === "running" && Math.abs((p.x - s.chief.x)) < 460) {
        const expected = ["slide","vault","roll","climb","catch","wallRun","dive"].includes(s.parkour.state) ? s.parkour.state : (!p.onGround ? "jump" : "run");
        const chiefPose = s.chief.pose === "normal" ? "run" : s.chief.pose;
        const ok = expected === "jump" ? ["jump","dive"].includes(chiefPose) : expected === "catch" ? ["catch","climb","wallRun"].includes(chiefPose) : expected === chiefPose || (expected === "run" && chiefPose === "run");
        if (!ok) window.__realplayPoseMismatches.push({ t:+s.gameClock.toFixed(3), x:+p.x.toFixed(1), player:expected, chief:chiefPose });
      }
      if (window.__realplaySamples.length < 3000 && (!window.__realplaySamples.length || s.gameClock - window.__realplaySamples.at(-1).t >= .1)) window.__realplaySamples.push({ t:+s.gameClock.toFixed(3), x:+p.x.toFixed(1), y:+p.y.toFixed(1), state:s.parkour.state, chiefPose:s.chief?.pose || null, result:!!s.result });
      return rv;
    };
  }, id);
}

async function tapJump(page, ms = 45) {
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(ms);
  await page.keyboard.up("ArrowUp");
}

async function timedDrive(page, id, opts = {}) {
  await startRouteAtBeginning(page, id);
  await page.keyboard.down("ArrowRight");
  let finished = false;
  for (let i = 0; i < (opts.frames || 900); i++) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    const p = s.player, right = p.x + s.hitbox.w;
    if (s.result || right >= s.route.finishX) { finished = true; break; }
    if (!opts.rightOnly) {
      for (const o of s.route.obstacles.filter(o => o.type === "slide")) {
        const gap = o.x - right;
        if (p.onGround && gap >= 2 && gap <= 40) await tapJump(page, 35);
      }
      for (const o of s.route.obstacles.filter(o => o.type === "vault")) {
        if (p.onGround && right >= o.x - 55 && right <= o.x - 12) await tapJump(page, 45);
      }
      for (const z of [...(s.route.diveZones || []), ...(s.route.highJumpZones || [])]) {
        const c = p.x + s.hitbox.w / 2;
        if (c >= z.x1 + 2 && c <= z.x2 - 2 && (p.onGround || id[0] === "D")) await tapJump(page, 45);
      }
      if (id === "D04" && p.onGround && p.x > 5530 && p.x < 6190) await tapJump(page, 30);
    }
    if (opts.fast) await page.evaluate(() => __tmbCampaignStep(1 / 60));
    else await page.waitForTimeout(16);
  }
  await page.keyboard.up("ArrowRight");
  const summary = await page.evaluate(() => {
    const s = __TMB_A12__.getState();
    return {
      routeId: s.routeId,
      finished: !!s.result || s.player.x + s.hitbox.w >= s.route.finishX,
      x: +s.player.x.toFixed(2),
      finishX: s.route.finishX,
      deaths: s.deaths || 0,
      catches: s.chief?.catches || 0,
      result: !!s.result,
      backEvents: window.__realplayBackEvents || [],
      poseMismatches: window.__realplayPoseMismatches || [],
      samples: window.__realplaySamples || [],
    };
  });
  summary.finished ||= finished;
  return summary;
}

async function rightOnlyD04(browser) {
  const entry = await newPage(browser);
  await startRouteAtBeginning(entry.page, "D04");
  await entry.page.evaluate(() => {
    __TMB_A12__.placePlayer(5400, __TMB_A12__.getState().player.y);
    window.__realplayBackEvents = [];
  });
  await entry.page.keyboard.down("ArrowRight");
  for (let i = 0; i < 620; i++) await entry.page.evaluate(() => __tmbCampaignStep(1 / 60));
  await entry.page.keyboard.up("ArrowRight");
  const before = await entry.page.evaluate(() => {
    const s = __TMB_A12__.getState();
    return { routeId:s.routeId, finished:!!s.result, x:+s.player.x.toFixed(2), finishX:s.route.finishX, deaths:s.deaths||0, catches:s.chief?.catches||0, result:!!s.result, backEvents:window.__realplayBackEvents||[], poseMismatches:window.__realplayPoseMismatches||[], samples:window.__realplaySamples||[] };
  });
  await entry.page.screenshot({ path: path.join(out, "d04-right-only-after-1280x720.png") });
  await closePage(entry);
  return { ...before, consoleErrors: entry.errors.length, errors: entry.errors };
}

async function finishIcon(browser, id, viewport, file) {
  const entry = await newPage(browser, viewport);
  const run = await timedDrive(entry.page, id, { frames: 420, fast: true });
  await entry.page.evaluate(() => {
    if (!__TMB_A12__.getState().result) __TMB_A12__.finishResult();
    __tmbCampaignDraw();
  });
  await entry.page.waitForTimeout(250);
  await entry.page.screenshot({ path: path.join(out, file) });
  const metric = await entry.page.evaluate(() => {
    const s = __TMB_A12__.getState();
    const c = s.chief || {};
    const feet = c.y + 48;
    const route = __TMB_A12__.routeDefinition(s.routeId);
    const cx = c.x + 16;
    const grounds = route.groundSegments || [];
    const covering = grounds.filter(g => cx >= g.x - 4 && cx <= g.x + g.w + 4).sort((a, b) => a.y - b.y)[0];
    const nearest = grounds.slice().sort((a, b) => Math.min(Math.abs(cx - a.x), Math.abs(cx - a.x - a.w)) - Math.min(Math.abs(cx - b.x), Math.abs(cx - b.x - b.w)))[0];
    const ground = covering?.y ?? nearest?.y ?? null;
    return { routeId:s.routeId, result:!!s.result, chiefX:+c.x?.toFixed?.(2), feetY:+feet.toFixed(2), groundY:ground, delta:ground == null ? null : +(feet - ground).toFixed(2), pose:c.pose, resultAngry:!!c.resultAngry };
  });
  await closePage(entry);
  return { ...metric, run, consoleErrors: entry.errors.length, errors: entry.errors };
}

async function routeTable(browser) {
  const rows = [];
  const scopedIds = process.env.TMB_REALPLAY_FULL === "1" ? routeIds : ["D01", "D04", "D09", "D18"];
  for (const id of scopedIds) {
    const entry = await newPage(browser, { width: 800, height: 450 });
    const r = await timedDrive(entry.page, id, { frames: 360, fast: true });
    await closePage(entry);
    rows.push({
      routeId: id,
      finished: r.finished,
      x: r.x,
      deaths: r.deaths,
      catches: r.catches,
      backEvents: r.backEvents.length,
      firstBackX: r.backEvents[0]?.x ?? null,
      loop: r.backEvents.length >= 3 || (!r.finished && r.x < r.finishX - 500),
      poseMismatches: r.poseMismatches.length,
      finishIconChecked: false,
      consoleErrors: entry.errors.length,
    });
  }
  return rows;
}

async function videoRoute(browser, id) {
  const entry = await newPage(browser, { width: 1280, height: 720 }, `realplay-${id}.webm`);
  const run = await timedDrive(entry.page, id, { frames: 420 });
  await closePage(entry);
  return run;
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const d04RightOnly = await rightOnlyD04(browser);
    const videos = {};
    for (const id of ["D01", "D04", "D09", "D18"]) videos[id] = await videoRoute(browser, id);
    const finish = [
      await finishIcon(browser, "D01", { width: 1280, height: 720 }, "finish-chief-d01-1280x720.png"),
      await finishIcon(browser, "D04", { width: 1280, height: 720 }, "finish-chief-d04-1280x720.png"),
      await finishIcon(browser, "D01", { width: 390, height: 844 }, "finish-chief-d01-390x844.png"),
      await finishIcon(browser, "D04", { width: 390, height: 844 }, "finish-chief-d04-390x844.png"),
    ];
    const rows = await routeTable(browser);
    const metrics = { mojibake: mojibakeReport(), d04RightOnly, videos, finish, routeTable: rows, consoleErrors: d04RightOnly.consoleErrors + Object.values(videos).reduce((n, r) => n + (r.consoleErrors || 0), 0) + finish.reduce((n, r) => n + r.consoleErrors, 0) + rows.reduce((n, r) => n + r.consoleErrors, 0) };
    metrics.routeTableComplete = rows.length === routeIds.length;
    metrics.routeTableCompleted = rows.length;
    metrics.routeTableRemaining = routeIds.length - rows.length;
    fs.writeFileSync(path.join(out, "realplay-metrics.json"), JSON.stringify(metrics, null, 2));
    if (metrics.mojibake.total !== 0 || !metrics.mojibake.sameAs37f63dd) throw new Error("mojibake failed");
    if (d04RightOnly.backEvents.length) throw new Error("D04 right-only pushback remains");
    if (finish.some(r => !r.resultAngry || r.delta !== 0)) throw new Error("finish chief icon/ground failed");
    console.log(JSON.stringify({ d04RightOnly: { finished:d04RightOnly.finished, x:d04RightOnly.x, backEvents:d04RightOnly.backEvents.length }, videos:Object.fromEntries(Object.entries(videos).map(([k,v])=>[k,{finished:v.finished, deaths:v.deaths, catches:v.catches, backEvents:v.backEvents.length, poseMismatches:v.poseMismatches.length}])), finish:finish.map(f=>({routeId:f.routeId, viewport:f.run?.routeId, delta:f.delta, angry:f.resultAngry})), routeRows:rows.length, routeFinished:rows.filter(r=>r.finished).length, routeBackEvents:rows.reduce((n,r)=>n+r.backEvents,0), routePoseMismatches:rows.reduce((n,r)=>n+r.poseMismatches,0), consoleErrors:metrics.consoleErrors }, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
