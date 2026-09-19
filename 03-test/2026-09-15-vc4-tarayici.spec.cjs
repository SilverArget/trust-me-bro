const { test, expect } = require("playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
let server, base;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel =
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (e, b) => {
      if (e) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".html")
          ? "text/html"
          : file.endsWith(".mp3")
            ? "audio/mpeg"
            : file.endsWith(".png")
              ? "image/png"
              : "application/octet-stream",
      );
      res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});
const mobile = {
  viewport: { width: 2400, height: 1080 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1.5,
};
async function state(page, expr) {
  return page.evaluate((e) => eval(e), expr);
}
async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelector("#bootOverlay")?.classList.contains("hidden"),
  );
}
async function boot(page, hash = "#debug") {
  await page.goto(base + hash);
  await ready(page);
  if (await page.locator("#characterSelect.show").count())
    await page.locator(".characterChoice").first().tap();
  await page.waitForTimeout(1000);
}
async function visual(page) {
  return page.evaluate(() => {
    const s = window.__tmb,
      p = s.player,
      r = s.courierRect,
      c = document.querySelector("#game"),
      g = c.getContext("2d"),
      d = c.width / parseFloat(c.style.width),
      x = Math.max(0, Math.min(c.width - 1, Math.round((r.x + r.w / 2) * d))),
      y = Math.max(0, Math.min(c.height - 1, Math.round((r.y + r.h / 2) * d))),
      pix = (a, b) => Array.from(g.getImageData(a, b, 1, 1).data),
      a = pix(x, y),
      b = pix(Math.max(0, x - 40), y);
    return {
      player: p,
      dead: s.dead,
      spawnGrace: s.spawnGrace,
      characterChosen: s.characterChosen,
      characterId: s.characterId,
      png: s.pngState[s.characterId],
      courierDrawn: s.courierDrawn,
      courierPath: s.courierPath,
      courierRect: r,
      sample: {
        x,
        y,
        rgba: a,
        background: b,
        different: JSON.stringify(a) !== JSON.stringify(b),
      },
    };
  });
}
const touchSessions = new WeakMap();
async function touch(page, type, points) {
  let cdp = touchSessions.get(page);
  if (!cdp) {
    cdp = await page.context().newCDPSession(page);
    touchSessions.set(page, cdp);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((p, i) => ({
      x: p.x,
      y: p.y,
      id: p.id ?? i + 1,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    })),
  });
}

test("S1 gerçek canvas: başlangıç, restart, ölüm", async ({ browser }) => {
  const page = await browser.newPage(mobile);
  await boot(page);
  const initial = await visual(page);
  await page.keyboard.press("r");
  await page.waitForTimeout(1000);
  const restart = await visual(page);
  await page.keyboard.press("k");
  await page.waitForTimeout(1800);
  const afterDeath = await visual(page);
  console.log("S1", JSON.stringify({ initial, restart, afterDeath }));
  expect(
    initial.courierDrawn && restart.courierDrawn && afterDeath.courierDrawn,
  ).toBeTruthy();
  for (const [name, sample] of Object.entries({ initial, restart, afterDeath })) {
    expect(sample.courierRect, `${name}: courier bbox missing`).toBeTruthy();
    expect(sample.courierRect.x, `${name}: courier left of viewport`).toBeGreaterThanOrEqual(0);
    expect(sample.courierRect.x + sample.courierRect.w, `${name}: courier right of viewport`).toBeLessThanOrEqual(mobile.viewport.width);
  }
  await page.close();
});

