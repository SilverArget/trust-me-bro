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
test("C2 visibility all 41 additions MAD", async ({ page }) => {
  test.setTimeout(300000);
  const dir = path.resolve(
    __dirname,
    `../../01-tasarim/coin-T2/visibility-c2${process.env.C2_VIS_ID?'-fix':''}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  await page.goto(base + "#debug");await page.waitForFunction(()=>window.__TMB_A12__);
  const samples=await page.evaluate(()=>{const rows=[];for(const id of ['D01','D02','D03','D04','D05','D06','F01','F02','F03','F04']){__TMB_A12__.renderWorldOnRoute(id[0]==='F'?'frozen':'dock31',id);for(const o of __TMB_A12__.getState().route.obstacles)if(o.id.includes('-t2c-'))rows.push({...o,route:id,type:o.parkour||o.type});}return rows;});
  expect(samples.length).toBe(41);
  if(process.env.C2_VIS_ID){const chosen=samples.find(o=>o.id===process.env.C2_VIS_ID);expect(chosen).toBeTruthy();samples.splice(0,samples.length,chosen);}
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
    fs.writeFileSync(path.join(dir,"partial.json"),JSON.stringify(rows,null,2));
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
