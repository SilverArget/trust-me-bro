const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ids = process.argv.slice(2);
if (!ids.length || ids.some(id => !/^D(?:0[1-9]|1[0-8])$/.test(id))) {
  throw new Error('usage: node 03-test/record-chief-paths.cjs <D01...D18>');
}
const nodePath = process.env.NODE_PATH || 'C:/Users/Arget/AppData/Roaming/npm/node_modules';
const pattern = `O-1 B-5 (?:${ids.join('|')}) ideal keyboard route`;
const cli = path.join(path.dirname(require.resolve('playwright/package.json')), require('playwright/package.json').bin.playwright);
cp.execFileSync(process.execPath, [cli, 'test', '03-test/vp-dock-play.spec.cjs', '--workers=1', '--reporter=line', '-g', pattern], {
  cwd: root, stdio: 'inherit', env: {...process.env, NODE_PATH: nodePath, TMB_RECORD_CHIEF: '1'}
});
const out = {};
for (let n = 1; n <= 18; n++) {
  const id = `D${String(n).padStart(2, '0')}`;
  const file = path.join(__dirname, `.chief-record-${id}.json`);
  if (fs.existsSync(file)) out[id] = JSON.parse(fs.readFileSync(file, 'utf8'));
}
fs.writeFileSync(path.join(root, 'js/chief-paths.js'), `window.TMB_CHIEF_PATHS = ${JSON.stringify(out)};\n`, 'utf8');
for (const id of ids) fs.rmSync(path.join(__dirname, `.chief-record-${id}.json`), {force:true});
console.log(`wrote ${Object.keys(out).length} routes to js/chief-paths.js`);
