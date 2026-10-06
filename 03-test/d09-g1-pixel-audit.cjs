#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const outDir = path.join(__dirname, "manager-preview", "d09-mantik");
const REGIONS = [
  { id: "g1-left", x: 377, y: 150, w: 64, h: 62 },
  { id: "g1-wide", x: 648, y: 150, w: 114, h: 62 },
  { id: "g1-right", x: 1210, y: 132, w: 44, h: 78 },
];

async function countFile(page, file) {
  const body = fs.readFileSync(path.join(outDir, file)).toString("base64");
  const url = `data:image/png;base64,${body}`;
  await page.setContent(`<canvas id="c"></canvas><img id="i" src="${url}">`);
  await page.waitForFunction(() => i.complete && i.naturalWidth);
  return page.evaluate((regions) => {
    const canvas = document.getElementById("c");
    const ctx = canvas.getContext("2d");
    const img = document.getElementById("i");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    return Object.fromEntries(regions.map((r) => {
      const data = ctx.getImageData(r.x, r.y, r.w, r.h).data;
      let rope = 0;
      for (let i = 0; i < data.length; i += 4) {
        const red = data[i], green = data[i + 1], blue = data[i + 2], alpha = data[i + 3];
        if (alpha > 200 && red >= 22 && red <= 34 && green >= 36 && green <= 50 && blue >= 43 && blue <= 60) rope++;
      }
      return [r.id, rope];
    }));
  }, REGIONS);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const before = await countFile(page, "before-g1-1280x720.png");
    const after = await countFile(page, "after-g1-1280x720.png");
    const totalBefore = Object.values(before).reduce((a, b) => a + b, 0);
    const totalAfter = Object.values(after).reduce((a, b) => a + b, 0);
    const payload = { before, after, totalBefore, totalAfter, threshold: 250 };
    console.log(JSON.stringify(payload, null, 2));
    if (!(totalBefore < 80 && totalAfter > payload.threshold)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
