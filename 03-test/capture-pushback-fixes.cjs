const fs = require("fs");
const http = require("http");
const path = require("path");
const childProcess = require("child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const out = path.join(root, "03-test", "manager-preview", "gorsel-pushback");
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

const profile = {
  schema: 1,
  runnerId: "male",
  walletBalance: 2000,
  ownedRunnerIds: ["male", "female", "tall", "compact", "bruiser", "athlete"],
  ownedOutfitSetIds: ["default", "shadowNinja"],
  equippedOutfitByRunner: { male: "shadowNinja", female: "default", tall: "default", compact: "default", bruiser: "default", athlete: "default" },
  ownedChiefIds: ["securityTall", "classicChief", "robotGuard", "bouncer"],
  equippedChief: "robotGuard",
  ownedWorldIds: ["dock31", "frozen", "magma", "aftermath"],
  selectedWorldId: "dock31",
  settings: { language: "tr" },
};

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
  const set = s => Array.from(new Set([...s].filter(ch => ch.codePointAt(0) > 127))).sort().join("");
  const count = s => [...s].filter(ch => ch.codePointAt(0) > 127).length;
  return { totalMatches: Object.values(matches).reduce((a, b) => a + b, 0), matches, indexNonAsciiCount: count(current), base37f63ddNonAsciiCount: count(base), indexNonAsciiSameAs37f63dd: count(current) === count(base) && set(current) === set(base) };
}

async function pageWith(browser, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", err => errors.push(err.message));
  await page.addInitScript(p => localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p)), profile);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbCampaignDraw);
  await page.evaluate(() => document.getElementById("introOverlay")?.remove());
  if (await page.locator("#characterSelect.show").count()) await page.locator('.characterChoice[data-runner-id="male"]').click();
  await page.waitForFunction(() => !document.getElementById("characterSelect")?.classList.contains("show"));
  return { page, errors };
}

function copyVideoFrames() {
  const video = "C:/Users/Arget/.claude/uploads/6694e6e3-151c-4b10-9090-422bb32b3602/bd8917ba-Trust_Me_Bro___The_Game_Lies_to_You_-_Google_Chrome_2026-10-08_15-15-48.mp4";
  const frames = [
    { at: "21.80", name: "video-repro-before-pushback.png" },
    { at: "21.87", name: "video-repro-after-pushback.png" },
  ];
  const copied = [];
  if (!fs.existsSync(video)) return copied;
  for (const f of frames) {
    const dst = path.join(out, f.name);
    childProcess.execFileSync("ffmpeg", ["-y", "-ss", f.at, "-i", video, "-frames:v", "1", dst], { stdio: "ignore" });
    copied.push(f.name);
  }
  return copied;
}

async function pushbackEvidence(browser) {
  const { page, errors } = await pageWith(browser, { width: 1280, height: 720 });
  const metrics = await page.evaluate(() => {
    __TMB_A12__.startRoute("D04");
    const route = __TMB_A12__.routeDefinition("D04");
    const zone = route.diveZones.find(z => z.id === "d04-dz-03");
    const playerW = __TMB_A12__.getState().hitbox.w;
    const currentX = zone.x2 - 2;
    const oldStartX = currentX - 208;
    const endX = zone.landX;
    const duration = 0.58;
    const tau = 1 / 30;
    const oldArcX = oldStartX + (endX - oldStartX) * tau / duration;
    const oldDx = oldArcX - currentX;
    const shift = Math.max(0, currentX - oldArcX);
    const afterArcX = oldArcX + shift;
    const afterDx = afterArcX - currentX;
    __TMB_A12__.placePlayer(currentX, zone.landY - 48);
    __TMB_A12__.forceChiefNear(-230);
    __tmbCampaignDraw();
    return { routeId: "D04", zoneId: zone.id, triggerX: +currentX.toFixed(2), oldStartX: +oldStartX.toFixed(2), landX: zone.landX, playerW, beforeDx: +oldDx.toFixed(2), afterDx: +afterDx.toFixed(2), shift: +shift.toFixed(2) };
  });
  await page.screenshot({ path: path.join(out, "d04-pushback-after-1280x720.png") });
  await page.close();
  return { ...metrics, consoleErrors: errors.length, errors };
}

