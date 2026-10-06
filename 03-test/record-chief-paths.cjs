const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ids = process.argv.slice(2);
if (!ids.length || ids.some(id => !/^(?:D(?:0[1-9]|1[0-8])|F0[1-6])$/.test(id))) {
  throw new Error('usage: node 03-test/record-chief-paths.cjs <D01...D18|F01...F06>');
}
const nodePath = process.env.NODE_PATH || 'C:/Users/Arget/AppData/Roaming/npm/node_modules';
const pattern = `O-1 B-5 (?:${ids.join('|')}) ideal keyboard route`;
const cli = path.join(path.dirname(require.resolve('playwright/package.json')), require('playwright/package.json').bin.playwright);
cp.execFileSync(process.execPath, [cli, 'test', '03-test/vp-dock-play.spec.cjs', '--workers=1', '--reporter=line', '-g', pattern], {
  cwd: root, stdio: 'inherit', env: {...process.env, NODE_PATH: nodePath, TMB_RECORD_CHIEF: '1'}
});
const productPath = path.join(root, 'js/chief-paths.js');
const context = {window:{}};
if (fs.existsSync(productPath)) vm.runInNewContext(fs.readFileSync(productPath, 'utf8'), context);
const out = context.window.TMB_CHIEF_PATHS || {};
for (const id of ids) {
  const file = path.join(__dirname, `.chief-record-${id}.json`);
  if (fs.existsSync(file)) {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    const stuns = record.samples.filter(sample => sample[3] === 'stun');
    if (stuns.length) {
      const ranges=[];
      for(const sample of stuns){const last=ranges.at(-1);if(last&&sample[0]-last[1]<=.051)last[1]=sample[0];else ranges.push([sample[0],sample[0]])}
      console.log(`STUN-INFO ${id}: ${ranges.map(([a,b])=>`${a.toFixed(3)}-${b.toFixed(3)}s`).join(', ')}`);
    }
    if (id === 'D09') record.delay = 2.5;
    out[id] = record;
  }
}
fs.writeFileSync(productPath, `window.TMB_CHIEF_PATHS = ${JSON.stringify(out)};\n`, 'utf8');
for (const id of ids) fs.rmSync(path.join(__dirname, `.chief-record-${id}.json`), {force:true});
console.log(`wrote ${Object.keys(out).length} routes to js/chief-paths.js`);
