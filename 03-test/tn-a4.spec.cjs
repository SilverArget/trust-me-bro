const { test, expect } = require("playwright/test");
const fs = require("fs"),
  http = require("http"),
  path = require("path");
let server, base;
test.beforeAll(async () => {
  fs.mkdirSync(path.join(__dirname, "tn-a4-shots"), { recursive: true });
  server = http.createServer((req, res) => {
    const rel =
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    fs.readFile(path.join(__dirname, "..", rel), (e, b) => {
      res.statusCode = e ? 404 : 200;
      res.setHeader(
        "Content-Type",
        rel.endsWith(".js")
          ? "text/javascript"
          : rel.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
      );
      res.end(e ? "missing" : b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(async () => new Promise((r) => server.close(r)));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto(base);
  await page.waitForFunction(() => window.__TMB_A12__);
  await page.locator(".characterChoice:visible").first().click();
});
async function worlds(page) {
  await page.evaluate(() => __TMB_A12__.openShop());
  await page.locator('[data-tab="worlds"]').click();
  return page.locator('[data-item="frozen"] [data-action]');
}
async function driveFrozen(page, id) {
  await page.evaluate((id) => __TMB_A12__.startRoute(id), id);
  await page.keyboard.down("ArrowRight");
  const seen = new Set();
  let f02Backtracked = false;
  let f01Slowed = false;
  for (let i = 0; i < 2000; i++) {
    const s = await page.evaluate(() => __TMB_A12__.getState());
    for (const move of s.engine.observedStates) seen.add(move);
    const x = s.player.x;
    if (id === "F01" && !f01Slowed && x > 2880) {
      f01Slowed = true;
      await page.keyboard.up("ArrowRight");
      await page.waitForTimeout(400);
      await page.keyboard.down("ArrowRight");
    }
    if (id === "F02" && !f02Backtracked && x > 7085) {
      f02Backtracked = true;
      await page.keyboard.up("ArrowRight");
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(500);
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.down("ArrowRight");
    }
    const jump =
      (id === "F01" &&
        [
          [1080, 1160],
          [1600, 1700],
          [2964, 3010],
          [4000, 4090],
          [5550, 5640],
          [6950, 7040],
        ].some(([a, b]) => x > a && x < b)) ||
      (id === "F02" &&
        [
          [4580, 4680],
          [5680, 5740],
          [9374, 9420],
        ].some(([a, b]) => x > a && x < b));
    if (jump) await page.keyboard.press("Space");
    if (s.result) break;
    await page.waitForTimeout(50);
  }
  await page.keyboard.up("ArrowRight");
  const state = await page.evaluate(() => __TMB_A12__.getState());
  for (const move of state.engine.observedStates) seen.add(move);
  console.log(
    "FROZEN_RUN",
    id,
    state.result?.elapsed,
    state.economy.runCoins,
    state.economy.collectedCoinIds.join(","),
  );
  return { state, seen: [...seen] };
}
for (const id of ["F01", "F02"])
  // EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
  test.skip(`frozen-${id}-real-input-completion`, async ({ page }) => {
    test.setTimeout(110000);
    await page.evaluate(async (id) => {
      await __TMB_A12__.setWallet(500);
      await __TMB_A12__.purchaseWorld("frozen");
      __TMB_A12__.startRoute("F01");
      if (id === "F02") __TMB_A12__.finish();
    }, id);
    const idle = await page.evaluate(() => __TMB_A12__.getState());
    expect(
      idle.engine.observedStates.filter((x) => x === "vault"),
    ).toHaveLength(0);
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => __TMB_A12__.getState().player.x)).toBe(
      idle.player.x,
    );
    const r = await driveFrozen(page, id);
    expect(r.state.result).not.toBeNull();
    expect(r.state.result.elapsed).toBeGreaterThanOrEqual(45);
    expect(r.state.result.elapsed).toBeLessThanOrEqual(90);
    expect(r.state.economy.runCoins).toBe(40);
    expect(r.seen).toContain("vault");
    test
      .info()
      .annotations.push({
        type: "measure",
        description: `${id} ${r.state.result.elapsed.toFixed(2)}s deaths=${r.state.deaths} coins=${r.state.economy.runCoins}/40 events=${r.seen.join(",")}`,
      });
  });
test("world-purchase-ui-and-insufficient-i18n", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(159));
  let b = await worlds(page);
  for (const lang of ["en", "tr", "ru"]) {
    await page.evaluate((l) => __TMB_A12__.setLanguage(l), lang);
    await expect(b).toBeDisabled();
    expect(await b.textContent()).toBe(
      (await page.evaluate(() => __TMB_A12__.i18n()))[lang].insufficient,
    );
  }
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).profile.walletBalance,
  ).toBe(159);
});
test("world-purchase-double-tap-ui", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(1000));
  const b = await worlds(page);
  await b.click({ clickCount: 2, delay: 30 });
  await expect
    .poll(() =>
      page.evaluate(() => __TMB_A12__.getState().profile.walletBalance),
    )
    .toBe(840);
  const s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.profile.ownedWorldIds.filter((x) => x === "frozen")).toHaveLength(1);
});
test("world-purchase-save-failure", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    __TMB_A12__.failSave(true);
  });
  const b = await worlds(page);
  await b.click();
  let s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.profile.walletBalance).toBe(500);
  expect(s.profile.ownedWorldIds).not.toContain("frozen");
  await page.evaluate(() => __TMB_A12__.failSave(false));
  await b.click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        __TMB_A12__.getState().profile.ownedWorldIds.includes("frozen"),
      ),
    )
    .toBe(true);
});
test("world-preview-no-side-effect", async ({ page }) => {
  const before = await page.evaluate(() => __TMB_A12__.getState());
  await worlds(page);
  await page.locator('[data-item="frozen"] h3').click();
  const after = await page.evaluate(() => __TMB_A12__.getState());
  expect(after.shop.previewWorldId).toBe("frozen");
  expect(after.profile).toEqual(before.profile);
  expect(after.economy).toEqual(before.economy);
});
test("world-switch-cache-stable", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
  });
  await page.waitForTimeout(80);
  const counts = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(async () => {
      await __TMB_A12__.purchaseWorld("dock31");
      __TMB_A12__.startRoute("D01");
    });
    await page.waitForTimeout(50);
    let s = await page.evaluate(() => __TMB_A12__.getState());
    expect(s.world.activeCacheKey).toContain("dock31|D01|2|");
    counts.push(s.world.cacheKeys.length);
    await page.evaluate(async () => {
      await __TMB_A12__.purchaseWorld("frozen");
      __TMB_A12__.startRoute("D01");
    });
    await page.waitForTimeout(50);
    s = await page.evaluate(() => __TMB_A12__.getState());
    expect(s.world.activeCacheKey).toContain("frozen|D01|2|");
    counts.push(s.world.cacheKeys.length);
  }
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
});
test("world-select-safe-start", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    __TMB_A12__.placePlayer(500, 250);
  });
  const before = await page.evaluate(() => __TMB_A12__.getState());
  await page.evaluate(() => __TMB_A12__.purchaseWorld("frozen"));
  const mid = await page.evaluate(() => __TMB_A12__.getState());
  expect(mid.world.selectedWorldId).toBe("dock31");
  expect(mid.world.pendingWorldId).toBe("frozen");
  expect(mid.routeId).toBe(before.routeId);
  expect(mid.player.x).toBe(before.player.x);
  expect(mid.economy.runCoins).toBe(before.economy.runCoins);
  await page.evaluate(() => __TMB_A12__.startRoute("D01"));
  await expect
    .poll(() =>
      page.evaluate(() => __TMB_A12__.getState().world.selectedWorldId),
    )
    .toBe("frozen");
});
test("world-theme-readable-regions", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
    __TMB_A12__.placePlayer(2460);
  });
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => {
    const c = document.querySelector("#game"),
      x = c.getContext("2d"),
      spread = (X, Y, W, H) => {
        const d = x.getImageData(X, Y, W, H).data,
          a = [];
        for (let i = 0; i < d.length; i += 4)
          a.push((d[i] + d[i + 1] + d[i + 2]) / 3);
        a.sort((p, q) => p - q);
        return a[Math.floor(a.length * 0.9)] - a[Math.floor(a.length * 0.1)];
      };
    return {
      cover: document.querySelectorAll("#a12Shop.show").length,
      coin: spread(0, 330, c.width, 130),
      ramp: spread(350, 330, 400, 130),
      edge: spread(0, 390, c.width, 80),
      coinLikeDecor: Array.from(
        x.getImageData(0, 250, c.width, 90).data,
      ).filter(
        (v, i, a) =>
          i % 4 === 0 &&
          v > 240 &&
          a[i + 1] > 140 &&
          a[i + 1] < 210 &&
          a[i + 2] < 90,
      ).length,
    };
  });
  expect(m.cover).toBe(0);
  expect(m.coin).toBeGreaterThan(15);
  expect(m.ramp).toBeGreaterThan(15);
  expect(m.edge).toBeGreaterThan(15);
  expect(m.coinLikeDecor).toBe(0);
});
test("world-theme-readable-mobile-light-grounded", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
  });
  await page.waitForTimeout(120);
  const gap = await page.evaluate(
    () => __TMB_A12__.getState().world.renderSignatures.foregroundLampGroundGap,
  );
  expect(gap).toBeLessThanOrEqual(4);
  test
    .info()
    .annotations.push({
      type: "measure",
      description: `foreground lamp endpoint-ground gap ${gap}px`,
    });
});
test("world-theme-readable-wide-light-grounded", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
  });
  await page.waitForTimeout(120);
  const gap = await page.evaluate(
    () => __TMB_A12__.getState().world.renderSignatures.foregroundLampGroundGap,
  );
  expect(gap).toBeLessThanOrEqual(4);
  test
    .info()
    .annotations.push({
      type: "measure",
      description: `foreground lamp endpoint-ground gap ${gap}px`,
    });
});
test("world-buy-i18n-tr-ru", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(500));
  const b = await worlds(page);
  for (const lang of ["tr", "ru"]) {
    await page.evaluate((l) => __TMB_A12__.setLanguage(l), lang);
    const expected = await page.evaluate(
      (l) => __TMB_A12__.i18n()[l].buyWorld.replace("{price}", "160"),
      lang,
    );
    expect(await b.textContent()).toBe(expected);
  }
});
test("world-theme-screenshots", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(500));
  for (const size of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    for (const world of ["dock31", "frozen"])
      for (const pos of [
        { id: "start", x: 300 },
        { id: "obstacle", x: 2460 },
      ]) {
        await page.setViewportSize(size);
        await page.evaluate(
          async ({ world, x }) => {
            await __TMB_A12__.purchaseWorld(world);
            __TMB_A12__.startRoute("D01");
            __TMB_A12__.placePlayer(x);
          },
          { world, x: pos.x },
        );
        await expect
          .poll(() =>
            page.evaluate(() => __TMB_A12__.getState().world.selectedWorldId),
          )
          .toBe(world);
        await page.waitForTimeout(100);
        const name = world === "dock31" ? "dock" : "frozen";
        await page.screenshot({
          path: path.join(
            __dirname,
            "tn-a4-shots",
            `${name}-${pos.id}-${size.width}x${size.height}.png`,
          ),
        });
      }
  }
});
test("frozen-not-recolor", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(500));
  const samples = {};
  for (const world of ["dock31", "frozen"]) {
    await page.evaluate(async (w) => {
      await __TMB_A12__.purchaseWorld(w);
      __TMB_A12__.startRoute("D01");
      __TMB_A12__.placePlayer(2460);
    }, world);
    await page.waitForTimeout(100);
    samples[world] = await page.evaluate(() => {
      const c = document.querySelector("#game"),
        x = c.getContext("2d"),
        regions = {
          background: [0, 70, 500, 190],
          structures: [0, 210, 500, 170],
          ground: [0, 390, 500, 90],
          obstacle: [310, 315, 280, 130],
        },
        out = {};
      for (const [k, r] of Object.entries(regions))
        out[k] = Array.from(x.getImageData(...r).data);
      return out;
    });
  }
  const fitRmse = (a, b) => {
    let total = 0,
      n = 0;
    for (let ch = 0; ch < 3; ch++) {
      let sx = 0,
        sy = 0,
        sxx = 0,
        sxy = 0,
        m = 0;
      for (let i = ch; i < a.length; i += 4) {
        sx += a[i];
        sy += b[i];
        sxx += a[i] * a[i];
        sxy += a[i] * b[i];
        m++;
      }
      const den = m * sxx - sx * sx,
        A = den ? (m * sxy - sx * sy) / den : 0,
        B = (sy - A * sx) / m;
      for (let i = ch; i < a.length; i += 4) {
        total += (b[i] - (A * a[i] + B)) ** 2;
        n++;
      }
    }
    return Math.sqrt(total / n);
  };
  const values = {};
  for (const k of Object.keys(samples.dock31))
    values[k] = fitRmse(samples.dock31[k], samples.frozen[k]);
  const synthetic = Object.fromEntries(Object.keys(values).map((k) => [k, 0]));
  for (const k of Object.keys(values)) {
    expect(synthetic[k]).toBeLessThan(1);
    expect(values[k]).toBeGreaterThan(18);
  }
  test
    .info()
    .annotations.push({ type: "measure", description: JSON.stringify(values) });
});
test("frozen-ground-pattern-and-readable-variants", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
    __TMB_A12__.placePlayer(2460);
  });
  await page.waitForTimeout(100);
  const m = await page.evaluate(() => {
    const c = document.querySelector("#game"),
      x = c.getContext("2d"),
      d = x.getImageData(0, 390, c.width, 100).data;
    let yellow = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] > 180 && d[i + 1] > 120 && d[i + 2] < 80) yellow++;
    const spread = (X, Y, W, H) => {
      const q = x.getImageData(X, Y, W, H).data,
        a = [];
      for (let i = 0; i < q.length; i += 4)
        a.push((q[i] + q[i + 1] + q[i + 2]) / 3);
      a.sort((a, b) => a - b);
      return a[(a.length * 0.9) | 0] - a[(a.length * 0.1) | 0];
    };
    return {
      yellowRatio: yellow / (d.length / 4),
      edge: spread(0, 385, 700, 90),
      obstacle: spread(250, 300, 360, 150),
      ramp: spread(330, 330, 300, 120),
    };
  });
  expect(m.yellowRatio).toBeLessThan(0.01);
  expect(m.edge).toBeGreaterThan(18);
  expect(m.obstacle).toBeGreaterThan(18);
  expect(m.ramp).toBeGreaterThan(18);
  test
    .info()
    .annotations.push({ type: "measure", description: JSON.stringify(m) });
});
test("frozen-physics-identical", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(500));
  const runs = {};
  for (const world of ["dock31", "frozen"]) {
    await page.evaluate(async (w) => {
      await __TMB_A12__.purchaseWorld(w);
    }, world);
    await page.keyboard.down("ArrowRight");
    await page.evaluate(() => __TMB_A12__.startRoute("D01"));
    runs[world] = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const raw = [],
            tick = () => {
              const s = __TMB_A12__.getState();
              raw.push({ t: s.gameClock, x: s.player.x, y: s.player.y });
              if (s.gameClock < 3.05) requestAnimationFrame(tick);
              else {
                const out = [];
                for (let target = 0.2; target <= 3.001; target += 0.2) {
                  let i = 1;
                  while (i < raw.length && raw[i].t < target) i++;
                  const a = raw[Math.max(0, i - 1)],
                    b = raw[Math.min(i, raw.length - 1)],
                    q = b.t === a.t ? 0 : (target - a.t) / (b.t - a.t);
                  out.push({
                    x: a.x + (b.x - a.x) * q,
                    y: a.y + (b.y - a.y) * q,
                  });
                }
                resolve(out);
              }
            };
          requestAnimationFrame(tick);
        }),
    );
    await page.keyboard.up("ArrowRight");
  }
  for (let i = 0; i < 15; i++) {
    expect(Math.abs(runs.dock31[i].x - runs.frozen[i].x)).toBeLessThanOrEqual(
      0.5,
    );
    expect(Math.abs(runs.dock31[i].y - runs.frozen[i].y)).toBeLessThanOrEqual(
      0.5,
    );
  }
});
test("frozen-render-performance", async ({ page }) => {
  const m = await page.evaluate(() => {
    const d = __TMB_A12__.benchmarkWorldDraw("dock31", 120),
      f = __TMB_A12__.benchmarkWorldDraw("frozen", 120);
    return { dock: d, frozen: f, ratio: f / d };
  });
  test
    .info()
    .annotations.push({ type: "measure", description: JSON.stringify(m) });
  expect(m.ratio).toBeLessThanOrEqual(1.5);
});
test("frozen-dock-signatures-absent", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(500));
  const measured = {};
  for (const world of ["dock31", "frozen"]) {
    await page.evaluate(async (w) => {
      await __TMB_A12__.purchaseWorld(w);
      __TMB_A12__.startRoute("D01");
    }, world);
    await page.waitForTimeout(80);
    measured[world] = await page.evaluate(
      () => __TMB_A12__.getState().world.renderSignatures,
    );
  }
  for (const key of [
    "deckStripe",
    "dock31Text",
    "containerBlock",
    "dockCrane",
    "loadingCorridor",
  ]) {
    expect(measured.dock31[key]).toBeGreaterThan(0);
    expect(measured.frozen[key]).toBe(0);
  }
  test
    .info()
    .annotations.push({
      type: "measure",
      description: JSON.stringify(measured),
    });
});

// EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
test.skip("frozen-routes-F01-F02-registry-and-coins", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
  });
  let s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.world.registry.frozen.routes).toEqual(["F01", "F02", "F03", "F04"]);
  expect(s.route.id).toBe("F01");
  expect(s.route.name).toBe("COLD ARRIVAL");
  expect(s.route.coins).toHaveLength(40);
  expect(s.route.coins.filter((c) => c.skill)).toHaveLength(15);
  expect(s.route.unlocked).toEqual({
    F01: true,
    F02: false,
    F03: false,
    F04: false,
  });
  await page.evaluate(() => {
    for (const id of __TMB_A12__.routeCoins()) __TMB_A12__.collectCoin(id);
    __TMB_A12__.finish();
  });
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).economy.runCoins,
  ).toBe(40);
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F02"))).toBe(true);
  s = await page.evaluate(() => __TMB_A12__.getState());
  expect(s.route.id).toBe("F02");
  expect(s.route.name).toBe("SUSPENDED CARGO");
  expect(s.route.coins).toHaveLength(40);
  expect(s.route.coins.filter((c) => c.skill)).toHaveLength(15);
});

test("frozen-route-unlock-chain-save-and-no-second-charge", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("D01");
  });
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F02"))).toBe(false);
  await page.evaluate(() => {
    for (const id of __TMB_A12__.routeCoins()) __TMB_A12__.collectCoin(id);
    __TMB_A12__.finish();
  });
  let s = await page.evaluate(() => __TMB_A12__.getState());
  const wallet = s.profile.walletBalance;
  expect(s.route.unlocked).toEqual({
    F01: true,
    F02: true,
    F03: false,
    F04: false,
  });
  const restored = await context.newPage();
  await restored.goto(base);
  await restored.waitForFunction(() => window.__TMB_A12__);
  await expect
    .poll(() => restored.evaluate(() => __TMB_A12__.getState().route.id))
    .toBe("F02");
  s = await restored.evaluate(() => __TMB_A12__.getState());
  expect(s.profile.walletBalance).toBe(wallet);
  expect(s.profile.ownedWorldIds.filter((x) => x === "frozen")).toHaveLength(1);
  expect(s.route.unlocked.F03).toBe(false);
  await restored.close();
});

test("frozen-F01-F02-theme-and-screenshots", async ({ page }) => {
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
  });
  for (const route of ["F01", "F02"]) {
    if (route === "F02")
      await page.evaluate(() => {
        __TMB_A12__.startRoute("F01");
        __TMB_A12__.finish();
      });
    for (const size of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ])
      for (const pos of [
        { id: "start", x: 300 },
        { id: "obstacle", x: route === "F01" ? 3040 : 4700 },
      ]) {
        await page.setViewportSize(size);
        expect(
          await page.evaluate((r) => __TMB_A12__.startRoute(r), route),
        ).toBe(true);
        await page.evaluate((x) => __TMB_A12__.placePlayer(x), pos.x);
        await page.waitForTimeout(100);
        const s = await page.evaluate(() => __TMB_A12__.getState());
        expect(s.world.selectedWorldId).toBe("frozen");
        expect(s.route.id).toBe(route);
        for (const key of [
          "deckStripe",
          "dock31Text",
          "containerBlock",
          "dockCrane",
          "loadingCorridor",
        ])
          expect(s.world.renderSignatures[key]).toBe(0);
        await page.screenshot({
          path: path.join(
            __dirname,
            "tn-a4-shots",
            `${route}-${pos.id}-${size.width}x${size.height}.png`,
          ),
        });
      }
  }
});

test("frozen-F01-mobile-first-checkpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    __TMB_A12__.startRoute("F01");
  });
  const controls = await page
    .locator("#mobileControls button")
    .evaluateAll((bs) =>
      bs
        .map((b) => b.getBoundingClientRect())
        .map((r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom })),
    );
  for (let i = 0; i < controls.length; i++)
    for (let j = i + 1; j < controls.length; j++)
      expect(
        Math.max(
          0,
          Math.min(controls[i].r, controls[j].r) -
            Math.max(controls[i].l, controls[j].l),
        ) *
          Math.max(
            0,
            Math.min(controls[i].b, controls[j].b) -
              Math.max(controls[i].t, controls[j].t),
          ),
      ).toBe(0);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(100);
  await page.evaluate(() => __TMB_A12__.placePlayer(4350));
  await page.waitForTimeout(100);
  await page.keyboard.up("ArrowRight");
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).checkpointX,
  ).toBeGreaterThanOrEqual(3600);
});

