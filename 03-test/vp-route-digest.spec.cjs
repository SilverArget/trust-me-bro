const { test, expect } = require('playwright/test');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { runBot } = require('./lib/bot-s-drive.cjs');
const { runMagma } = require('./lib/bot-magma.cjs');
const { runAftermath } = require('./lib/bot-aftermath.cjs');

const root = path.join(__dirname, '..');
const goldenDir = process.env.TMB_GOLDEN_DIR || path.join(root, '03-test', 'golden-current');
const routes = ['D02', 'D06', 'F01', 'M01', 'A01'];
let server, base;
let runSerial = 0;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      res.statusCode = error ? 404 : 200;
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(error ? 'missing' : body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
  fs.mkdirSync(goldenDir, { recursive: true });
});
test.afterAll(async () => new Promise(resolve => server.close(resolve)));
test.beforeEach(async ({ page }) => page.addInitScript(() => {
  let seed = 0x1a2b3c4d;
  Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  window.__tmbAdvanceTime = () => {};
}));

async function digest(page, routeId) {
  await page.goto(base + `?digestRun=${++runSerial}#debug`);
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.isVisible()) await choice.click();
  await page.evaluate(() => {
    window.__routeDigest = { samples: [], checkpoints: [], events: [], wallRunContactFrame: null };
    let frame = 0, lastCheckpoint = null, lastState = null;
    const original = window.__tmbCampaignStep;
    window.__tmbCampaignStep = dt => {
      original(dt);
      frame++;
      const state = window.__TMB_A12__.getState();
      if (window.__routeDigest.wallRunContactFrame == null && (state.wallMantle || state.lastWallMantle)) {
        window.__routeDigest.wallRunContactFrame = frame;
      }
      const movement = state.player.state;
      if (state.checkpointX !== lastCheckpoint) {
        if (state.checkpointX != null) window.__routeDigest.checkpoints.push(state.checkpointX);
        lastCheckpoint = state.checkpointX;
      }
      if (movement !== lastState && ['vault', 'slide', 'wallRun', 'jump', 'idle', 'run'].includes(movement)) {
        const event = movement === 'idle' || movement === 'run' ? (lastState === 'jump' ? 'land' : null) : movement;
        if (event) window.__routeDigest.events.push({ frame, event });
        lastState = movement;
      }
      if (frame % 6 === 0) window.__routeDigest.samples.push([Math.round(state.player.x * 10) / 10, Math.round(state.player.y * 10) / 10]);
    };
  });
  const result = routeId[0] === 'M' ? await runMagma(page, routeId) : routeId[0] === 'A' ? await runAftermath(page, routeId) : await runBot(page, routeId);
  const trace = await page.evaluate(() => window.__routeDigest);
  const payload = { routeId, finished: result.finished, deaths: result.deaths, checkpoints: trace.checkpoints, events: trace.events, samples: trace.samples };
  if (routeId === 'D02') payload.wallRunContactFrame = trace.wallRunContactFrame;
  payload.digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return payload;
}

// T2A-3 semantic contract: E:/oyunlar/TrustMeBro/01-tasarim/2026-10-02-vector-t2a3-brief.md
function expectD02WallRunSemanticMatch(actual, golden) {
  const actualContact = actual.wallRunContactFrame;
  expect(actualContact, 'D02 actual has no wallRun contact').toBeDefined();
  expect(actual.events.filter(item => item.frame < actualContact)).toEqual(
    golden.events.filter(item => item.frame < actualContact),
  );
  const goldenPreContactSamples = Math.floor((actualContact - 1) / 6);
  const actualPreContactSamples = Math.floor((actualContact - 1) / 6);
  expect(actualPreContactSamples).toBe(goldenPreContactSamples);
  expect(actual.samples.slice(0, actualPreContactSamples)).toEqual(
    golden.samples.slice(0, goldenPreContactSamples),
  );
  expect({
    finished: actual.finished,
    deaths: actual.deaths,
    checkpoints: actual.checkpoints,
    eventTypes: actual.events.map(item => item.event),
  }).toEqual({
    finished: golden.finished,
    deaths: golden.deaths,
    checkpoints: golden.checkpoints,
    eventTypes: golden.events.map(item => item.event),
  });
}

for (const routeId of routes) test(`${routeId} deterministic route digest`, async ({ page }) => {
  const first = await digest(page, routeId);
  const second = await digest(page, routeId);
  expect(second).toEqual(first);
  const file = path.join(goldenDir, routeId + '.json');
  if (process.env.TMB_WRITE_GOLDEN === '1') fs.writeFileSync(file, JSON.stringify(first, null, 2) + '\n');
  else {
    const golden = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (routeId === 'D02') expectD02WallRunSemanticMatch(first, golden);
    else expect(first).toEqual(golden);
  }
  console.log('VP_ROUTE_DIGEST ' + JSON.stringify({ routeId, digest: first.digest, finished: first.finished, deaths: first.deaths, samples: first.samples.length }));
});
