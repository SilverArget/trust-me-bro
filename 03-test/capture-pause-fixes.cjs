const fs = require("fs");
const http = require("http");
const path = require("path");
const childProcess = require("child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-pause");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".json": "application/json; charset=utf-8" };
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

const fullProfile = (chief = "securityTall") => ({
  schema: 1,
  runnerId: "male",
  walletBalance: 2000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default"],
  equippedOutfitByRunner: { male: "default", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: chief,
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language: "tr" },
});

function mojibakeReport() {
  const pattern = /Ã|â€|Å¸/g;
  const files = ["index.html", ...fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`)];
  const matches = {};
  for (const rel of files) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    matches[rel] = (text.match(pattern) || []).length;
  }
  const current = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const base = childProcess.execFileSync("git", ["show", "37f63dd:index.html"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const chars = s => Array.from(new Set([...s].filter(ch => ch.codePointAt(0) > 127))).sort().join("");
  const count = s => [...s].filter(ch => ch.codePointAt(0) > 127).length;
  return {
    totalMatches: Object.values(matches).reduce((a, b) => a + b, 0),
    matches,
    indexNonAsciiCount: count(current),
    base37f63ddNonAsciiCount: count(base),
    indexNonAsciiSet: chars(current),
    base37f63ddNonAsciiSet: chars(base),
    indexNonAsciiSameAs37f63dd: count(current) === count(base) && chars(current) === chars(base),
  };
}

async function pageWith(browser, viewport = { width: 1280, height: 720 }, chief = "securityTall") {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push(err.message));
  await page.addInitScript(profile => {
    localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(profile));
  }, fullProfile(chief));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  if (await page.locator("#characterSelect.show").count()) await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  return { page, errors };
}

const stableState = s => ({
  routeId: s.routeId,
  x: +s.player.x.toFixed(3),
  y: +s.player.y.toFixed(3),
  chiefX: s.chief ? +s.chief.x.toFixed(3) : null,
  chiefT: s.chief && Number.isFinite(s.chief.chiefT) ? +s.chief.chiefT.toFixed(3) : null,
  deaths: s.deaths || 0,
  cameraWorldY: +s.cameraWorldY.toFixed(3),
});

async function pauseMetrics(browser) {
  const { page, errors } = await pageWith(browser);
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D04");
    __TMB_A12__.placePlayerAtChiefTime(6.8);
    __tmbCampaignDraw();
  });
  await page.locator("#pauseBtn").click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(out, "pause-before-1280x720.png") });
  const before = await page.evaluate(() => stableStateForCapture());
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(out, "pause-after-5s-1280x720.png") });
  const after = await page.evaluate(() => stableStateForCapture());
  await page.locator("#pauseOverlay").click();
  await page.waitForTimeout(1000);
  const resumed = await page.evaluate(() => stableStateForCapture());
  await page.close();
  return {
    before,
    after,
    unchanged: JSON.stringify(before) === JSON.stringify(after),
    resumedMoved: resumed.x !== after.x || resumed.chiefT !== after.chiefT,
    resumed,
    consoleErrors: errors.length,
    errors,
  };
}

async function tapJump(page) {
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(35);
  await page.keyboard.up("ArrowUp");
}

async function driveD04AndMeasure(browser) {
  const { page, errors } = await pageWith(browser);
  await page.evaluate(() => {
    __TMB_A12__.startRoute("D04");
    window.__d04BackEvents = [];
    window.__d04Prev = null;
    window.stableStateForCapture = () => {
      const s = __TMB_A12__.getState();
      return {
        routeId: s.routeId,
        x: +s.player.x.toFixed(3),
        y: +s.player.y.toFixed(3),
        chiefX: s.chief ? +s.chief.x.toFixed(3) : null,
        chiefT: s.chief && Number.isFinite(s.chief.chiefT) ? +s.chief.chiefT.toFixed(3) : null,
        deaths: s.deaths || 0,
        cameraWorldY: +s.cameraWorldY.toFixed(3),
      };
    };
    const raw = window.__tmbCampaignStep;
    window.__tmbCampaignStep = dt => {
      const prev = __TMB_A12__.getState();
      const px = prev.player.x, deaths = prev.deaths || 0;
      const value = raw(dt);
      const s = __TMB_A12__.getState();
      const dx = s.player.x - px;
      if (dx < -0.75) {
        const reset = (s.deaths || 0) > deaths || Math.abs(dx) > 120;
        const p = s.player;
        window.__d04BackEvents.push({
          t: +s.gameClock.toFixed(3),
          prevX: +px.toFixed(3),
          x: +p.x.toFixed(3),
          dx: +dx.toFixed(3),
          y: +p.y.toFixed(3),
          vx: +p.vx.toFixed(3),
          state: s.parkour.state,
          source: reset ? "death-or-retry" : "collision-or-snap",
          chiefCatches: s.chief?.catches || 0,
        });
      }
      return value;
    };
  });
  await page.keyboard.down("ArrowRight");
  const fired = new Set();
  let end = null;
  for (let i = 0; i < 2400; i++) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    end = s;
    const p = s.player, right = p.x + s.hitbox.w, center = p.x + s.hitbox.w / 2;
    if (s.result || right >= s.route.finishX) break;
    const jumpKeys = [];
    for (const z of s.route.diveZones || []) if (center >= z.x1 + 3 && center <= z.x2 - 3) jumpKeys.push(`dive-${z.id}`);
    for (const o of s.route.obstacles || []) {
      if (o.type === "vault" && right >= o.x - 55 && right <= o.x - 12) jumpKeys.push(`vault-${o.id}`);
      if (o.type === "slide" && p.onGround && o.x - right >= 2 && o.x - right <= 36) jumpKeys.push(`slide-${o.id}`);
    }
    if (p.onGround && p.x >= 5530 && p.x < 6190) jumpKeys.push(`d04-long-${Math.floor((p.x - 5530) / 82.65)}-${Math.floor(s.gameClock * 2)}`);
    const ledges = (s.route.catchableSurfaces || []).map(v => typeof v === "string" ? v : v.id).map(id => s.route.groundSegments.find(g => g.id === id)).filter(Boolean);
    for (const g of ledges) if (right >= g.x - 58 && right <= g.x + 4) jumpKeys.push(`catch-${g.id}-${Math.floor(s.gameClock * 5)}`);
    const key = jumpKeys.find(k => !fired.has(k));
    if (key) {
      fired.add(key);
      await tapJump(page);
    }
    await page.waitForTimeout(16);
  }
  await page.keyboard.up("ArrowRight");
  const events = await page.evaluate(() => window.__d04BackEvents || []);
  await page.screenshot({ path: path.join(out, "d04-drive-after-fix-1280x720.png") });
  await page.close();
  const real = events.filter(e => e.source !== "death-or-retry" && e.chiefCatches === 0);
  return { finished: !!end?.result || end?.player.x + end?.hitbox.w >= end?.route.finishX, finalX: end?.player ? +end.player.x.toFixed(3) : null, finishX: end?.route?.finishX ?? null, eventCount: events.length, realBackEvents: real, allEvents: events.slice(0, 30), consoleErrors: errors.length, errors };
}

async function finishChiefEvidence(browser, routeId, viewport, file, chief = "securityTall") {
  const { page, errors } = await pageWith(browser, viewport, chief);
  await page.evaluate(id => {
    __TMB_A12__.startRoute(id);
    const s = __TMB_A12__.getState();
    const t = Math.max(2, (s.chief?.playerT || 8) - 2.2);
    __TMB_A12__.placePlayerAtChiefTime(t);
    __TMB_A12__.forceChiefNear();
    const before = __TMB_A12__.getState();
    window.__finishChiefBefore = before.chief ? { x: before.chief.x, chiefT: before.chief.chiefT } : null;
    const r = __TMB_A12__.routeDefinition(id);
    const last = [...r.groundSegments].filter(g => g.solid !== false).sort((a, b) => (b.x + b.w) - (a.x + a.w))[0];
    const finishGround = last?.y ?? 455;
    __TMB_A12__.placePlayer(r.finishX - 260, finishGround - 48);
    __TMB_A12__.forceChiefNear();
    for (let i = 0; i < 120; i++) __tmbCampaignStep(1 / 60);
    __TMB_A12__.placePlayer(r.finishX + 2, finishGround - 48);
    for (let i = 0; i < 80; i++) __tmbCampaignStep(1 / 60);
    if (!__TMB_A12__.getState().result) __TMB_A12__.finishResult();
    __TMB_A12__.forceChiefNear(-260);
    __tmbCampaignDraw();
  }, routeId);
  await page.screenshot({ path: path.join(out, file) });
  const fixed = await page.evaluate(async () => {
    const a = __TMB_A12__.getState().chief ? { x: __TMB_A12__.getState().chief.x, chiefT: __TMB_A12__.getState().chief.chiefT, pose: __TMB_A12__.getState().chief.pose, resultAngry: __TMB_A12__.getState().chief.resultAngry } : null;
    await new Promise(r => setTimeout(r, 2000));
    const s = __TMB_A12__.getState();
    const b = s.chief ? { x: s.chief.x, chiefT: s.chief.chiefT, pose: s.chief.pose, resultAngry: s.chief.resultAngry } : null;
    return { beforeFinish: window.__finishChiefBefore, afterFinishA: a, afterFinishB: b, static: JSON.stringify(a) === JSON.stringify(b), result: !!s.result };
  });
  await page.close();
  return { ...fixed, consoleErrors: errors.length, errors };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const metrics = {};
    await browser.newPage().then(async page => {
      await page.addInitScript(() => {
        window.stableStateForCapture = () => {
          const s = __TMB_A12__.getState();
          return {
            routeId: s.routeId,
            x: +s.player.x.toFixed(3),
            y: +s.player.y.toFixed(3),
            chiefX: s.chief ? +s.chief.x.toFixed(3) : null,
            chiefT: s.chief && Number.isFinite(s.chief.chiefT) ? +s.chief.chiefT.toFixed(3) : null,
            deaths: s.deaths || 0,
            cameraWorldY: +s.cameraWorldY.toFixed(3),
          };
        };
      });
      await page.close();
    });
    // Install helper in every page after creation.
    const oldNewPage = browser.newPage.bind(browser);
    browser.newPage = async (...args) => {
      const page = await oldNewPage(...args);
      await page.addInitScript(() => {
        window.stableStateForCapture = () => {
          const s = __TMB_A12__.getState();
          return {
            routeId: s.routeId,
            x: +s.player.x.toFixed(3),
            y: +s.player.y.toFixed(3),
            chiefX: s.chief ? +s.chief.x.toFixed(3) : null,
            chiefT: s.chief && Number.isFinite(s.chief.chiefT) ? +s.chief.chiefT.toFixed(3) : null,
            deaths: s.deaths || 0,
            cameraWorldY: +s.cameraWorldY.toFixed(3),
          };
        };
      });
      return page;
    };
    metrics.mojibake = mojibakeReport();
    metrics.pause = await pauseMetrics(browser);
    metrics.d04BackPush = await driveD04AndMeasure(browser);
    metrics.finishChiefD01Desktop = await finishChiefEvidence(browser, "D01", { width: 1280, height: 720 }, "finish-chief-d01-1280x720.png", "securityTall");
    metrics.finishChiefD04Desktop = await finishChiefEvidence(browser, "D04", { width: 1280, height: 720 }, "finish-chief-d04-1280x720.png", "securityTall");
    metrics.finishChiefD01Mobile = await finishChiefEvidence(browser, "D01", { width: 390, height: 844 }, "finish-chief-d01-390x844.png", "robotGuard");
    metrics.finishChiefD04Mobile = await finishChiefEvidence(browser, "D04", { width: 390, height: 844 }, "finish-chief-d04-390x844.png", "bouncer");
    metrics.consoleErrors = Object.values(metrics).reduce((n, v) => n + (v && typeof v.consoleErrors === "number" ? v.consoleErrors : 0), 0);
    fs.writeFileSync(path.join(out, "pause-metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
    if (!metrics.mojibake.indexNonAsciiSameAs37f63dd || metrics.mojibake.totalMatches !== 0) throw new Error("mojibake check failed");
    if (!metrics.pause.unchanged || !metrics.pause.resumedMoved) throw new Error("pause freeze check failed");
    if (metrics.d04BackPush.realBackEvents.length) throw new Error("D04 real back-push events remain");
    for (const key of ["finishChiefD01Desktop", "finishChiefD04Desktop", "finishChiefD01Mobile", "finishChiefD04Mobile"]) {
      if (!metrics[key].result || !metrics[key].static || !metrics[key].afterFinishB?.resultAngry) throw new Error(`${key} result chief check failed`);
    }
    console.log("PAUSE_FIXES " + JSON.stringify({
      pauseUnchanged: metrics.pause.unchanged,
      d04RealBackEvents: metrics.d04BackPush.realBackEvents.length,
      consoleErrors: metrics.consoleErrors,
      mojibake: metrics.mojibake.totalMatches,
    }));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