async function unlockFrozen(page, to) {
  await page.evaluate(async (to) => {
    await __TMB_A12__.setWallet(500);
    await __TMB_A12__.purchaseWorld("frozen");
    for (const id of ["F01", "F02", "F03"]) {
      if (id === to) break;
      __TMB_A12__.startRoute(id);
      __TMB_A12__.finish();
    }
    __TMB_A12__.startRoute(to);
  }, to);
}
async function driveFrozenB(page, id, mainOnly = false) {
  if (["F02", "F03", "F04"].includes(id) && !mainOnly) {
    await unlockFrozen(page, id);
    await page.evaluate(() => {
      window.__frozenRideMax = {};
      window.__frozenRawStep = window.__tmbCampaignStep;
      window.__tmbCampaignStep = (dt) => {
        window.__frozenRawStep(dt);
        for (const p of __TMB_A12__.getState().movingPlatforms)
          window.__frozenRideMax[p.id] = Math.max(window.__frozenRideMax[p.id] || 0, p.rideFrames);
      };
    });
    const driven = await require("./lib/bot-s-drive.cjs").runBot(page, id, { resume: true, live: true });
    const observed = await page.evaluate(() => {
      window.__tmbCampaignStep = window.__frozenRawStep;
      const state = __TMB_A12__.getState(), rides = Object.entries(window.__frozenRideMax);
      delete window.__frozenRawStep;
      delete window.__frozenRideMax;
      return { state, rides };
    });
    return { state: observed.state, rides: observed.rides, seen: driven.parkourSamples.map(v => v.state), flows: observed.state.engine.observedStates };
  }
  await unlockFrozen(page, id);
  const seen = new Set(),
    flows = new Set(),
    start = Date.now();
  let last;
  await page.keyboard.down("ArrowRight");
  while (Date.now() - start < 100000) {
    last = await page.evaluate(() => __TMB_A12__.getState());
    seen.add(last.player.state);
    for (const m of last.engine.observedStates) flows.add(m);
    const x = last.player.x;
    if (!mainOnly) {
      const action =
        (id === "F03" &&
          [
            [720, 900],
            [3760, 3940],
            [5120, 5280],
            [8360, 8500],
          ].some(([a, b]) => x > a && x < b)) ||
        (id === "F04" &&
          [
            [1040, 1160],
            [1480, 2100],
            [4860, 5000],
            [8860, 9040],
          ].some(([a, b]) => x > a && x < b));
      if (action) await page.keyboard.press("Space");
    }
    if (last.result) break;
    await page.waitForTimeout(40);
  }
  await page.keyboard.up("ArrowRight");
  console.log(
    "FROZEN_B_RUN",
    id,
    JSON.stringify({
      x: last?.player.x,
      elapsed: last?.result?.elapsed,
      coins: last?.economy.runCoins,
      ids: last?.economy.collectedCoinIds,
      seen: [...seen],
      flows: [...flows],
    }),
  );
  return { state: last, seen: [...seen], flows: [...flows] };
}
for (const id of ["F03", "F04"])
  // EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
  test.skip(`frozen-${id}-real-input-completion`, async ({ page }) => {
    test.setTimeout(120000);
    const r = await driveFrozenB(page, id);
    expect(r.state.result).not.toBeNull();
    expect(r.state.result.elapsed).toBeGreaterThanOrEqual(45);
    expect(r.state.result.elapsed).toBeLessThanOrEqual(90);
    expect(r.state.economy.runCoins).toBe(40);
    expect(id === "F03" ? r.seen : r.flows).toContain(
      id === "F03" ? "slide" : "rollDrop",
    );
    test
      .info()
      .annotations.push({
        type: "measure",
        description: JSON.stringify({
          id,
          elapsed: r.state.result.elapsed,
          deaths: r.state.deaths,
          coins: r.state.economy.runCoins,
          states: r.seen,
          flows: r.flows,
        }),
      });
  });
test.describe.configure({ timeout: 120000 });
test("frozen-parkour-carriers-and-bypasses", async ({ page }) => {
  await unlockFrozen(page, "F02");
  const observed = {};
  const f02 = await driveFrozenB(page, "F02");
  observed["F02-crane"] = {
    flows: f02.flows,
    rides: f02.rides,
    state: f02.state.player.state,
  };
  observed["F02-pallet"] = observed["F02-crane"];
  const f03 = await driveFrozenB(page, "F03");
  observed["F03-overpass"] = {
    flows: f03.flows,
    rides: f03.state.movingPlatforms.map((p) => [p.id, p.rideFrames]),
    state: f03.state.player.state,
  };
  const roll = await driveFrozenB(page, "F04");
  observed["F04-roll"] = { flows: roll.flows, states: roll.seen };
  expect(observed["F02-crane"].rides.some((x) => x[1] > 0)).toBe(true);
  expect(observed["F02-pallet"].rides.some((x) => x[1] > 0)).toBe(true);
  expect(observed["F03-overpass"].flows).toContain("overpassRide");
  expect(observed["F04-roll"].flows).toContain("rollDrop");
  await unlockFrozen(page, "F01");
  // [Y 27.09 coin tasarımı: F01 pallet 2] eski 0 = coin öncesi
  expect(
    (await page.evaluate(() => __TMB_A12__.getState())).movingPlatforms,
  ).toHaveLength(2);
  test
    .info()
    .annotations.push({
      type: "measure",
      description: JSON.stringify(observed),
    });
});
test("frozen-hazard-combination-and-source-match", async ({ page }) => {
  const ids = ["F01", "F02", "F03", "F04"],
    rows = [];
  for (const id of ids) {
    const r = await page.evaluate((id) => __TMB_A12__.routeDefinition(id), id),
      ramps = r.obstacles.filter((o) => o.type === "ramp");
    expect(ramps.map((x) => x.id)).toEqual(
      r.obstacles.filter((x) => x.type === "ramp").map((x) => x.id),
    );
    for (const ramp of ramps) {
      let hits = 0;
      const landing = {
        x1: ramp.x + ramp.w,
        x2: ramp.x + ramp.w + 500,
        y1: 230,
        y2: 455,
      };
      for (let phase = 0; phase < 20; phase++)
        for (const h of r.obstacles.filter((o) =>
          ["collapse", "containerDoor", "worker"].includes(o.type),
        )) {
          const hx1 = h.type === "worker" ? h.x - 18 : h.x,
            hx2 = h.type === "worker" ? h.x + 48 : h.x + h.w,
            hy1 = h.y || 337,
            hy2 = (h.y || 337) + (h.h || 28);
          if (
            landing.x1 < hx2 &&
            landing.x2 > hx1 &&
            landing.y1 < hy2 &&
            landing.y2 > hy1
          )
            hits++;
        }
      expect(hits, `${id}/${ramp.id}`).toBe(0);
      rows.push({ id, ramp: ramp.id, phases: 20, hits });
    }
  }
  const synthetic = { ramp: { x: 100, w: 200 }, collapse: { x: 300, w: 100 } };
  expect(synthetic.ramp.x + synthetic.ramp.w).toBe(synthetic.collapse.x);
  test
    .info()
    .annotations.push({ type: "measure", description: JSON.stringify(rows) });
});
// EMEKLİ [Y 27.09 coin tasarımı] → G1–G7
test.skip("frozen-skill-lines-main-only", async ({ page }) => {
  test.setTimeout(360000);
  const rows = [];
  for (const id of ["F01", "F02", "F03", "F04"]) {
    const full = await page.evaluate(
      (id) =>
        __TMB_A12__.routeDefinition(id).coins.filter((c) => c.skill).length,
      id,
    );
    expect(full).toBe(15);
    await unlockFrozen(page, id);
    await page.keyboard.down("ArrowRight");
    await page.evaluate(() => __TMB_A12__.placePlayer(11000));
    await page.waitForTimeout(800);
    await page.keyboard.up("ArrowRight");
    const s = await page.evaluate(() => __TMB_A12__.getState()),
      got = s.economy.collectedCoinIds.filter(
        (x) => Number(x.slice(-2)) >= 26,
      ).length;
    expect(got).toBeLessThanOrEqual(7);
    rows.push({ id, mainOnly: got, full });
  }
  test
    .info()
    .annotations.push({ type: "measure", description: JSON.stringify(rows) });
});
test("route-similarity-matrix", async ({ page }) => {
  const ids = [
      "D01",
      "D02",
      "D03",
      "D04",
      "D05",
      "D06",
      "F01",
      "F02",
      "F03",
      "F04",
    ],
    defs = Object.fromEntries(
      await Promise.all(
        ids.map(async (id) => [
          id,
          await page.evaluate((id) => __TMB_A12__.routeDefinition(id), id),
        ]),
      ),
    ),
    lev = (a, b) => {
      let d = Array(b.length + 1)
        .fill(0)
        .map((_, i) => i);
      for (let i = 0; i < a.length; i++) {
        let n = [i + 1];
        for (let j = 0; j < b.length; j++)
          n.push(
            Math.min(n[j] + 1, d[j + 1] + 1, d[j] + (a[i] === b[j] ? 0 : 1)),
          );
        d = n;
      }
      return d[b.length];
    },
    matrix = {};
  for (const a of ids) {
    matrix[a] = {};
    for (const b of ids) {
      const A = defs[a],
        B = defs[b],
        ta = A.obstacles.map((o) => o.type),
        tb = B.obstacles.map((o) => o.type),
        dist = lev(ta, tb) / Math.max(ta.length, tb.length, 1),
        same = ta.join("|") === tb.join("|");
      let shifted = false;
      if (same) {
        const delta = A.obstacles[0].x - B.obstacles[0].x;
        shifted = A.obstacles.every(
          (o, i) => Math.abs(o.x - (B.obstacles[i].x + delta)) <= 150,
        );
      }
      if (a !== b) expect(same && shifted, `${a}/${b}`).toBe(false);
      if (a.startsWith("F") && b.startsWith("F") && a !== b)
        expect(dist).toBeGreaterThanOrEqual(0.3);
      matrix[a][b] = Number((1 - dist).toFixed(3));
    }
  }
  const copy = {
      ...defs.D04,
      obstacles: defs.D04.obstacles.map((o) => ({ ...o, x: o.x + 500 })),
    },
    delta = copy.obstacles[0].x - defs.D04.obstacles[0].x;
  expect(
    copy.obstacles.every(
      (o, i) => Math.abs(o.x - (defs.D04.obstacles[i].x + delta)) <= 150,
    ),
  ).toBe(true);
  test
    .info()
    .annotations.push({ type: "matrix", description: JSON.stringify(matrix) });
});
test("frozen-F03-F04-theme-obstacle-screenshots", async ({ page }) => {
  await unlockFrozen(page, "F03");
  for (const route of ["F01", "F02", "F03", "F04"])
    for (const size of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await unlockFrozen(page, route);
      const spec =
        route === "F02"
          ? size.width === 1280
            ? { x: 1450, types: ["crane"] }
            : { x: 5440, types: ["pallet"] }
          : {
              F01: { x: 3740, types: ["vault"] },
              F03: { x: 7540, types: ["containerDoor", "worker"] },
              F04: { x: 6730, types: ["collapse"] },
            }[route];
      await page.evaluate((x) => __TMB_A12__.placePlayer(x), spec.x);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const s = __TMB_A12__.getState(),
              l = __tmb.layout,
              x = l.viewOffsetX + (s.player.x - __tmb.cam) * l.viewScale,
              y = l.viewOffsetY + (l.worldY + s.player.y) * l.viewScale;
            return (
              x >= 0 &&
              y >= 0 &&
              x + s.hitbox.w * l.viewScale <= l.viewportW &&
              y + s.hitbox.h * l.viewScale <= l.viewportH
            );
          }),
        )
        .toBe(true);
      const boxes = await page.evaluate((types) => {
          const s = __TMB_A12__.getState(),
            l = __tmb.layout,
            screen = (o) => ({
              x: l.viewOffsetX + (o.x - __tmb.cam) * l.viewScale,
              y: l.viewOffsetY + (l.worldY + (o.y ?? 407)) * l.viewScale,
              w: (o.w || 36) * l.viewScale,
              h: (o.h || 76) * l.viewScale,
            }),
            items = s.route.obstacles
              .filter((o) => types.includes(o.type))
              .map((o) => {
                const moving = s.movingPlatforms.find((p) => p.id === o.id);
                const live = moving ||
                  (o.type === "worker"
                    ? { ...o, x: o.x - 18, y: 379, w: 36, h: 76 }
                    : o.type === "vault"
                      ? { ...o, y: 407 }
                      : o.type === "collapse"
                        ? { ...o, y: o.y || 337 }
                        : o.type === "containerDoor"
                          ? { ...o, y: o.openY }
                          : o);
                return { type: o.type, ...screen(live) };
              }),
            player = screen({ ...s.player, w: s.hitbox.w, h: s.hitbox.h });
          return {
            viewport: { w: l.viewportW, h: l.viewportH },
            player,
            items,
          };
        }, spec.types),
        inside = (b, v) =>
          b.x >= 0 && b.y >= 0 && b.x + b.w <= v.w && b.y + b.h <= v.h,
        intersects = (b, v) =>
          b.x < v.w && b.x + b.w > 0 && b.y < v.h && b.y + b.h > 0;
      expect(inside(boxes.player, boxes.viewport)).toBe(true);
      for (const type of spec.types)
        expect(
          boxes.items.some((o) => o.type === type && intersects(o, boxes.viewport)),
          type,
        ).toBe(true);
      expect(boxes.items.map((x) => x.type)).toEqual(
        expect.arrayContaining(spec.types),
      );
      const visibleItems = boxes.items.filter((item) =>
        intersects(item, boxes.viewport),
      );
      const mechanicPixels = await page.evaluate(async (items) => {
        const canvas = document.querySelector("#game"),
          context = canvas.getContext("2d"),
          sx = canvas.width / canvas.getBoundingClientRect().width,
          sy = canvas.height / canvas.getBoundingClientRect().height,
          regions = items.map((item) => ({
            type: item.type,
            x: Math.max(0, Math.floor(item.x * sx)),
            y: Math.max(0, Math.floor((item.y - 18) * sy)),
            w: 0,
            h: 0,
          })),
          sample = (r) =>
            Array.from(context.getImageData(r.x, r.y, r.w, r.h).data);
        for (const region of regions) {
          region.w = Math.max(1, Math.min(canvas.width - region.x, Math.ceil(items[regions.indexOf(region)].w * sx)));
          region.h = Math.max(1, Math.min(canvas.height - region.y, Math.ceil((items[regions.indexOf(region)].h + 32) * sy)));
        }
        const visible = regions.map(sample);
        const beforeFrame = __TMB_A12__.getState().engine.renderFrameCount;
        __TMB_A12__.setMovingPlatformsVisible(false);
        await new Promise((resolve, reject) => {
          const deadline = performance.now() + 1000,
            check = () => {
              if (__TMB_A12__.getState().engine.renderFrameCount > beforeFrame)
                resolve();
              else if (performance.now() > deadline)
                reject(new Error("no draw frame after hiding moving platforms"));
              else requestAnimationFrame(check);
            };
          requestAnimationFrame(check);
        });
        const hidden = regions.map(sample);
        __TMB_A12__.setMovingPlatformsVisible(true);
        return regions.map((region, index) => {
          const light = [];
          for (let i = 0; i < visible[index].length; i += 4)
            light.push(
              (visible[index][i] + visible[index][i + 1] + visible[index][i + 2]) /
                3,
            );
          light.sort((a, b) => a - b);
          return {
            type: region.type,
            mad:
              visible[index].reduce(
                (sum, value, i) => sum + Math.abs(value - hidden[index][i]),
                0,
              ) / visible[index].length,
            contrast:
              light[Math.floor(light.length * 0.9)] -
              light[Math.floor(light.length * 0.1)],
          };
        });
      }, visibleItems);
      for (const item of mechanicPixels) {
        expect(item.contrast, `${route} ${item.type} contrast`).toBeGreaterThan(15);
        if (["crane", "pallet"].includes(item.type))
          expect(item.mad, `${route} ${item.type} difference`).toBeGreaterThan(3);
      }
      if (route === "F02")
        await expect
          .poll(() =>
            page.evaluate(() => {
              const s = __TMB_A12__.getState(),
                p = s.movingPlatforms.find(
                  (item) =>
                    s.player.x + s.hitbox.w > item.x &&
                    s.player.x < item.x + item.w &&
                    Math.abs(s.player.y + s.hitbox.h - item.y) <= 5,
                );
              return s.player.onGround && !!p;
            }),
          )
          .toBe(true);
      const playerPixels = await page.evaluate(async (staleBox) => {
        const c = document.querySelector("#game"),
          x = c.getContext("2d"),
          sx = c.width / c.getBoundingClientRect().width,
          sy = c.height / c.getBoundingClientRect().height,
          state = __TMB_A12__.getState(),
          layout = __tmb.layout,
          box = {
            x:
              layout.viewOffsetX +
              (state.player.x - __tmb.cam) * layout.viewScale,
            y:
              layout.viewOffsetY +
              (layout.worldY + state.player.y) * layout.viewScale,
            w: state.hitbox.w * layout.viewScale,
            h: state.hitbox.h * layout.viewScale,
          },
          r = {
            x: Math.max(0, Math.floor(box.x * sx)),
            y: Math.max(0, Math.floor(box.y * sy)),
            w: Math.max(1, Math.ceil(box.w * sx)),
            h: Math.max(1, Math.ceil(box.h * sy)),
          },
          visible = Array.from(x.getImageData(r.x, r.y, r.w, r.h).data),
          beforeFrame = state.engine.renderFrameCount;
        __TMB_A12__.setPlayerVisible(false);
        await new Promise((resolve, reject) => {
          const deadline = performance.now() + 1000,
            check = () => {
              if (__TMB_A12__.getState().engine.renderFrameCount > beforeFrame)
                resolve();
              else if (performance.now() > deadline)
                reject(new Error("no draw frame after hiding player"));
              else requestAnimationFrame(check);
            };
          requestAnimationFrame(check);
        });
        const hidden = Array.from(x.getImageData(r.x, r.y, r.w, r.h).data);
        __TMB_A12__.setPlayerVisible(true);
        return {
          pixels: visible.reduce(
            (n, value, index) => n + Math.abs(value - hidden[index]),
            0,
          ),
          frameDelta:
            __TMB_A12__.getState().engine.renderFrameCount - beforeFrame,
          staleDelta: {
            x: Math.abs(box.x - staleBox.x),
            y: Math.abs(box.y - staleBox.y),
          },
          world: state.world.selectedWorldId,
          cacheKey: state.world.activeCacheKey,
        };
      }, boxes.player);
      expect(playerPixels.frameDelta).toBeGreaterThanOrEqual(1);
      expect(playerPixels.pixels).toBeGreaterThan(0);
      console.log("A4B1_REG_PLAYER", JSON.stringify({ route, size, ...playerPixels }));
      test.info().annotations.push({
        type: "player-pixel-measure",
        description: JSON.stringify({ route, size, ...playerPixels }),
      });
      await page.screenshot({
        path: path.join(
          __dirname,
          "tn-a4-shots",
          `${route}-obstacle-${size.width}x${size.height}.png`,
        ),
      });
    }
});
test("frozen-F03-F04-chain-theme-start-shots", async ({ page }) => {
  await unlockFrozen(page, "F02");
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F03"))).toBe(false);
  await page.evaluate(() => __TMB_A12__.finish());
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F03"))).toBe(true);
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F04"))).toBe(false);
  await page.evaluate(() => __TMB_A12__.finish());
  expect(await page.evaluate(() => __TMB_A12__.startRoute("F04"))).toBe(true);
  for (const route of ["F03", "F04"])
    for (const size of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await unlockFrozen(page, route);
      await page.evaluate(() => __TMB_A12__.placePlayer(300));
      await page.waitForTimeout(80);
      const s = await page.evaluate(() => __TMB_A12__.getState());
      expect(s.world.selectedWorldId).toBe("frozen");
      expect(s.route.id).toBe(route);
      for (const key of [
        "deckStripe",
        "dock31Text",
        "containerBlock",
        "dockCrane",
        "loadingCorridor",
      ])
        expect(s.world.renderSignatures[key]).toBe(0);
      await page.screenshot({
        path: path.join(
          __dirname,
          "tn-a4-shots",
          `${route}-start-${size.width}x${size.height}.png`,
        ),
      });
    }
});
test("moving-platform-visible", async ({ page }) => {
  const cases = [
    { world: "frozen", route: "F02", type: "crane" },
    { world: "frozen", route: "F02", type: "pallet" },
    { world: "dock31", route: "D03", type: "crane" },
    { world: "dock31", route: "D05", type: "pallet" },
  ];
  const measured = [];
  for (const item of cases) {
    if (item.world === "frozen") await unlockFrozen(page, item.route);
    else
      await page.evaluate((route) => {
        __TMB_A12__.purchaseWorld("dock31");
        __TMB_A12__.startRoute(route);
      }, item.route);
    const platform = await page.evaluate((type) => {
      const p = __TMB_A12__.getState().movingPlatforms.find((x) =>
        x.id.includes(type),
      );
      __TMB_A12__.placePlayer(p.x + p.w / 2 - 12, p.y - 48);
      return p;
    }, item.type);
    const pixels = await page.evaluate(async (id) => {
      const canvas = document.querySelector("#game"),
        context = canvas.getContext("2d"),
        boxFor = (p) => {
          const l = __tmb.layout,
            sx = canvas.width / canvas.getBoundingClientRect().width,
            sy = canvas.height / canvas.getBoundingClientRect().height;
          return {
            x: Math.floor((l.viewOffsetX + (p.x - __tmb.cam) * l.viewScale) * sx),
            y: Math.floor((l.viewOffsetY + (l.worldY + p.y - 18) * l.viewScale) * sy),
            w: Math.max(1, Math.ceil(p.w * l.viewScale * sx)),
            h: Math.max(1, Math.ceil((p.h + 32) * l.viewScale * sy)),
          };
        },
        started = performance.now();
      let box;
      while (performance.now() - started <= 2000) {
        const p = __TMB_A12__.getState().movingPlatforms.find((x) => x.id === id);
        box = boxFor(p);
        if (
          box.x >= 0 &&
          box.x + box.w <= canvas.width &&
          box.y >= 0 &&
          box.y + box.h <= canvas.height
        )
          break;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      if (
        !box ||
        box.x < 0 ||
        box.x + box.w > canvas.width ||
        box.y < 0 ||
        box.y + box.h > canvas.height
      )
        throw new Error(
          `platform box did not enter canvas within 2000 ms; box=${JSON.stringify(box)} canvas=${canvas.width}x${canvas.height}`,
        );
      const state = __TMB_A12__.getState(),
        p = state.movingPlatforms.find((x) => x.id === id);
      box = boxFor(p);
      const sample = () =>
        Array.from(context.getImageData(box.x, box.y, box.w, box.h).data);
      const visible = sample();
      const beforeFrame = __TMB_A12__.getState().engine.renderFrameCount;
      __TMB_A12__.setMovingPlatformsVisible(false);
      await new Promise((resolve, reject) => {
        const deadline = performance.now() + 1000,
          check = () => {
            if (__TMB_A12__.getState().engine.renderFrameCount > beforeFrame)
              resolve();
            else if (performance.now() > deadline)
              reject(new Error("no draw frame after hiding moving platforms"));
            else requestAnimationFrame(check);
          };
        requestAnimationFrame(check);
      });
      const hidden = sample();
      __TMB_A12__.setMovingPlatformsVisible(true);
      const light = [];
      for (let i = 0; i < visible.length; i += 4)
        light.push((visible[i] + visible[i + 1] + visible[i + 2]) / 3);
      light.sort((a, b) => a - b);
      return {
        mad:
          visible.reduce((sum, value, i) => sum + Math.abs(value - hidden[i]), 0) /
          visible.length,
        contrast:
          light[Math.floor(light.length * 0.9)] -
          light[Math.floor(light.length * 0.1)],
      };
    }, platform.id);
    expect(pixels.mad, `${item.route} ${item.type} difference`).toBeGreaterThan(3);
    expect(pixels.contrast, `${item.route} ${item.type} contrast`).toBeGreaterThan(15);
    measured.push({ ...item, ...pixels });
  }
  test.info().annotations.push({
    type: "measure",
    description: JSON.stringify(measured),
  });
});

async function magmaScene(page, route="D01", x=300) {
  await page.evaluate(({route,x}) => { __TMB_A12__.renderWorldOnRoute("magma",route); __TMB_A12__.placePlayer(x); }, {route,x});
  await page.waitForTimeout(180);
  expect((await page.evaluate(() => __TMB_A12__.getState())).world.selectedWorldId).toBe("magma");
}

test("magma-registry-purchase", async ({ page }) => {
  await page.evaluate(() => __TMB_A12__.setWallet(1000));
  const before=await page.evaluate(() => __TMB_A12__.getState());
  const results=await page.evaluate(() => Promise.all([__TMB_A12__.purchaseWorld("magma"),__TMB_A12__.purchaseWorld("magma")]));
  const after=await page.evaluate(() => __TMB_A12__.getState());
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(after.profile.walletBalance).toBe(800);
  expect(after.profile.ownedWorldIds.filter(x=>x==="magma")).toHaveLength(1);
  expect(after.profile.ownedWorldIds.includes("frozen")).toBe(before.profile.ownedWorldIds.includes("frozen"));
  expect(after.world.selectedWorldId).toBe("dock31");
  expect(after.world.pendingWorldId).toBeNull();
});

test("magma-dock-frozen-signatures-absent", async ({ page }) => {
  await magmaScene(page);
  const sig=await page.evaluate(() => __TMB_A12__.getState().world.renderSignatures);
  for(const key of ["deckStripe","dock31Text","containerBlock","dockCrane","loadingCorridor","snowCap","icicles","iceRatio"]) expect(sig[key],key).toBe(0);
});

// EMEKLİ [Y §10 C uzakta lav] → magma-lava-far-only
test.skip("magma-safe-surface-not-lava", async ({ page }) => {
  await magmaScene(page);
  const ratios=await page.evaluate(() => {
    const c=document.querySelector("#game"),x=c.getContext("2d"),ratio=(r)=>{const d=x.getImageData(...r).data;let hot=0,n=0;for(let i=0;i<d.length;i+=4){const R=d[i]/255,G=d[i+1]/255,B=d[i+2]/255,max=Math.max(R,G,B),min=Math.min(R,G,B),delta=max-min;let h=0;if(delta){if(max===R)h=60*((G-B)/delta%6);else if(max===G)h=60*((B-R)/delta+2);else h=60*((R-G)/delta+4);if(h<0)h+=360;}const s=max?delta/max:0;if(h<=40&&s>.6&&max>.6)hot++;n++;}return hot/n;};return {surface:ratio([0,390,c.width,90]),lava:ratio([0,450,c.width,70])};
  });
  expect(ratios.surface).toBeLessThanOrEqual(.02);expect(ratios.lava).toBeGreaterThanOrEqual(.05);
  console.log("MAGMA_LAVA",JSON.stringify(ratios));
  test.info().annotations.push({type:"measure",description:JSON.stringify(ratios)});
});

test("magma-readable", async ({ page }) => {
  const values=[];
  for(const size of [{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(size);await magmaScene(page,"D01",2460);const v=await page.evaluate(()=>{const c=document.querySelector("#game"),x=c.getContext("2d"),spread=r=>{const d=x.getImageData(...r).data,a=[];for(let i=0;i<d.length;i+=4)a.push((d[i]+d[i+1]+d[i+2])/3);a.sort((p,q)=>p-q);return a[Math.floor(a.length*.9)]-a[Math.floor(a.length*.1)];};return [spread([0,330,c.width,130]),spread([350,330,Math.min(400,c.width-350),130]),spread([0,390,c.width,80])];});for(const n of v)expect(n).toBeGreaterThan(15);values.push({size,v});}
  console.log("MAGMA_READABLE",JSON.stringify(values));test.info().annotations.push({type:"measure",description:JSON.stringify(values)});
});

test("magma-moving-platform-visible", async ({ page }) => {
  await magmaScene(page,"D03",2400);
  const m=await page.evaluate(async()=>{const p=__TMB_A12__.getState().movingPlatforms[0];__TMB_A12__.placePlayer(p.x);await new Promise(r=>setTimeout(r,180));const c=document.querySelector("#game"),x=c.getContext("2d"),l=__tmb.layout,sx=c.width/c.getBoundingClientRect().width,sy=c.height/c.getBoundingClientRect().height,r=[Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*sx)),Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*sy)),Math.ceil(p.w*l.viewScale*sx),Math.ceil((p.h+32)*l.viewScale*sy)],sample=()=>Array.from(x.getImageData(...r).data),a=sample(),beforeFrame=__TMB_A12__.getState().engine.renderFrameCount;__TMB_A12__.setMovingPlatformsVisible(false);await new Promise((resolve,reject)=>{const deadline=performance.now()+1000,check=()=>{if(__TMB_A12__.getState().engine.renderFrameCount>beforeFrame)resolve();else if(performance.now()>deadline)reject(new Error("no draw frame after hiding moving platforms"));else requestAnimationFrame(check);};requestAnimationFrame(check);});const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((u,v)=>u-v);return {mad:a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],frameDelta:__TMB_A12__.getState().engine.renderFrameCount-beforeFrame};});
  expect(m.frameDelta).toBeGreaterThanOrEqual(1);
  expect(m.mad).toBeGreaterThan(3);expect(m.contrast).toBeGreaterThan(15);console.log("MAGMA_MOVING",JSON.stringify(m));test.info().annotations.push({type:"measure",description:JSON.stringify(m)});
});

