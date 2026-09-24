"use strict";
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs"), http = require("node:http"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const sources = {
  before: execFileSync("git", ["show", "88287f7:index.html"], { cwd: root, encoding: "utf8" }),
  after: fs.readFileSync(path.join(root, "index.html"), "utf8"),
};
async function dump(html) {
  const lines = html.split(/\r?\n/), geoIndex = lines.findIndex(x => x.includes("if(location.hash==='#geodumpall')"));
  if (geoIndex < 0) throw new Error("geodumpall source hook missing");
  const geoLine = lines.splice(geoIndex, 1)[0], geoBody = geoLine.slice(geoLine.indexOf("{") + 1, geoLine.lastIndexOf("}"));
  html = lines.join("\n").replace(/\}\)\(\);\s*<\/script>/, `if(location.hash==='#geodumpall')setTimeout(()=>{${geoBody}},0);\n})();\n</script>`);
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "index.html";
    if (rel === "index.html") return res.end(html);
    fs.readFile(path.join(root, rel), (e, b) => { if (e) { res.statusCode = 404; return res.end("missing"); } res.end(b); });
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let line = null;
  page.on("console", m => { if (m.text().startsWith("GEODUMPALL|")) line = m.text(); });
  page.on("pageerror", e => console.error("GEODUMP pageerror", e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#geodumpall`);
  for (let i = 0; i < 40 && !line; i++) await page.waitForTimeout(50);
  await browser.close();
  await new Promise(r => server.close(r));
  if (!line) throw new Error("GEODUMPALL console line missing");
  return line.slice("GEODUMPALL|".length).split("|");
}
(async () => {
  const before = await dump(sources.before), after = await dump(sources.after);
  const changed = before.map((row, i) => ({ index: i, before: row, after: after[i] })).filter(x => x.before !== x.after);
  const result = { baseline: "88287f7:index.html", rows_before: before.length, rows_after: after.length, diff_count: changed.length, changed };
  fs.writeFileSync(path.join(__dirname, "vc7-tur2", "geodumpall-diff.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  if (before.length !== 186 || after.length !== 186 || changed.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
