const { test, expect } = require("playwright/test"),
  fs = require("fs"),
  http = require("http"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  evidence =
    "E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02/turc/c1a2",
  N1 = process.env.TMB_C1A2_N1 === "1",
  N2 = process.env.TMB_C1A2_N2 === "1";
let server, base;
test.beforeAll(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  server = http.createServer((q, r) => {
    const f =
      decodeURIComponent(new URL(q.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    fs.readFile(path.join(root, f), (e, b) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader(
        "Content-Type",
        f.endsWith(".js")
          ? "text/javascript"
          : f.endsWith(".html")
            ? "text/html"
            : "application/octet-stream",
      );
      r.end(b);
    });
  });
  await new Promise((x) => server.listen(0, "127.0.0.1", x));
  base = `http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(() => new Promise((x) => server.close(x)));
async function boot(p) {
  await p.goto(base + "#debug");
  await p.waitForFunction(() => window.__TMB_A12__);
  const c = p.locator(".characterChoice:visible").first();
  if (await c.count()) await c.click();
  await p.evaluate(() => {
    __TMB_A12__.renderWorldOnRoute("dock31", "D01");
    __TMB_A12__.startRoute("D01");
  });
  await p.waitForFunction(() => {
    const s = __TMB_A12__.getState();
    return (
      s.route?.id === "D01" ||
      s.routeId === "D01" ||
      s.route?.catchableSurfaces?.length >= 3
    );
  });
  await p.waitForTimeout(1100);
}
async function recorder(p) {
  await p.evaluate((gap) => {
    const R = (window.__rec = {
      a: [],
      proof: {},
      run: 1,
      had: 0,
      end: null,
      skip: 0,
      injected: 0,
    });
    function pix() {
      const c = document.querySelector("#game"),
        d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let h = 5381,
        n = 0,
        s = 0,
        q = 0;
      for (let i = 0; i < d.length; i += 4) {
        h = ((h * 33) ^ d[i] ^ d[i + 1] ^ d[i + 2] ^ d[i + 3]) >>> 0;
        for (let k = 0; k < 3; k++) {
          n++;
          s += d[i + k];
          q += d[i + k] ** 2;
        }
      }
      return {
        hash: h.toString(16),
        std: Math.sqrt(q / n - (s / n) ** 2),
        url: c.toDataURL(),
      };
    }
    function f() {
      if (!R.run) return;
      const s = __TMB_A12__.getState();
      const injecting = gap && !R.injected && s.edgeClimb?.phase === "catch";
      if (injecting) {
        R.injected = 1;
        R.skip = s.gameClock + 0.3;
      }
      if (!injecting && s.gameClock < R.skip) return requestAnimationFrame(f);
      const x = {
        gameClock: s.gameClock,
        parkour: s.parkour.state,
        edgeClimb: s.edgeClimb ? { ...s.edgeClimb } : null,
        player: { ...s.player, w: s.hitbox.w, h: s.hitbox.h },
        jump: !!s.input?.jump,
        pose: s.pose,
      };
      R.a.push(x);
      if (s.edgeClimb) R.had = 1;
      for (const [k, v] of Object.entries(R.proof))
        if (!v.next && R.a.length - 1 > v.i) v.next = pix();
      if (s.edgeClimb?.phase === "catch" && !R.proof.catch)
        R.proof.catch = {
          i: R.a.length - 1,
          state: s.parkour.state,
          pixel: pix(),
        };
      if (
        s.edgeClimb &&
        s.edgeClimb.elapsed >= 0.45 * s.edgeClimb.duration &&
        !R.proof.mid
      )
        R.proof.mid = {
          i: R.a.length - 1,
          state: s.parkour.state,
          pixel: pix(),
        };
      if (!s.edgeClimb && R.had && R.end === null) {
        R.end = s.gameClock;
        R.proof.end = {
          i: R.a.length - 1,
          state: s.parkour.state,
          pixel: pix(),
        };
      }
      requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }, N1);
}
async function touch(p, dir, hold) {
  const j = p.locator("#joystick"),
    b = p.locator("#jumpWrap button[data-k=jump]");
  await expect(j).toBeVisible();
  await expect(b).toBeVisible();
  const [x, y] = await Promise.all([j.boundingBox(), b.boundingBox()]);
  expect(x.width).toBeGreaterThan(0);
  expect(y.width).toBeGreaterThan(0);
  const c = await p.context().newCDPSession(p),
    a = {
      x: x.x + x.width / 2,
      y: x.y + x.height / 2,
      id: 1,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    },
    m = { ...a, x: a.x + dir * 0.45 * x.width },
    z = {
      x: y.x + y.width / 2,
      y: y.y + y.height / 2,
      id: 2,
      radiusX: 2,
      radiusY: 2,
      force: 1,
    };
  await c.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [a],
  });
  await c.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [m],
  });
  const jc = await p.evaluate(() => __TMB_A12__.getState().gameClock);
  await c.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [z],
  });
  const q = await p.evaluate(() => {
    const s = __TMB_A12__.getState();
    return { zc: s.gameClock, jumpSeen: !!s.input?.jump };
  });
  if (!hold) {
    await p.waitForTimeout(80);
    await c.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [m],
    });
  }
  return {
    jc,
    ...q,
    release: () =>
      c.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [m],
      }),
    close: async () => {
      await c.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await c.detach();
    },
  };
}
async function alpha(p, pose) {
  return p.evaluate(async (o) => {
    const s = __TMB_A12__.getState(),
      r = s.runnerId || "male",
      out =
        JSON.parse(
          localStorage.getItem("trust_me_bro_last_delivery_v2_save") || "{}",
        )?.v36?.equippedOutfitByRunner?.[r] || "default",
      ct = await fetch("sprites/a5/atlas-contract.json").then((x) => x.json()),
      im = new Image();
    im.src = `sprites/a5/${r}-${out}-full.png`;
    await im.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.drawImage(
      im,
      o.frame * 64,
      ct.motions[o.motion].row * 64,
      64,
      64,
      0,
      0,
      64,
      64,
    );
    const d = g.getImageData(0, 0, 64, 64).data;
    let a = 64,
      b = -1;
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++)
        if (d[(y * 64 + x) * 4 + 3]) {
          a = Math.min(a, x);
          b = Math.max(b, x);
        }
    return { min: a - 32, max: b - 32 };
  }, pose);
}
const B = (ok, pass, why, val) =>
  ok
    ? { status: pass ? "PASS" : "FAIL", value: val }
    : { status: "OLCULEMEDI", reason: why, value: val };
async function run(browser, si, kind, hold) {
  const ist = kind === "touch",
    ctx = await browser.newContext(
      ist && !N2
        ? {
            viewport: { width: 844, height: 390 },
            hasTouch: true,
            isMobile: true,
            deviceScaleFactor: 1,
          }
        : { viewport: { width: 1280, height: 720 } },
    ),
    p = await ctx.newPage();
  try {
    await boot(p);
    const route = await p.evaluate(() => __TMB_A12__.routeDefinition("D01")),
      surface = route.catchableSurfaces[si],
      target = route.groundSegments.find((x) => x.id === surface.id),
      dir = surface.dir || 1;
    await p.evaluate(
      ({ route, target, dir }) => {
        const s = __TMB_A12__.getState(),
          cx = target.x + (dir < 0 ? target.w + 105 : -105),
          g = route.groundSegments.find((v) => cx >= v.x && cx <= v.x + v.w);
        __TMB_A12__.placePlayer(cx - s.hitbox.w / 2, g.y - s.hitbox.h);
      },
      { route, target, dir },
    );
    await recorder(p);
    let ctl,
      key = dir < 0 ? "ArrowLeft" : "ArrowRight";
    if (!ist) {
      await p.keyboard.down(key);
      await p.keyboard.down("ArrowUp");
      if (!hold) {
        await p.waitForTimeout(80);
        await p.keyboard.up("ArrowUp");
      }
    } else if (!N2) ctl = await touch(p, dir, hold);
    let released = 0,
      t = Date.now();
    while (Date.now() - t < 12000) {
      const r = await p.evaluate(() => ({
        end: __rec.end,
        clock: __TMB_A12__.getState().gameClock,
      }));
      if (r.end !== null) {
        if (hold && !released && r.clock - r.end >= 0.3) {
          if (ctl) await ctl.release();
          else await p.keyboard.up("ArrowUp");
          released = 1;
        }
        if (r.clock - r.end >= 0.6) break;
      }
      await p.waitForTimeout(10);
    }
    await p.keyboard.up(key);
    await p.keyboard.up("ArrowUp");
    if (ctl) await ctl.close();
    const R = await p.evaluate(() => {
        __rec.run = 0;
        return __rec;
      }),
      a = R.a,
      active = a.filter((x) => x.edgeClimb),
      caught = active.find((x) => x.edgeClimb.phase === "catch") || active[0],
      wid = caught?.edgeClimb.wallId,
      wall = route.groundSegments.find((x) => x.id === wid);
    const ch = !ist
      ? { status: "PASS", vx: true, jump: true }
      : N2
        ? { status: "KANAL KURULAMADI", vx: false, jump: false }
        : {
            status: "PASS",
            vx: a.some(
              (x) =>
                x.gameClock >= ctl.jc &&
                x.gameClock - ctl.jc <= 0.3 &&
                x.player.vx * dir > 0,
            ),
          jump: ctl.jumpSeen || a.some((x) => x.gameClock >= ctl.zc && x.jump),
          };
    if (!ch.vx || !ch.jump) ch.status = "KANAL KURULAMADI";
    const cc = R.proof.catch ? a[R.proof.catch.i].gameClock : null,
      ec = R.end,
      w =
        cc === null || ec === null
          ? []
          : a.filter((x) => x.gameClock >= cc - 0.1 && x.gameClock <= ec + 0.6);
    let gap = 0;
    for (let i = 1; i < w.length; i++)
      gap = Math.max(gap, w[i].gameClock - w[i - 1].gameClock);
    const why =
        ch.status !== "PASS"
          ? "kanal kurulamadi"
          : !active.length
            ? "tirmanis baslamadi"
            : ec === null
              ? "bitmedi"
              : gap > 0.05
                ? "ornekleme boslugu"
                : null,
      bad = active.filter(
        (x) =>
          x.pose?.motion !== "wallRun" ||
          x.pose.frame !==
            Math.floor(
              Math.min(0.999, x.edgeClimb.elapsed / x.edgeClimb.duration) * 8,
            ),
      );
    let pen = 0;
    if (wall)
      for (const x of active) {
        const b = await alpha(p, x.pose),
          c = x.player.x + x.player.w / 2,
          f = x.player.vx < 0 ? -1 : 1,
          l = c + (f < 0 ? -b.max : b.min),
          r = c + (f < 0 ? -b.min : b.max);
        pen = Math.max(pen, dir > 0 ? r - wall.x : wall.x + wall.w - l);
      }
    const after =
        ec === null
          ? []
          : a.filter((x) => x.gameClock >= ec && x.gameClock - ec <= 0.6),
      feet = after.length
        ? Math.min(...after.map((x) => x.player.y + x.player.h))
        : null,
      floor = caught ? caught.edgeClimb.wallTop - 8 : null,
      proof = Object.values(R.proof),
      t4 =
        proof.length === 3 &&
        proof.every(
          (x) =>
            x.state &&
            x.pixel.std > 0 &&
            x.next &&
            x.pixel.hash !== x.next.hash,
        );
    const out = {
      surface: surface.id,
      caughtWall: wid || null,
      variant: `${kind}-${hold ? "hold" : "tap"}`,
      channel: ch,
      T1: B(!why, bad.length === 0, why, `bad=${bad.length}/${active.length}`),
      T2: B(
        !why && wall,
        pen <= 4,
        why || "yakalanan duvar yok",
        `maxPen=${pen.toFixed(3)}`,
      ),
      T3: B(
        !why && feet !== null,
        feet >= floor,
        why,
        `minFeet=${feet?.toFixed(3) ?? "null"} floor=${floor?.toFixed(3) ?? "null"}`,
      ),
      T4: B(!why, t4, why, `proof=${proof.length}/3`),
      maxGap: +gap.toFixed(4),
      trace: a,
    };
    for (const [n, x] of Object.entries(R.proof)) {
      if (x.pixel?.url) {
        fs.writeFileSync(
          path.join(
            evidence,
            `${si + 1}-${kind}-${hold ? "hold" : "tap"}-${n}.png`,
          ),
          Buffer.from(x.pixel.url.split(",")[1], "base64"),
        );
        delete x.pixel.url;
      }
      if (x.next?.url) delete x.next.url;
    }
    return out;
  } finally {
    await ctx.close();
  }
}
test("D01 first three catchable surfaces x four input variants", async ({
  browser,
}) => {
  test.setTimeout(295000);
  const all = [];
  for (let s = 0; s < 3; s++)
    for (const [k, h] of [
      ["keyboard", 0],
      ["keyboard", 1],
      ["touch", 0],
      ["touch", 1],
    ]) {
      const r = await run(browser, s, k, !!h);
      all.push(r);
      fs.writeFileSync(
        path.join(evidence, `${s + 1}-${k}-${h ? "hold" : "tap"}.json`),
        JSON.stringify(r, null, 2),
      );
      console.log("TURC", JSON.stringify({ ...r, trace: undefined }));
      for (const q of ["T1", "T2", "T3", "T4"])
        if (r[q].status === "FAIL")
          expect
            .soft(false, `${r.surface} ${r.variant} ${q} ${r[q].value}`)
            .toBeTruthy();
    }
  for (const k of ["keyboard", "touch"])
    expect
      .soft(
        all.some(
          (r) => r.variant.startsWith(k) && r.T3.status !== "OLCULEMEDI",
        ),
        `T3 ${k} hic olculmedi`,
      )
      .toBeTruthy();
  fs.writeFileSync(
    path.join(evidence, "summary.json"),
    JSON.stringify(
      all.map((r) => ({ ...r, trace: undefined })),
      null,
      2,
    ),
  );
});