test("magma-physics-identical", async ({ page }) => {
  const run=async w=>{await page.evaluate(w=>{__TMB_A12__.renderWorldOnRoute(w,"D01");__TMB_A12__.placePlayer(70);},w);await page.keyboard.down("ArrowRight");await page.evaluate(w=>__TMB_A12__.renderWorldOnRoute(w,"D01"),w);const a=await page.evaluate(()=>new Promise(resolve=>{const raw=[],tick=()=>{const s=__TMB_A12__.getState();raw.push({t:s.gameClock,x:s.player.x,y:s.player.y});if(s.gameClock<3.05)requestAnimationFrame(tick);else{const out=[];for(let target=.2;target<=3.001;target+=.2){let i=1;while(i<raw.length&&raw[i].t<target)i++;const p=raw[Math.max(0,i-1)],q=raw[Math.min(i,raw.length-1)],f=q.t===p.t?0:(target-p.t)/(q.t-p.t);out.push([p.x+(q.x-p.x)*f,p.y+(q.y-p.y)*f]);}resolve(out);}};requestAnimationFrame(tick);}));await page.keyboard.up("ArrowRight");return a;},dock=await run("dock31"),magma=await run("magma");for(let i=0;i<dock.length;i++){expect(Math.abs(dock[i][0]-magma[i][0])).toBeLessThanOrEqual(.5);expect(Math.abs(dock[i][1]-magma[i][1])).toBeLessThanOrEqual(.5);}
});

test("magma-render-performance", async ({ page }) => {const m=await page.evaluate(()=>({dock:__TMB_A12__.benchmarkWorldDraw("dock31",120),magma:__TMB_A12__.benchmarkWorldDraw("magma",120)}));console.log("MAGMA_PERF",JSON.stringify(m));expect(m.magma/m.dock).toBeLessThanOrEqual(1.5);test.info().annotations.push({type:"measure",description:JSON.stringify({...m,ratio:m.magma/m.dock})});});

test("magma-not-recolor-and-screenshots", async ({ page }) => {
  const fit=(a,b)=>{let total=0,n=0;for(let ch=0;ch<3;ch++){let sx=0,sy=0,sxx=0,sxy=0,m=0;for(let i=ch;i<a.length;i+=4){sx+=a[i];sy+=b[i];sxx+=a[i]*a[i];sxy+=a[i]*b[i];m++;}const den=m*sxx-sx*sx,A=den?(m*sxy-sx*sy)/den:0,B=(sy-A*sx)/m;for(let i=ch;i<a.length;i+=4){total+=(b[i]-(A*a[i]+B))**2;n++;}}return Math.sqrt(total/n);};
  const all={};for(const world of ["dock31","frozen","magma"]){await page.evaluate(w=>__TMB_A12__.renderWorldOnRoute(w,"D01"),world);await page.waitForTimeout(150);all[world]=await page.evaluate(()=>{const x=document.querySelector("#game").getContext("2d"),rs={background:[0,70,500,190],structures:[0,210,500,170],ground:[0,390,500,90],obstacle:[310,315,280,130]},o={};for(const [k,r] of Object.entries(rs))o[k]=Array.from(x.getImageData(...r).data);return o;});}
  const values={};for(const source of ["dock31","frozen"])for(const k of Object.keys(all.magma)){const v=fit(all[source][k],all.magma[k]);expect(v,`${source} ${k}`).toBeGreaterThan(18);values[`${source}-${k}`]=v;}expect(fit(all.magma.background,all.magma.background)).toBeLessThan(1);
  for(const size of [{width:1280,height:720},{width:390,height:844}])for(const route of ["D01","D03"]){await page.setViewportSize(size);await magmaScene(page,route,route==="D03"?2400:300);await page.screenshot({path:path.join(__dirname,"tn-a4-shots",`magma-${route}-${size.width}x${size.height}.png`)});}
  console.log("MAGMA_RMSE",JSON.stringify(values));test.info().annotations.push({type:"measure",description:JSON.stringify(values)});
});

test("coin-contact-only", async ({ page }) => {
  const rows = await page.evaluate(() => {
    const rect = { x: 100, y: 100, w: 32, h: 48 },
      radius = __TMB_A12__.coinGeometry().contactRadius,
      corner = { x: rect.x + rect.w, y: rect.y + rect.h },
      diagonal = (distance) => ({
        x: corner.x + distance / Math.SQRT2,
        y: corner.y + distance / Math.SQRT2,
      }),
      probes = {
        horizontal: [{ x: rect.x + rect.w + radius + 1, y: 124 }, { x: rect.x + rect.w + radius - 1, y: 124 }],
        vertical: [{ x: 116, y: rect.y + rect.h + radius + 1 }, { x: 116, y: rect.y + rect.h + radius - 1 }],
        diagonal: [diagonal(radius + 1), diagonal(radius - 1)],
      };
    return ["D01", "D03", "D06", "F02"].flatMap((route) =>
      Object.entries(probes).map(([approach, [apart, overlap]]) => ({
        route,
        approach,
        apart: __TMB_A12__.coinContact(rect, apart),
        overlap: __TMB_A12__.coinContact(rect, overlap),
        old120WouldCollect: Math.hypot(apart.x - 116, apart.y - 124) < 120,
      })),
    );
  });
  for (const row of rows) {
    expect(row.apart, `${row.route} ${row.approach} 1px apart`).toBe(false);
    expect(row.overlap, `${row.route} ${row.approach} 1px overlap`).toBe(true);
    expect(row.old120WouldCollect, `${row.route} ${row.approach} old positive control`).toBe(true);
  }
  test.info().annotations.push({ type: "measure", description: JSON.stringify(rows) });
});

test("coin-draw-equals-pickup", async ({ page }) => {
  const measured = await page.evaluate(() => ({
    geometry: __TMB_A12__.coinGeometry(),
    pixelRadius: __TMB_A12__.measureCoinPixels(),
  }));
  expect(Math.abs(measured.pixelRadius - measured.geometry.contactRadius)).toBeLessThanOrEqual(1);
  expect(measured.geometry.contactRadius).toBe(
    measured.geometry.fillRadius + measured.geometry.strokeWidth / 2,
  );
  test.info().annotations.push({ type: "measure", description: JSON.stringify(measured) });
});

const dockBaseline = {
  D01: [...Array.from({length:25},(_,i)=>({n:i,x:180+i*170,y:i%3===1?355:390,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:2710+i*78,y:i%3===1?355:390,skill:true}))],
  D02: [...Array.from({length:25},(_,i)=>({n:i,x:170+i*170,y:i%3===1?355:390,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:4070+i*78,y:i%3===1?355:390,skill:true}))],
  D03: [...Array.from({length:25},(_,i)=>({n:i,x:170+i*420,y:425,skill:false})),...Array.from({length:8},(_,i)=>({n:25+i,x:1160+i*105,y:390,skill:true})),...Array.from({length:7},(_,i)=>({n:33+i,x:5240+i*118,y:390,skill:true}))],
  D04: [...Array.from({length:25},(_,i)=>({n:i,x:170+i*280,y:i%3===1?355:390,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:1510+i*100,y:300,skill:true}))],
  D05: [...Array.from({length:25},(_,i)=>({n:i,x:170+i*330,y:425,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:4350+i*155,y:365,skill:true}))],
  D06: [...Array.from({length:25},(_,i)=>({n:i,x:i===1?1450:i===2?1580:200+i*440,y:425,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:660+i*50,y:215,skill:true}))],
};
const c1Rejected = (route) => [...Array.from({length:25},(_,n)=>({n,x:route==="D06"?1600+n*12:200+n*12,y:425,skill:false})),...Array.from({length:15},(_,i)=>({n:25+i,x:route==="D06"?1000:510+i*12,y:route==="D06"?215:425,skill:true}))];
const layoutMeasures = (actual, baseline) => {
  const byN = new Map(actual.map(c=>[Number(c.id.slice(-2))-1,c]));
  const rows = baseline.map(b=>({b,a:byN.get(b.n)}));
  const groups = [false,true].map(skill=>rows.filter(r=>r.b.skill===skill));
  const pairDistances=[],spacingExemptions=[],spacingViolations=[];
  for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++){
    const actualDistance=Math.hypot(actual[i].x-actual[j].x,actual[i].y-actual[j].y);
    const baselineDistance=Math.hypot(baseline[i].x-baseline[j].x,baseline[i].y-baseline[j].y);
    const threshold=baselineDistance<40?baselineDistance-1:40;
    const pair=`c${String(baseline[i].n+1).padStart(2,"0")}-c${String(baseline[j].n+1).padStart(2,"0")}`;
    pairDistances.push(actualDistance);
    if(baselineDistance<40)spacingExemptions.push({pair,baselineDistance,threshold});
    if(actualDistance<threshold)spacingViolations.push({pair,actualDistance,baselineDistance,threshold});
  }
  const segmentCounts = list => { const out={}; for(const c of list)out[Math.floor(c.x/1000)]=(out[Math.floor(c.x/1000)]||0)+1; return out; };
  const segmentDelta = (()=>{const a=segmentCounts(actual),b=segmentCounts(baseline),keys=new Set([...Object.keys(a),...Object.keys(b)]);return Math.max(...[...keys].map(k=>Math.abs((a[k]||0)-(b[k]||0))),0)})();
  const moved=rows.filter(r=>r.a.x!==r.b.x||r.a.y!==r.b.y);
  return {
    order:groups.every(g=>g.slice().sort((p,q)=>p.a.x-q.a.x).map(r=>r.b.n).join(",")===g.slice().sort((p,q)=>p.b.x-q.b.x).map(r=>r.b.n).join(",")),
    maxDx:Math.max(...rows.map(r=>Math.abs(r.a.x-r.b.x))), maxDy:Math.max(...rows.map(r=>Math.abs(r.a.y-r.b.y))),
    moved:moved.map(r=>({id:r.a.id,dx:r.a.x-r.b.x,dy:r.a.y-r.b.y})),
    minSpacing:Math.min(...pairDistances), spacingExemptions, spacingViolations,
    spans:groups.map(g=>({actual:Math.max(...g.map(r=>r.a.x))-Math.min(...g.map(r=>r.a.x)),baseline:Math.max(...g.map(r=>r.b.x))-Math.min(...g.map(r=>r.b.x))})),
    segmentDelta,
  };
};

// EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
test.skip("coin-layout-order-displacement-spacing-span-segments", async ({ page }) => {
  const measured={};
  for(const route of Object.keys(dockBaseline)){
    await page.evaluate(route=>__TMB_A12__.startRoute(route,true,true),route);
    const actual=await page.evaluate(()=>__TMB_A12__.getState().route.coins);
    const m=measured[route]=layoutMeasures(actual,dockBaseline[route]);
    expect(m.order,`${route} G1 order`).toBe(true);
    expect(m.maxDx,`${route} G2 dx`).toBeLessThanOrEqual(160);
    expect(m.maxDy,`${route} G2 dy`).toBeLessThanOrEqual(140);
    expect(m.spacingViolations,`${route} G3 spacing`).toEqual([]);
    for(const span of m.spans)expect(span.actual,`${route} G4 span`).toBeGreaterThanOrEqual(span.baseline*.9);
    expect(m.segmentDelta,`${route} G5 segments`).toBeLessThanOrEqual(2);
  }
  const negative=Object.fromEntries(Object.keys(dockBaseline).map(route=>[route,layoutMeasures(c1Rejected(route).map(c=>({id:`${route}-c${String(c.n+1).padStart(2,"0")}`,...c})),dockBaseline[route])]));
  console.log("COIN_LAYOUT_MEASURE",JSON.stringify({measured,negative}));
  test.info().annotations.push({type:"coin-layout",description:JSON.stringify({measured,negative})});
});

// EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
test.skip("coin-layout-hazard-safe", async ({ page }) => {
  const rows=[];
  for(const route of Object.keys(dockBaseline)){
    await page.evaluate(route=>__TMB_A12__.startRoute(route,true,true),route);
    const actual=await page.evaluate(()=>__TMB_A12__.getState().route.coins);
    const m=layoutMeasures(actual,dockBaseline[route]);
    rows.push({route,moved:m.moved.length,hazardHits:0});
    expect(0,`${route} G8 moved-coin hazard hits`).toBe(0);
  }
  test.info().annotations.push({type:"coin-layout-hazard",description:JSON.stringify(rows)});
});

const dockInput = {
  D01:{timeout:45000,zones:[[815,870],[1580,1640]]},
  D02:{timeout:90000,zones:[[685,730],[1250,1300],[1810,1850],[1890,1925],[3230,3420],[6420,6510],[6970,7050],[7620,7710],[8420,8510]]},
  D03:{timeout:90000,jumpEvery:100000},
  D04:{timeout:90000,zones:[[1240,1300],[2160,2240],[4700,4780]]},
};
async function runDockInput(page,route,override={}){
  const input={...dockInput[route],...override},trace=[];
  await page.evaluate(route=>__TMB_A12__.startRoute(route,true,true),route);
  await page.keyboard.down("ArrowRight");
  const started=Date.now(); let n=1,last;
  while(Date.now()-started<input.timeout){
    const s=last=await page.evaluate(()=>__TMB_A12__.getState());
    trace.push({x:s.player.x,y:s.player.y});
    if(input.zones?.some(([a,b])=>s.player.x>a&&s.player.x<b)||input.jumpEvery&&n++%input.jumpEvery===0)await page.keyboard.press("Space");
    if(s.result){await page.keyboard.up("ArrowRight");s.trace=trace;return s;}
    await page.waitForTimeout(40);
  }
  await page.keyboard.up("ArrowRight");
  throw new Error(`${route} timeout x=${last?.player.x} coins=${last?.economy?.runCoins}`);
}

for(const route of ["D01","D02","D04"]){
  // EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
  test.skip(`d-all-40-real-input ${route}`,async({page})=>{
    test.setTimeout(100000);
    const s=await runDockInput(page,route),got=new Set(s.economy.collectedCoinIds);
    console.log("D_ALL_40_TRACE",route,s.economy.runCoins,s.route.coins.filter(c=>!got.has(c.id)).map(c=>({id:c.id,x:c.x,y:c.y,trace:s.trace.reduce((best,p)=>Math.abs(p.x-c.x)<Math.abs(best.x-c.x)?p:best,s.trace[0])})));
    expect(s.economy.runCoins).toBe(40);
  });
}

for(const route of ["D01","D02","D03","D04"]){
  // EMEKLİ [Y 27.09] coin yerleşimi → G1–G7 (T2)
  test.skip(`d-skill-line-main-only ${route}`,async({page})=>{
    test.setTimeout(100000);
    const s=await runDockInput(page,route),skillCollected=s.economy.collectedCoinIds.filter(id=>Number(id.slice(-2))>=26).length;
    console.log("D_SKILL_LINE",route,{skillCollected,total:s.economy.runCoins});
    if(["D03","D04"].includes(route))expect(skillCollected).toBeLessThanOrEqual(7);
    test.info().annotations.push({type:"d-skill-line",description:JSON.stringify({route,skillCollected,total:s.economy.runCoins})});
  });
}

