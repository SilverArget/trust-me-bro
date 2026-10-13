const { test, expect } = require("playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profileKey = "trust_me_bro_campaign_profile_v1";
let server, origin;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://local").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end("missing");
    const type = file.endsWith(".html") ? "text/html; charset=utf-8" : file.endsWith(".js") ? "text/javascript; charset=utf-8" : "application/octet-stream";
    const body = fs.readFileSync(file);
    res.writeHead(200, { "content-type":type, "content-length":body.length });
    res.end(body);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

test("owned world resumes, final route finishes, reload reopens locked picker", async ({ page }) => {
  await page.route("**/playgama-bridge.js", route => route.fulfill({ status:200, contentType:"text/javascript", body:"/* standalone */" }));
  await page.addInitScript(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    window.__fillTextCalls = [];
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      window.__fillTextCalls.push(String(text));
      return fillText.call(this, text, ...args);
    };
    document.addEventListener("tmb:rewarded-capability", event => { event.detail.available = true; });
  });
  await page.addInitScript(({ key }) => {
    if(localStorage.getItem(key)!==null)return;
    localStorage.setItem(key, JSON.stringify({
      runnerId:"male", selectedWorldId:"dock31", ownedWorldIds:["dock31","frozen"],
      progressByRoute:Object.fromEntries([1,2,3,4,5].map(n=>[`F0${n}`,{ completed:true }]))
    }));
  }, { key:profileKey });
  await page.goto(`${origin}/index.html#debug`);
  await page.waitForFunction(() => window.__TMB_A12__ && !document.querySelector("#a12WorldSelect")?.hidden);

  await page.locator('[data-world="frozen"]').click();
  await expect.poll(() => page.evaluate(() => __TMB_A12__.getState().routeId)).toBe("F06");
  await expect.poll(() => page.evaluate(() => __TMB_A12__.profile().selectedWorldId)).toBe("frozen");

  await page.evaluate(() => __TMB_A12__.finish());
  await expect(page.locator("#a12Actions")).toBeVisible();
  await expect.poll(() => page.evaluate(() => __fillTextCalls.some(text => /^YOU FINISHED \+\d+$/.test(text)))).toBe(true);
  await expect.poll(() => page.evaluate(() => __fillTextCalls.some(text => /^F06 COMPLETE \+\d+$/.test(text)))).toBe(false);
  await expect.poll(() => page.evaluate(() => __fillTextCalls.some(text => /^EARNED \+\d+$/.test(text)))).toBe(true);
  await expect(page.locator('#a12Actions [data-act="next"]')).toBeHidden();
  await expect(page.locator('#a12Actions [data-act="worlds"]')).toBeVisible();
  await expect(page.locator('#a12Actions [data-act="shop"]')).toBeVisible();
  await expect(page.locator('#a12Actions [data-act="rewarded"]')).toContainText("WATCH AD");
  await expect(page.locator('#a12Actions [data-act="retry"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({ route:__TMB_A12__.getState().routeId, phase:document.body.dataset.campaignPhase }))).toEqual({ route:"F06", phase:"result" });

  await page.reload();
  await page.waitForFunction(() => window.__TMB_A12__ && !document.querySelector("#a12WorldSelect")?.hidden);
  await expect(page.locator('[data-world="magma"]')).toHaveAttribute("data-owned", "false");
  await page.locator('[data-world="magma"]').click();
  await expect(page.locator("#a12Shop")).toHaveClass(/show/);
  await expect.poll(() => page.evaluate(() => __TMB_A12__.profile().selectedWorldId)).toBe("frozen");
});
