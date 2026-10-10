const { test, expect } = require('playwright/test');
const fs = require('fs');
const Module = require('module');
const path = require('path');

// Reuse the production route driver without registering its test matrix. This
// retains its server/boot lifecycle, TMB_APP_ROOT handling and keyboard driver.
const sourceFile = path.join(__dirname, 'vp-dock-play.spec.cjs');
let source = fs.readFileSync(sourceFile, 'utf8');
const testsAt = source.indexOf('\nfor (const id of routeIds) test(');
if (testsAt < 0) throw new Error('vp-dock-play test boundary not found');
source = source.slice(0, testsAt);
source += '\nmodule.exports={boot,drive,transitions};\n';
const driver = new Module(sourceFile, module);
driver.filename = sourceFile;
driver.paths = module.paths;
driver._compile(source, sourceFile);
const { boot, drive } = driver.exports;

const view = process.env.TUR15RT_VIEW || 'desktop';
const chief = process.env.TMB_CHIEF || 'securityTall';
const evidenceRoot = path.resolve(__dirname, 'manager-preview', 'tur15rt');

test.describe.configure({ mode: 'serial' });

function scenarioDir(name) {
  const dir = path.resolve(evidenceRoot, ...(process.env.TMB_CHIEF ? [chief] : []), name, view);
  if (!dir.startsWith(evidenceRoot + path.sep)) throw new Error(`Unsafe evidence path: ${dir}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function releaseAllKeys(page) {
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Space', 'Shift']) {
    await page.keyboard.up(key);
  }
}

function flatStopSurfaces(route, minX) {
  return route.groundSegments
    .filter(s => s.kind === 'ground' && s.solid !== false && s.w >= 360 && s.x + s.w >= minX + 280)
    .map(s => ({ id:s.id, x:Math.max(minX, s.x + 72), end:s.x + s.w - 180, y:s.y }))
    .filter(s => s.end >= s.x + 80)
    .sort((a, b) => a.x - b.x);
}

async function driveToStop(page, id, minX) {
  const viewport = page.viewportSize() || { width:915, height:412 };
  await boot(page, id, viewport);
  const route = await page.evaluate(routeId => __TMB_A12__.routeDefinition(routeId), id);
  const flats = flatStopSurfaces(route, minX ?? route.chief?.startX ?? route.checkpoints[1] ?? 0);
  expect(flats.length, `${id} suitable flat stop surface`).toBeGreaterThan(0);
  let stoppedOn = null;
  const driven = await drive(page, id, {
    stopAfter:({ s }) => {
      const center = s.player.x + s.hitbox.w / 2;
      const flat = flats.find(q => center >= q.x && center <= q.end && Math.abs(s.player.y + s.hitbox.h - q.y) <= 4);
      const ready = !!flat && s.chief?.entryPhase === 'running' && s.player.onGround && s.parkour.state === 'normal' && s.player.vx > 180;
      if (ready) stoppedOn = flat;
      return ready;
    },
  });
  await releaseAllKeys(page);
  expect(stoppedOn, `${id} reached a flat surface after chief activation`).toBeTruthy();
  expect(driven.end.result, `${id} must stop before finish`).toBeFalsy();
  return { route, stoppedOn, driven };
}

async function startFrameRecorder(page) {
  return page.evaluate(() => {
    window.__tmbXWriteLog = [];
    const initial = __TMB_A12__.getState();
    const record = window.__tur15rt = {
      active:true,
      startClock:initial.gameClock,
      baseCatches:initial.chief.catches,
      frames:[],
      catchClock:null,
      retryGapPx:null,
      catchLog:null,
    };
    const sample = () => {
      if (!record.active) return;
      const s = __TMB_A12__.getState();
      const catchLog = window.__tmbXWriteLog.findLast?.(row => row.source === 'chief-catch-reset')
        || [...window.__tmbXWriteLog].reverse().find(row => row.source === 'chief-catch-reset');
      const firstCaught = s.chief.catches > record.baseCatches && record.catchClock === null;
      let playerX = s.player.x;
      let chiefX = s.chief.x;
      let gapPx = playerX - (chiefX + s.chief.w);
      if (firstCaught && catchLog) {
        playerX = catchLog.beforeX;
        chiefX = catchLog.chiefX;
        gapPx = playerX - (chiefX + s.chief.w);
        record.catchClock = s.gameClock;
        record.retryGapPx = s.player.x - (s.chief.x + s.chief.w);
        record.catchLog = {...catchLog};
      }
      record.frames.push({
        frame:record.frames.length,
        gameClock:s.gameClock,
        playerX,
        chiefX,
        gapPx,
        caught:s.chief.catches > record.baseCatches,
        playerVx:s.player.vx,
        retryPlayerX:firstCaught ? s.player.x : null,
        retryChiefX:firstCaught ? s.chief.x : null,
        retryGapPx:firstCaught ? record.retryGapPx : null,
      });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    return { startClock:record.startClock, baseCatches:record.baseCatches };
  });
}

async function stopFrameRecorder(page) {
  return page.evaluate(() => {
    window.__tur15rt.active = false;
    return window.__tur15rt;
  });
}

async function captureFullStop(page, dir, startClock) {
  let nextShot = startClock;
  const shotTimes = [];
  let catchClock = null;
  const wallDeadline = Date.now() + 12000;
  while (Date.now() < wallDeadline) {
    const marker = await page.evaluate(() => {
      const s = __TMB_A12__.getState();
      return { gameClock:s.gameClock, catchClock:window.__tur15rt.catchClock };
    });
    catchClock ??= marker.catchClock;
    if (marker.gameClock + .002 >= nextShot) {
      const file = `${String(shotTimes.length).padStart(3, '0')}.jpg`;
      await page.screenshot({ path:path.join(dir, file), type:'jpeg', quality:75, scale:'css' });
      shotTimes.push(marker.gameClock);
      nextShot += .125;
    }
    if (catchClock !== null && marker.gameClock >= catchClock + 2) break;
    await page.waitForTimeout(8);
  }
  const record = await stopFrameRecorder(page);
  expect(record.catchClock, 'chief catches during full stop').not.toBeNull();
  expect(record.frames.at(-1).gameClock - record.catchClock, 'two seconds captured after retry').toBeGreaterThanOrEqual(1.98);
  const screenshotFps = (shotTimes.length - 1) / (shotTimes.at(-1) - shotTimes[0]);
  const maxScreenshotGap = Math.max(...shotTimes.slice(1).map((t, i) => t - shotTimes[i]));
  expect(screenshotFps, 'full-stop screenshot rate').toBeGreaterThanOrEqual(7.5);
  expect(maxScreenshotGap, 'full-stop maximum screenshot interval').toBeLessThanOrEqual(.17);
  return { record, screenshots:shotTimes.length, screenshotFps, maxScreenshotGap };
}

async function capturePause(page, dir, startClock, seconds) {
  await page.screenshot({ path:path.join(dir, '000-pause-start.png') });
  await page.waitForFunction(target => __TMB_A12__.getState().gameClock >= target, startClock + seconds, { polling:'raf' });
  return 1;
}

function writeFrames(dir, record) {
  fs.writeFileSync(path.join(dir, 'frames.jsonl'), record.frames.map(row => JSON.stringify(row)).join('\n') + '\n');
}

function fullStopSummary(scenario, stoppedOn, record, capture) {
  const firstContact = record.frames.find(row => row.gapPx <= 4);
  const firstCaught = record.frames.find(row => row.caught);
  const firstStationary = record.frames.find(row => Math.abs(row.playerVx) < 1);
  const uncaughtAdjacentFrames = record.frames.filter(row => row.gapPx <= 4 && !row.caught).length;
  return {
    scenario,
    view,
    chief,
    stopSurface:stoppedOn.id,
    stopX:+record.frames[0].playerX.toFixed(2),
    frameCount:record.frames.length,
    screenshots:capture.screenshots,
    screenshotFps:+capture.screenshotFps.toFixed(2),
    maxScreenshotGap:+capture.maxScreenshotGap.toFixed(3),
    stopToContactSeconds:+(firstContact.gameClock - record.startClock).toFixed(3),
    stationaryToContactSeconds:firstStationary ? +(firstContact.gameClock - firstStationary.gameClock).toFixed(3) : null,
    contactFrame:firstContact.frame,
    caughtFrame:firstCaught.frame,
    contactEqualsCaught:firstContact.frame === firstCaught.frame,
    uncaughtAdjacentFrames,
    retryGapPx:+record.retryGapPx.toFixed(2),
  };
}

async function runFullStop(page, id, scenario, minX) {
  test.setTimeout(140000);
  const dir = scenarioDir(scenario);
  const { stoppedOn } = await driveToStop(page, id, minX);
  const { startClock } = await startFrameRecorder(page);
  const capture = await captureFullStop(page, dir, startClock);
  const { record } = capture;
  writeFrames(dir, record);
  const summary = fullStopSummary(scenario, stoppedOn, record, capture);
  console.log(`TUR15RT ${JSON.stringify(summary)}`);
  expect(summary.contactEqualsCaught).toBe(true);
  expect(summary.uncaughtAdjacentFrames).toBe(0);
  expect(summary.retryGapPx).toBeGreaterThan(4);
  expect(record.frames.filter(row => row.caught).length).toBeGreaterThan(0);
  expect(record.frames.at(-1).caught).toBe(true);
  return summary;
}

test(`D04 full stop [TUR15RT_VIEW=${view}]`, async ({ page }) => {
  await runFullStop(page, 'D04', 'd04-full-stop', 3919);
});

test(`D04 one second pause [TUR15RT_VIEW=${view}]`, async ({ page }) => {
  test.setTimeout(140000);
  const dir = scenarioDir('d04-one-second-pause');
  const { stoppedOn } = await driveToStop(page, 'D04', 3919);
  const { startClock, baseCatches } = await startFrameRecorder(page);
  const screenshots = await capturePause(page, dir, startClock, 1);
  const pauseRecord = await stopFrameRecorder(page);
  await page.keyboard.down('ArrowRight');
  const resumed = await drive(page, 'D04');
  await releaseAllKeys(page);
  const end = await page.evaluate(() => __TMB_A12__.getState());
  writeFrames(dir, pauseRecord);
  await page.screenshot({ path:path.join(dir, `${String(screenshots).padStart(3, '0')}-finish.png`) });
  const finished = !!resumed.end.result || resumed.end.player.x + resumed.end.hitbox.w >= resumed.end.route.finishX;
  const summary = {
    scenario:'d04-one-second-pause',
    view,
    chief,
    stopSurface:stoppedOn.id,
    pauseSeconds:+(pauseRecord.frames.at(-1).gameClock - startClock).toFixed(3),
    pauseFrames:pauseRecord.frames.length,
    screenshots:screenshots + 1,
    catches:end.chief.catches - baseCatches,
    deaths:resumed.deaths,
    finished,
  };
  console.log(`TUR15RT ${JSON.stringify(summary)}`);
  expect(summary.pauseSeconds).toBeGreaterThanOrEqual(1);
  expect(summary.catches).toBe(0);
  expect(summary.deaths).toBe(0);
  expect(summary.finished).toBe(true);
});

test(`A02 full stop [TUR15RT_VIEW=${view}]`, async ({ page }) => {
  await runFullStop(page, 'A02', 'a02-full-stop');
});