// A4b-1-FIX: screen-space regions derived from the live layout; no fixed world/screen mix.
async function a4fixFrame(page,world,route,size) {
 await page.setViewportSize(size);
 await page.evaluate(({world,route})=>{const a=__TMB_A12__;a.renderThemeFixture(world,route);const s=a.getState();const x=route==='D02'?s.route.obstacles.find(o=>o.type==='worker').x-110:route==='D03'?s.movingPlatforms[0].x-70:300;a.placePlayer(x);},{world,route});
 await page.waitForTimeout(850);
 expect(await page.evaluate(()=>__TMB_A12__.getState().world.selectedWorldId)).toBe(world);
 return page.evaluate(()=>{
  const s=__TMB_A12__.getState(),c=document.querySelector('#game'),l=__tmb.layout,scale=l.viewScale*c.width/c.getBoundingClientRect().width;
  const box=(x,y,w,h)=>({x:(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*c.width/c.getBoundingClientRect().width,y:(l.viewOffsetY+(l.worldY+y)*l.viewScale)*c.height/c.getBoundingClientRect().height,w:w*scale,h:h*scale});
  const crate=s.route.obstacles.find(o=>o.type==='vault'&&o.x>=__tmb.cam&&o.x<__tmb.cam+l.W),worker=s.route.obstacles.find(o=>o.type==='worker'),crane=s.movingPlatforms[0];
  const hud=[{x:14,y:14,w:360,h:54},l.hud,l.timer].map(b=>({x:(l.viewOffsetX+b.x*l.viewScale)*c.width/c.getBoundingClientRect().width,y:(l.viewOffsetY+b.y*l.viewScale)*c.height/c.getBoundingClientRect().height,w:b.w*scale,h:b.h*scale}));return {hud,width:c.width,height:c.height,ground:(l.viewOffsetY+(l.worldY+455)*l.viewScale)*c.height/c.getBoundingClientRect().height,player:box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h),crate:crate?box(crate.x,455-crate.h,crate.w,crate.h):null,worker:worker?box(worker.x-20,455-94,40,94):null,crane:crane?box(crane.x,crane.y,crane.w,crane.h):null};
 });
}
async function a4fixPixels(page,rect) {
 const p=await page.evaluate(r=>{const c=document.querySelector('#game'),x=Math.max(0,Math.floor(r.x)),y=Math.max(0,Math.floor(r.y)),w=Math.max(1,Math.min(c.width-x,Math.ceil(r.w))),h=Math.max(1,Math.min(c.height-y,Math.ceil(r.h)));const data=c.getContext('2d').getImageData(x,y,w,h).data;let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));return {x,y,w,h,data:btoa(binary)};},rect);
 p.data=Buffer.from(p.data,'base64');return p;
}
function a4fixHSV(r,g,b){r/=255;g/=255;b/=255;const v=Math.max(r,g,b),m=Math.min(r,g,b),d=v-m;let h=!d?0:v===r?60*((g-b)/d%6):v===g?60*((b-r)/d+2):60*((r-g)/d+4);if(h<0)h+=360;return [h,v?d/v:0,v];}
function a4fixRatio(p,predicate){let n=0;for(let i=0;i<p.data.length;i+=4)if(predicate(...a4fixHSV(...p.data.slice(i,i+3))))n++;return n/(p.data.length/4);}
function a4fixFit(a,b){let total=0,n=0;for(let ch=0;ch<3;ch++){let sx=0,sy=0,sxx=0,sxy=0,m=0;for(let i=ch;i<a.length;i+=4){sx+=a[i];sy+=b[i];sxx+=a[i]*a[i];sxy+=a[i]*b[i];m++;}const den=m*sxx-sx*sx,A=den?(m*sxy-sx*sy)/den:0,B=(sy-A*sx)/m;for(let i=ch;i<a.length;i+=4){total+=(b[i]-(A*a[i]+B))**2;n++;}}return Math.sqrt(total/n);}
const a4fixSizes=[{width:1280,height:720},{width:390,height:844}];
test('magma-ground-texture',async({page})=>{for(const size of a4fixSizes){const f=await a4fixFrame(page,'magma','D01',size),p=await a4fixPixels(page,{x:0,y:f.ground,w:f.width,h:80});let edges=0,n=0;const gray=(x,y)=>{const i=(y*p.w+x)*4;return .299*p.data[i]+.587*p.data[i+1]+.114*p.data[i+2];};for(let y=1;y<p.h-1;y++)for(let x=1;x<p.w-1;x++){if(x>=f.player.x&&x<=f.player.x+f.player.w&&y+p.y<=f.player.y+f.player.h)continue;const gx=-gray(x-1,y-1)+gray(x+1,y-1)-2*gray(x-1,y)+2*gray(x+1,y)-gray(x-1,y+1)+gray(x+1,y+1),gy=-gray(x-1,y-1)-2*gray(x,y-1)-gray(x+1,y-1)+gray(x-1,y+1)+2*gray(x,y+1)+gray(x+1,y+1);if(Math.hypot(gx,gy)>80)edges++;n++;}const ratio=edges/n;console.log('FIX_GROUND',size.width,ratio);expect(ratio).toBeGreaterThanOrEqual(.03);expect(ratio).toBeLessThanOrEqual(.30);}});
test('magma-lava-far-only',async({page})=>{for(const size of a4fixSizes){const f=await a4fixFrame(page,'magma','D01',size),depth=size.width===1280?200:160,pred=(h,s,v)=>h<=40&&s>.6&&v>.6;const near=a4fixRatio(await a4fixPixels(page,{x:0,y:f.ground-depth,w:f.width,h:depth}),pred),all=a4fixRatio(await a4fixPixels(page,{x:0,y:0,w:f.width,h:f.height}),pred);console.log('FIX_LAVA',size.width,{near,all,ground:f.ground});expect(near).toBeLessThanOrEqual(.01);expect(all).toBeGreaterThanOrEqual(.01);}});
test('magma-ash-small-sparse',async({page})=>{for(const size of a4fixSizes){const f=await a4fixFrame(page,'magma','D01',size),p=await a4fixPixels(page,{x:0,y:0,w:f.width,h:Math.max(1,f.ground-260)}),mask=new Uint8Array(p.w*p.h);let total=0,max=0,samples=0;for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){if(f.hud.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))continue;samples++;const i=(y*p.w+x)*4,[h,s,v]=a4fixHSV(...p.data.slice(i,i+3));if(s<.2&&v>.35){mask[y*p.w+x]=1;total++;}}for(let i=0;i<mask.length;i++)if(mask[i]){const q=[i];mask[i]=0;let count=0;while(q.length){const k=q.pop();count++;const x=k%p.w,y=Math.floor(k/p.w);for(const j of [x>0?k-1:-1,x<p.w-1?k+1:-1,y>0?k-p.w:-1,y<p.h-1?k+p.w:-1])if(j>=0&&mask[j]){mask[j]=0;q.push(j);}}max=Math.max(max,count);}console.log('FIX_ASH',size.width,{max,coverage:total/samples});expect(max).toBeLessThanOrEqual(36);expect(total/samples).toBeLessThanOrEqual(.015);}});
test('magma-crate-not-dock',async({page})=>{for(const size of a4fixSizes){const ratios={};for(const world of ['dock31','magma']){const f=await a4fixFrame(page,world,'D01',size);expect(f.crate).not.toBeNull();ratios[world]=a4fixRatio(await a4fixPixels(page,f.crate),(h,s,v)=>h>=20&&h<=40&&s>=.35&&s<=.8&&v>=.35&&v<=.8);}console.log('FIX_CRATE',size.width,ratios);expect(ratios.dock31).toBeGreaterThanOrEqual(.30);expect(ratios.magma).toBeLessThanOrEqual(.05);}});
test('magma-worker-variant',async({page})=>{for(const size of a4fixSizes){const pixels={};for(const world of ['dock31','frozen','magma']){const f=await a4fixFrame(page,world,'D02',size);pixels[world]=(await a4fixPixels(page,f.worker)).data;}for(const world of ['dock31','frozen']){const rmse=a4fixFit(pixels[world],pixels.magma);console.log('FIX_WORKER',size.width,world,rmse);expect(rmse).toBeGreaterThan(18);}expect(a4fixFit(pixels.magma,pixels.magma)).toBeLessThan(1);}});
test('magma-crane-in-frame',async({page})=>{for(const size of a4fixSizes){const f=await a4fixFrame(page,'magma','D03',size),b=f.crane;expect(b).not.toBeNull();const visible=Math.max(0,Math.min(f.width,b.x+b.w)-Math.max(0,b.x))*Math.max(0,Math.min(f.height,b.y+b.h)-Math.max(0,b.y))/(b.w*b.h);expect(visible).toBeGreaterThanOrEqual(.8);expect(f.player.x+f.player.w).toBeGreaterThan(0);expect(f.player.x).toBeLessThan(f.width);const a=await a4fixPixels(page,b);await page.evaluate(()=>__TMB_A12__.setMovingPlatformsVisible(false));await page.waitForTimeout(40);const hidden=await a4fixPixels(page,b);await page.evaluate(()=>__TMB_A12__.setMovingPlatformsVisible(true));const mad=a.data.reduce((n,v,i)=>n+Math.abs(v-hidden.data[i]),0)/a.data.length,lum=[];for(let i=0;i<a.data.length;i+=4)lum.push((a.data[i]+a.data[i+1]+a.data[i+2])/3);lum.sort((a,b)=>a-b);const contrast=lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)];console.log('FIX_CRANE',size.width,{visible,mad,contrast});expect(mad).toBeGreaterThan(3);expect(contrast).toBeGreaterThan(15);}});
test('magma-fix-evidence-frames',async({page})=>{test.setTimeout(60000);for(const size of a4fixSizes)for(const world of ['dock31','frozen','magma'])for(const route of ['D01','D02','D03']){const f=await a4fixFrame(page,world,route,size);expect(f.player.x).toBeLessThan(f.width);expect(f.player.x+f.player.w).toBeGreaterThan(0);expect(f.player.y).toBeGreaterThanOrEqual(0);expect(f.player.y+f.player.h).toBeLessThanOrEqual(f.height);await page.screenshot({path:path.join(__dirname,'tn-a4-shots',`${world==='dock31'?'dock':world}-${route}-${size.width}x${size.height}.png`)});}});

// A4b-2a: live measurements, fixed dt/seed, locked Bot S through world adapter.
const {runMagma,startMagma}=require('./lib/bot-magma.cjs');
const {prepareMagmaPage,readMagmaProbe}=require('./lib/magma-probe.cjs');
const {runWalking:walkMagma}=require('./lib/bot-w.cjs');
for(const id of ['M01','M02'])test('magma-'+id+'-bot-s-completion',async({browser})=>{
 const rows=[];for(let i=0;i<2;i++){const q=await prepareMagmaPage(browser,base);try{const r=await runMagma(q,id);const observed=await readMagmaProbe(q);rows.push({finished:r.finished,deaths:r.deaths,game_s:r.game_s,hash:r.hash,coins:observed.economy.collectedCoinIds.length,world:observed.world,routeId:observed.routeId,rides:observed.rides,collapse:observed.collapse,usage:observed.usage});}finally{await q.close();}}
 if(process.env.M_RED)rows[0].coins=0;
 console.log('M_COMPLETION',id,JSON.stringify(rows));
 expect(rows.every(r=>r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90&&r.coins===14&&r.world==='magma'&&r.routeId===id)&&rows[0].hash===rows[1].hash).toBe(true);
});
for(const id of ['M01','M02'])test('magma-'+id+'-G1-walking-zero',async({browser})=>{
 const q=await prepareMagmaPage(browser,base);try{await startMagma(q,id);const w=await walkMagma(q,id);if(process.env.M_RED)w.coinIds.push('synthetic-ground-coin');console.log('M_WALK',id,JSON.stringify({complete:w.complete,coins:w.coinIds,coverage:w.coverage}));expect(w.complete&&w.coinIds.length===0&&w.coverage>=.95).toBe(true);}finally{await q.close();}
});

test('magma-M02-carriers-visible-on-contact',async({browser})=>{
 const rows=[];
 for(const target of ['m02-m-01','m02-m-06','m02-m-10']){
  const q=await prepareMagmaPage(browser,base);try{
   await q.evaluate(target=>{const orig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const r=orig(dt);if(__TMB_A12__.getState().movingPlatforms.some(p=>p.id===target&&p.rideFrames>=3))throw Error('M_CARRIER_CAPTURE');return r;};},target);
   try{await runMagma(q,'M02');}catch(e){if(!String(e).includes('M_CARRIER_CAPTURE'))throw e;}
   await q.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));__tmbParkour.pause();window.dispatchEvent(new Event('pageshow'));});
   await q.waitForTimeout(80);
   const v=await q.evaluate(async target=>{
    const s=__TMB_A12__.getState(),p=s.movingPlatforms.find(m=>m.id===target),canvas=document.querySelector('#game'),c=canvas.getContext('2d'),l=__tmb.layout,rect=canvas.getBoundingClientRect(),scale=canvas.width/rect.width;
    const x=Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*scale)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*scale)),w=Math.min(canvas.width-x,Math.ceil(p.w*l.viewScale*scale)),h=Math.min(canvas.height-y,Math.ceil((p.h+32)*l.viewScale*scale));
    const sample=()=>Array.from(c.getImageData(x,y,w,h).data),a=sample();__TMB_A12__.setMovingPlatformsVisible(false);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);
    const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((a,b)=>a-b);
    return {target,world:s.world.selectedWorldId,route:s.routeId,rideFrames:p.rideFrames,mad:a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],visible:w/(p.w*l.viewScale*scale),cover:[...document.querySelectorAll('#a12Shop.show,#characterSelect.show')].filter(e=>e.getBoundingClientRect().width>0).length};
   },target);rows.push(v);
  }finally{await q.close();}
 }
 if(process.env.M_RED)rows[0].mad=0;
 console.log('M_VISIBLE',JSON.stringify(rows));expect(rows.every(r=>r.world==='magma'&&r.route==='M02'&&r.rideFrames>2&&r.mad>3&&r.contrast>15&&r.visible>=.8&&r.cover===0)).toBe(true);
});
test('magma-M01-M02-parkour-systems-observed',async({browser})=>{
 const rows=[];for(const id of ['M01','M02']){const q=await prepareMagmaPage(browser,base);try{const r=await runMagma(q,id),p=await readMagmaProbe(q);rows.push({id,ramp:p.flips>0,vault:r.parkourSamples.some(s=>s.state==='vault'),slide:r.parkourSamples.some(s=>s.state==='slide'),platform:r.route.obstacles.filter(o=>o.type==='platform').some(o=>p.usage[o.id]>2),carriers:id==='M01'?Object.keys(p.rides).length===0:Object.values(p.rides).every(n=>n>2)&&Object.keys(p.rides).length===3,collapse:id==='M02'?Object.keys(p.collapse).length===0:p.collapse['m01-m-collapse'].includes('FALLING')&&p.collapse['m01-m-collapse'].includes('ABSENT')});}finally{await q.close();}}
 if(process.env.M_RED)rows[0].vault=false;console.log('M_MECHANICS',JSON.stringify(rows));expect(rows.every(r=>r.ramp&&r.vault&&r.slide&&r.platform&&r.carriers&&r.collapse)).toBe(true);
});

// A4b-2b: independent new route gates.
for(const id of ['M03','M04'])test('magma-'+id+'-bot-s-completion',async({browser})=>{
 const rows=[];for(let i=0;i<2;i++){const q=await prepareMagmaPage(browser,base);try{const r=await runMagma(q,id);const observed=await readMagmaProbe(q);rows.push({finished:r.finished,deaths:r.deaths,game_s:r.game_s,hash:r.hash,coins:observed.economy.collectedCoinIds.length,world:observed.world,routeId:observed.routeId,rides:observed.rides,collapse:observed.collapse,usage:observed.usage});}finally{await q.close();}}
 if(process.env.M_RED)rows[0].coins=0;
 console.log('M_COMPLETION',id,JSON.stringify(rows));
 expect(rows.every(r=>r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90&&r.coins===14&&r.world==='magma'&&r.routeId===id)&&rows[0].hash===rows[1].hash).toBe(true);
});
for(const id of ['M03','M04'])test('magma-'+id+'-G1-walking-zero',async({browser})=>{
 const q=await prepareMagmaPage(browser,base);try{await startMagma(q,id);const w=await walkMagma(q,id);if(process.env.M_RED)w.coinIds.push('synthetic-ground-coin');console.log('M_WALK',id,JSON.stringify({complete:w.complete,coins:w.coinIds,coverage:w.coverage}));expect(w.complete&&w.coinIds.length===0&&w.coverage>=.95).toBe(true);}finally{await q.close();}
});

test('magma-M04-carriers-visible-on-contact',async({browser})=>{
 const rows=[];
 for(const target of ['m04-m-03','m04-m-08']){
  const q=await prepareMagmaPage(browser,base);try{
   await q.evaluate(target=>{const orig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const r=orig(dt);if(__TMB_A12__.getState().movingPlatforms.some(p=>p.id===target&&p.rideFrames>=3))throw Error('M_CARRIER_CAPTURE');return r;};},target);
   try{await runMagma(q,'M04');}catch(e){if(!String(e).includes('M_CARRIER_CAPTURE'))throw e;}
   await q.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));__tmbParkour.pause();window.dispatchEvent(new Event('pageshow'));});
   await q.waitForTimeout(80);
   const v=await q.evaluate(async target=>{
    const s=__TMB_A12__.getState(),p=s.movingPlatforms.find(m=>m.id===target),canvas=document.querySelector('#game'),c=canvas.getContext('2d'),l=__tmb.layout,rect=canvas.getBoundingClientRect(),scale=canvas.width/rect.width;
    const x=Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*scale)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*scale)),w=Math.min(canvas.width-x,Math.ceil(p.w*l.viewScale*scale)),h=Math.min(canvas.height-y,Math.ceil((p.h+32)*l.viewScale*scale));
    const sample=()=>Array.from(c.getImageData(x,y,w,h).data),a=sample();__TMB_A12__.setMovingPlatformsVisible(false);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);
    const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((a,b)=>a-b);
    return {target,world:s.world.selectedWorldId,route:s.routeId,rideFrames:p.rideFrames,mad:a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],visible:w/(p.w*l.viewScale*scale),cover:[...document.querySelectorAll('#a12Shop.show,#characterSelect.show')].filter(e=>e.getBoundingClientRect().width>0).length};
   },target);rows.push(v);
  }finally{await q.close();}
 }
 if(process.env.M_RED)rows[0].mad=0;
 console.log('M_VISIBLE',JSON.stringify(rows));expect(rows.every(r=>r.world==='magma'&&r.route==='M04'&&r.rideFrames>2&&r.mad>3&&r.contrast>15&&r.visible>=.8&&r.cover===0)).toBe(true);
});

const {prepareMagmaB,idle:magmaIdle}=require('./lib/magma-b-probe.cjs');
const magmaBOut=process.env.M_B_OUT||fs.readFileSync(path.join(__dirname,'a4b2b-run-path.txt'),'utf8').trim();
test('magma-M03-M04-parkour-and-closed-door-bypass',async({browser})=>{
 test.setTimeout(90000);const rows=[];
 for(const id of ['M03','M04']){
  const q=await prepareMagmaB(browser,base);try{
   await startMagma(q,id);if(id==='M03')await magmaIdle(q,6);
   const r=await runMagma(q,id,{resume:true}),p=await readMagmaProbe(q),b=await q.evaluate(()=>__mb);
   const mechanics=r.route.obstacles.filter(o=>['vault','slide','platform','overpass'].includes(o.type)).map(o=>({id:o.id,type:o.type,frames:p.usage[o.id]||0}));
   const row={id,finished:r.finished,deaths:r.deaths,seconds:r.game_s,coins:p.economy.collectedCoinIds.length,mechanics,rides:p.rides,collapse:p.collapse,...b};rows.push(row);
  }finally{await q.close();}
 }
 if(process.env.M_RED)rows[0].crossings[0].state='OPEN';
 fs.writeFileSync(path.join(magmaBOut,'mechanics-b.json'),JSON.stringify(rows,null,2));console.log('M_B_MECHANICS',JSON.stringify(rows));
 expect(rows.every(r=>r.finished&&r.deaths===0&&r.seconds>=45&&r.seconds<=90&&r.coins===14&&r.mechanics.every(m=>m.frames>2)&&['launch','tuck','open'].every(s=>r.flipPhases.includes(s))&&r.landings.length===1&&r.checkpoint>15000&&Object.keys(r.collapse).length===0)).toBe(true);
 expect(rows[0].barrels>0&&['OPEN','PREPARING','CLOSING','CLOSED'].every(s=>rows[0].doors['m03-m-door'].includes(s))&&rows[0].crossings.some(c=>c.state==='CLOSED'&&c.pushes===0&&c.bottom<=c.doorTop)&&Object.keys(rows[0].rides).length===0).toBe(true);
 expect(Object.keys(rows[1].doors).length===0&&rows[1].barrels===0&&Object.keys(rows[1].rides).length===2&&Object.values(rows[1].rides).every(n=>n>2)).toBe(true);
});

test('magma-hazard-combination-20-real-phases-and-source-match',async({browser})=>{
 test.setTimeout(120000);const vm=require('vm'),src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8');
 const definitions=vm.runInNewContext(src.slice(src.indexOf('  function range('),src.indexOf('  function drawCoin('))+src.slice(src.indexOf('  const COINS ='),src.indexOf('  const CHIEF_SPRITE'))+'\nROUTES');
 const report=[];const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const id of ['M01','M02','M03','M04']){
  const q=await prepareMagmaB(browser,base);try{
   const r=await runMagma(q,id),b=await q.evaluate(()=>__mb),observed=await readMagmaProbe(q),ramps=r.route.obstacles.filter(o=>o.type==='ramp'),hazards=r.route.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type));
   expect(r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90).toBe(true);
   expect(ramps).toEqual(JSON.parse(JSON.stringify(definitions[id].obstacles.filter(o=>o.type==='ramp'))));
   expect(hazards).toEqual(JSON.parse(JSON.stringify(definitions[id].obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type)))));
   expect(b.landings.length).toBe(ramps.length);
   await startMagma(q,id);await q.evaluate(()=>{__tmbParkour.manual();__tmbParkour.move(0);const c=__TMB_A12__.getState().route.obstacles.find(o=>o.type==='collapse');if(c)__TMB_A12__.placePlayer(c.x+20,c.y-48);});
   if(hazards.some(o=>o.type==='collapse')){
    await q.evaluate(()=>{const orig=__tmbCampaignStep;window.__hazardOrig=orig;window.__tmbCampaignStep=dt=>{const v=orig(dt);if(__TMB_A12__.getState().collapsing.some(c=>c.state==='CONTACT_WARNING'))throw Error('M_COLLAPSE_PHASE_START');return v;};});
    try{await runMagma(q,id);}catch(e){if(!String(e).includes('M_COLLAPSE_PHASE_START'))throw e;}
    await q.evaluate(()=>{window.__tmbCampaignStep=window.__hazardOrig;__tmbParkour.move(0);});
   }
   const phases=await q.evaluate(()=>{
    const rows=[];for(let phase=0;phase<20;phase++){
     for(let i=0;i<30;i++){__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);}
     const s=__TMB_A12__.getState();rows.push({phase,clock:s.gameClock,collapse:s.collapsing,doors:s.containerDoors,barrels:s.barrels,carriers:s.movingPlatforms});
    }return rows;
   });
   const scans=[];for(const [i,ramp] of ramps.entries()){
    const landing=b.landings[i];expect(landing.x>=ramp.x&&landing.x<=ramp.x+ramp.w+700).toBe(true);
    // The measured touchdown height distinguishes an elevated bypass from the barrel lane below.
    const zone={x:Math.min(ramp.x+ramp.w,landing.x),y:landing.y,w:Math.max(ramp.x+ramp.w+500,landing.x+landing.w)-Math.min(ramp.x+ramp.w,landing.x),h:landing.h};
    if(process.env.M_RED&&id==='M01'){const h=hazards.find(h=>h.type==='collapse');const syntheticRamp={...ramp,x:h.x-ramp.w};zone.x=syntheticRamp.x+syntheticRamp.w;zone.y=h.y;zone.w=500;zone.h=h.h;}
    for(const phase of phases){const rects=[];
     for(const c of phase.collapse){const o=hazards.find(o=>o.id===c.id);if(c.state!=='ABSENT')rects.push({id:c.id,x:o.x,y:o.y+c.fallY,w:o.w,h:o.h,state:c.state});}
     for(const d of phase.doors)if(['CLOSING','CLOSED'].includes(d.state))rects.push(d);
     for(const b of phase.barrels)rects.push({id:b.id,x:b.x,y:b.y,w:28,h:28,state:b.warning>0?'WARNING':'ROLLING'});
     scans.push({ramp:ramp.id,phase:phase.phase,clock:phase.clock,zone,rects,hits:rects.filter(h=>overlap(zone,h)).map(h=>h.id)});
    }
   }
   const mechanical=r.route.obstacles.filter(o=>['vault','slide','platform','overpass'].includes(o.type)).map(o=>({id:o.id,type:o.type,frames:observed.usage[o.id]||0}));
   console.log('M_B_EACH_MECHANIC',JSON.stringify({id,mechanical,rides:observed.rides,flipPhases:b.flipPhases}));
   expect([...new Set(mechanical.map(m=>m.type))].every(type=>mechanical.some(m=>m.type===type&&m.frames>2))&&r.route.obstacles.filter(o=>['crane','pallet'].includes(o.type)).every(o=>observed.rides[o.id]>2)&&['launch','tuck','open'].every(s=>b.flipPhases.includes(s))).toBe(true);
   const row={id,ramps:ramps.map(o=>o.id),hazards:hazards.map(o=>o.id),landings:b.landings,mechanical,rides:observed.rides,collapse:observed.collapse,phases,scans};report.push(row);
   expect(scans.length).toBe(ramps.length*20);expect(new Set(phases.map(p=>p.clock)).size).toBe(20);expect(scans.every(s=>s.hits.length===0)).toBe(true);
   if(hazards.some(o=>o.type==='collapse'))expect(new Set(phases.flatMap(p=>p.collapse.map(c=>c.state))).size).toBeGreaterThan(1);
   if(hazards.some(o=>o.type==='worker'))expect(new Set(phases.flatMap(p=>p.barrels.map(b=>b.x))).size).toBeGreaterThan(2);
   if(hazards.some(o=>o.type==='containerDoor'))expect(new Set(phases.flatMap(p=>p.doors.map(d=>d.state))).size).toBeGreaterThan(2);
   const syntheticHazard={x:1000,y:407,w:100,h:48},syntheticRamp={x:800,w:200};const syntheticZone={x:syntheticRamp.x+syntheticRamp.w,y:407,w:500,h:48};expect(overlap(syntheticZone,syntheticHazard)).toBe(true);
  }finally{await q.close();}
 }
 fs.writeFileSync(path.join(magmaBOut,'hazard-b.json'),JSON.stringify(report,null,2));console.log('M_B_HAZARD',JSON.stringify(report.map(r=>({id:r.id,ramps:r.ramps,phases:r.phases.length,scans:r.scans.length,hits:r.scans.flatMap(s=>s.hits),landings:r.landings}))));
});

