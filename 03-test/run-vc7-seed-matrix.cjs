const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cli = 'C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js';
const outDir = path.join(__dirname, 'vc7-tur2', 'seed-runs');
fs.mkdirSync(outDir, { recursive: true });
const rows = [];
for (const seed of [1, 2, 3, 4]) {
  for (let run = 1; run <= 3; run++) {
    const env = { ...process.env, NODE_PATH: 'C:/Users/Arget/AppData/Roaming/npm/node_modules', VC7_RANDOM_SEED: String(seed), VC7_FLAKE_DIAG: '1' };
    const p = spawnSync(process.execPath, [cli, 'test', '03-test/vc7-tur1.spec.cjs', '--workers=1', '-g', 'canvas PNG evidence'], { cwd: root, env, encoding: 'utf8', timeout: 180000 });
    const text = `${p.stdout || ''}\n${p.stderr || ''}`;
    const m = [...text.matchAll(/VC7_TUR1B_PNG (\{.*\})/g)].at(-1);
    let measurement = null;
    if (m) measurement = JSON.parse(m[1]);
    const portrait = measurement?.['9x16'];
    const row = { seed, run, exitCode: p.status, ratio: portrait?.spikeChangedRatio ?? null, orange: portrait?.telegraphOrangePixels ?? null, mode: (portrait?.telegraphOrangePixels ?? 0) >= 150 ? 'GOOD' : 'BAD', randomCalls: portrait?.randomTrace?.length ?? null };
    rows.push(row);
    fs.writeFileSync(path.join(outDir, `seed-${seed}-run-${run}.log`), text);
    process.stdout.write(JSON.stringify(row) + '\n');
  }
}
fs.writeFileSync(path.join(__dirname, 'vc7-tur2', 'seed-matrix.json'), JSON.stringify(rows, null, 2));
