const { test } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');
const childProcess = require('child_process');

const root = path.join(__dirname, '..');
const outDir = path.join(__dirname, 'manager-preview', 'isaret');
const phase = process.env.TMB_HINT_PHASE || 'after';
const baselineJs = phase === 'before'
  ? childProcess.execFileSync('git', ['show', 'HEAD:js/a12-campaign.js'], { cwd: root, encoding: 'utf8' })
  : null;

let server, base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    if (baselineJs && rel.replace(/\\/g, '/') === 'js/a12-campaign.js') {
      res.setHeader('Content-Type', 'text/javascript');
      return res.end(baselineJs);
    }
    fs.readFile(path.join(root, rel), (err, body) => {
      if (err) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

async function boot(page, id, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(base + '#debug');
  await page.waitForFunction(() => window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.click();
  await page.evaluate(async id => {
    if (id[0] === 'F') { await __TMB_A12__.setWallet(500); await __TMB_A12__.purchaseWorld('frozen'); __TMB_A12__.renderWorldOnRoute('frozen', id); }
    else __TMB_A12__.renderWorldOnRoute('dock31', id);
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief();
  }, id);
  await page.waitForFunction(id => __TMB_A12__.getState().route.id === id, id);
}

async function segment(page, x) {
  await page.evaluate(x => { window.__tmbSegmentStart(x); __TMB_A12__.disableChief(); }, x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.up('ArrowRight');
}

test('manager jump hint preview frames', async ({ page }) => {
  await boot(page, 'D09', { width: 1280, height: 720 });
  await page.screenshot({ path: path.join(outDir, `${phase}-d09-start-1280x720.png`) });

  await boot(page, 'D01', { width: 1280, height: 720 });
  await segment(page, 5488);
  await page.screenshot({ path: path.join(outDir, `${phase}-d01-far-1280x720.png`) });
  await segment(page, 5688);
  await page.screenshot({ path: path.join(outDir, `${phase}-d01-near-1280x720.png`) });

  await boot(page, 'D01', { width: 390, height: 844 });
  await segment(page, 5688);
  await page.screenshot({ path: path.join(outDir, `${phase}-portrait-390x844.png`) });
});