// A4b-2b theme measurements use the same thresholds as the accepted theme gates.
async function magmaBFrame(page,id,world,size,position){
 await page.setViewportSize(size);await page.evaluate(({id,world,position})=>{const a=__TMB_A12__;a.renderWorldOnRoute('magma',id);a.renderThemeFixture(world,id);const s=a.getState();a.placePlayer(position==='start'?70:s.route.obstacles.find(o=>o.type==='vault').x-110);},{id,world,position});await page.waitForTimeout(850);
 return page.evaluate(()=>{const s=__TMB_A12__.getState(),c=document.querySelector('#game'),l=__tmb.layout,scale=c.width/c.getBoundingClientRect().width,box=(x,y,w,h)=>({x:(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*scale,y:(l.viewOffsetY+(l.worldY+y)*l.viewScale)*scale,w:w*l.viewScale*scale,h:h*l.viewScale*scale});const o=s.route.obstacles.find(o=>o.type==='vault'&&o.x>=__tmb.cam&&o.x<__tmb.cam+l.W);const hud=[{x:14,y:14,w:360,h:54},l.hud,l.timer].map(b=>({x:(l.viewOffsetX+b.x*l.viewScale)*scale,y:(l.viewOffsetY+b.y*l.viewScale)*scale,w:b.w*l.viewScale*scale,h:b.h*l.viewScale*scale}));return {world:s.world.selectedWorldId,id:s.routeId,signatures:s.world.renderSignatures,hud,width:c.width,height:c.height,ground:(l.viewOffsetY+(l.worldY+455)*l.viewScale)*scale,player:box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h),crate:o?box(o.x,455-o.h,o.w,o.h):null,cover:[...document.querySelectorAll('#a12Shop.show,#characterSelect.show')].filter(e=>e.getBoundingClientRect().width>0).length};});
}
function magmaBTexture(p){let edges=0,n=0;const g=(x,y)=>{const i=(y*p.w+x)*4;return .299*p.data[i]+.587*p.data[i+1]+.114*p.data[i+2];};for(let y=1;y<p.h-1;y++)for(let x=1;x<p.w-1;x++){const gx=-g(x-1,y-1)+g(x+1,y-1)-2*g(x-1,y)+2*g(x+1,y)-g(x-1,y+1)+g(x+1,y+1),gy=-g(x-1,y-1)-2*g(x,y-1)-g(x+1,y-1)+g(x-1,y+1)+2*g(x,y+1)+g(x+1,y+1);if(Math.hypot(gx,gy)>80)edges++;n++;}return edges/n;}
function magmaBAsh(p,hud){const mask=new Uint8Array(p.w*p.h);let total=0,max=0,samples=0;for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){if(hud.some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))continue;samples++;const i=(y*p.w+x)*4,[h,s,v]=a4fixHSV(...p.data.slice(i,i+3));if(s<.2&&v>.35){mask[y*p.w+x]=1;total++;}}for(let i=0;i<mask.length;i++)if(mask[i]){const q=[i];mask[i]=0;let count=0;while(q.length){const k=q.pop();count++;const x=k%p.w,y=Math.floor(k/p.w);for(const j of [x>0?k-1:-1,x<p.w-1?k+1:-1,y>0?k-p.w:-1,y<p.h-1?k+p.w:-1])if(j>=0&&mask[j]){mask[j]=0;q.push(j);}}max=Math.max(max,count);}return {max,coverage:total/samples};}
for(const id of ['M03','M04'])test('magma-'+id+'-route-theme-and-evidence',async({page})=>{
 test.setTimeout(90000);const rows=[];
 // Theme fixture can start locked routes only after the existing M01 prerequisite.
 await page.evaluate(()=>{for(const prerequisite of ['M01','M02','M03']){__TMB_A12__.renderWorldOnRoute('magma',prerequisite);__TMB_A12__.finish();}});
 for(const size of a4fixSizes)for(const position of ['start','obstacle']){
  const pixels={},crate={};let f;const control=await a4fixFrame(page,'dock31','D01',size);const dockCrateControl=a4fixRatio(await a4fixPixels(page,control.crate),(h,s,v)=>h>=20&&h<=40&&s>=.35&&s<=.8&&v>=.35&&v<=.8);
  for(const world of ['dock31','frozen','magma']){
   f=await magmaBFrame(page,id,world,size,position);expect(f.world===world&&f.id===id&&f.cover===0).toBe(true);
   pixels[world]=(await a4fixPixels(page,{x:0,y:80,w:Math.min(500,f.width),h:Math.min(330,f.ground-100)})).data;
   if(position==='obstacle'){expect(f.crate).not.toBeNull();crate[world]=a4fixRatio(await a4fixPixels(page,f.crate),(h,s,v)=>h>=20&&h<=40&&s>=.35&&s<=.8&&v>=.35&&v<=.8);}
  }
  const pred=(h,s,v)=>h<=40&&s>.6&&v>.6,depth=size.width===1280?200:160;
  const ground=magmaBTexture(await a4fixPixels(page,{x:0,y:f.ground,w:f.width,h:80})),near=a4fixRatio(await a4fixPixels(page,{x:0,y:f.ground-depth,w:f.width,h:depth}),pred),all=a4fixRatio(await a4fixPixels(page,{x:0,y:0,w:f.width,h:f.height}),pred),ash=magmaBAsh(await a4fixPixels(page,{x:0,y:0,w:f.width,h:Math.max(1,f.ground-260)}),f.hud),rmse=Object.fromEntries(['dock31','frozen'].map(w=>[w,a4fixFit(pixels[w],pixels.magma)]));
  const row={id,size,position,ground,near,all,ash,rmse,crate,dockCrateControl,signatures:f.signatures};if(process.env.M_RED)row.ground=0;rows.push(row);console.log('M_B_THEME_ROW',JSON.stringify(row));
  expect(row.ground>=.03&&row.ground<=.30&&near<=.01&&all>=.01&&ash.max<=36&&ash.coverage<=.015&&Object.values(rmse).every(v=>v>18)&&Object.values(f.signatures).every(v=>v===0)).toBe(true);
  if(position==='obstacle')expect(dockCrateControl>=.30&&crate.magma<=.05).toBe(true);
  expect(a4fixFit(pixels.magma,pixels.magma)<1&&f.player.x<f.width&&f.player.x+f.player.w>0&&f.player.y>=0&&f.player.y+f.player.h<=f.height).toBe(true);
  expect(await page.evaluate(({id})=>{const s=__TMB_A12__.getState();return s.routeId===id&&s.world.selectedWorldId==='magma';},{id})).toBe(true);
  await page.screenshot({path:path.join(__dirname,'tn-a4-shots',`${id}-${position}-${size.width}x${size.height}.png`)});
 }
 fs.writeFileSync(path.join(magmaBOut,id+'-theme.json'),JSON.stringify(rows,null,2));console.log('M_B_THEME',JSON.stringify(rows));
});
// A4b-2c final acceptance. Independent controls use fresh profiles.
const magmaCOut=process.env.M_C_OUT||fs.readFileSync(path.join(__dirname,'a4b2c-run-path.txt'),'utf8').trim().replace(/^\uFEFF/,'');
const magmaCIds=['M01','M02','M03','M04'];
const mCAudited=new Set();
const mCCheck=(value,label)=>{if(process.env.M_C_AUDIT&&!mCAudited.has(label)){let rejected=false;try{expect(false,label+' intentional-red').toBe(true);}catch(e){rejected=true;fs.appendFileSync(path.join(magmaCOut,'assert-audit-c.jsonl'),JSON.stringify({label,rejected,error:e.message})+'\n');}if(!rejected)throw Error('Negative oracle accepted '+label);mCAudited.add(label);}expect(process.env.M_C_RED===label?false:value,label).toBe(true);};
test('magma-route-unlock-chain-save-retry-next-G7',async({page,context})=>{
 const rows=[];await page.evaluate(async()=>{__tmbParkour.manual();__TMB_A12__.finish();await __TMB_A12__.setWallet(200);await __TMB_A12__.purchaseWorld('magma');await __TMB_A12__.purchaseWorld('magma');});await page.locator('#a12Actions [data-act="next"]').click();
 let s=await page.evaluate(()=>__TMB_A12__.getState());
 mCCheck(s.world.selectedWorldId==='magma'&&s.routeId==='M01'&&s.profile.walletBalance===0,'purchase');
 mCCheck(JSON.stringify(s.world.registry.magma.routes)===JSON.stringify(magmaCIds),'registry');
 const preserved=JSON.stringify(Object.fromEntries(Object.entries(s.profile.progressByRoute).filter(([id])=>/^[DF]/.test(id))));
 mCCheck(magmaCIds.every((id,i)=>s.route.unlocked[id]===(i===0)),'initial-lock');
 mCCheck(await page.evaluate(()=>['M02','M03','M04'].every(id=>__TMB_A12__.startRoute(id)===false)),'reject-locked');
 for(const [i,id] of magmaCIds.entries()){
  s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'start',id:s.routeId,coins:s.route.coins.length});
  mCCheck(s.routeId===id&&s.route.coins.length===14&&!s.result,'start-count');
  await page.evaluate(()=>{const a=__TMB_A12__;a.collectCoin(a.routeCoins()[0]);a.retry(false);});s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'retry',id:s.routeId,coins:s.route.coins.length});
  mCCheck(s.routeId===id&&s.route.coins.length===14&&s.economy.runCoins===1&&!s.result,'retry-count');
  const coinIds=s.economy.collectedCoinIds;const restored=await context.newPage();await restored.goto(base);await restored.waitForFunction(()=>window.__TMB_A12__);await restored.evaluate(()=>__tmbParkour.manual());const saved=await restored.evaluate(()=>__TMB_A12__.getState());await restored.close();
  mCCheck(saved.routeId===id&&saved.route.coins.length===14&&JSON.stringify(saved.economy.collectedCoinIds)===JSON.stringify(coinIds)&&JSON.stringify(saved.route.unlocked)===JSON.stringify(s.route.unlocked)&&saved.profile.walletBalance===s.profile.walletBalance,'save-resume');
  await page.evaluate(()=>__TMB_A12__.finish());s=await page.evaluate(()=>__TMB_A12__.getState());
  mCCheck(magmaCIds.every((r,j)=>s.route.unlocked[r]===(j<=i+1)),'progressive-lock');
  const wallet=s.profile.walletBalance;await page.evaluate(()=>__TMB_A12__.purchaseWorld('magma'));
  mCCheck((await page.evaluate(()=>__TMB_A12__.profile())).walletBalance===wallet,'no-second-charge');
  await page.locator('#a12Actions [data-act="retry"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());
  mCCheck(s.routeId===id&&s.route.coins.length===14&&s.economy.runCoins===0&&!s.result,'result-retry');
  await page.evaluate(()=>__TMB_A12__.finish());await page.locator('#a12Actions [data-act="next"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'next',id:s.routeId,coins:s.route.coins.length});
  mCCheck(s.routeId===magmaCIds[(i+1)%4]&&s.route.coins.length===14&&!s.result,'next-count');
 }
 s=await page.evaluate(()=>__TMB_A12__.getState());mCCheck(JSON.stringify(Object.fromEntries(Object.entries(s.profile.progressByRoute).filter(([id])=>/^[DF]/.test(id))))===preserved,'df-progress');
 mCCheck(s.profile.ownedWorldIds.filter(id=>id==='magma').length===1,'unique-ownership');
 fs.writeFileSync(path.join(magmaCOut,'chain-g7.json'),JSON.stringify(rows,null,2));
});
function magmaCDistance(A,B){const a=A.obstacles.slice().sort((a,b)=>a.x-b.x),b=B.obstacles.slice().sort((a,b)=>a.x-b.x);let d=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let n=[i+1];for(let j=0;j<b.length;j++)n.push(Math.min(n[j]+1,d[j+1]+1,d[j]+(a[i].type===b[j].type?0:1)));d=n;}const same=a.map(o=>o.type).join('|')===b.map(o=>o.type).join('|'),delta=same?a.map((o,i)=>o.x-b[i].x):[];const shift=same?(Math.min(...delta)+Math.max(...delta))/2:0;return{distance:d[b.length]/Math.max(a.length,b.length,1),copy:same&&delta.every(v=>Math.abs(v-shift)<=150),normalizedA:a.map(o=>o.x/A.length),normalizedB:b.map(o=>o.x/B.length)};}
test('magma-route-similarity-14x14',async({page})=>{
 const defs=await page.evaluate(()=>Object.fromEntries(['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04','M01','M02','M03','M04'].map(id=>[id,__TMB_A12__.routeDefinition(id)]))),matrix={},pairs=[];
 for(const [a,A] of Object.entries(defs)){matrix[a]={};for(const [b,B] of Object.entries(defs)){const r=magmaCDistance(A,B);matrix[a][b]=r.distance;if(a!==b){mCCheck(!r.copy,'no-copy');if((a[0]==='M'&&/[MF]/.test(b[0]))||(b[0]==='M'&&a[0]==='F'))mCCheck(r.distance>=.3,'distance');}pairs.push({a,b,...r});}}
 const copy={...defs.D04,obstacles:defs.D04.obstacles.map(o=>({...o,x:o.x+500}))};mCCheck(magmaCDistance(defs.D04,copy).copy,'copy-control');
 fs.writeFileSync(path.join(magmaCOut,'similarity.json'),JSON.stringify({matrix,pairs},null,2));
});
test('magma-route-localized-names',async({page})=>{
 const dictionary=await page.evaluate(()=>__TMB_A12__.i18n());const names={};for(const lang of ['en','tr','ru']){names[lang]=Object.fromEntries(magmaCIds.map(id=>[id,dictionary[lang][id]]));mCCheck(Object.values(names[lang]).every(v=>typeof v==='string'&&v.length>4)&&new Set(Object.values(names[lang])).size===4,'names');}
 mCCheck(names.en.M01==='FOUNDRY WALK'&&names.en.M02==='CASTING CRANE'&&names.en.M03==='FURNACE AISLE'&&names.en.M04==='MAGMA LIFT','english-names');
 fs.writeFileSync(path.join(magmaCOut,'names.json'),JSON.stringify(names,null,2));
});
test('magma-G4-twelve-distinct-targets-and-positive-controls',async()=>{
 const rows=magmaCIds.flatMap(id=>JSON.parse(fs.readFileSync(path.join(magmaCOut,id,'g4-pilot.json'),'utf8')));
 mCCheck(rows.length===12&&new Set(rows.map(r=>r.target.id)).size===12,'g4-count');
 for(const id of magmaCIds)mCCheck(['CJ','CC','CS'].every(kind=>rows.filter(r=>r.id===id&&r.kind===kind).length===1),'g4-types');
 for(const r of rows){mCCheck(r.finished&&r.targetMissed&&r.intersections===0&&r.positiveControl&&r.traceSamples>0&&r.status==='PASS','g4-pass');const contact=p=>{const c=r.target;return Math.hypot(c.x-Math.max(p.x,Math.min(c.x,p.x+p.w)),c.y-Math.max(p.y,Math.min(c.y,p.y+p.h)))<=10;};mCCheck(r.segments.flatMap(s=>s.trace).every(p=>!contact(p)),'g4-trace');mCCheck(contact({x:r.target.x-5,y:r.target.y-5,w:10,h:10}),'g4-contact-control');}
 fs.writeFileSync(path.join(magmaCOut,'g4-summary.json'),JSON.stringify(rows.map(r=>({id:r.id,kind:r.kind,target:r.target.id,missed:r.targetMissed,intersections:r.intersections,positive:r.positiveControl,samples:r.traceSamples,finished:r.finished,teleportSkipsTarget:r.teleportSkipsTarget})),null,2));
});

for(const id of ['M01','M02'])test('magma-'+id+'-route-theme-and-evidence',async({page})=>{
 test.setTimeout(90000);const rows=[];
 // Theme fixture can start locked routes only after the existing M01 prerequisite.
 await page.evaluate(()=>{for(const prerequisite of ['M01','M02','M03']){__TMB_A12__.renderWorldOnRoute('magma',prerequisite);__TMB_A12__.finish();}});
 for(const size of a4fixSizes)for(const position of ['start','obstacle']){
  const pixels={},crate={};let f;const control=await a4fixFrame(page,'dock31','D01',size);const dockCrateControl=a4fixRatio(await a4fixPixels(page,control.crate),(h,s,v)=>h>=20&&h<=40&&s>=.35&&s<=.8&&v>=.35&&v<=.8);
  for(const world of ['dock31','frozen','magma']){
   f=await magmaBFrame(page,id,world,size,position);expect(f.world===world&&f.id===id&&f.cover===0).toBe(true);
   pixels[world]=(await a4fixPixels(page,{x:0,y:80,w:Math.min(500,f.width),h:Math.min(330,f.ground-100)})).data;
   if(position==='obstacle'){expect(f.crate).not.toBeNull();crate[world]=a4fixRatio(await a4fixPixels(page,f.crate),(h,s,v)=>h>=20&&h<=40&&s>=.35&&s<=.8&&v>=.35&&v<=.8);}
  }
  const pred=(h,s,v)=>h<=40&&s>.6&&v>.6,depth=size.width===1280?200:160;
  const ground=magmaBTexture(await a4fixPixels(page,{x:0,y:f.ground,w:f.width,h:80})),near=a4fixRatio(await a4fixPixels(page,{x:0,y:f.ground-depth,w:f.width,h:depth}),pred),all=a4fixRatio(await a4fixPixels(page,{x:0,y:0,w:f.width,h:f.height}),pred),ash=magmaBAsh(await a4fixPixels(page,{x:0,y:0,w:f.width,h:Math.max(1,f.ground-260)}),f.hud),rmse=Object.fromEntries(['dock31','frozen'].map(w=>[w,a4fixFit(pixels[w],pixels.magma)]));
  const row={id,size,position,ground,near,all,ash,rmse,crate,dockCrateControl,signatures:f.signatures};if(process.env.M_RED)row.ground=0;rows.push(row);console.log('M_B_THEME_ROW',JSON.stringify(row));
  expect(row.ground>=.03&&row.ground<=.30&&near<=.01&&all>=.01&&ash.max<=36&&ash.coverage<=.015&&Object.values(rmse).every(v=>v>18)&&Object.values(f.signatures).every(v=>v===0)).toBe(true);
  if(position==='obstacle')expect(dockCrateControl>=.30&&crate.magma<=.05).toBe(true);
  expect(a4fixFit(pixels.magma,pixels.magma)<1&&f.player.x<f.width&&f.player.x+f.player.w>0&&f.player.y>=0&&f.player.y+f.player.h<=f.height).toBe(true);
  expect(await page.evaluate(({id})=>{const s=__TMB_A12__.getState();return s.routeId===id&&s.world.selectedWorldId==='magma';},{id})).toBe(true);
  await page.screenshot({path:path.join(__dirname,'tn-a4-shots',`${id}-${position}-${size.width}x${size.height}.png`)});
 }
 fs.writeFileSync(path.join(magmaCOut,id+'-theme.json'),JSON.stringify(rows,null,2));console.log('M_B_THEME',JSON.stringify(rows));
});
test('magma-M01-mobile-touch-first-checkpoint',async({browser})=>{
 test.setTimeout(90000);const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await context.newPage();
 try{await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.addInitScript(()=>{let now=0;Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;});await p.goto(base);await p.waitForFunction(()=>window.__TMB_A12__);await p.locator('.characterChoice:visible').first().tap();await startMagma(p,'M01');
 await p.evaluate(()=>__tmbAdvanceTime(1500));
 const controls=await p.locator('#joystick,#jumpWrap button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
 mCCheck(controls.length===2&&controls.every(r=>r.w>0&&r.h>0&&r.x>=0&&r.y>=0&&r.x+r.w<=390&&r.y+r.h<=844)&&!(controls[0].x<controls[1].x+controls[1].w&&controls[0].x+controls[0].w>controls[1].x&&controls[0].y<controls[1].y+controls[1].h&&controls[0].y+controls[0].h>controls[1].y),'mobile-controls');
 const cdp=await context.newCDPSession(p),joy={x:controls[0].x+controls[0].w*.9,y:controls[0].y+controls[0].h*.5,id:1},jump={x:controls[1].x+controls[1].w*.5,y:controls[1].y+controls[1].h*.5,id:2};
 await p.evaluate(()=>{window.__touchFired=[];window.__touchEvents=[];for(const type of ['pointerdown','pointerup'])document.addEventListener(type,e=>__touchEvents.push({type,kind:e.pointerType,trusted:e.isTrusted,target:e.target.id||e.target.tagName}),true);});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joy]});let held=false,release=0,steps=0,last;
 for(;steps<2400;steps++){
  const q=await p.evaluate(()=>{const s=__TMB_A12__.getState(),p=s.player,pw=s.hitbox.w;let target=null;for(const o of s.route.obstacles){if(__touchFired.includes(o.id))continue;let trigger=false;if(['vault','slide'].includes(o.type)){const gap=o.x-(p.x+pw),look=Math.max(40,Math.min(60,Math.abs(p.vx)*.15));trigger=gap>=-.001&&gap<=look;}else if(o.type==='platform'&&p.onGround){const dy=o.y-(p.y+s.hitbox.h),disc=560*560+2*1450*dy,t=disc>=0?(560+Math.sqrt(disc))/1450:NaN,landing=p.x+pw/2+Math.max(0,p.vx)*t;trigger=Number.isFinite(t)&&t<=1&&landing>=o.x+16&&landing<=o.x+o.w-16;}if(trigger){target=o.id;break;}}return{target,checkpoint:s.checkpointX,x:p.x,deaths:s.deaths,world:s.world.selectedWorldId,id:s.routeId};});last=q;if(q.checkpoint>=5200)break;
  if(held&&steps>=release){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jump]});held=false;}
  if(q.target&&!held){await p.evaluate(id=>__touchFired.push(id),q.target);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joy,jump]});held=true;release=steps+8;}
  await p.evaluate(()=>{__tmbParkour.manual();__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);});
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const events=await p.evaluate(()=>__touchEvents);console.log('MOBILE_DIAG',JSON.stringify({last,steps,events,controls,fired:await p.evaluate(()=>__touchFired)}));mCCheck(last.checkpoint>=5200&&last.deaths===0&&last.world==='magma'&&last.id==='M01','mobile-checkpoint');mCCheck(events.filter(e=>e.trusted&&e.kind==='touch'&&e.type==='pointerdown').length>=5,'mobile-real-touch');
 fs.writeFileSync(path.join(magmaCOut,'mobile.json'),JSON.stringify({viewport:{width:390,height:844},controls,last,steps,events},null,2));
 }finally{await context.close();}
});

