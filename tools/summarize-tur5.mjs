import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "03-test", "manager-preview", "video-1008-tur5");
const viewports = ["915x412", "1280x720"];
const routeIds = [
  ...Array.from({length:18},(_,i)=>`D${String(i+1).padStart(2,"0")}`),
  ...["F","M","A"].flatMap(prefix=>Array.from({length:6},(_,i)=>`${prefix}${String(i+1).padStart(2,"0")}`))
];

const latest = new Map();
for (const viewport of viewports) {
  const file = path.join(evidence, `final-matrix-${viewport.split("x")[0]}.jsonl`);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean)) {
    const row = JSON.parse(line);
    latest.set(`${row.route}|${row.viewport}`, row);
  }
}

const round = value => Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
const rows = [];
for (const route of routeIds) for (const viewport of viewports) {
  const raw = latest.get(`${route}|${viewport}`) || null;
  rows.push(raw ? {
    route, viewport, finish:!!raw.finish, deaths:raw.deaths, catches:raw.catches,
    collected:raw.collected, total:raw.total,
    playerInFramePct:round(raw.playerInFramePct), chiefInFramePct:round(raw.chiefInFramePct),
    chiefDistanceMedianPx:round(raw.chiefDistanceMedian),
    pass:!!raw.finish && raw.deaths===0 && raw.catches===0 && raw.collected>=raw.total-2 &&
      raw.playerInFramePct===100 && raw.chiefInFramePct>=90 && raw.chiefDistanceMedian<=300
  } : {route,viewport,missing:true,pass:false});
}
const routeReport = {
  generatedAt:new Date().toISOString(),
  criteria:{finish:true,deaths:0,catches:0,collected:"total - 2 or better",playerInFramePct:100,chiefInFramePct:">= 90",chiefDistanceMedianPx:"<= 300"},
  routes:routeIds.length, samples:rows.length, passed:rows.filter(row=>row.pass).length,
  missing:rows.filter(row=>row.missing).map(row=>`${row.route}/${row.viewport}`), rows
};
fs.writeFileSync(path.join(evidence,"route-acceptance-table.json"),JSON.stringify(routeReport,null,2)+"\n","utf8");
const routeMd = [
  "# Tur 5 route acceptance",
  "",
  `Result: ${routeReport.passed}/${routeReport.samples} viewport-route samples pass; missing ${routeReport.missing.length}.`,
  "",
  "| Route | Viewport | Finish | Death | Catch | Coins | Player in frame | Chief in frame | Median distance | Pass |",
  "|---|---:|:---:|---:|---:|---:|---:|---:|---:|:---:|",
  ...rows.map(row=>row.missing
    ? `| ${row.route} | ${row.viewport} | — | — | — | — | — | — | — | NO DATA |`
    : `| ${row.route} | ${row.viewport} | ${row.finish?"yes":"no"} | ${row.deaths} | ${row.catches} | ${row.collected}/${row.total} | ${row.playerInFramePct}% | ${row.chiefInFramePct}% | ${row.chiefDistanceMedianPx}px | ${row.pass?"PASS":"FAIL"} |`),
  ""
].join("\n");
fs.writeFileSync(path.join(evidence,"route-acceptance-table.md"),routeMd,"utf8");

const audit = JSON.parse(fs.readFileSync(path.join(evidence,"coin-solid-audit.json"),"utf8"));
const coinRows = routeIds.map(route=>{
  const a = audit.routes.find(row=>row.id===route);
  const runs = viewports.map(viewport=>latest.get(`${route}|${viewport}`)).filter(Boolean);
  return {
    route,total:a?.total??null,
    collected915:latest.get(`${route}|915x412`)?.collected??null,
    collected1280:latest.get(`${route}|1280x720`)?.collected??null,
    verifiedCollectableMax:runs.length?Math.max(...runs.map(row=>row.collected)):null,
    solidInside:a?.solidInside??null,
    pass:runs.length===2 && runs.every(row=>row.collected>=row.total-2) && a?.solidInside===0
  };
});
const coinReport={generatedAt:new Date().toISOString(),routes:coinRows.length,passed:coinRows.filter(row=>row.pass).length,rows:coinRows};
fs.writeFileSync(path.join(evidence,"coin-acceptance-table.json"),JSON.stringify(coinReport,null,2)+"\n","utf8");
const coinMd=[
  "# Tur 5 coin acceptance",
  "",
  `Result: ${coinReport.passed}/${coinReport.routes} routes pass in both viewports with zero solid intersections.`,
  "",
  "| Route | Total | Collected 915 | Collected 1280 | Verified collectable | Inside solid | Pass |",
  "|---|---:|---:|---:|---:|---:|:---:|",
  ...coinRows.map(row=>`| ${row.route} | ${row.total??"—"} | ${row.collected915??"—"} | ${row.collected1280??"—"} | ${row.verifiedCollectableMax??"—"} | ${row.solidInside??"—"} | ${row.pass?"PASS":"FAIL"} |`),
  ""
].join("\n");
fs.writeFileSync(path.join(evidence,"coin-acceptance-table.md"),coinMd,"utf8");

console.log(JSON.stringify({routeSamples:`${routeReport.passed}/${routeReport.samples}`,coinRoutes:`${coinReport.passed}/${coinReport.routes}`,missing:routeReport.missing},null,2));