async function routeArcTable(browser) {
  const { page, errors } = await pageWith(browser, { width: 800, height: 450 });
  const table = await page.evaluate(() => {
    const ids = ["D01","D02","D03","D04","D05","D06","D07","D08","D09","D10","D11","D12","D13","D14","D15","D16","D17","D18","F01","F02","F03","F04","F05","F06","M01","M02","M03","M04","M05","M06","A01","A02","A03","A04","A05","A06"];
    const rows = [];
    for (const id of ids) {
      const r = __TMB_A12__.routeDefinition(id);
      let zones = 0, probes = 0, backEvents = 0, landingDeaths = 0, minDx = Infinity;
      for (const kind of ["diveZones", "highJumpZones"]) {
        for (const z of r[kind] || []) {
          if (!Number.isFinite(z.x1) || !Number.isFinite(z.x2) || !Number.isFinite(z.landX)) continue;
          zones++;
          for (const triggerX of [z.x1, z.x2]) {
            probes++;
            const landX = kind === "diveZones" ? z.landX : z.landX - 16;
            const oldStartX = triggerX - 220;
            const oldArcX = oldStartX + (landX - oldStartX) * (1 / 30) / 0.58;
            const shiftedArcX = oldArcX + Math.max(0, triggerX - oldArcX);
            const dx = shiftedArcX - triggerX;
            minDx = Math.min(minDx, dx);
            if (dx < -0.001) backEvents++;
            const landY = Number.isFinite(z.landY) ? z.landY : 455;
            const surface = (r.groundSegments || []).find(g => landX >= g.x - 8 && landX <= g.x + g.w + 8 && Math.abs(g.y - landY) <= 90);
            if (!surface) landingDeaths++;
          }
        }
      }
      rows.push({ routeId: id, zones, probes, backEvents, landingDeaths, minDx: Number.isFinite(minDx) ? +minDx.toFixed(3) : null });
    }
    return rows;
  });
  await page.close();
  return { rows: table, totalBackEvents: table.reduce((n, r) => n + r.backEvents, 0), totalLandingDeaths: table.reduce((n, r) => n + r.landingDeaths, 0), consoleErrors: errors.length, errors };
}

async function finishChiefEvidence(browser, routeId, viewport, file) {
  const { page, errors } = await pageWith(browser, viewport);
  const metric = await page.evaluate(id => {
    __TMB_A12__.startRoute(id);
    const route = __TMB_A12__.routeDefinition(id);
    const finishGround = [...route.groundSegments].filter(g => g.x <= route.finishX && route.finishX <= g.x + g.w + 80).sort((a, b) => a.y - b.y)[0]?.y ?? 455;
    __TMB_A12__.placePlayer(route.finishX - 260, finishGround - 48);
    __TMB_A12__.forceChiefNear(-260);
    for (let i = 0; i < 80; i++) __tmbCampaignStep(1 / 60);
    __TMB_A12__.placePlayer(route.finishX + 2, finishGround - 48);
    for (let i = 0; i < 80; i++) __tmbCampaignStep(1 / 60);
    if (!__TMB_A12__.getState().result) __TMB_A12__.finishResult();
    __TMB_A12__.forceChiefNear(-260);
    __tmbCampaignDraw();
    const s = __TMB_A12__.getState();
    const cx = s.chief.x + 16;
    const ground = [...route.groundSegments].filter(g => cx >= g.x - 2 && cx <= g.x + g.w + 2).sort((a, b) => a.y - b.y)[0]?.y ?? null;
    return { routeId: id, viewport, chiefX: +s.chief.x.toFixed(2), feetY: +(s.chief.y + 48).toFixed(2), groundY: ground, delta: ground == null ? null : +(s.chief.y + 48 - ground).toFixed(2), result: !!s.result };
  }, routeId);
  await page.screenshot({ path: path.join(out, file) });
  await page.close();
  return { ...metric, consoleErrors: errors.length, errors };
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const copiedVideoFrames = copyVideoFrames();
    const pushback = await pushbackEvidence(browser);
    const routeTable = await routeArcTable(browser);
    const finishChief = [
      await finishChiefEvidence(browser, "D01", { width: 1280, height: 720 }, "finish-chief-d01-1280x720.png"),
      await finishChiefEvidence(browser, "D04", { width: 1280, height: 720 }, "finish-chief-d04-1280x720.png"),
      await finishChiefEvidence(browser, "D01", { width: 390, height: 844 }, "finish-chief-d01-390x844.png"),
      await finishChiefEvidence(browser, "D04", { width: 390, height: 844 }, "finish-chief-d04-390x844.png"),
    ];
    const metrics = { mojibake: mojibakeReport(), copiedVideoFrames, pushback, routeTable, finishChief, consoleErrors: pushback.consoleErrors + routeTable.consoleErrors + finishChief.reduce((n, r) => n + r.consoleErrors, 0) };
    fs.writeFileSync(path.join(out, "pushback-metrics.json"), JSON.stringify(metrics, null, 2));
    if (metrics.mojibake.totalMatches !== 0 || !metrics.mojibake.indexNonAsciiSameAs37f63dd) throw new Error("mojibake report failed");
    if (pushback.afterDx < -0.001 || routeTable.totalBackEvents !== 0 || routeTable.totalLandingDeaths !== 0) throw new Error("arc pushback table failed");
    if (finishChief.some(r => r.delta !== 0)) throw new Error("finish chief feet not grounded");
    if (metrics.consoleErrors !== 0) throw new Error("console errors");
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