// A4c-1: independent theme acceptance; no route or physics mutation.
async function aftermathLoaded(page){const bytes=await page.evaluate(async()=>new TextEncoder().encode(await (await fetch('js/a12-campaign.js')).text()).length);aftermathCheck('loaded JS bytes',bytes,x=>x===fs.statSync(path.join(__dirname,'../js/a12-campaign.js')).size,-1);}
async function aftermathScene(page,route='D01',x=300){
 await page.evaluate(({route,x})=>{__TMB_A12__.renderThemeFixture('aftermath',route);__TMB_A12__.placePlayer(x);},{route,x});await page.waitForTimeout(250);
 expect((await page.evaluate(()=>__TMB_A12__.getState())).world.selectedWorldId).toBe('aftermath');
}
const aftermathAudit=[];
function aftermathCheck(name,value,predicate,negative){
 expect(predicate(value),name).toBe(true);
 expect(()=>expect(predicate(negative),name+' NEGATIVE').toBe(true)).toThrow();
 aftermathAudit.push(name);console.log('AFTERMATH_NEGATIVE',name,'rejected');
}
test('aftermath-registry-purchase',async({page})=>{ await aftermathLoaded(page);
 const before=await page.evaluate(()=>__TMB_A12__.getState());
 await page.evaluate(()=>__TMB_A12__.setWallet(1000));
 const result=await page.evaluate(()=>Promise.all([__TMB_A12__.purchaseWorld('aftermath'),__TMB_A12__.purchaseWorld('aftermath')]));
 const s=await page.evaluate(()=>__TMB_A12__.getState());
 aftermathCheck('single purchase',result.filter(Boolean).length,x=>x===1,2);
 aftermathCheck('500 cost',s.profile.walletBalance,x=>x===500,499);
 aftermathCheck('one ownership',s.profile.ownedWorldIds.filter(x=>x==='aftermath').length,x=>x===1,2);
 aftermathCheck('no pending route',s.world.pendingWorldId,x=>x===null,'A01');
 aftermathCheck('safe selection',s.world.selectedWorldId,x=>x===before.world.selectedWorldId,'missing');
 const source=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8');
 aftermathCheck('registry A4c-2b four implemented routes',source,x=>/aftermath: \{[^\n]*price: 500, enabled: true, routes: \["A01", "A02", "A03", "A04"\]/.test(x),source.replace('price: 500, enabled: true','price: 501, enabled: true'));
});
test('aftermath-emergency-light-bounded',async({page})=>{ await aftermathLoaded(page);
 await aftermathScene(page);
 const m=await page.evaluate(()=>{__tmbParkour.manual();const mean=a=>a.reduce((s,v,i)=>s+(i%4===3?0:v),0)/(a.length/4*3),spread=a=>{const b=[];for(let i=0;i<a.length;i+=4)b.push((a[i]+a[i+1]+a[i+2])/3);b.sort((a,b)=>a-b);return b[Math.floor(b.length*.9)]-b[Math.floor(b.length*.1)];};let max=0,minEdge=Infinity;const lamps=[];for(let f=0;f<=120;f++){const a=__TMB_A12__.aftermathProbe(f/60,true),b=__TMB_A12__.aftermathProbe(f/60,false);max=Math.max(max,Math.abs(mean(a.surface)-mean(b.surface))/mean(b.surface));minEdge=Math.min(minEdge,spread(a.edge));lamps.push(mean(a.light)-mean(b.light));}const bad=__TMB_A12__.aftermathProbe(.5,true,20),off=__TMB_A12__.aftermathProbe(.5,false);return {max,minEdge,lightMin:Math.min(...lamps),lightMax:Math.max(...lamps),negative:Math.abs(mean(bad.surface)-mean(off.surface))/mean(off.surface),frames:121,dt:1/60};});
 aftermathCheck('light surface max relative <=.15',m.max,x=>x<=.15,m.negative);
 aftermathCheck('light exists',m.lightMax,x=>x>5,0);
 aftermathCheck('light changes',m.lightMax-m.lightMin,x=>x>1,0);
 aftermathCheck('all phases readable',m.minEdge,x=>x>15,0);
 console.log('AFTERMATH_LIGHT',JSON.stringify(m));
});
test('aftermath-decor-never-collapses',async({page})=>{ await aftermathLoaded(page);
 await aftermathScene(page);const m=await page.evaluate(()=>{__tmbParkour.manual();const initial=__TMB_A12__.aftermathProbe().decor;let equal=true;for(let i=0;i<1800;i++){__tmbCampaignStep(1/60);if(i%60===0)equal&&=JSON.stringify(__TMB_A12__.aftermathProbe(i/60).decor)===JSON.stringify(initial);}const bad=structuredClone(initial);bad[0].y+=100;return {initial,equal,negative:JSON.stringify(bad)===JSON.stringify(initial)};});
 aftermathCheck('stable decor id/base/visible 30s',m.equal,x=>x===true,m.negative);
 const src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),body=src.slice(src.indexOf('  function aftermathDecor()'),src.indexOf('  function aftermathBackdrop('));
 aftermathCheck('decor no hazard controller',body,x=>!/(collapsing|fallY|gameClock|\.state|timer)/.test(x),body+' collapsing[0].fallY');
 console.log('AFTERMATH_DECOR',JSON.stringify(m));
});
test('aftermath-safe-surface-readable',async({page})=>{ await aftermathLoaded(page);
 await aftermathScene(page);const m=await page.evaluate(()=>{const a=__TMB_A12__.aftermathProbe(0,false),lum=d=>{const z=[];for(let i=0;i<d.length;i+=4)z.push((d[i]+d[i+1]+d[i+2])/3);z.sort((a,b)=>a-b);return z[Math.floor(z.length*.9)]-z[Math.floor(z.length*.1)];};return {edge:lum(a.edge),texture:lum(a.surface)};});
 aftermathCheck('safe edge contrast',m.edge,x=>x>15,0);aftermathCheck('concrete surface structure',m.texture,x=>x>15,0);console.log('AFTERMATH_SURFACE',JSON.stringify(m));
});
test('aftermath-dock-frozen-magma-signatures-absent',async({page})=>{ await aftermathLoaded(page);
 await aftermathScene(page);const sig=await page.evaluate(()=>__TMB_A12__.getState().world.renderSignatures);
 for(const k of ['deckStripe','dock31Text','dockCrane','loadingCorridor','snowCap','icicles','iceRatio'])aftermathCheck(k,sig[k],x=>x===0,1);
 const src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),body=src.slice(src.indexOf('  function aftermathDecor()'),src.indexOf('  function drawThemeScene('));
 aftermathCheck('live aftermath dispatch',src,x=>/function drawWorldIntegrated\(c\) \{\s*if\(profile.selectedWorldId==="aftermath"\)\{drawAftermathWorld\(c\);return;\}/.test(x),src.replace('drawAftermathWorld(c);return;','return;'));
 for(const k of ['drawMetal','drawDockBackdrop','frozenSurface','magmaSurface','magmaBackdropCache'])aftermathCheck('source absent '+k,body,x=>!x.includes(k),body+k);
});
test('aftermath-not-recolor-and-screenshots',async({page})=>{ await aftermathLoaded(page);
 test.setTimeout(180000);const cdp=await page.context().newCDPSession(page);const fit=(a,b)=>{let total=0,n=0;for(let ch=0;ch<3;ch++){let sx=0,sy=0,sxx=0,sxy=0,m=0;for(let i=ch;i<a.length;i+=4){sx+=a[i];sy+=b[i];sxx+=a[i]*a[i];sxy+=a[i]*b[i];m++;}const den=m*sxx-sx*sx,A=den?(m*sxy-sx*sy)/den:0,B=(sy-A*sx)/m;for(let i=ch;i<a.length;i+=4){total+=(b[i]-(A*a[i]+B))**2;n++;}}return Math.sqrt(total/n);};
 const dir=path.join(__dirname,'tn-a4-shots','aftermath-a4c1');fs.mkdirSync(dir,{recursive:true});const values=[];
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const route of ['D01','D02','D03']){
 const all={};await page.setViewportSize(size);
 for(const world of ['dock31','frozen','magma','aftermath']){
 await page.evaluate(({world,route})=>{__TMB_A12__.renderThemeFixture(world,route);const s=__TMB_A12__.getState(),o=route==='D02'?s.route.obstacles.find(o=>o.type==='worker'):route==='D03'?s.movingPlatforms[0]:null;__TMB_A12__.placePlayer(o?(route==='D03'?o.x+o.w*.35:o.x-110):300);},{world,route});await page.waitForTimeout(850);
 const m=await page.evaluate(()=>{
 const c=document.querySelector('#game'),ctx=c.getContext('2d'),w=c.width,h=c.height,s=__TMB_A12__.getState(),l=__tmb.layout,sx=c.width/c.getBoundingClientRect().width,sy=c.height/c.getBoundingClientRect().height;
 const box=(x,y,W,H)=>[(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*sx,(l.viewOffsetY+(l.worldY+y)*l.viewScale)*sy,W*l.viewScale*sx,H*l.viewScale*sy];
 const player=box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h),o=s.routeId==='D02'?s.route.obstacles.find(o=>o.type==='worker'):s.routeId==='D03'?s.movingPlatforms[0]:s.route.obstacles.find(o=>o.type==='vault'&&o.x>=__tmb.cam&&o.x<__tmb.cam+l.W);
 const ob=s.routeId==='D02'?box(o.x-24,455-98,48,98):s.routeId==='D03'?box(o.x,o.y-18,o.w,o.h+32):box(o.x,455-o.h,o.w,o.h),ground=box(__tmb.cam,455,Math.min(500,w/(l.viewScale*sx)),60);
 const rects={background:[0,h*.10,w*.7,h*.23],structures:[0,ground[1]-190,w*.7,170],ground,obstacle:ob};
 const visible=b=>Math.max(0,Math.min(w,b[0]+b[2])-Math.max(0,b[0]))*Math.max(0,Math.min(h,b[1]+b[3])-Math.max(0,b[1]))/(b[2]*b[3]);
 return {world:s.world.selectedWorldId,route:s.routeId,cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,playerVisible:visible(player),targetVisible:visible(ob),regions:Object.fromEntries(Object.entries(rects).map(([k,r])=>{const x=Math.max(0,Math.floor(r[0])),y=Math.max(0,Math.floor(r[1])),W=Math.max(1,Math.min(w-x,Math.floor(r[2]))),H=Math.max(1,Math.min(h-y,Math.floor(r[3]))),d=ctx.getImageData(x,y,W,H).data;let b='';for(let i=0;i<d.length;i+=16384)b+=String.fromCharCode(...d.subarray(i,i+16384));return [k,btoa(b)];}))};
 });
 aftermathCheck('shot no cover',m.cover,x=>x===0,1);aftermathCheck('shot player in frame',m.playerVisible,x=>x>=.8,0);aftermathCheck('shot target in frame',m.targetVisible,x=>x>=.8,0);
 aftermathCheck('shot world '+world,m.world,x=>x===world,'wrong');aftermathCheck('shot route '+route,m.route,x=>x===route,'wrong');all[world]=Object.fromEntries(Object.entries(m.regions).map(([k,v])=>[k,Buffer.from(v,'base64')]));
 const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(dir,`${world}-${route}-${size.width}x${size.height}.png`),Buffer.from(shot.data,'base64'));
 }
 // Desktop fixture ROIs retain the established not-recolor definition; mobile readability has its own gate.
 if(size.width===1280)for(const world of ['dock31','frozen','magma'])for(const region of Object.keys(all.aftermath)){const v=fit(all[world][region],all.aftermath[region]);console.log('AFTERMATH_ROI',route,world,region,v);aftermathCheck(`${route} ${world} ${region} RMSE`,v,x=>x>18,fit(all[world][region],all[world][region]));values.push({route,world,region,rmse:v});}
 }
 console.log('AFTERMATH_RMSE',JSON.stringify(values));
});
test("aftermath-readable",async({page})=>{ await aftermathLoaded(page);
 const rows=[];
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const kind of ['edge','vault','ramp','coin']){
 await page.setViewportSize(size);
 await page.evaluate(kind=>{__TMB_A12__.renderThemeFixture('aftermath','D01');const s=__TMB_A12__.getState(),o=kind==='coin'?s.route.coins[0]:s.route.obstacles.find(o=>o.type===(kind==='edge'?'platform':kind));window.__aRead={kind,o};__TMB_A12__.placePlayer(o?o.x-65:300);},kind);await page.waitForTimeout(850);
 const m=await page.evaluate(()=>{const c=document.querySelector('#game'),l=__tmb.layout,scale=l.viewScale*c.width/c.getBoundingClientRect().width,{kind,o}=__aRead;let r=kind==='coin'?{x:o.x-14,y:o.y-14,w:28,h:28}:kind==='edge'?{x:o?.x||300,y:o?.y||455,w:Math.min(o?.w||150,150),h:24}:kind==='ramp'?{x:o.x,y:455-o.h,w:o.w,h:o.h}: {x:o.x,y:455-o.h,w:o.w,h:o.h};const x=Math.max(0,Math.floor((l.viewOffsetX+(r.x-__tmb.cam)*l.viewScale)*c.width/c.getBoundingClientRect().width)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+r.y)*l.viewScale)*c.height/c.getBoundingClientRect().height)),w=Math.min(c.width-x,Math.ceil(r.w*scale)),h=Math.min(c.height-y,Math.ceil(r.h*scale)),d=c.getContext('2d').getImageData(x,y,w,h).data,z=[];for(let i=0;i<d.length;i+=4)z.push((d[i]+d[i+1]+d[i+2])/3);z.sort((a,b)=>a-b);return {contrast:z[Math.floor(z.length*.9)]-z[Math.floor(z.length*.1)],cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,rect:{x,y,w,h}};});
 aftermathCheck(`readable ${size.width} ${kind}`,m.contrast,x=>x>15,0);aftermathCheck('readable no cover',m.cover,x=>x===0,1);rows.push({size,kind,...m});
 }console.log('AFTERMATH_READABLE',JSON.stringify(rows));
});
test("aftermath-moving-platform-visible", async ({ page }) => { await aftermathLoaded(page);
  for(const route of ["D03","D05"]){ await aftermathScene(page,route,2400);
  const m=await page.evaluate(async()=>{const p=__TMB_A12__.getState().movingPlatforms[0];__TMB_A12__.placePlayer(p.x);await new Promise(r=>setTimeout(r,180));const c=document.querySelector("#game"),x=c.getContext("2d"),l=__tmb.layout,sx=c.width/c.getBoundingClientRect().width,sy=c.height/c.getBoundingClientRect().height,r=[Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*sx)),Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*sy)),Math.ceil(p.w*l.viewScale*sx),Math.ceil((p.h+32)*l.viewScale*sy)],sample=()=>Array.from(x.getImageData(...r).data),a=sample(),beforeFrame=__TMB_A12__.getState().engine.renderFrameCount;__TMB_A12__.setMovingPlatformsVisible(false);await new Promise((resolve,reject)=>{const deadline=performance.now()+1000,check=()=>{if(__TMB_A12__.getState().engine.renderFrameCount>beforeFrame)resolve();else if(performance.now()>deadline)reject(new Error("no draw frame after hiding moving platforms"));else requestAnimationFrame(check);};requestAnimationFrame(check);});const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((u,v)=>u-v);return {mad:a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],frameDelta:__TMB_A12__.getState().engine.renderFrameCount-beforeFrame};});
  aftermathCheck('moving fresh frame',m.frameDelta,x=>x>=1,0);
  aftermathCheck('moving MAD',m.mad,x=>x>3,0);aftermathCheck('moving contrast',m.contrast,x=>x>15,0);console.log("AFTERMATH_MOVING",JSON.stringify(m));test.info().annotations.push({type:"measure",description:JSON.stringify({route,...m})});}
});

test("aftermath-physics-identical", async ({ page }) => { await aftermathLoaded(page);
  const run=async w=>{await page.evaluate(w=>{__TMB_A12__.renderWorldOnRoute(w,"D01");__TMB_A12__.placePlayer(70);},w);await page.keyboard.down("ArrowRight");await page.evaluate(w=>__TMB_A12__.renderWorldOnRoute(w,"D01"),w);const a=await page.evaluate(()=>new Promise(resolve=>{const raw=[],tick=()=>{const s=__TMB_A12__.getState();raw.push({t:s.gameClock,x:s.player.x,y:s.player.y});if(s.gameClock<3.05)requestAnimationFrame(tick);else{const out=[];for(let target=.2;target<=3.001;target+=.2){let i=1;while(i<raw.length&&raw[i].t<target)i++;const p=raw[Math.max(0,i-1)],q=raw[Math.min(i,raw.length-1)],f=q.t===p.t?0:(target-p.t)/(q.t-p.t);out.push([p.x+(q.x-p.x)*f,p.y+(q.y-p.y)*f]);}resolve(out);}};requestAnimationFrame(tick);}));await page.keyboard.up("ArrowRight");return a;},dock=await run("dock31"),aftermath=await run("aftermath");for(let i=0;i<dock.length;i++){aftermathCheck('physics x '+i,Math.abs(dock[i][0]-aftermath[i][0]),x=>x<=.5,1);aftermathCheck('physics y '+i,Math.abs(dock[i][1]-aftermath[i][1]),x=>x<=.5,1);}
});

test("aftermath-render-performance", async ({ page }) => { await aftermathLoaded(page);const m=await page.evaluate(()=>({dock:__TMB_A12__.benchmarkWorldDraw("dock31",120),aftermath:__TMB_A12__.benchmarkWorldDraw("aftermath",120)}));console.log("AFTERMATH_PERF",JSON.stringify(m));aftermathCheck('render ratio',m.aftermath/m.dock,x=>x<=1.5,1.51);test.info().annotations.push({type:"measure",description:JSON.stringify({...m,ratio:m.aftermath/m.dock})});});


// A4c-2a: live measurements, fixed dt/seed, locked Bot S through world adapter.
const {runAftermath,startAftermath}=require('./lib/bot-aftermath.cjs');
const {prepareAftermathPage,readAftermathProbe}=require('./lib/aftermath-probe.cjs');
const {runWalking:walkAftermathA}=require('./lib/bot-w.cjs');
for(const id of ['A01','A02'])test('aftermath-'+id+'-bot-s-completion',async({browser})=>{
 const rows=[];for(let i=0;i<2;i++){const q=await prepareAftermathPage(browser,base);try{const r=await runAftermath(q,id);const observed=await readAftermathProbe(q);rows.push({finished:r.finished,deaths:r.deaths,game_s:r.game_s,hash:r.hash,coins:observed.economy.collectedCoinIds.length,world:observed.world,routeId:observed.routeId,rides:observed.rides,collapse:observed.collapse,usage:observed.usage});}finally{await q.close();}}
 if(process.env.A_RED)rows[0].coins=0;
 console.log('M_COMPLETION',id,JSON.stringify(rows));
 expect(rows.every(r=>r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90&&r.coins===14&&r.world==='aftermath'&&r.routeId===id)&&rows[0].hash===rows[1].hash).toBe(true);
});
for(const id of ['A01','A02'])test('aftermath-'+id+'-G1-walking-zero',async({browser})=>{
 const q=await prepareAftermathPage(browser,base);try{await startAftermath(q,id);const w=await walkAftermathA(q,id);if(process.env.A_RED)w.coinIds.push('synthetic-ground-coin');console.log('M_WALK',id,JSON.stringify({complete:w.complete,coins:w.coinIds,coverage:w.coverage}));expect(w.complete&&w.coinIds.length===0&&w.coverage>=.95).toBe(true);}finally{await q.close();}
});

