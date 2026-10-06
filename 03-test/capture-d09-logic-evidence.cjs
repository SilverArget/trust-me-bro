#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const outDir = path.join(__dirname, "manager-preview", "d09-mantik");
const beforeJs = childProcess.execFileSync("git", ["show", "53a7c16:js/a12-campaign.js"], { cwd: root, encoding: "utf8" });

function contentType(rel) {
  if (rel.endsWith(".js")) return "text/javascript";
  if (rel.endsWith(".html")) return "text/html";
  if (rel.endsWith(".css")) return "text/css";
  if (rel.endsWith(".png")) return "image/png";
  if (rel.endsWith(".jpg") || rel.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

async function withServer(mode, fn) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    if (mode === "before" && rel === "js/a12-campaign.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(beforeJs);
      return;
    }
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; res.end("missing"); return; }
      res.setHeader("Content-Type", contentType(rel));
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}/index.html#debug`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function boot(page, url) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(url);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator(".characterChoice:visible").first();
  if (await choice.count()) await choice.click();
  await page.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute("dock31", "D09");
    __TMB_A12__.startRoute("D09");
    __TMB_A12__.disableChief();
  });
}

async function frameAt(page, x, file, redBox = null) {
  await page.evaluate(x => {
    const s = __tmbSegmentStart(x);
    __TMB_A12__.disableChief();
    for (let i = 0; i < 90; i++) __tmbCampaignStep(1 / 60);
    __tmbCampaignDraw();
    return s;
  }, x);
  if (redBox) {
    await page.evaluate(box => {
      const d = document.createElement("div");
      Object.assign(d.style, {
        position: "fixed",
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.w}px`,
        height: `${box.h}px`,
        border: "5px solid #f22",
        boxSizing: "border-box",
        zIndex: 99999,
        pointerEvents: "none",
      });
      d.dataset.logicEvidence = "1";
      document.body.appendChild(d);
    }, redBox);
  }
  await page.screenshot({ path: path.join(outDir, file) });
  await page.evaluate(() => document.querySelectorAll("[data-logic-evidence]").forEach(el => el.remove()));
}

async function captureMode(browser, mode) {
  await withServer(mode, async url => {
    const page = await browser.newPage();
    try {
      await boot(page, url);
      const red = mode === "before";
      await frameAt(page, 3050, `${mode}-g1-1280x720.png`, red ? { x: 455, y: 165, w: 420, h: 195 } : null);
      await frameAt(page, 6400, `${mode}-g2-1280x720.png`, red ? { x: 440, y: 360, w: 470, h: 120 } : null);
      for (const [i, x] of [700, 2500, 4400, 6400].entries()) {
        await frameAt(page, x, `${mode}-strip-${String(i + 1).padStart(2, "0")}.png`, red ? { x: 432, y: 130, w: 480, h: 390 } : null);
      }
    } finally {
      await page.close();
    }
  });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    await captureMode(browser, "before");
    await captureMode(browser, "after");
  } finally {
    await browser.close();
  }
  console.log(`wrote evidence to ${outDir}`);
})();
