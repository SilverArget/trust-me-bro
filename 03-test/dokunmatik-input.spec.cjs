const { test, expect, devices } = require('playwright/test');
const fs = require('fs');
const http = require('http');
const path = require('path');

const root = process.env.TMB_ROOT || path.resolve(__dirname, '..');
const outDir = process.env.TMB_OUT || path.join(__dirname, 'manager-preview', 'dokunmatik');
const label = process.env.TMB_LABEL || 'after';
let server;
let base;

test.beforeAll(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(root, rel), (error, body) => {
      if (error) {
        res.statusCode = 404;
        res.end('missing');
        return;
      }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});

test.afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

function deviceCases(browserName) {
  const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'] || {};
  const pixel = devices['Pixel 7'] || devices['Pixel 5'] || {};
  if (browserName === 'webkit') {
    return [
      { name: 'webkit-iphone-portrait', options: { ...iphone, viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true } },
      { name: 'webkit-iphone-landscape', options: { ...iphone, viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true } },
    ];
  }
  if (browserName === 'chromium') {
    return [
      { name: 'chromium-pixel7-portrait', options: { ...pixel, viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } },
      { name: 'chromium-pixel7-landscape', options: { ...pixel, viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true } },
    ];
  }
  return [];
}

async function boot(page) {
  await page.goto(`${base}#debug`);
  await page.waitForFunction(() => window.__tmb && window.__TMB_A12__);
  const choice = page.locator('.characterChoice:visible').first();
  if (await choice.count()) await choice.tap();
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    window.__probePointerTargets = {};
    if (window.__tmbSetProgress) window.__tmbSetProgress(1, 1, 0, 0);
    if (window.__TMB_A12__) window.__TMB_A12__.startRoute('D01');
  });
}

async function pointer(page, type, x, y, id = 41) {
  await page.evaluate(({ type, x, y, id }) => {
    const store = window.__probePointerTargets || (window.__probePointerTargets = {});
    const target = type === 'pointerdown'
      ? (document.elementFromPoint(x, y) || document.body)
      : (store[id] || document.elementFromPoint(x, y) || document.body);
    if (type === 'pointerdown') store[id] = target;
    const ev = new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: id,
      pointerType: 'touch',
      isPrimary: id === 41,
      clientX: x,
      clientY: y,
      button: type === 'pointerdown' ? 0 : -1,
      buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    });
    target.dispatchEvent(ev);
    if (type === 'pointerup' || type === 'pointercancel') delete store[id];
  }, { type, x, y, id });
}

async function read(page) {
  return await page.evaluate(() => {
    const knob = document.querySelector('#joystickKnob');
    const joy = document.querySelector('#joystick').getBoundingClientRect();
    const jump = document.querySelector('#jumpWrap button').getBoundingClientRect();
    const campaignState = window.__TMB_A12__?.getState?.();
    const player = campaignState?.player || window.__tmb.player;
    return {
      axis: +(window.__tmb.joystick.axis || 0).toFixed(3),
      active: window.__tmb.joystick.active,
      jump: window.__tmb.keys.jump,
      jumpPressed: document.querySelector('#jumpWrap button')?.classList.contains('pressed') || false,
      vx: +(player.vx || 0).toFixed(1),
      vy: +(player.vy || 0).toFixed(1),
      onGround: !!player.onGround,
      knob: knob.style.transform || 'translate(0px,0px)',
      joy: { x: +joy.x.toFixed(1), y: +joy.y.toFixed(1), w: +joy.width.toFixed(1), h: +joy.height.toFixed(1), right: +joy.right.toFixed(1) },
      jumpRect: { x: +jump.x.toFixed(1), y: +jump.y.toFixed(1), w: +jump.width.toFixed(1), h: +jump.height.toFixed(1) },
    };
  });
}

async function resetRun(page) {
  await page.evaluate(() => {
    if (window.__TMB_A12__) window.__TMB_A12__.startRoute('D01');
    if (window.__probePointerTargets) window.__probePointerTargets = {};
  });
  await page.waitForTimeout(20);
}

async function runDrag(page, name, start, dx = 48) {
  await resetRun(page);
  await pointer(page, 'pointerdown', start.x, start.y);
  const t0 = await page.evaluate(() => performance.now());
  await pointer(page, 'pointermove', start.x + dx, start.y);
  const immediate = await read(page);
  let runMs = null;
  for (let i = 0; i < 24; i++) {
    await page.evaluate(() => {
      if (window.__tmbCampaignStep) window.__tmbCampaignStep(1 / 60);
    });
    await page.waitForTimeout(16);
    const s = await read(page);
    if (Math.abs(s.vx) >= 30) {
      runMs = +(await page.evaluate(t => performance.now() - t, t0)).toFixed(1);
      break;
    }
  }
  const after = await read(page);
  await pointer(page, 'pointerup', start.x + dx, start.y);
  await page.waitForTimeout(20);
  const released = await read(page);
  return { name, start: { x: Math.round(start.x), y: Math.round(start.y) }, immediate, after, runMs, released };
}

