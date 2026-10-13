#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const Module = require('module');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { performance } = require('perf_hooks');

const REPO = path.resolve(__dirname, '..');
const BUILD = path.resolve('E:/oyunlar/TrustMeBro/crazygames/build-dd4ec2e');
const OUTPUT_ROOT = path.resolve('E:/oyunlar/TrustMeBro/crazygames/onizleme-dd4ec2e');
const DRIVER_FILE = path.join(REPO, '03-test', 'vp-dock-play.spec.cjs');
const DEFAULT_ROUTES = ['D07', 'F03', 'M02', 'A02'];
const LAYOUTS = {
  landscape: {
    viewport: { width: 1920, height: 1080 },
    video: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    outputRoot: 'raw',
    outputFolder: 'landscape',
  },
  portrait: {
    viewport: { width: 1080, height: 1620 },
    video: { width: 1080, height: 1620 },
    deviceScaleFactor: 1,
    outputRoot: 'raw',
    outputFolder: 'portrait',
  },
  landscape540: {
    viewport: { width: 960, height: 540 },
    video: { width: 960, height: 540 },
    deviceScaleFactor: 1,
    outputRoot: 'raw540',
    outputFolder: 'landscape',
  },
  portrait810: {
    viewport: { width: 540, height: 810 },
    video: { width: 540, height: 810 },
    deviceScaleFactor: 1,
    outputRoot: 'raw540',
    outputFolder: 'portrait',
  },
};

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const result = { routes: DEFAULT_ROUTES, layouts: Object.keys(LAYOUTS), headless: true };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value === '--routes') result.routes = argv[++i].split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    else if (value === '--layout') {
      const layout = argv[++i];
      result.layouts = layout === 'all' ? Object.keys(LAYOUTS)
        : layout === 'raw540' ? ['landscape540', 'portrait810']
          : [layout];
    } else if (value === '--headed') result.headless = false;
    else if (value === '--help') {
      console.log('Usage: node tools/capture-cg-preview.cjs [--routes D07,F03,M02,A02] [--layout landscape|portrait|landscape540|portrait810|raw540|all] [--headed]');
      process.exit(0);
    } else fail(`Unknown argument: ${value}`);
  }
  for (const layout of result.layouts) if (!LAYOUTS[layout]) fail(`Unknown layout: ${layout}`);
  return result;
}

function resolvePlaywright() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules'),
    ...(() => {
      const npx = path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx');
      return fs.existsSync(npx)
        ? fs.readdirSync(npx).map(name => path.join(npx, name, 'node_modules'))
        : [];
    })(),
  ];
  for (const base of candidates) {
    try {
      const entry = require.resolve('playwright', { paths: [base] });
      const testEntry = require.resolve('playwright/test', { paths: [base] });
      return { playwright: require(entry), test: require(testEntry), moduleDir: path.dirname(entry) };
    } catch (_) {}
  }
  fail('Playwright Node package was not found (checked global npm and npx caches).');
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webmanifest': 'application/manifest+json',
  })[ext] || 'application/octet-stream';
}

async function serve(directory) {
  const resolvedRoot = path.resolve(directory);
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(resolvedRoot, relative);
    if (file !== resolvedRoot && !file.startsWith(resolvedRoot + path.sep)) {
      response.statusCode = 403;
      response.end('forbidden');
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.statusCode = error.code === 'ENOENT' ? 404 : 500;
        response.end(error.code || 'read error');
        return;
      }
      response.setHeader('Content-Type', contentType(file));
      response.setHeader('Cache-Control', 'no-store');
      response.end(body);
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, base: `http://127.0.0.1:${server.address().port}/index.html` };
}

