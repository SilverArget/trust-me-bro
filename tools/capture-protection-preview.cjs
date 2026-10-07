const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const outDir = process.env.TMB_PROTECTION_OUT || path.join(root, "03-test", "manager-preview", "koruma");
const publicOutDir = "E:/oyunlar/TrustMeBro/02-kod/03-test/manager-preview/koruma";

function contentType(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".mp3")) return "audio/mpeg";
  if (file.endsWith(".mp4")) return "video/mp4";
  if (file.endsWith(".json") || file.endsWith(".webmanifest")) return "application/json";
  return "application/octet-stream";
}

function serverFor(baseDir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    const file = path.join(baseDir, rel);
    fs.readFile(file, (err, body) => {
      if (err) {
        res.statusCode = 404;
        res.end("missing");
        return;
      }
      res.setHeader("Content-Type", contentType(rel));
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function snippet(text, needle, radius = 520) {
  const at = text.indexOf(needle);
  const start = Math.max(0, (at < 0 ? 0 : at) - radius);
  return text.slice(start, start + radius * 2).replace(/[<>&]/g, ch => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]));
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serverFor(root);
  const browser = await chromium.launch();
  try {
    const port = server.address().port;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://localhost:${port}/index.html#debug`);
    await page.waitForSelector("#game", { timeout: 10000 });
    await page.screenshot({ path: path.join(outDir, "izinli-host.png"), fullPage: true });

    const blocked = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await blocked.goto(`http://bad.localhost:${port}/index.html`, { waitUntil: "commit", timeout: 10000 }).catch(() => {});
    await blocked.getByText(/resmi sitelerde oynanabilir\./).waitFor({ timeout: 10000 });
    await blocked.screenshot({ path: path.join(outDir, "izinsiz-host.png"), fullPage: true });

    const src = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const min = fs.readFileSync(path.join(dist, "index.html"), "utf8");
    const compare = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await compare.setContent(`<!doctype html><style>
      body{margin:0;background:#101820;color:#eaf6ff;font:14px Consolas,monospace}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:18px}
      h1{font:700 18px system-ui;margin:0 0 10px}
      pre{height:650px;overflow:hidden;white-space:pre-wrap;background:#071018;border:1px solid #2d4458;border-radius:8px;padding:14px}
    </style><div class="grid"><section><h1>Kaynak index.html</h1><pre>${snippet(src, "TMB_ALLOWED_HOSTS")}</pre></section><section><h1>dist/index.html minify+mangle</h1><pre>${snippet(min, "TMB_ALLOWED_HOSTS")}</pre></section></div>`);
    await compare.screenshot({ path: path.join(outDir, "karistirilmis-kod.png"), fullPage: true });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (path.resolve(outDir).toLowerCase() !== path.resolve(publicOutDir).toLowerCase()) {
    fs.mkdirSync(publicOutDir, { recursive: true });
    for (const name of ["izinli-host.png", "izinsiz-host.png", "karistirilmis-kod.png"]) {
      fs.copyFileSync(path.join(outDir, name), path.join(publicOutDir, name));
    }
  }
  console.log(outDir);
})();
