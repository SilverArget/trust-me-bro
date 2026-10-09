import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '03-test/manager-preview/video-1008-tur6');
const inputs = ['matrix-915x412.jsonl', 'matrix-1280x720.jsonl'];
const rows = inputs.flatMap(file => fs.readFileSync(path.join(dir, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse));
const routeOrder = [...new Set(rows.map(row => row.route))];
const pass = row => row.finish && row.deaths === 0 && row.catches === 0 && row.collected >= row.total - 2
  && row.playerInFramePct === 100 && row.playerForwardPct >= 99 && row.chiefInFramePct >= 90 && row.chiefDistanceP90 <= 400;
const compact = row => ({
  finish: row.finish, deaths: row.deaths, catches: row.catches,
  coins: `${row.collected}/${row.total}`,
  playerInFramePct: +row.playerInFramePct.toFixed(1),
  playerForwardPct: +row.playerForwardPct.toFixed(1),
  chiefInFramePct: +row.chiefInFramePct.toFixed(1),
  chiefDistanceMedian: +row.chiefDistanceMedian.toFixed(1),
  chiefDistanceP90: +row.chiefDistanceP90.toFixed(1),
  pass: pass(row),
});
const byRoute = Object.fromEntries(routeOrder.map(route => [route, Object.fromEntries(rows.filter(row => row.route === route).map(row => [row.viewport, compact(row)]))]));
const summary = {
  generatedAt: new Date().toISOString(),
  criteria: {finish:true,deaths:0,catches:0,coins:'collected >= total - 2',playerInFramePct:100,playerForwardPct:'>=99',chiefInFramePct:'>=90',chiefDistanceP90:'<=400'},
  samples: rows.length,
  routes: routeOrder.length,
  passed: rows.filter(pass).length,
  failed: rows.filter(row => !pass(row)).length,
  maxima: {
    chiefDistanceP90: +Math.max(...rows.map(row => row.chiefDistanceP90)).toFixed(1),
    playerScreenXp99: +Math.max(...rows.map(row => row.playerScreenXp99)).toFixed(1),
  },
  minima: {
    playerInFramePct: +Math.min(...rows.map(row => row.playerInFramePct)).toFixed(1),
    playerForwardPct: +Math.min(...rows.map(row => row.playerForwardPct)).toFixed(1),
    chiefInFramePct: +Math.min(...rows.map(row => row.chiefInFramePct)).toFixed(1),
  },
  byRoute,
};
fs.writeFileSync(path.join(dir, 'route-acceptance-table.json'), JSON.stringify(summary, null, 2) + '\n');
const lines = [
  '# Tur 6 — 36 rota × 2 viewport kabul tablosu', '',
  `Örnek: ${summary.samples}; geçen: ${summary.passed}; kalan: ${summary.failed}.`, '',
  '| Rota | 915×412 | 1280×720 |', '|---|---|---|',
  ...routeOrder.map(route => {
    const show = row => `${row.pass?'PASS':'FAIL'}; ${row.coins}; oyuncu ${row.playerInFramePct}% / ileri ${row.playerForwardPct}%; şef ${row.chiefInFramePct}%; med/p90 ${row.chiefDistanceMedian}/${row.chiefDistanceP90}px; ölüm/yakalama ${row.deaths}/${row.catches}`;
    return `| ${route} | ${show(byRoute[route]['915x412'])} | ${show(byRoute[route]['1280x720'])} |`;
  }), '',
];
fs.writeFileSync(path.join(dir, 'route-acceptance-table.md'), lines.join('\n'));
console.log(`TUR6-SUMMARY | routes=${summary.routes} samples=${summary.samples} passed=${summary.passed} failed=${summary.failed} maxP90=${summary.maxima.chiefDistanceP90} minChief=${summary.minima.chiefInFramePct}`);
if (summary.routes !== 36 || summary.samples !== 72 || summary.failed) process.exitCode = 1;