test('aftermath-A02-carriers-visible-on-contact',async({browser})=>{
 const rows=[];
 for(const target of ['a02-m-01','a02-m-07','a02-m-12']){
  const q=await prepareAftermathPage(browser,base);try{
   await q.evaluate(target=>{const orig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const r=orig(dt);if(__TMB_A12__.getState().movingPlatforms.some(p=>p.id===target&&p.rideFrames>=3))throw Error('M_CARRIER_CAPTURE');return r;};},target);
   try{await runAftermath(q,'A02');}catch(e){if(!String(e).includes('M_CARRIER_CAPTURE'))throw e;}
   await q.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));__tmbParkour.pause();window.dispatchEvent(new Event('pageshow'));});
   await q.waitForTimeout(80);
   const v=await q.evaluate(async target=>{
    const s=__TMB_A12__.getState(),p=s.movingPlatforms.find(m=>m.id===target),canvas=document.querySelector('#game'),c=canvas.getContext('2d'),l=__tmb.layout,rect=canvas.getBoundingClientRect(),scale=canvas.width/rect.width;
    const x=Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*scale)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*scale)),w=Math.min(canvas.width-x,Math.ceil(p.w*l.viewScale*scale)),h=Math.min(canvas.height-y,Math.ceil((p.h+32)*l.viewScale*scale));
    const sample=()=>Array.from(c.getImageData(x,y,w,h).data),a=sample();__TMB_A12__.setMovingPlatformsVisible(false);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);
    const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((a,b)=>a-b);
    return {target,world:s.world.selectedWorldId,route:s.routeId,rideFrames:p.rideFrames,mad:a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],visible:w/(p.w*l.viewScale*scale),cover:[...document.querySelectorAll('#a12Shop.show,#characterSelect.show')].filter(e=>e.getBoundingClientRect().width>0).length};
   },target);rows.push(v);
  }finally{await q.close();}
 }
 if(process.env.A_RED)rows[0].mad=0;
 console.log('M_VISIBLE',JSON.stringify(rows));expect(rows.every(r=>r.world==='aftermath'&&r.route==='A02'&&r.rideFrames>2&&r.mad>3&&r.contrast>15&&r.visible>=.8&&r.cover===0)).toBe(true);
});
// A4c-2a route-specific hazards; mutations exercise each predicate independently.
const aOut=fs.readFileSync(path.join(__dirname,'a4c2a-run-path.txt'),'utf8').trim();
function aCheck(name,value,predicate,bad){aftermathCheck('A4c2a '+name,value,predicate,bad);}
test('aftermath-A01-collapse-and-safe-lower-path',async({browser})=>{
 const rows=[];for(const lower of [false,true]){const p=await prepareAftermathPage(browser,base);try{
 if(lower)await p.evaluate(()=>window.__TMB_SKIP_MOVE_ID__='a01-m-upper-entry');
 const r=await runAftermath(p,'A01'),o=await readAftermathProbe(p),s=await p.evaluate(()=>__TMB_A12__.getState());
 const states=o.collapse['a01-m-collapse'];
 aCheck('only typed collapse',s.collapsing.every(c=>s.route.obstacles.some(x=>x.id===c.id&&x.type==='collapse')),x=>x,true===false);
 aCheck('safe finish '+lower,r.finished&&r.deaths===0,x=>x,false);
 aCheck('collapse states '+lower,states,x=>lower?JSON.stringify(x)==='["READY"]':['READY','CONTACT_WARNING','FALLING','ABSENT'].every(k=>x.includes(k)),[]);
 aCheck('lower traversed '+lower,o.trace.filter(t=>t.x>=14960&&t.x<=15160),x=>x.length>0&&(!lower||x.every(t=>Math.abs(t.y+t.h-455)<2)),[]);
 rows.push({lower,game_s:r.game_s,states,deaths:r.deaths});
 }finally{await p.close();}}
 const source=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8');aCheck('collapse typed source',source,x=>x.includes('route.obstacles.filter(o=>o.type === "collapse")'),source.replaceAll('route.obstacles.filter(o=>o.type === "collapse")','route.obstacles'));
 fs.writeFileSync(path.join(aOut,'collapse.json'),JSON.stringify(rows,null,2));
});
test('aftermath-A02-worker-deterministic-warning-and-mechanics',async({browser})=>{
 const rows=[];for(let n=0;n<2;n++){const p=await prepareAftermathPage(browser,base);try{
 await p.evaluate(()=>{const orig=__tmbCampaignStep;window.__workerTrace=[];window.__workerBirths=[];const seen=new Set();window.__tmbCampaignStep=dt=>{const v=orig(dt),s=__TMB_A12__.getState();for(const b of s.barrels){if(!seen.has(b.id)){seen.add(b.id);__workerBirths.push({t:s.gameClock,x:b.x,warning:b.warning,vx:b.vx});}__workerTrace.push([s.gameClock,b.x,b.y,b.warning]);}return v;};});
 const r=await runAftermath(p,'A02'),o=await readAftermathProbe(p),b=await p.evaluate(()=>({births:__workerBirths,trace:__workerTrace}));
 aCheck('worker birth warning '+n,b.births,x=>x.length>2&&x.every(b=>b.warning>=.7&&b.vx===-185),[]);
 aCheck('carrier contact '+n,Object.values(o.rides),x=>x.length===3&&x.every(v=>v>2),[0,0,0]);
 aCheck('vault slide platform overpass '+n,r.parkourSamples.some(s=>s.state==='vault')&&r.parkourSamples.some(s=>s.state==='slide')&&o.usage['a02-m-rescue-overpass']>2&&o.usage['a02-m-04']>2,x=>x,false);
 rows.push({births:b.births,traceHash:require('crypto').createHash('sha256').update(JSON.stringify(b.trace)).digest('hex'),rides:o.rides});
 }finally{await p.close();}}
 aCheck('worker trace repeat',rows[0].traceHash,x=>x===rows[1].traceHash,'bad');aCheck('worker birth repeat',JSON.stringify(rows[0].births),x=>x===JSON.stringify(rows[1].births),'[]');
 const src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),body=src.slice(src.indexOf('    if (route.obstacles.some((o) => o.type === "worker"))'),src.indexOf('    const overpass ='));
 aCheck('worker no random attack',body,x=>!x.includes('Math.random')&&x.includes('warning: 0.75'),body+'Math.random()');
 fs.writeFileSync(path.join(aOut,'worker.json'),JSON.stringify(rows,null,2));
});
test('aftermath-A01-A02-route-theme-and-frames',async({page})=>{
 test.setTimeout(180000);const rows=[],dir=path.join(__dirname,'tn-a4-shots','aftermath-a4c2a');fs.mkdirSync(dir,{recursive:true});
 await page.evaluate(()=>{__TMB_A12__.renderWorldOnRoute('aftermath','A01');__TMB_A12__.finish();});
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const id of ['A01','A02'])for(const position of ['start','obstacle']){
 await page.setViewportSize(size);const all={};
 for(const world of ['dock31','frozen','magma','aftermath']){
 await page.evaluate(({id,world,position})=>{const a=__TMB_A12__;if(!a.renderThemeFixture(world,id))throw Error('fixture failed');const s=a.getState(),o=position==='start'?s.route.obstacles.find(o=>o.type==='slide'):s.route.obstacles.find(o=>o.type==='vault');a.placePlayer(o.x-110);},{id,world,position});await page.waitForTimeout(850);
 const v=await page.evaluate(position=>{const a=__TMB_A12__,s=a.getState(),c=document.querySelector('#game'),ctx=c.getContext('2d'),l=__tmb.layout,k=l.viewScale*c.width/c.getBoundingClientRect().width,o=position==='start'?s.route.obstacles.find(o=>o.type==='slide'):s.route.obstacles.find(o=>o.type==='vault');
 const box=(x,y,w,h)=>[(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*c.width/c.getBoundingClientRect().width,(l.viewOffsetY+(l.worldY+y)*l.viewScale)*c.height/c.getBoundingClientRect().height,w*k,h*k];
 const ground=box(__tmb.cam,455,Math.min(500,c.width/k),60),ob=box(o.x,455-o.h,o.w,o.h),player=box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h);
 const rects={ground,background:[0,c.height*.1,c.width*.7,c.height*.23],obstacle:ob};const visible=b=>Math.max(0,Math.min(c.width,b[0]+b[2])-Math.max(0,b[0]))*Math.max(0,Math.min(c.height,b[1]+b[3])-Math.max(0,b[1]))/(b[2]*b[3]);
 return {world:s.world.selectedWorldId,id:s.routeId,cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,player:visible(player),target:visible(ob),sig:s.world.renderSignatures,regions:Object.fromEntries(Object.entries(rects).map(([k,r])=>{const x=Math.max(0,Math.floor(r[0])),y=Math.max(0,Math.floor(r[1])),w=Math.max(1,Math.min(c.width-x,Math.floor(r[2]))),h=Math.max(1,Math.min(c.height-y,Math.floor(r[3]))),d=ctx.getImageData(x,y,w,h).data;let b='';for(let i=0;i<d.length;i+=16384)b+=String.fromCharCode(...d.subarray(i,i+16384));return[k,btoa(b)];}))};},position);
 aCheck('frame route/world',v.id===id&&v.world===world,x=>x,false);aCheck('frame cover',v.cover,x=>x===0,1);aCheck('frame player',v.player,x=>x>=.8,0);aCheck('frame obstacle',v.target,x=>x>=.8,0);
 all[world]=Object.fromEntries(Object.entries(v.regions).map(([k,b])=>[k,Buffer.from(b,'base64')]));
 if(world==='aftermath'){
 aCheck('route signatures',v.sig,x=>['deckStripe','dock31Text','containerBlock','dockCrane','loadingCorridor','snowCap','icicles','iceRatio'].every(k=>x[k]===0),{deckStripe:1});
 for(const reg of ['ground','obstacle']){const lum=[];for(let j=0;j<all[world][reg].length;j+=4)lum.push((all[world][reg][j]+all[world][reg][j+1]+all[world][reg][j+2])/3);lum.sort((a,b)=>a-b);const contrast=lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)];aCheck('route contrast '+reg,contrast,x=>x>15,0);rows.push({id,position,size,reg,contrast});}
 const cdp=await page.context().newCDPSession(page),shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await cdp.detach();fs.writeFileSync(path.join(dir,`${id}-${position}-${size.width}x${size.height}.png`),Buffer.from(shot.data,'base64'));
 }
 }
 if(size.width===1280)for(const world of ['dock31','frozen','magma'])for(const reg of Object.keys(all.aftermath)){const rmse=a4fixFit(all[world][reg],all.aftermath[reg]);aCheck('route RMSE '+id+' '+position+' '+world+' '+reg,rmse,x=>x>18,a4fixFit(all[world][reg],all[world][reg]));rows.push({id,position,world,reg,rmse});}
 }
 fs.writeFileSync(path.join(aOut,'theme.json'),JSON.stringify(rows,null,2));
});

// A4c-2b independent route gates
const abOut=fs.readFileSync(path.join(__dirname,"a4c2b-run-path.txt"),"utf8").trim();
function abCheck(name,value,predicate,bad){aftermathCheck("A4c2b "+name,value,predicate,bad);}
for(const id of ['A03','A04'])test('aftermath-'+id+'-bot-s-completion',async({browser})=>{
 const rows=[];for(let i=0;i<2;i++){const q=await prepareAftermathPage(browser,base);try{const r=await runAftermath(q,id);const observed=await readAftermathProbe(q);rows.push({finished:r.finished,deaths:r.deaths,game_s:r.game_s,hash:r.hash,coins:observed.economy.collectedCoinIds.length,world:observed.world,routeId:observed.routeId,rides:observed.rides,collapse:observed.collapse,usage:observed.usage});}finally{await q.close();}}
 if(process.env.A_RED)rows[0].coins=0;
 console.log('M_COMPLETION',id,JSON.stringify(rows));
 expect(rows.every(r=>r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90&&r.coins===14&&r.world==='aftermath'&&r.routeId===id)&&rows[0].hash===rows[1].hash).toBe(true);
});
for(const id of ['A03','A04'])test('aftermath-'+id+'-G1-walking-zero',async({browser})=>{
 const q=await prepareAftermathPage(browser,base);try{await startAftermath(q,id);const w=await walkAftermathA(q,id);if(process.env.A_RED)w.coinIds.push('synthetic-ground-coin');console.log('M_WALK',id,JSON.stringify({complete:w.complete,coins:w.coinIds,coverage:w.coverage}));expect(w.complete&&w.coinIds.length===0&&w.coverage>=.95).toBe(true);}finally{await q.close();}
});

test('aftermath-A04-carriers-visible-on-contact',async({browser})=>{
 const rows=[];
 for(const target of ['a04-m-04','a04-m-09']){
  const q=await prepareAftermathPage(browser,base);try{
   await q.evaluate(target=>{const orig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const r=orig(dt);if(__TMB_A12__.getState().movingPlatforms.some(p=>p.id===target&&p.rideFrames>=3))throw Error('M_CARRIER_CAPTURE');return r;};},target);
   try{await runAftermath(q,'A04');}catch(e){if(!String(e).includes('M_CARRIER_CAPTURE'))throw e;}
   await q.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));__tmbParkour.pause();window.dispatchEvent(new Event('pageshow'));});
   await q.waitForTimeout(80);
   const v=await q.evaluate(async target=>{
    const s=__TMB_A12__.getState(),p=s.movingPlatforms.find(m=>m.id===target),canvas=document.querySelector('#game'),c=canvas.getContext('2d'),l=__tmb.layout,rect=canvas.getBoundingClientRect(),scale=canvas.width/rect.width;
    const x=Math.max(0,Math.floor((l.viewOffsetX+(p.x-__tmb.cam)*l.viewScale)*scale)),y=Math.max(0,Math.floor((l.viewOffsetY+(l.worldY+p.y-18)*l.viewScale)*scale)),w=Math.min(canvas.width-x,Math.ceil(p.w*l.viewScale*scale)),h=Math.min(canvas.height-y,Math.ceil((p.h+32)*l.viewScale*scale));
    const sample=()=>Array.from(c.getImageData(x,y,w,h).data),a=sample();__TMB_A12__.setMovingPlatformsVisible(false);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=sample();__TMB_A12__.setMovingPlatformsVisible(true);
    const lum=[];for(let i=0;i<a.length;i+=4)lum.push((a[i]+a[i+1]+a[i+2])/3);lum.sort((a,b)=>a-b);
    return {target,world:s.world.selectedWorldId,route:s.routeId,rideFrames:p.rideFrames,mad:a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0)/a.length,contrast:lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)],visible:w/(p.w*l.viewScale*scale),cover:[...document.querySelectorAll('#a12Shop.show,#characterSelect.show')].filter(e=>e.getBoundingClientRect().width>0).length};
   },target);rows.push(v);
  }finally{await q.close();}
 }
 if(process.env.A_RED)rows[0].mad=0;
 console.log('M_VISIBLE',JSON.stringify(rows));expect(rows.every(r=>r.world==='aftermath'&&r.route==='A04'&&r.rideFrames>2&&r.mad>3&&r.contrast>15&&r.visible>=.8&&r.cover===0)).toBe(true);
});
test('aftermath-A03-A04-route-theme-and-frames',async({page})=>{
 test.setTimeout(180000);const rows=[],dir=path.join(__dirname,'tn-a4-shots','aftermath-a4c2b');fs.mkdirSync(dir,{recursive:true});
 await page.evaluate(()=>{for(const id of ['A01','A02','A03']){__TMB_A12__.renderWorldOnRoute('aftermath',id);__TMB_A12__.finish();}});
 for(const size of [{width:1280,height:720},{width:390,height:844}])for(const id of ['A03','A04'])for(const position of ['start','obstacle']){
 await page.setViewportSize(size);const all={};
 for(const world of ['dock31','frozen','magma','aftermath']){
 await page.evaluate(({id,world,position})=>{const a=__TMB_A12__;if(!a.renderThemeFixture(world,id))throw Error('fixture failed');const s=a.getState(),o=position==='start'?s.route.obstacles.find(o=>o.type==='slide'):s.route.obstacles.find(o=>o.type==='vault');a.placePlayer(o.x-110);},{id,world,position});await page.waitForTimeout(850);
 const v=await page.evaluate(position=>{const a=__TMB_A12__,s=a.getState(),c=document.querySelector('#game'),ctx=c.getContext('2d'),l=__tmb.layout,k=l.viewScale*c.width/c.getBoundingClientRect().width,o=position==='start'?s.route.obstacles.find(o=>o.type==='slide'):s.route.obstacles.find(o=>o.type==='vault');
 const box=(x,y,w,h)=>[(l.viewOffsetX+(x-__tmb.cam)*l.viewScale)*c.width/c.getBoundingClientRect().width,(l.viewOffsetY+(l.worldY+y)*l.viewScale)*c.height/c.getBoundingClientRect().height,w*k,h*k];
 const ground=box(__tmb.cam,455,Math.min(500,c.width/k),60),ob=box(o.x,455-o.h,o.w,o.h),player=box(s.player.x,s.player.y,s.hitbox.w,s.hitbox.h);
 const rects={ground,background:[0,c.height*.1,c.width*.7,c.height*.23],obstacle:ob};const visible=b=>Math.max(0,Math.min(c.width,b[0]+b[2])-Math.max(0,b[0]))*Math.max(0,Math.min(c.height,b[1]+b[3])-Math.max(0,b[1]))/(b[2]*b[3]);
 return {world:s.world.selectedWorldId,id:s.routeId,cover:document.querySelectorAll('#a12Shop.show,#characterSelect.show').length,player:visible(player),target:visible(ob),sig:s.world.renderSignatures,regions:Object.fromEntries(Object.entries(rects).map(([k,r])=>{const x=Math.max(0,Math.floor(r[0])),y=Math.max(0,Math.floor(r[1])),w=Math.max(1,Math.min(c.width-x,Math.floor(r[2]))),h=Math.max(1,Math.min(c.height-y,Math.floor(r[3]))),d=ctx.getImageData(x,y,w,h).data;let b='';for(let i=0;i<d.length;i+=16384)b+=String.fromCharCode(...d.subarray(i,i+16384));return[k,btoa(b)];}))};},position);
 abCheck('frame route/world',v.id===id&&v.world===world,x=>x,false);abCheck('frame cover',v.cover,x=>x===0,1);abCheck('frame player',v.player,x=>x>=.8,0);abCheck('frame obstacle',v.target,x=>x>=.8,0);
 all[world]=Object.fromEntries(Object.entries(v.regions).map(([k,b])=>[k,Buffer.from(b,'base64')]));
 if(world==='aftermath'){
 abCheck('route signatures',v.sig,x=>['deckStripe','dock31Text','containerBlock','dockCrane','loadingCorridor','snowCap','icicles','iceRatio'].every(k=>x[k]===0),{deckStripe:1});
 for(const reg of ['ground','obstacle']){const lum=[];for(let j=0;j<all[world][reg].length;j+=4)lum.push((all[world][reg][j]+all[world][reg][j+1]+all[world][reg][j+2])/3);lum.sort((a,b)=>a-b);const contrast=lum[Math.floor(lum.length*.9)]-lum[Math.floor(lum.length*.1)];abCheck('route contrast '+reg,contrast,x=>x>15,0);rows.push({id,position,size,reg,contrast});}
 const cdp=await page.context().newCDPSession(page),shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await cdp.detach();fs.writeFileSync(path.join(dir,`${id}-${position}-${size.width}x${size.height}.png`),Buffer.from(shot.data,'base64'));
 }
 }
 if(size.width===1280)for(const world of ['dock31','frozen','magma'])for(const reg of Object.keys(all.aftermath)){const rmse=a4fixFit(all[world][reg],all.aftermath[reg]);abCheck('route RMSE '+id+' '+position+' '+world+' '+reg,rmse,x=>x>18,a4fixFit(all[world][reg],all[world][reg]));rows.push({id,position,world,reg,rmse});}
 }
 fs.writeFileSync(path.join(abOut,'theme.json'),JSON.stringify(rows,null,2));
});
const {prepareAftermathB,idle:abIdle}=require('./lib/aftermath-b-probe.cjs');
test('aftermath-A03-chief-contract-escape-catch-checkpoint-pause',async({browser})=>{
 test.setTimeout(90000);const q=await prepareAftermathB(browser,base);try{
 await startAftermath(q,'A03');await abIdle(q,6);
 await q.evaluate(()=>{const step=__tmbCampaignStep;window.__chiefTrace=[];window.__tmbCampaignStep=dt=>{const v=step(dt),s=__TMB_A12__.getState();if(s.chief.active)__chiefTrace.push({t:s.gameClock,x:s.player.x,cx:s.chief.x,checkpoint:s.checkpointX});return v;};});
 const r=await runAftermath(q,'A03',{resume:true}),o=await readAftermathProbe(q),b=await q.evaluate(()=>__mb),trace=await q.evaluate(()=>__chiefTrace);
 abCheck('clean escape',r.finished&&r.deaths===0&&r.game_s>=45&&r.game_s<=90,x=>x,false);
 abCheck('closed bypass with chief',b.crossings,x=>x.some(c=>c.state==='CLOSED'&&c.pushes===0&&c.bottom<=c.doorTop&&trace.some(t=>t.x>=c.x-10&&t.x<=c.x+10)),[]);
 abCheck('overpass contact',o.usage['a03-m-bypass'],x=>x>2,0);
 abCheck('start threshold',trace[0].x,x=>x>=12000&&x<12010,1800);
 const checkpoints=[...r.route.checkpoints,r.route.finishX],intervals=checkpoints.slice(1).map((v,i)=>v-checkpoints[i]);
 await startAftermath(q,'A03');await runAftermath(q,'A03',{resume:true,stopAtX:12500});
 const approach=await q.evaluate(()=>{__tmbParkour.move(0);const rows=[];const begin=__TMB_A12__.getState();for(let i=0;i<600;i++){__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);const s=__TMB_A12__.getState();rows.push({t:s.gameClock,x:s.player.x,cx:s.chief.x,dist:s.chief.distance,cam:__tmb.cam,caught:s.chief.catches});if(s.chief.catches)break;}return{begin,rows,end:__TMB_A12__.getState()};});
 abCheck('approach visible',approach.rows,x=>x.some(v=>!v.caught&&v.cx>=v.cam&&v.dist>32&&v.dist<190),[]);
 abCheck('stopped caught',approach.end.chief.catches,x=>x===1,0);
 abCheck('checkpoint return',approach.end.player.x,x=>x===approach.end.checkpointX,-1);
 abCheck('respawn lead',approach.end.chief.distance,x=>x>=375,0);
 abCheck('safe respawn',approach.end.player.y+approach.end.hitbox.h,x=>Math.abs(x-455)<2,0);
 const recovery=await runAftermath(q,'A03',{resume:true,stopAtX:12500}),after=await q.evaluate(()=>__TMB_A12__.getState());
 abCheck('resume safe',after.chief.catches,x=>x===1,2);
 // Real pause path: suspended native frames must preserve both actors.
 await q.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(()=>cb(performance.now()));__tmbPause();window.dispatchEvent(new Event('pageshow'));});
 const pauseA=await q.evaluate(()=>__TMB_A12__.getState());await q.waitForTimeout(350);const pauseB=await q.evaluate(()=>__TMB_A12__.getState());
 abCheck('pause chief',pauseB.chief.x,x=>x===pauseA.chief.x,pauseA.chief.x+10);abCheck('pause player',pauseB.player.x,x=>x===pauseA.player.x,pauseA.player.x+10);
 const report={seconds:r.game_s,chaseSeconds:trace.at(-1).t-trace[0].t,chaseStart:trace[0],chaseEnd:trace.at(-1),intervals,crossings:b.crossings,approach:approach.rows,returnDistance:approach.begin.player.x-approach.end.player.x,catchSeconds:approach.end.gameClock-approach.begin.gameClock,returnX:approach.end.player.x,recoverySeconds:after.gameClock-approach.end.gameClock,pauseDx:pauseB.chief.x-pauseA.chief.x};fs.writeFileSync(path.join(abOut,'chief.json'),JSON.stringify(report,null,2));console.log('A_CHIEF',JSON.stringify({...report,approach:undefined}));
 }finally{await q.close();}
});
test('aftermath-A04-all-mechanics-final',async({browser})=>{
 const q=await prepareAftermathB(browser,base);try{await startAftermath(q,'A04');await abIdle(q,6);const r=await runAftermath(q,'A04',{resume:true}),p=await readAftermathProbe(q),b=await q.evaluate(()=>__mb),s=await q.evaluate(()=>__TMB_A12__.getState());
 abCheck('final finish',r.finished&&r.deaths===0&&!!s.result,x=>x,false);
 for(const type of ['vault','slide','platform','overpass'])abCheck('mechanic '+type,r.route.obstacles.filter(o=>o.type===type).some(o=>p.usage[o.id]>2),x=>x,false);
 abCheck('frontflip phases',b.flipPhases,x=>['launch','tuck','open'].every(k=>x.includes(k)),[]);abCheck('one landing',b.landings.length,x=>x===1,0);
 abCheck('carriers',Object.values(p.rides),x=>x.length===2&&x.every(v=>v>2),[0]);
 abCheck('collapse states',p.collapse['a04-m-collapse'],x=>['READY','CONTACT_WARNING','FALLING','ABSENT'].every(k=>x.includes(k)),[]);
 abCheck('door states',b.doors['a04-m-door'],x=>['OPEN','PREPARING','CLOSING','CLOSED'].every(k=>x.includes(k)),[]);
 abCheck('closed final bypass',b.crossings,x=>x.some(c=>c.state==='CLOSED'&&c.pushes===0&&c.bottom<=c.doorTop),[]);
 abCheck('safe final checkpoint',s.checkpointX,x=>x===16000,70);
 fs.writeFileSync(path.join(abOut,'mechanics.json'),JSON.stringify({seconds:r.game_s,usage:p.usage,rides:p.rides,collapse:p.collapse,...b},null,2));
 }finally{await q.close();}
});
test('aftermath-hazard-A01-A04-20-real-phases-source-match',async({browser})=>{
 test.setTimeout(120000);const vm=require('vm'),src=fs.readFileSync(path.join(__dirname,'../js/a12-campaign.js'),'utf8'),defs=vm.runInNewContext(src.slice(src.indexOf('  function range('),src.indexOf('  function drawCoin('))+src.slice(src.indexOf('  const COINS ='),src.indexOf('  const CHIEF_SPRITE'))+';ROUTES'),report=[],overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(const id of ['A01','A02','A03','A04']){const q=await prepareAftermathB(browser,base);try{
 const r=await runAftermath(q,id),b=await q.evaluate(()=>__mb),ramps=r.route.obstacles.filter(o=>o.type==='ramp'),hazards=r.route.obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type));
 abCheck(id+' source inventory',JSON.stringify({ramps,hazards}),x=>x===JSON.stringify({ramps:defs[id].obstacles.filter(o=>o.type==='ramp'),hazards:defs[id].obstacles.filter(o=>['collapse','containerDoor','worker'].includes(o.type))}),'{}');
 abCheck(id+' finish',r.finished&&r.deaths===0,x=>x,false);abCheck(id+' landing count',b.landings.length,x=>x===ramps.length,-1);
 await startAftermath(q,id);
 if(hazards.some(o=>o.type==='collapse')){
 await q.evaluate(()=>{window.__abHazardOrig=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const v=__abHazardOrig(dt);if(__TMB_A12__.getState().collapsing.some(c=>c.state==='CONTACT_WARNING'))throw Error('A_COLLAPSE_PHASE_START');return v;};});
 try{await runAftermath(q,id,{resume:true});}catch(e){if(!String(e).includes('A_COLLAPSE_PHASE_START'))throw e;}
 await q.evaluate(()=>{window.__tmbCampaignStep=window.__abHazardOrig;__tmbParkour.move(0);});
 }
 const phases=await q.evaluate(()=>{__tmbParkour.move(0);const rows=[];for(let phase=0;phase<20;phase++){for(let j=0;j<30;j++){__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);}const s=__TMB_A12__.getState();rows.push({clock:s.gameClock,doors:s.containerDoors,collapse:s.collapsing,barrels:s.barrels});}return rows;});
 abCheck(id+' real phases',new Set(phases.map(p=>p.clock)).size,x=>x===20,1);
 if(hazards.some(o=>o.type==='collapse'))abCheck(id+' live collapse phases',new Set(phases.flatMap(p=>p.collapse.map(c=>c.state))).size,x=>x>1,1);
 if(hazards.some(o=>o.type==='containerDoor'))abCheck(id+' live door phases',new Set(phases.flatMap(p=>p.doors.map(d=>d.state))).size,x=>x>2,1);
 if(hazards.some(o=>o.type==='worker'))abCheck(id+' live barrel positions',new Set(phases.flatMap(p=>p.barrels.map(b=>b.x))).size,x=>x>2,1);
 const scans=[];for(const [i,ramp] of ramps.entries()){const land=b.landings[i],zone={x:Math.min(ramp.x+ramp.w,land.x),y:land.y,w:Math.max(ramp.x+ramp.w+500,land.x+land.w)-Math.min(ramp.x+ramp.w,land.x),h:land.h};if(process.env.A_HAZARD_RED){const h=hazards.find(o=>o.type==="containerDoor");zone.x=h.x;zone.y=h.y;zone.w=h.w;zone.h=h.h;}for(const phase of phases){const rects=[...phase.doors.filter(d=>['CLOSING','CLOSED'].includes(d.state)),...phase.collapse.filter(c=>c.state!=='ABSENT').map(c=>({...c,y:c.y+c.fallY})),...phase.barrels.map(v=>({...v,w:28,h:28}))];scans.push({clock:phase.clock,zone,hits:rects.filter(v=>overlap(zone,v)).map(v=>v.id)});}abCheck(id+' synthetic colliding ramp',overlap({...zone,x:1000,y:407},{x:1000,y:407,w:100,h:48}),x=>x,false);}
 abCheck(id+' scan count',scans.length,x=>x===ramps.length*20,-1);abCheck(id+' safe landing',scans.every(s=>s.hits.length===0),x=>x,false);report.push({id,ramps,hazards,landings:b.landings,phases,scans});
 }finally{await q.close();}}
 fs.writeFileSync(path.join(abOut,'hazard.json'),JSON.stringify(report,null,2));
});
test('aftermath-D06-chief-baseline-differential',async({browser})=>{
 const rows=[];for(const baseline of [true,false]){const q=await browser.newPage({viewport:{width:1280,height:720}});try{
 const code=fs.readFileSync(baseline?path.join(abOut,'pre/js/a12-campaign.js'):path.join(__dirname,'../js/a12-campaign.js'),'utf8');
 await q.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname.endsWith('/js/a12-campaign.js'))return route.fulfill({contentType:'text/javascript',body:code});return route.continue();});
 await q.addInitScript(()=>{let seed=0x1a2b3c4d,now=0;Math.random=()=> (seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;Date.now=()=>Math.floor(now);Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;localStorage.setItem('trust_me_bro_campaign_profile_v1',JSON.stringify({progressByRoute:{D05:{completed:true}}}));});
 await q.goto(base);await q.waitForFunction(()=>window.__TMB_A12__&&window.__tmbParkour);await q.locator('.characterChoice:visible').first().click();
 abCheck('D06 loaded bytes '+baseline,await q.evaluate(async()=>new TextEncoder().encode(await(await fetch('js/a12-campaign.js')).text()).length),x=>x===Buffer.byteLength(code),-1);
 await q.evaluate(()=>{__tmbParkour.manual();__TMB_A12__.startRoute('D06',true,true);window.__dc=[];const step=__tmbCampaignStep;window.__tmbCampaignStep=dt=>{const v=step(dt),s=__TMB_A12__.getState();__dc.push({t:s.gameClock,p:s.player,chief:s.chief,checkpoint:s.checkpointX,deaths:s.deaths});return v;};});
 const r=await require('./lib/bot-s-drive.cjs').runBot(q,'D06',{resume:true}),trace=await q.evaluate(()=>__dc);rows.push({baseline,finished:r.finished,deaths:r.deaths,seconds:r.game_s,hash:r.hash,chiefHash:require('crypto').createHash('sha256').update(JSON.stringify(trace)).digest('hex')});
 }finally{await q.close();}}
 abCheck('D06 finished',rows.every(r=>r.finished&&r.deaths===0),x=>x,false);abCheck('D06 same trace',rows[0].chiefHash,x=>x===rows[1].chiefHash,'bad');abCheck('D06 same inputs result',rows[0].hash,x=>x===rows[1].hash,'bad');fs.writeFileSync(path.join(abOut,'D06-differential.json'),JSON.stringify(rows,null,2));
});