async function addZoneOverlay(page) {
  await page.evaluate(() => {
    document.querySelector('#probeZones')?.remove();
    const root = document.createElement('div');
    root.id = 'probeZones';
    root.style.cssText = 'position:fixed;inset:0;z-index:999999;pointer-events:none;font:800 13px system-ui;color:white';
    const mk = (text, css) => {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = `position:absolute;display:flex;align-items:flex-start;justify-content:center;padding-top:10px;border:2px solid #fff8;${css}`;
      root.appendChild(d);
    };
    mk('JOYSTICK INVISIBLE ZONE', 'left:0;bottom:0;width:45vw;height:55vh;background:#00aaff40;');
    mk('JUMP INVISIBLE ZONE', 'right:0;bottom:0;width:40vw;height:55vh;background:#ffcc0040;');
    document.body.appendChild(root);
  });
}

test('dokunmatik joystick ve jump input olcumu', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const rows = [];
  const browserName = browser.browserType().name();
  for (const cfg of deviceCases(browserName)) {
    const context = await browser.newContext(cfg.options);
    const page = await context.newPage();
    await boot(page);
    const baseState = await read(page);
    const center = { x: baseState.joy.x + baseState.joy.w / 2, y: baseState.joy.y + baseState.joy.h / 2 };
    const edgeOutside = { x: baseState.joy.right + 36, y: center.y };
    const floating = { x: Math.min(page.viewportSize().width * 0.30, baseState.joy.right + 84), y: page.viewportSize().height * 0.70 };
    const centerDrag = await runDrag(page, 'visible-center-drag', center);
    const edgeDrag = await runDrag(page, 'edge-outside-visible-pad', edgeOutside);
    const floatDrag = await runDrag(page, 'floating-left-zone', floating);

    await resetRun(page);
    await pointer(page, 'pointerdown', center.x, center.y, 51);
    await pointer(page, 'pointermove', center.x + 48, center.y, 51);
    const beforeCancel = await read(page);
    await pointer(page, 'pointercancel', center.x + 48, center.y, 51);
    await page.waitForTimeout(80);
    const afterCancel80 = await read(page);
    await pointer(page, 'pointerup', center.x + 48, center.y, 51);
    await page.waitForTimeout(20);
    const afterCancelUp = await read(page);

    await resetRun(page);
    await pointer(page, 'pointerdown', floating.x, floating.y, 61);
    await pointer(page, 'pointermove', floating.x + 52, floating.y, 61);
    await pointer(page, 'pointerdown', page.viewportSize().width * 0.78, page.viewportSize().height * 0.72, 62);
    await page.waitForTimeout(50);
    const combo = await read(page);
    await pointer(page, 'pointerup', floating.x + 52, floating.y, 61);
    await pointer(page, 'pointerup', page.viewportSize().width * 0.78, page.viewportSize().height * 0.72, 62);

    const pauseWasVisible = await page.locator('#pauseBtn').isVisible();
    if (pauseWasVisible) await page.locator('#pauseBtn').tap();
    const pauseClicked = await page.locator('#pauseOverlay.show').isVisible().catch(() => false);
    if (pauseClicked) await page.locator('#pauseOverlay').tap({ position: { x: 8, y: 8 } }).catch(() => {});
    const muteWasVisible = await page.locator('#muteBtn').isVisible();
    if (muteWasVisible) await page.locator('#muteBtn').tap();
    const muteClicked = muteWasVisible;

    rows.push({
      label,
      device: cfg.name,
      viewport: `${page.viewportSize().width}x${page.viewportSize().height}`,
      base: baseState,
      centerDrag,
      edgeDrag,
      floatDrag,
      pointercancel: { beforeCancel, afterCancel80, afterCancelUp },
      combo,
      buttons: { pauseClicked, muteClicked },
    });

    if (label === 'after' && browserName === 'webkit') {
      await addZoneOverlay(page);
      await page.screenshot({ path: path.join(outDir, `${cfg.name}-zones.png`), fullPage: true });
    }
    await context.close();
  }
  fs.writeFileSync(path.join(outDir, `${label}-${browserName}.json`), JSON.stringify(rows, null, 2));
  console.log(`DOKUNMATIK_${label.toUpperCase()}_${browserName.toUpperCase()} ${JSON.stringify(rows)}`);
  expect(rows.length).toBeGreaterThan(0);
});