function loadDriver(base, testModule) {
  process.env.TMB_APP_ROOT = BUILD;
  global.__TMB_CAPTURE_BASE__ = base;
  global.__TMB_CAPTURE_TEST__ = testModule;
  let source = fs.readFileSync(DRIVER_FILE, 'utf8');
  source = source.slice(0, source.indexOf('\nfor (const id of routeIds) test('));
  source = source.replace(
    "const { test, expect } = require('playwright/test');",
    'const { expect } = global.__TMB_CAPTURE_TEST__;',
  );
  const hooksStart = source.indexOf('let server, base;');
  const hooksEndMarker = "test.afterAll(async () => new Promise(resolve => server.close(resolve)));";
  const hooksEnd = source.indexOf(hooksEndMarker);
  if (hooksStart < 0 || hooksEnd < 0) fail('vp-dock-play server hook block was not found');
  source = source.slice(0, hooksStart)
    + 'let base = global.__TMB_CAPTURE_BASE__;\n'
    + source.slice(hooksEnd + hooksEndMarker.length);
  const autoRun = /  await page\.keyboard\.down\('ArrowRight'\);\r?\n}/;
  if (!autoRun.test(source)) fail('vp-dock-play boot ArrowRight tail was not found');
  source = source.replace(autoRun, '}');
  const jumpCall = '      await jump(page, touch);';
  if (!source.includes(jumpCall)) fail('vp-dock-play drive jump call was not found');
  source = source.replace(jumpCall, "      if(global.__TMB_CAPTURE_INPUT_EVENT__)global.__TMB_CAPTURE_INPUT_EVENT__({key:target[0],mechanic:target[1].mech,gameTime:s.gameClock,x:p.x});\n" + jumpCall);
  source += '\nmodule.exports={boot,drive,transitions};\n';
  const driver = new Module(DRIVER_FILE, module);
  driver.filename = DRIVER_FILE;
  driver.paths = module.paths;
  driver._compile(source, DRIVER_FILE);
  delete global.__TMB_CAPTURE_BASE__;
  delete global.__TMB_CAPTURE_TEST__;
  return driver.exports;
}

function round(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}

function addEvent(events, type, videoEpoch, routeEpoch, details = {}) {
  const now = performance.now();
  events.push({
    type,
    videoTime: round((now - videoEpoch) / 1000),
    routeTime: round((now - routeEpoch) / 1000),
    ...details,
  });
}

async function observeEvents(page, events, videoEpoch, routeEpoch, control) {
  let previous = null;
  let chiefVisibleSeen = false;
  let finishSeen = false;
  let resultSeen = false;
  while (!control.stop) {
    let sample;
    try {
      sample = await page.evaluate(() => {
        const s = window.__TMB_A12__?.getState();
        if (!s) return null;
        const layout = window.__tmb?.layout || null;
        let chiefVisible = false;
        if (s.chief?.active && s.chief.entryPhase !== 'result' && layout) {
          const scale = layout.viewScale || 1;
          const ox = layout.viewOffsetX || 0;
          const oy = layout.viewOffsetY || 0;
          const cx = ox + (s.chief.x - s.cameraX + s.chief.w / 2) * scale;
          const cy = oy + (s.chief.y + s.cameraWorldY + s.chief.h / 2) * scale;
          chiefVisible = cx >= 0 && cx <= layout.viewportW && cy >= 0 && cy <= layout.viewportH;
        }
        return {
          clock: s.gameClock, state: s.parkour.state, x: s.player.x,
          coins: s.economy.collectedCoinIds, checkpointX: s.checkpointX,
          chiefVisible, finishPhase: s.finishGate.phase, result: !!s.result,
        };
      });
    } catch (_) {
      if (control.stop) break;
      throw _;
    }
    if (sample) {
      if (!previous) {
        previous = { ...sample, coins: [...sample.coins] };
      } else {
        const stateChanged = sample.state !== previous.state;
        if (stateChanged && sample.state === 'jump') addEvent(events, 'jump', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
        if (stateChanged && (sample.state === 'catch' || sample.state === 'climb')) addEvent(events, sample.state, videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
        if (stateChanged && sample.state === 'dive') addEvent(events, 'dive', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
        if (stateChanged && sample.state === 'roll') addEvent(events, 'roll', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
        const oldCoins = new Set(previous.coins);
        for (const coinId of sample.coins) if (!oldCoins.has(coinId)) addEvent(events, 'coin', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x), coinId });
        if (sample.checkpointX !== previous.checkpointX) addEvent(events, 'checkpoint', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x), checkpointX: sample.checkpointX });
        previous = { ...sample, coins: [...sample.coins] };
      }
      if (!chiefVisibleSeen && sample.chiefVisible) {
        chiefVisibleSeen = true;
        addEvent(events, 'chief_visible', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
      }
      if (!finishSeen && sample.finishPhase !== 'open') {
        finishSeen = true;
        addEvent(events, 'finish_gate', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x), phase: sample.finishPhase });
      }
      if (!resultSeen && sample.result) {
        resultSeen = true;
        addEvent(events, 'result_screen', videoEpoch, routeEpoch, { gameTime: round(sample.clock), x: round(sample.x) });
      }
    }
    await page.waitForTimeout(25);
  }
}

