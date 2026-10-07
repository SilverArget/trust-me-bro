const { spawnSync } = require('child_process');

const env = {
  ...process.env,
  NODE_PATH: process.env.NODE_PATH || 'C:\\Users\\Arget\\AppData\\Roaming\\npm\\node_modules',
  TMB_RAF_HZ: '144',
  TMB_ROUTE_IDS: 'D01,D02,D03,D04,D05,D06,D07'
};

const result = spawnSync('cmd.exe', ['/c', 'npx.cmd',
  'playwright',
  'test',
  '03-test/vp-dock-play.spec.cjs',
  '-g',
  'O-1 B-5',
  '--workers=1',
  '--reporter=line'
], { stdio: 'inherit', shell: false, env });

process.exit(result.status ?? 1);
