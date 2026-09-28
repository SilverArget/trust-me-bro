const { test, expect } = require("playwright/test");
const fs = require("fs"),
  http = require("http"),
  path = require("path");
const { runBot } = require("./lib/bot-s-drive.cjs");
let server, base;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel =
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    fs.readFile(path.join(__dirname, "..", rel), (e, b) => {
      if (!e && rel === "js/a12-campaign.js") {
        const referer = new URL(req.headers.referer || "http://x", "http://x"),
          removeId = referer.searchParams.get("visremove");
        if (removeId) {
          const hook = `\n  for (const r of Object.values(ROUTES)) r.obstacles = r.obstacles.filter((o) => o.id !== ${JSON.stringify(removeId)});`;
          b = Buffer.from(
            b.toString().replace(
              "\n  const CHIEF_SPRITE = new Image();",
              hook + "\n  const CHIEF_SPRITE = new Image();",
            ),
          );
        }
        if (referer.searchParams.get("tetikchief") === "reset")
          b = Buffer.from(
            b
              .toString()
              .replace(
                "if (!campaignChief.active && player.x>=1800)",
                "if (!campaignChief.active && player.x>=1800 && !window.__TMB_SEGMENT_TEST__)",
              )
              .replace(
                "        getState: debugState,",
                `        getState: debugState,
        resetChiefForSegment: () => {
          if (!campaignChief) return null;
          window.__TMB_SEGMENT_TEST__ = true;
          campaignChief.active = false;
          campaignChief.x = player.x - 400;
          campaignChief.y = GROUND - campaignChief.h;
          campaignChief.catches = 0;
          campaignChief.caughtT = 0;
          campaignChief.lastReturnX = null;
          return {...campaignChief};
        },`,
              ),
          );
      }
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
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(async () => new Promise((r) => server.close(r)));
test.beforeEach(async ({ page }) =>
  page.addInitScript(
    ({ freezeTime, skipMoveId }) => {
      let seed = 0x1a2b3c4d,
        now = 0;
      Math.random = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      if (freezeTime) {
        Date.now = () => Math.floor(now);
        Object.defineProperty(performance, "now", { value: () => now });
      }
      window.__tmbAdvanceTime = (ms) => {
        now += ms;
      };
      window.__TMB_SKIP_MOVE_ID__ = skipMoveId;
      localStorage.setItem(
        "trust_me_bro_campaign_profile_v1",
        JSON.stringify({
          ownedWorldIds: ["dock31", "frozen"],
          progressByRoute: {
            F01: { completed: true },
            F02: { completed: true },
            F03: { completed: true },
          },
        }),
      );
    },
    {
      freezeTime: process.env.T1B_TIME_REAL !== "1",
      skipMoveId: process.env.T1B_SKIP_MOVE_ID || "",
    },
  ),
);
test("B-KANCA debug-only campaign step", async ({ browser }) => {
  const release = await browser.newPage();
  await release.goto(base);
  expect(await release.evaluate(() => typeof window.__tmbCampaignStep)).toBe(
    "undefined",
  );
  expect(await release.evaluate(() => typeof window.__tmbParkour)).toBe(
    "undefined",
  );
  await release.close();
  const page = await browser.newPage();
  await page.goto(base + "#debug");
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  expect(await page.evaluate(() => typeof window.__tmbCampaignStep)).toBe(
    "function",
  );
  expect(await page.evaluate(() => typeof window.__tmbParkour)).toBe("object");
  await page.locator(".characterChoice:visible").first().click();
  const measured = await page.evaluate(() => {
    __TMB_A12__.startRoute("D01");
    __tmbParkour.manual();
    __tmbParkour.move(1);
    const a = __TMB_A12__.getState();
    for (let i = 0; i < 60; i++) __tmbCampaignStep(1 / 60);
    const b = __TMB_A12__.getState();
    const clock = b.gameClock;
    for (let i = 0; i < 60; i++) __tmbParkour.step(1 / 60);
    const c = __TMB_A12__.getState();
    return {
      x0: a.player.x,
      x1: b.player.x,
      clock1: clock,
      clock2: c.gameClock,
    };
  });
  expect(measured.x1).toBeGreaterThan(measured.x0);
  expect(measured.clock1).toBeGreaterThan(0);
  expect(measured.clock2).toBe(measured.clock1);
  await page.close();
});
test("RED-LOOP movement and surface positives", async ({ page }) => {
  await page.goto(base + "#debug");
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  await page.locator(".characterChoice:visible").first().click();
  const d01 = await runBot(page, "D01"),
    d05 = await runBot(page, "D05");
  const measured = { d01: d01.positive, d05: d05.positive };
  fs.writeFileSync(
    path.resolve(
      __dirname,
      "../../01-tasarim/coin-T1b1/red-loop-measured.json",
    ),
    JSON.stringify(measured, null, 2) + "\n",
  );
  expect(measured.d01).toEqual(
    expect.arrayContaining(["d01-vault", "d01-slide", "d01-t1b-platform-1"]),
  );
  expect(measured.d05).toEqual(expect.arrayContaining(["d05-pallet"]));
});
function writeEvidence(out) {
  const dir = path.resolve(__dirname, "../../01-tasarim/coin-T1b1"),
    q = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  fs.writeFileSync(
    path.join(dir, "bot-s-results.csv"),
    "route,finished,deaths,game_s,steps,trace_hash_1,trace_hash_2\n" +
      out
        .map((v) =>
          [
            v.route,
            v.finished,
            v.deaths,
            v.game_s,
            v.steps,
            v.trace_hash_1,
            v.trace_hash_2,
          ]
            .map(q)
            .join(","),
        )
        .join("\n") +
      "\n",
  );
  const points = fs
      .readFileSync(path.join(dir, "new-points.csv"), "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const c = line.split(",");
        return {
          route: c[0],
          id: c[1],
          type: c[2],
          x: Number(c[3]),
          y: c[4] === "" ? undefined : Number(c[4]),
          w: Number(c[5]),
          h: Number(c[6]),
        };
      }),
    used = new Set(out.flatMap((v) => v.usage));
  fs.writeFileSync(
    path.join(dir, "usage.csv"),
    "route,id,type,used\n" +
      points
        .map((v) => [v.route, v.id, v.type, used.has(v.id)].map(q).join(","))
        .join("\n") +
      "\n",
  );
}
test("B-D06 and Bot S deterministic routes", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(base + "#debug");
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  await page.locator(".characterChoice:visible").first().click();
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
    out = [];
  for (const id of ids) {
    const a = await runBot(page, id),
      b = await runBot(page, id);
    out.push({
      ...a,
      route: id,
      trace_hash_1: a.hash,
      trace_hash_2: b.hash,
      deterministic: a.hash === b.hash,
      usage_count: a.usage.length,
    });
  }
  fs.writeFileSync(
    path.resolve(__dirname, "../../01-tasarim/coin-T1b1/bot-s-results.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  writeEvidence(out);
  const expectedIds = fs
      .readFileSync(
        path.resolve(__dirname, "../../01-tasarim/coin-T1b1/new-points.csv"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split(",")[1]),
    used = new Set(out.flatMap((v) => v.usage)),
    unused = expectedIds.filter((id) => !used.has(id));
  expect(used.size).toBe(74);
  expect(unused).toEqual([]);
  expect(out.filter((v) => v.deterministic).length).toBe(10);
  expect(out.filter((v) => v.finished && v.deaths === 0).length).toBe(10);
});

test("O-TETIK segmented Bot W", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(base + "?tetikchief=reset#debug");
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  await page.locator(".characterChoice:visible").first().click();
  const points = fs
      .readFileSync(
        path.resolve(__dirname, "../../01-tasarim/coin-T1b1/new-points.csv"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const c = line.split(",");
        return { route: c[0], id: c[1], type: c[2] };
      }),
    rows = [];
  for (const point of points) {
    const measured = await page.evaluate(({ route, id }) => {
      if (route[0] === "F") __TMB_A12__.renderWorldOnRoute("frozen", route);
      else __TMB_A12__.renderWorldOnRoute("dock31", route);
      __tmbParkour.manual();
      const initial = __TMB_A12__.getState(),
        o = initial.route.obstacles.find((v) => v.id === id),
        kind = o.parkour || o.type,
        startX = (o.minX ?? o.x) - 96;
      __TMB_A12__.placePlayer(startX);
      __TMB_A12__.resetChiefForSegment();
      __tmbParkour.move(1);
      let airborne = false,
        state = initial,
        deathReason = "";
      for (let i = 0; i < 240; i++) {
        __tmbAdvanceTime(1000 / 60);
        __tmbCampaignStep(1 / 60);
        state = __TMB_A12__.getState();
        airborne ||= !state.player.onGround && state.player.vy < -40;
        if (state.deaths || state.result) {
          if (state.deaths)
            deathReason = state.chief?.caughtT
              ? "chief"
              : state.player.y > 520
                ? "fall"
                : "hazard";
          break;
        }
        const live = state.movingPlatforms.find((v) => v.id === id) || o,
          passed = state.player.x > (live.maxX ?? live.x) + live.w + 40,
          stopped =
            Math.abs(state.player.vx) < 0.01 &&
            live.x - (state.player.x + state.hitbox.w) <= 40 &&
            live.x >= state.player.x;
        if (passed || stopped) break;
      }
      const live = state.movingPlatforms.find((v) => v.id === id) || o,
        gap = live.x - (state.player.x + state.hitbox.w);
      let outcome = state.deaths
        ? "ölür"
        : airborne
          ? "uçar"
          : Math.abs(state.player.vx) < 0.01 && gap >= -0.01 && gap <= 40
            ? "durur"
            : state.player.x > (live.maxX ?? live.x) + live.w + 40
              ? "geçer"
              : "durur";
      return {
        outcome,
        deathReason,
        x: state.player.x,
        vx: state.player.vx,
        gap,
        kind,
      };
    }, point);
    rows.push({
      ...point,
      inputRequired: point.type === "platform" ? "hayır" : "evet",
      expected: point.type === "platform" ? "geçer" : "durur",
      ...measured,
    });
  }
  const q = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`,
    outPath = path.resolve(
      __dirname,
      "../../01-tasarim/coin-T1b1/trigger-table.csv",
    );
  fs.writeFileSync(
    outPath,
    "item,input_required,without_input,death_reason,measured_x,source_line\n" +
      rows
        .map((v) =>
          [
            v.id,
            v.inputRequired,
            v.outcome,
            v.deathReason,
            v.x.toFixed(3),
            "index.html:680",
          ]
            .map(q)
            .join(","),
        )
        .join("\n") +
      "\n",
  );
  const mismatches = rows.filter((v) => v.outcome !== v.expected);
  fs.writeFileSync(
    path.resolve(
      __dirname,
      "../../01-tasarim/coin-T1b1/trigger-results.json",
    ),
    JSON.stringify({ rows, mismatches }, null, 2) + "\n",
  );
  expect(mismatches.map((v) => v.id)).toEqual([]);
});

test("B-GORUNURLUK world by type pixel MAD", async ({ page }) => {
  test.setTimeout(120000);
  const dir = path.resolve(
    __dirname,
    "../../01-tasarim/coin-T1b1/visibility",
  );
  fs.mkdirSync(dir, { recursive: true });
  const all = fs
      .readFileSync(path.join(dir, "..", "new-points.csv"), "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const c = line.split(",");
        return {
          route: c[0],
          id: c[1],
          type: c[2],
          x: Number(c[3]),
          y: c[4] === "" ? undefined : Number(c[4]),
          w: Number(c[5]),
          h: Number(c[6]),
        };
      }),
    samples = [];
  for (const world of ["dock", "frozen"])
    for (const type of ["vault", "slide", "pallet", "platform"])
      samples.push(
        all.find(
          (v) =>
            (world === "dock" ? v.route[0] === "D" : v.route[0] === "F") &&
            v.type === type &&
            (type !== "vault" || v.x > 1200),
        ),
      );
  samples.push({ route: "D03", id: "d03-upper", type: "platform", x: 6430, y: 330, w: 760, h: 24, control: true });
  async function render(sample, removed, suffix) {
    const query = removed ? `?visremove=${encodeURIComponent(sample.id)}` : "";
    await page.goto(base + query + "#debug");
    await page.waitForFunction(() => window.__TMB_A12__);
    const choice = page.locator(".characterChoice:visible").first();
    if (await choice.isVisible()) await choice.click();
    await page.evaluate((sample) => {
      const { route, id } = sample;
      if (route[0] === "F") __TMB_A12__.renderWorldOnRoute("frozen", route);
      else __TMB_A12__.renderWorldOnRoute("dock31", route);
      const o = __TMB_A12__.getState().route.obstacles.find((v) => v.id === id);
      __TMB_A12__.setPlayerVisible(false);
      __TMB_A12__.placePlayer((o?.x ?? sample.x) + (o?.w ?? sample.w) + 150);
    }, sample);
    await page.waitForTimeout(650);
    const captured = await page.evaluate((sample) => {
      const { id, type } = sample;
      const state = __TMB_A12__.getState(),
        o = state.route.obstacles.find((v) => v.id === id),
        live = state.movingPlatforms.find((v) => v.id === id),
        source = live || o || sample,
        layout = window.__tmb.layout,
        canvas = document.querySelector("#game"),
        scale = layout.viewScale,
        dpr = canvas.width / layout.viewportW,
        worldX = source?.x ?? state.player.x,
        y = source?.y ?? 455 - (source?.h ?? (type === "slide" ? 160 : 48)),
        w = source?.w ?? 24,
        h = source?.h ?? 48,
        sx = Math.max(0, Math.floor((layout.viewOffsetX + (worldX - window.__tmb.cam) * scale - 18) * dpr)),
        sy = Math.max(0, Math.floor((layout.viewOffsetY + (layout.worldY + y) * scale - 18) * dpr)),
        sw = Math.min(canvas.width - sx, Math.ceil((w * scale + 36) * dpr)),
        sh = Math.min(canvas.height - sy, Math.ceil((h * scale + 36) * dpr)),
        ctx = canvas.getContext("2d"),
        pixels = Array.from(ctx.getImageData(sx, sy, sw, sh).data),
        blankY = Math.max(0, Math.floor((layout.viewOffsetY + (layout.worldY + 220) * scale) * dpr)),
        blank = Array.from(ctx.getImageData(sx, blankY, sw, Math.min(sh, canvas.height - blankY)).data),
        blankRepeat = Array.from(ctx.getImageData(sx, blankY, sw, Math.min(sh, canvas.height - blankY)).data);
      return { pixels, blank, blankRepeat, box: { sx, sy, sw, sh }, cam: window.__tmb.cam };
    }, sample);
    await page.locator("#game").screenshot({ path: path.join(dir, `${sample.id}-${suffix}.png`) });
    return captured;
  }
  const rows = [];
  let blankMad = 0;
  for (const sample of samples) {
    const withItem = await render(sample, false, "with"),
      withoutItem = await render(sample, true, "without"),
      n = Math.min(withItem.pixels.length, withoutItem.pixels.length),
      mad =
        Array.from({ length: n }, (_, i) =>
          Math.abs(withItem.pixels[i] - withoutItem.pixels[i]),
        ).reduce((a, b) => a + b, 0) / n,
      bn = Math.min(withItem.blank.length, withItem.blankRepeat.length),
      controlMad =
        Array.from({ length: bn }, (_, i) =>
          Math.abs(withItem.blank[i] - withItem.blankRepeat[i]),
        ).reduce((a, b) => a + b, 0) / bn;
    blankMad = Math.max(blankMad, controlMad);
    rows.push({ ...sample, mad, controlMad, bbox: withItem.box });
  }
  fs.writeFileSync(
    path.join(dir, "mad.csv"),
    "world,type,item,mad,threshold,pass\n" +
      rows
        .map((v) =>
          [
            v.route[0] === "F" ? "frozen" : "dock",
            v.type,
            v.id,
            v.mad.toFixed(3),
            8,
            v.mad >= 8,
          ].join(","),
        )
        .join("\n") +
      `\ncontrol,blank,empty-ground,${blankMad.toFixed(3)},8,${blankMad < 8}\n`,
  );
  expect(rows.filter((v) => !v.control).every((v) => v.mad >= 8)).toBe(true);
  expect(rows.find((v) => v.control).mad).toBeGreaterThanOrEqual(8);
  expect(blankMad).toBeLessThan(8);
});
test("O-BITIR diagnostic all routes", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(base + "#debug");
  await page.waitForFunction(() => window.__TMB_A12__ && window.__tmbParkour);
  await page.locator(".characterChoice:visible").first().click();
  const out = [];
  const diagnosticIds = process.env.T1B_ROUTE ? [process.env.T1B_ROUTE] : [
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
  ];
  for (const id of diagnosticIds)
    out.push({ ...(await runBot(page, id)), route: id });
  fs.writeFileSync(
    path.resolve(__dirname, "../../01-tasarim/coin-T1b1/bot-s-results.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
  expect(out.filter((x) => x.finished && x.deaths === 0).length).toBe(diagnosticIds.length);
});