function probeVideo(file) {
  const raw = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,avg_frame_rate,nb_frames:format=duration',
    '-of', 'json', file,
  ], { encoding: 'utf8' });
  const data = JSON.parse(raw);
  const stream = data.streams[0];
  const [num, den] = stream.avg_frame_rate.split('/').map(Number);
  return {
    width: stream.width,
    height: stream.height,
    duration: round(Number(data.format.duration)),
    fps: round(den ? num / den : 0),
    rate: stream.r_frame_rate,
    frames: Number(stream.nb_frames) || null,
  };
}

async function captureOne(browser, driver, route, layoutName, temporaryVideoRoot) {
  const layout = LAYOUTS[layoutName];
  const output = path.join(OUTPUT_ROOT, layout.outputRoot);
  const destinationDir = path.join(output, layout.outputFolder);
  fs.mkdirSync(destinationDir, { recursive: true });
  const videoFile = path.join(destinationDir, `${route}.webm`);
  const eventsFile = path.join(destinationDir, `${route}-events.json`);
  for (const file of [videoFile, eventsFile]) if (fs.existsSync(file)) fs.unlinkSync(file);

  const context = await browser.newContext({
    viewport: layout.viewport,
    deviceScaleFactor: layout.deviceScaleFactor,
    locale: 'en-US',
    recordVideo: { dir: temporaryVideoRoot, size: layout.video },
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
  const videoEpoch = performance.now();
  const page = await context.newPage();
  const video = page.video();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(String(error)));

  let events = [];
  let run = null;
  let finalState = null;
  let routeEpoch = null;
  try {
    await driver.boot(page, route, layout.viewport);
    await page.addStyleTag({ content: 'html,body,*{cursor:none!important}' });
    const startState = await page.evaluate(() => __TMB_A12__.getState());
    if (startState.route.id !== route || startState.player.x > 100) fail(`${route} did not start at the route beginning (x=${startState.player.x})`);
    routeEpoch = performance.now();
    addEvent(events, 'route_start', videoEpoch, routeEpoch, { gameTime: round(startState.gameClock), x: round(startState.player.x) });
    const observerControl = { stop: false };
    const observer = observeEvents(page, events, videoEpoch, routeEpoch, observerControl);
    global.__TMB_CAPTURE_INPUT_EVENT__ = input => addEvent(events, 'jump', videoEpoch, routeEpoch, {
      gameTime: round(input.gameTime), x: round(input.x), mechanic: input.mechanic, driverKey: input.key,
    });
    await page.keyboard.down('ArrowRight');
    try {
      run = await driver.drive(page, route);
      await page.keyboard.down('ArrowRight');
      await page.waitForFunction(() => !!__TMB_A12__.getState().result, null, { timeout: 5000 }).catch(() => {});
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(700);
      finalState = await page.evaluate(() => __TMB_A12__.getState());
    } finally {
      await page.keyboard.up('ArrowRight').catch(() => {});
      delete global.__TMB_CAPTURE_INPUT_EVENT__;
      observerControl.stop = true;
      await observer;
    }
  } finally {
    await page.close();
    await video.saveAs(videoFile);
    await context.close();
  }

  const finished = !!finalState?.result || finalState?.player.x + finalState?.hitbox.w >= finalState?.route.finishX;
  const metadata = {
    route,
    layout: layoutName,
    source: BUILD.replaceAll('\\', '/'),
    locale: 'en-US',
    input: 'real page.keyboard',
    viewport: layout.viewport,
    deviceScaleFactor: layout.deviceScaleFactor,
    requestedVideoFrame: layout.video,
    routeStartedAtVideoTime: events.find(event => event.type === 'route_start')?.videoTime ?? null,
    finished,
    deaths: Math.max(run?.deaths || 0, finalState?.deaths || 0),
    chiefCatches: Math.max(run?.chiefCatches || 0, finalState?.chief?.catches || 0),
    retries: run?.retries || 0,
    gameElapsed: round(finalState?.gameClock || 0),
    wallElapsed: round((performance.now() - routeEpoch) / 1000),
    consoleErrors,
    pageErrors,
  };
  const probe = probeVideo(videoFile);
  metadata.video = { file: videoFile.replaceAll('\\', '/'), ...probe };
  fs.writeFileSync(eventsFile, JSON.stringify({ metadata, events }, null, 2) + '\n', 'utf8');
  if (probe.width !== layout.video.width || probe.height !== layout.video.height) fail(`${route}/${layoutName} frame mismatch: ${probe.width}x${probe.height}`);
  if (!finished) fail(`${route}/${layoutName} did not finish`);
  if (metadata.deaths || metadata.chiefCatches) fail(`${route}/${layoutName} was not clean: deaths=${metadata.deaths}, catches=${metadata.chiefCatches}`);
  console.log(JSON.stringify(metadata));
  return metadata;
}

async function captureClean(browser, driver, route, layout, temporaryVideoRoot) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await captureOne(browser, driver, route, layout, temporaryVideoRoot);
    } catch (error) {
      lastError = error;
      console.error(`RETRY ${route}/${layout} attempt=${attempt} reason=${error.message.split('\n')[0]}`);
    }
  }
  throw lastError;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const required of [BUILD, DRIVER_FILE]) if (!fs.existsSync(required)) fail(`Missing required path: ${required}`);
  const pw = resolvePlaywright();
  const served = await serve(BUILD);
  const temporaryVideoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tmb-cg-preview-'));
  let browser;
  try {
    const driver = loadDriver(served.base, pw.test);
    for (const route of options.routes) if (!driver.transitions[route]) fail(`Driver has no transitions for ${route}`);
    browser = await pw.playwright.chromium.launch({ headless: options.headless, args: ['--mute-audio', '--hide-scrollbars'] });
    const summary = [];
    for (const layout of options.layouts) {
      for (const route of options.routes) summary.push(await captureClean(browser, driver, route, layout, temporaryVideoRoot));
    }
    const summariesByRoot = Map.groupBy(summary, capture => LAYOUTS[capture.layout].outputRoot);
    for (const [outputRoot, captures] of summariesByRoot) {
      const summaryFile = path.join(OUTPUT_ROOT, outputRoot, 'capture-summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify({ generatedAt: new Date().toISOString(), sourceHead: 'dd4ec2e', captures }, null, 2) + '\n', 'utf8');
      console.log(`SUMMARY ${summaryFile} captures=${captures.length}`);
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => served.server.close(resolve));
    fs.rmSync(temporaryVideoRoot, { recursive: true, force: true });
    delete process.env.TMB_APP_ROOT;
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