test("S2 gerçek media/audio ve event yayılımı", async ({ browser }) => {
  const page = await browser.newPage(mobile);
  await page.addInitScript(() => {
    const A = window.Audio;
    window.__audios = [];
    window.Audio = function (...a) {
      const x = new A(...a);
      window.__audios.push(x);
      return x;
    };
    window.Audio.prototype = A.prototype;
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) {
      const P = new Proxy(C, {
        construct(t, a) {
          const x = Reflect.construct(t, a);
          window.__ac = x;
          return x;
        },
      });
      window.AudioContext = P;
      window.webkitAudioContext = P;
    }
  });
  await page.goto(base + "#debugAudio");
  await ready(page);
  await page.locator(".characterChoice").first().tap();
  await page.evaluate(() => {
    window.__audioSeen = { pointerdown: 0, touchstart: 0 };
    for (const n of Object.keys(__audioSeen))
      window.addEventListener(n, () => __audioSeen[n]++);
  });
  const joy = await page.locator("#joystick").boundingBox();
  await page.touchscreen.tap(joy.x + joy.width / 2, joy.y + joy.height / 2);
  await page.waitForTimeout(500);
  const audio = await page.evaluate(() => {
    const b = __audios[0],
      dbg = [...document.querySelectorAll("div")].find((x) =>
        x.innerText.startsWith("AC:"),
      );
    return {
      paused: b.paused,
      readyState: b.readyState,
      muted: b.muted,
      volume: b.volume,
      acState: __ac && __ac.state,
      seen: __audioSeen,
      src: b.currentSrc,
      networkState: b.networkState,
      debug: dbg && dbg.innerText,
    };
  });
  console.log("S2", JSON.stringify(audio));
  expect(audio.seen.pointerdown + audio.seen.touchstart).toBeGreaterThan(0);
  await page.close();
});

test("S3 joystick tek ve çoklu dokunma", async ({ browser }) => {
  const page = await browser.newPage(mobile);
  await boot(page);
  await page.keyboard.press("r");
  await page.waitForTimeout(100);
  const joy = await page.locator("#joystick").boundingBox(),
    jump = await page.locator("#jumpWrap button").boundingBox(),
    cx = joy.x + joy.width / 2,
    cy = joy.y + joy.height / 2;
  const snap = () =>
    page.evaluate(() => {
      const j = document.querySelector("#joystick"),
        k = document.querySelector("#joystickKnob"),
        r = j.getBoundingClientRect(),
        e = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        ),
        m = new DOMMatrix(getComputedStyle(k).transform);
      return {
        axisFromKnob: m.e / (r.width * 0.3),
        transform: k.style.transform,
        top: e && e.id,
        hint: {
          pointerEvents: getComputedStyle(
            document.querySelector("#controlHint"),
          ).pointerEvents,
          z: getComputedStyle(document.querySelector("#controlHint")).zIndex,
        },
      };
    });
  const steps = { start: null, move: null, multi: null, end: null };
  await touch(page, "touchStart", [{ id: 1, x: cx, y: cy }]);
  steps.start = await snap();
  await touch(page, "touchMove", [{ id: 1, x: cx + 60, y: cy }]);
  steps.move = await snap();
  await touch(page, "touchStart", [
    { id: 1, x: cx + 60, y: cy },
    { id: 2, x: jump.x + jump.width / 2, y: jump.y + jump.height / 2 },
  ]);
  steps.multi = await snap();
  await touch(page, "touchEnd", []);
  steps.end = await snap();
  console.log("S3", JSON.stringify(steps));
  expect(Math.abs(steps.move.axisFromKnob)).toBeGreaterThan(0.1);
  expect(steps.multi.axisFromKnob).toBe(steps.move.axisFromKnob);
  expect(steps.end.axisFromKnob).toBe(0);
  expect(steps.end.transform).toContain("0px");
  await page.close();
});

test("S4 sahne 08 part 4 gerçek fizik tekrarları", async ({ browser }) => {
  test.setTimeout(60000);
  const page = await browser.newPage(mobile);
  await boot(page, "#s8p4debugAudio");
  const attempts = [];
  for (let a = 1; a <= 2; a++) {
    const started = Date.now();
    let jumps = 0;
    await page.keyboard.down("ArrowRight");
    while (Date.now() - started < 20000) {
      const s = await page.evaluate(() => ({
        dead: __tmb.dead,
        currentLevel: __tmb.currentLevel,
        currentPart: __tmb.currentPart,
        x: __tmb.player.x,
        y: __tmb.player.y,
        deaths: __tmb.deaths,
      }));
      if (s.dead || s.currentPart !== 4) {
        attempts.push({ ...s, attempt: a, jumps, ms: Date.now() - started });
        break;
      }
      if ((Date.now() - started) % 900 < 80) {
        await page.keyboard.press("Space");
        jumps++;
      }
      await page.waitForTimeout(50);
    }
    await page.keyboard.up("ArrowRight");
    if (await page.evaluate(() => __tmb.dead)) await page.waitForTimeout(1800);
    else if ((await page.evaluate(() => __tmb.currentPart)) === 4)
      attempts.push({
        ...(await page.evaluate(() => ({
          dead: __tmb.dead,
          currentLevel: __tmb.currentLevel,
          currentPart: __tmb.currentPart,
          x: __tmb.player.x,
          y: __tmb.player.y,
          deaths: __tmb.deaths,
        }))),
        attempt: a,
        jumps,
        ms: Date.now() - started,
      });
  }
  console.log("S4", JSON.stringify(attempts));
  expect(attempts.length).toBe(2);
  await page.close();
});