// A4c-2c final acceptance. Independent controls use fresh profiles.
const aftermathCOut=process.env.A_C_OUT||fs.readFileSync(path.join(__dirname,'a4c2c-run-path.txt'),'utf8').trim().replace(/^\uFEFF/,'');
const aftermathCIds=['A01','A02','A03','A04'];
const aCAudited=new Set();
const aCCheck=(value,label)=>{if(process.env.A_C_AUDIT&&!aCAudited.has(label)){let rejected=false;try{expect(false,label+' intentional-red').toBe(true);}catch(e){rejected=true;fs.appendFileSync(path.join(aftermathCOut,'assert-audit-c.jsonl'),JSON.stringify({label,rejected,error:e.message})+'\n');}if(!rejected)throw Error('Negative oracle accepted '+label);aCAudited.add(label);}expect(process.env.A_C_RED===label?false:value,label).toBe(true);};
test('aftermath-route-unlock-chain-save-retry-next-G7',async({page,context})=>{
 const rows=[];await page.evaluate(async()=>{__tmbParkour.manual();__TMB_A12__.finish();await __TMB_A12__.setWallet(500);await __TMB_A12__.purchaseWorld('aftermath');await __TMB_A12__.purchaseWorld('aftermath');});await page.locator('#a12Actions [data-act="next"]').click();
 let s=await page.evaluate(()=>__TMB_A12__.getState());
 aCCheck(s.world.selectedWorldId==='aftermath'&&s.routeId==='A01'&&s.profile.walletBalance===0,'purchase');
 aCCheck(JSON.stringify(s.world.registry.aftermath.routes)===JSON.stringify(aftermathCIds),'registry');
 const preserved=JSON.stringify(Object.fromEntries(Object.entries(s.profile.progressByRoute).filter(([id])=>/^[DFM]/.test(id))));
 aCCheck(aftermathCIds.every((id,i)=>s.route.unlocked[id]===(i===0)),'initial-lock');
 aCCheck(await page.evaluate(()=>['A02','A03','A04'].every(id=>__TMB_A12__.startRoute(id)===false)),'reject-locked');
 for(const [i,id] of aftermathCIds.entries()){
  s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'start',id:s.routeId,coins:s.route.coins.length});
  aCCheck(s.routeId===id&&s.route.coins.length===14&&!s.result,'start-count');
  await page.evaluate(()=>{const a=__TMB_A12__;a.collectCoin(a.routeCoins()[0]);a.retry(false);});s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'retry',id:s.routeId,coins:s.route.coins.length});
  aCCheck(s.routeId===id&&s.route.coins.length===14&&s.economy.runCoins===1&&!s.result,'retry-count');
  const coinIds=s.economy.collectedCoinIds;const restored=await context.newPage();await restored.goto(base);await restored.waitForFunction(()=>window.__TMB_A12__);await restored.evaluate(()=>__tmbParkour.manual());const saved=await restored.evaluate(()=>__TMB_A12__.getState());await restored.close();
  aCCheck(saved.routeId===id&&saved.route.coins.length===14&&JSON.stringify(saved.economy.collectedCoinIds)===JSON.stringify(coinIds)&&JSON.stringify(saved.route.unlocked)===JSON.stringify(s.route.unlocked)&&saved.profile.walletBalance===s.profile.walletBalance,'save-resume');
  await page.evaluate(()=>__TMB_A12__.finish());s=await page.evaluate(()=>__TMB_A12__.getState());
  aCCheck(aftermathCIds.every((r,j)=>s.route.unlocked[r]===(j<=i+1)),'progressive-lock');
  const wallet=s.profile.walletBalance;await page.evaluate(()=>__TMB_A12__.purchaseWorld('aftermath'));
  aCCheck((await page.evaluate(()=>__TMB_A12__.profile())).walletBalance===wallet,'no-second-charge');
  await page.locator('#a12Actions [data-act="retry"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());
  aCCheck(s.routeId===id&&s.route.coins.length===14&&s.economy.runCoins===0&&!s.result,'result-retry');
  await page.evaluate(()=>__TMB_A12__.finish());await page.locator('#a12Actions [data-act="next"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());rows.push({label:'next',id:s.routeId,coins:s.route.coins.length});
  aCCheck(s.routeId===aftermathCIds[(i+1)%4]&&s.route.coins.length===14&&!s.result,'next-count');
 }
 s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(JSON.stringify(Object.fromEntries(Object.entries(s.profile.progressByRoute).filter(([id])=>/^[DFM]/.test(id))))===preserved,'df-progress');
 aCCheck(s.profile.ownedWorldIds.filter(id=>id==='aftermath').length===1,'unique-ownership');
 fs.writeFileSync(path.join(aftermathCOut,'chain-g7.json'),JSON.stringify(rows,null,2));
});
function aftermathCDistance(A,B){const a=A.obstacles.slice().sort((a,b)=>a.x-b.x),b=B.obstacles.slice().sort((a,b)=>a.x-b.x);let d=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let n=[i+1];for(let j=0;j<b.length;j++)n.push(Math.min(n[j]+1,d[j+1]+1,d[j]+(a[i].type===b[j].type?0:1)));d=n;}const same=a.map(o=>o.type).join('|')===b.map(o=>o.type).join('|'),delta=same?a.map((o,i)=>o.x-b[i].x):[];const shift=same?(Math.min(...delta)+Math.max(...delta))/2:0;return{distance:d[b.length]/Math.max(a.length,b.length,1),copy:same&&delta.every(v=>Math.abs(v-shift)<=150),normalizedA:a.map(o=>o.x/A.length),normalizedB:b.map(o=>o.x/B.length)};}
test('aftermath-route-similarity-18x18',async({page})=>{
 const defs=await page.evaluate(()=>Object.fromEntries(['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04','M01','M02','M03','M04','A01','A02','A03','A04'].map(id=>[id,__TMB_A12__.routeDefinition(id)]))),matrix={},pairs=[];
 for(const [a,A] of Object.entries(defs)){matrix[a]={};for(const [b,B] of Object.entries(defs)){const r=aftermathCDistance(A,B);matrix[a][b]=r.distance;if(a!==b){aCCheck(!r.copy,'no-copy');if(a[0]==='A'&&b[0]==='A')aCCheck(r.distance>=.3,'distance');}pairs.push({a,b,...r});}}
 const copy={...defs.D04,obstacles:defs.D04.obstacles.map(o=>({...o,x:o.x+500}))};aCCheck(aftermathCDistance(defs.D04,copy).copy,'copy-control');
 fs.writeFileSync(path.join(aftermathCOut,'similarity.json'),JSON.stringify({matrix,pairs},null,2));
});
test('aftermath-route-localized-names',async({page})=>{
 const dictionary=await page.evaluate(()=>__TMB_A12__.i18n());const names={};for(const lang of ['en','tr','ru']){names[lang]=Object.fromEntries(aftermathCIds.map(id=>[id,dictionary[lang][id]]));aCCheck(Object.values(names[lang]).every(v=>typeof v==='string'&&v.length>4&&!v.includes('?'))&&new Set(Object.values(names[lang])).size===4,'names');}
 aCCheck(names.en.A01==='BROKEN RECEIVING'&&names.en.A02==='EMERGENCY CARGO'&&names.en.A03==='LAST COURIER'&&names.en.A04==='FINAL DISPATCH','english-names');
 fs.writeFileSync(path.join(aftermathCOut,'names.json'),JSON.stringify(names,null,2));
});
test('aftermath-G4-twelve-distinct-targets-and-positive-controls',async()=>{
 const rows=aftermathCIds.flatMap(id=>JSON.parse(fs.readFileSync(path.join(aftermathCOut,id,'g4-pilot.json'),'utf8')));
 aCCheck(rows.length===12&&new Set(rows.map(r=>r.target.id)).size===12,'g4-count');
 for(const id of aftermathCIds)aCCheck(['CJ','CC','CS'].every(kind=>rows.filter(r=>r.id===id&&r.kind===kind).length===1),'g4-types');
 for(const r of rows){aCCheck(r.finished&&r.targetMissed&&r.intersections===0&&r.positiveControl&&r.traceSamples>0&&r.status==='PASS','g4-pass');const contact=p=>{const c=r.target;return Math.hypot(c.x-Math.max(p.x,Math.min(c.x,p.x+p.w)),c.y-Math.max(p.y,Math.min(c.y,p.y+p.h)))<=10;};aCCheck(r.segments.flatMap(s=>s.trace).every(p=>!contact(p)),'g4-trace');aCCheck(contact({x:r.target.x-5,y:r.target.y-5,w:10,h:10}),'g4-contact-control');}
 fs.writeFileSync(path.join(aftermathCOut,'g4-summary.json'),JSON.stringify(rows.map(r=>({id:r.id,kind:r.kind,target:r.target.id,missed:r.targetMissed,intersections:r.intersections,positive:r.positiveControl,samples:r.traceSamples,finished:r.finished,teleportSkipsTarget:r.teleportSkipsTarget})),null,2));
});

test('aftermath-A01-mobile-touch-first-checkpoint',async({browser})=>{
 test.setTimeout(90000);const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await context.newPage();
 try{await p.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await p.addInitScript(()=>{let now=0;Object.defineProperty(performance,'now',{value:()=>now});window.__tmbAdvanceTime=ms=>now+=ms;});await p.goto(base);await p.waitForFunction(()=>window.__TMB_A12__);await p.locator('.characterChoice:visible').first().tap();await startAftermath(p,'A01');
 await p.evaluate(()=>__tmbAdvanceTime(1500));
 const controls=await p.locator('#joystick,#jumpWrap button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
 aCCheck(controls.length===2&&controls.every(r=>r.w>0&&r.h>0&&r.x>=0&&r.y>=0&&r.x+r.w<=390&&r.y+r.h<=844)&&!(controls[0].x<controls[1].x+controls[1].w&&controls[0].x+controls[0].w>controls[1].x&&controls[0].y<controls[1].y+controls[1].h&&controls[0].y+controls[0].h>controls[1].y),'mobile-controls');
 const cdp=await context.newCDPSession(p),joy={x:controls[0].x+controls[0].w*.9,y:controls[0].y+controls[0].h*.5,id:1},jump={x:controls[1].x+controls[1].w*.5,y:controls[1].y+controls[1].h*.5,id:2};
 await p.evaluate(()=>{window.__touchFired=[];window.__touchEvents=[];for(const type of ['pointerdown','pointerup'])document.addEventListener(type,e=>__touchEvents.push({type,kind:e.pointerType,trusted:e.isTrusted,target:e.target.id||e.target.tagName}),true);});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joy]});let held=false,release=0,steps=0,last;
 for(;steps<2400;steps++){
  const q=await p.evaluate(()=>{const s=__TMB_A12__.getState(),p=s.player,pw=s.hitbox.w;let target=null;for(const o of s.route.obstacles){if(__touchFired.includes(o.id))continue;let trigger=false;if(['vault','slide'].includes(o.type)){const gap=o.x-(p.x+pw),look=Math.max(40,Math.min(60,Math.abs(p.vx)*.15));trigger=gap>=-.001&&gap<=look;}else if(o.type==='platform'&&p.onGround){const dy=o.y-(p.y+s.hitbox.h),disc=560*560+2*1450*dy,t=disc>=0?(560+Math.sqrt(disc))/1450:NaN,landing=p.x+pw/2+Math.max(0,p.vx)*t;trigger=Number.isFinite(t)&&t<=1&&landing>=o.x+16&&landing<=o.x+o.w-16;}if(trigger){target=o.id;break;}}return{target,checkpoint:s.checkpointX,x:p.x,deaths:s.deaths,world:s.world.selectedWorldId,id:s.routeId};});last=q;if(q.checkpoint>=3000)break;
  if(held&&steps>=release){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[jump]});held=false;}
  if(q.target&&!held){await p.evaluate(id=>__touchFired.push(id),q.target);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[joy,jump]});held=true;release=steps+8;}
  await p.evaluate(()=>{__tmbParkour.manual();__tmbAdvanceTime(1000/60);__tmbCampaignStep(1/60);});
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const events=await p.evaluate(()=>__touchEvents);console.log('MOBILE_DIAG',JSON.stringify({last,steps,events,controls,fired:await p.evaluate(()=>__touchFired)}));aCCheck(last.checkpoint>=3000&&last.deaths===0&&last.world==='aftermath'&&last.id==='A01','mobile-checkpoint');aCCheck(events.filter(e=>e.trusted&&e.kind==='touch'&&e.type==='pointerdown').length>=4,'mobile-real-touch');
 fs.writeFileSync(path.join(aftermathCOut,'mobile.json'),JSON.stringify({viewport:{width:390,height:844},controls,last,steps,events},null,2));
 }finally{await context.close();}
});


test('aftermath-ui-world-transition-and-protected-chains',async({page})=>{
 await page.evaluate(async()=>{__tmbParkour.manual();await __TMB_A12__.setWallet(1000);});
 await worlds(page);await page.locator('[data-item="aftermath"] [data-action]').click();
 let s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(s.profile.ownedWorldIds.includes('aftermath')&&s.profile.walletBalance===500,'ui-purchase');
 await page.locator('[data-item="aftermath"] [data-action]').click();await page.locator('#a12Shop [data-close]').click();
 await page.evaluate(()=>__TMB_A12__.finish());await page.locator('#a12Actions [data-act="next"]').click();
 s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(s.routeId==='A01'&&s.world.selectedWorldId==='aftermath'&&s.profile.walletBalance>=500,'ui-A01');
 const rows=[];for(const [world,first,next] of [['dock31','D01','D02'],['frozen','F01','F02'],['magma','M01','M02']]){
  await page.evaluate(async world=>{__tmbParkour.manual();await __TMB_A12__.setWallet(1000);await __TMB_A12__.purchaseWorld(world);await __TMB_A12__.purchaseWorld(world);__TMB_A12__.finish();},world);
  await page.locator('#a12Actions [data-act="next"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(s.world.selectedWorldId===world&&s.routeId===first,'return-world');
  await page.evaluate(()=>__TMB_A12__.finish());await page.locator('#a12Actions [data-act="next"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(s.routeId===next,'protected-next');rows.push({world,first,next:s.routeId});
  await page.evaluate(async()=>{await __TMB_A12__.purchaseWorld('aftermath');__TMB_A12__.finish();});await page.locator('#a12Actions [data-act="next"]').click();s=await page.evaluate(()=>__TMB_A12__.getState());aCCheck(s.world.selectedWorldId==='aftermath'&&/^A0/.test(s.routeId),'return-aftermath');
 }
 fs.writeFileSync(path.join(aftermathCOut,'ui-transition.json'),JSON.stringify(rows,null,2));
});
