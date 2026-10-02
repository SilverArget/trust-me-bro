const { test, expect } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { runBot } = require('./lib/bot-s-drive.cjs');

const root = path.join(__dirname, '..');
let server, base;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

for (const routeId of ['D01', 'D02']) {
  test(`${routeId} Bot S wall body penetration stays at or below 2 px`, async ({ page }) => {
    await page.goto(base + '#debug');
    await page.waitForFunction(() => window.__TMB_A12__);
    await page.locator('.characterChoice:visible').first().click();
    await page.evaluate(() => {
      window.__wallClipSamples = [];
      const original = window.__tmbCampaignStep;
      window.__tmbCampaignStep = dt => {
        original(dt);
        const state = window.__TMB_A12__.getState();
        const player = state.player;
        const hitbox = state.hitbox;
        for (const wall of state.route.obstacles.filter(item => item.type === 'wallRun')) {
          const body = { x: wall.x + 2, y: (wall.baseY || 455) - wall.h + 2, w: Math.max(0, wall.w - 4), h: Math.max(0, wall.h - 4) };
          const overlapX = Math.max(0, Math.min(player.x + hitbox.w, body.x + body.w) - Math.max(player.x, body.x));
          const overlapY = Math.max(0, Math.min(player.y + hitbox.h, body.y + body.h) - Math.max(player.y, body.y));
          if (overlapX > 0 && overlapY > 0) window.__wallClipSamples.push({ wall: wall.id, x: wall.x, y: body.y, h: body.h, playerX: player.x, playerY: player.y, depth: Math.min(overlapX, overlapY) });
        }
      };
    });
    await runBot(page, routeId, { live: true });
    const result = await page.evaluate(() => {
      const walls = __TMB_A12__.getState().route.obstacles.filter(item => item.type === 'wallRun').map(item => ({ id: item.id, x: item.x, y: (item.baseY || 455) - item.h, h: item.h }));
      const samples = window.__wallClipSamples;
      return { walls, sampleHz: 60, sampleCount: samples.length, maxDepth: samples.reduce((max, item) => Math.max(max, item.depth), 0), worst: samples.sort((a, b) => b.depth - a.depth)[0] || null };
    });
    console.log('VP_WALL_CLIP ' + JSON.stringify({ routeId, ...result }));
    expect(result.walls.length, `No vertical wall attempted: ${JSON.stringify(result)}`).toBeGreaterThan(0);
    expect(result.sampleCount, `Wall was not intersected/sampled: ${JSON.stringify(result)}`).toBeGreaterThan(0);
    expect(result.maxDepth, `Wall penetration >2 px: ${JSON.stringify(result)}`).toBeLessThanOrEqual(2);
  });
}