test("S5 character-select touch does not leak into gameplay", async ({ browser }) => {
  const page = await browser.newPage(mobile);
  await page.goto(base + "#debug");
  await ready(page);
  await page.locator(".characterChoice").first().tap();
  const series = [];
  let elapsed = 0;
  for (const ms of [200, 500, 800, 1100, 1400]) {
    await page.waitForTimeout(ms - elapsed);
    elapsed = ms;
    series.push(await page.evaluate((t) => ({
      t, ...__tmb.player, dead: __tmb.dead, deaths: __tmb.deaths,
      joystick: __tmb.joystick, keys: __tmb.keys,
      spawnGrace: __tmb.spawnGrace,
      characterChosen: __tmb.characterChosen,
    }), ms));
  }
  console.log("S5", JSON.stringify(series));
  for (const sample of series) {
    expect(sample.deaths, `death by ${sample.t}ms`).toBe(0);
    expect(sample.dead, `dead at ${sample.t}ms`).toBe(false);
    expect(sample.characterChosen).toBe(true);
  }
  await page.close();
});

test("S6 joystick capture edge, knob, rapid taps, and hint overlay", async ({ browser }) => {
  const page = await browser.newPage(mobile);
  await boot(page);
  const box = await page.locator("#joystick").boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const readJoy = (label) => page.evaluate((label) => ({
    label, ...__tmb.joystick,
    knobX: new DOMMatrix(getComputedStyle(document.querySelector("#joystickKnob")).transform).e,
  }), label);
  const cases = {};

  await touch(page, "touchStart", [{ id: 61, x: box.x - 16, y: cy }]);
  await touch(page, "touchMove", [{ id: 61, x: cx + 45, y: cy }]);
  cases.outsideIn = await readJoy("outside-in");
  await touch(page, "touchEnd", []);

  await touch(page, "touchStart", [{ id: 62, x: cx, y: cy }]);
  await touch(page, "touchMove", [{ id: 62, x: cx + 45, y: cy }]);
  cases.knob = await readJoy("knob");
  await touch(page, "touchEnd", []);

  await touch(page, "touchStart", [{ id: 63, x: cx - 30, y: cy }]);
  await touch(page, "touchEnd", []);
  await page.waitForTimeout(60);
  await touch(page, "touchStart", [{ id: 64, x: cx + 45, y: cy }]);
  cases.rapid = await readJoy("rapid-second-down");
  await touch(page, "touchEnd", []);

  await page.evaluate(() => document.querySelector("#controlHint").classList.add("show"));
  await touch(page, "touchStart", [{ id: 65, x: cx, y: cy }]);
  await touch(page, "touchMove", [{ id: 65, x: cx - 45, y: cy }]);
  cases.hint = await readJoy("hint-visible");
  cases.hint.tree = await page.evaluate(() => [...document.querySelectorAll("#controlHint, #controlHint *")].map(el => ({
    tag: el.tagName, className: el.className, pointerEvents: getComputedStyle(el).pointerEvents,
  })));
  await touch(page, "touchEnd", []);
  console.log("S6", JSON.stringify(cases));

  for (const [name, sample] of Object.entries(cases)) {
    expect(sample.active, `${name}: joystick inactive`).toBe(true);
    expect(Math.abs(sample.axis), `${name}: axis did not follow`).toBeGreaterThan(.2);
  }
  expect(cases.hint.tree.every(x => x.pointerEvents === "none")).toBe(true);
  await page.close();
});
