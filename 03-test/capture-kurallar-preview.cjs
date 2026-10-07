#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const currentRoot = process.env.CURRENT_ROOT || path.resolve(__dirname, "..");
const beforeRoot = process.env.BEFORE_ROOT || "E:/oyunlar/TrustMeBro-wt/d09-sarkan";
const outDir = process.env.OUT_DIR || "E:/oyunlar/TrustMeBro/02-kod/03-test/manager-preview/kurallar";
const routes = (process.env.ROUTES || "D07,D08,D10,D11,D12,D13,D15,D17,D18,F01,D03,F03,F04").split(",");
const removedByRoute = {
  D07: ["d07-slide-01"],
  D08: ["d08-slide-01", "d08-slide-03"],
  D10: ["d10-slide-01", "d10-slide-02"],
  D11: ["d11-slide-02"],
  D12: ["d12-slide-01"],
  D13: ["d13-slide-01", "d13-slide-02", "d13-slide-03"],
  D15: ["d15-slide-01"],
  D17: ["d17-p2-m03-slide-06"],
  D18: ["d18-p1-a01-slide-01", "d18-p2-f03-slide-04", "d18-p2-f03-slide-05"],
  F01: ["f01-p2-d13-slide-06"],
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; res.end("missing"); return; }
      res.setHeader("Content-Type", rel.endsWith(".js") ? "text/javascript" : rel.endsWith(".html") ? "text/html" : "application/octet-stream");
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function boot(browser, server, routeId) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator(".characterChoice:visible").first();
  if (await choice.count()) await choice.click();
  if (routeId[0] === "F") {
    await page.evaluate(async () => {
      await __TMB_A12__.setWallet?.(2000);
      await __TMB_A12__.purchaseWorld?.("frozen");
      const p = __TMB_A12__.getState().profile;
      p.selectedWorldId = "frozen";
      p.ownedWorldIds = Array.from(new Set([...(p.ownedWorldIds || []), "frozen"]));
      for (const prior of ["F01", "F02", "F03"]) p.progressByRoute[prior] = { ...(p.progressByRoute[prior] || {}), completed: true, stars: 3 };
      localStorage.setItem("trust_me_bro_campaign_profile_v1", JSON.stringify(p));
    });
    await page.reload();
    await page.waitForFunction(() => window.__TMB_A12__);
    const again = page.locator(".characterChoice:visible").first();
    if (await again.count()) await again.click();
  }
  await page.evaluate(id => {
    __TMB_A12__.renderWorldOnRoute(id[0] === "F" ? "frozen" : "dock31", id);
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief?.();
  }, routeId);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, routeId);
  return page;
}

async function routeDefinition(page, routeId) {
  return page.evaluate(id => __TMB_A12__.routeDefinition(id), routeId);
}

function changedPoints(routeId, before, after) {
  const points = [];
  for (const id of removedByRoute[routeId] || []) {
    const o = (before.obstacles || []).find(v => v.id === id);
    if (o) points.push({ label: id, x: o.x, y: o.baseY || o.y || 455 });
  }
  const byId = new Map((before.groundSegments || []).map(s => [s.id, s]));
  for (const s of after.groundSegments || []) {
    const b = byId.get(s.id);
    if (b && (Math.abs((b.x || 0) - (s.x || 0)) > 0.5 || Math.abs((b.w || 0) - (s.w || 0)) > 0.5)) {
      points.push({ label: `${s.id}-gap`, x: Math.max(b.x + b.w, s.x + 24), y: s.y || b.y || 455 });
    }
  }
  if (!points.length) {
    const first = (before.groundSegments || [])[0] || { x: 260, y: 455 };
    points.push({ label: `${routeId}-overview`, x: first.x + 160, y: first.y });
  }
  return points.slice(0, 3);
}

async function snap(page, point) {
  await page.evaluate(p => {
    __TMB_A12__.placePlayer(Math.max(60, p.x - 160), (p.y || 455) - 48);
    for (let i = 0; i < 120; i++) __tmbCampaignStep(1 / 60);
    __tmbCampaignDraw();
  }, point);
  return await page.locator("#game").screenshot();
}

async function compose(browser, routeId, rows, file) {
  const page = await browser.newPage({ viewport: { width: 1720, height: Math.max(390, rows.length * 430) }, deviceScaleFactor: 1 });
  const htmlRows = rows.map((r, i) => `
    <section>
      <div class="label">${routeId} / ${r.label}</div>
      <img src="data:image/png;base64,${r.before.toString("base64")}">
      <img src="data:image/png;base64,${r.after.toString("base64")}">
    </section>`).join("");
  await page.setContent(`<!doctype html><style>
    body{margin:0;background:#111;color:white;font:18px Arial,sans-serif}
    section{height:430px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;padding:30px 16px 0;box-sizing:border-box;position:relative}
    .label{position:absolute;left:20px;top:6px;background:#111;padding:2px 8px}
    img{width:844px;height:390px;object-fit:contain;background:#000}
  </style>${htmlRows}`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const [beforeServer, currentServer] = await Promise.all([serve(beforeRoot), serve(currentRoot)]);
  const browser = await chromium.launch();
  try {
    for (const routeId of routes) {
      const beforePage = await boot(browser, beforeServer, routeId);
      const afterPage = await boot(browser, currentServer, routeId);
      const beforeRoute = await routeDefinition(beforePage, routeId);
      const afterRoute = await routeDefinition(afterPage, routeId);
      const points = changedPoints(routeId, beforeRoute, afterRoute);
      const rows = [];
      for (const point of points) rows.push({ label: point.label, before: await snap(beforePage, point), after: await snap(afterPage, point) });
      await compose(browser, routeId, rows, path.join(outDir, `${routeId}-once-sonra.png`));
      await beforePage.close();
      await afterPage.close();
      console.log(`PREVIEW ${routeId} ${points.map(p => p.label).join(",")}`);
    }
  } finally {
    await browser.close();
    await new Promise(resolve => beforeServer.close(resolve));
    await new Promise(resolve => currentServer.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
