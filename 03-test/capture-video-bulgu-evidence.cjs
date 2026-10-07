const fs = require('fs');
const http = require('http');
const path = require('path');
const cp = require('child_process');
const { chromium } = require('playwright');

const beforeRoot = path.resolve(process.argv[2]);
const afterRoot = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const out = path.resolve(process.argv[4] || path.join(__dirname, 'manager-preview', 'video-bulgu'));

const shots = [
  { name: 'd09-cukur', route: 'D09', x: 3600 },
  { name: 'd18-vault-basamak', route: 'D18', x: 1650 },
  { name: 'd18-inis-yayi', route: 'D18', x: 3500 },
  { name: 'd03-asili', route: 'D03', supportId: 'd03-v-13' },
  { name: 'd04-asili', route: 'D04', supportId: 'd04-v-03' },
  { name: 'd05-asili', route: 'D05', supportId: 'd05-v-08' },
  { name: 'd08-asili', route: 'D08', supportId: 'd08-v-31' },
  { name: 'd11-asili', route: 'D11', supportId: 'd11-v-28' },
];

function serve(rootDir) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(rootDir, rel), (error, body) => {
      if (error) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', rel.endsWith('.js') ? 'text/javascript' : rel.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(body);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function capture(rootLabel, base, shot) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${base}#debug`);
    await page.waitForFunction(() => window.__TMB_A12__);
    const choice = page.locator('.characterChoice:visible').first();
    if (await choice.count()) await choice.click();
    const state = await page.evaluate(shot => {
      const api = __TMB_A12__;
      api.renderWorldOnRoute('dock31', shot.route);
      api.startRoute(shot.route);
      api.disableChief();
      const route = api.routeDefinition(shot.route);
      let x = shot.x;
      if (shot.supportId) {
        const g = (route.groundSegments || []).find(v => v.id === shot.supportId);
        if (g) x = g.x + g.w / 2;
      }
      const supports = (route.groundSegments || []).filter(g => x >= g.x && x <= g.x + g.w);
      const y = supports.length ? Math.min(...supports.map(g => g.y)) : 455;
      const h = api.getState().hitbox.h;
      api.placePlayer(x, y - h);
      for (let i = 0; i < 45; i++) __tmbCampaignStep(1 / 60);
      __tmbCampaignDraw();
      const s = api.getState();
      return { route: shot.route, x, y, player: s.player, cameraWorldY: s.cameraWorldY };
    }, shot);
    const file = path.join(out, `${shot.name}-${rootLabel}.png`);
    await page.screenshot({ path: file });
    return { file, state };
  } finally {
    await page.close();
    await browser.close();
  }
}

function joinPng(left, right, outFile) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$left=[System.Drawing.Image]::FromFile('${left.replace(/'/g, "''")}')
$right=[System.Drawing.Image]::FromFile('${right.replace(/'/g, "''")}')
$bmp=New-Object System.Drawing.Bitmap 2560,720
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($left,0,0,1280,720)
$g.DrawImage($right,1280,0,1280,720)
$font=[System.Drawing.Font]::new('Arial',[single]24,[System.Drawing.FontStyle]::Bold)
$brush=New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230,255,255,255))
$shadow=New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180,0,0,0))
$g.DrawString('BEFORE 5bdb306',$font,$shadow,22,22)
$g.DrawString('BEFORE 5bdb306',$font,$brush,20,20)
$g.DrawString('AFTER HEAD',$font,$shadow,1302,22)
$g.DrawString('AFTER HEAD',$font,$brush,1300,20)
$bmp.Save('${outFile.replace(/'/g, "''")}',[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$bmp.Dispose();$left.Dispose();$right.Dispose()
`;
  cp.execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const beforeServer = await serve(beforeRoot);
  const afterServer = await serve(afterRoot);
  const beforeBase = `http://127.0.0.1:${beforeServer.address().port}/index.html`;
  const afterBase = `http://127.0.0.1:${afterServer.address().port}/index.html`;
  const results = [];
  try {
    for (const shot of shots) {
      const before = await capture('before', beforeBase, shot);
      const after = await capture('after', afterBase, shot);
      const joined = path.join(out, `${shot.name}-yanyana.png`);
      joinPng(before.file, after.file, joined);
      results.push({ ...shot, before: before.state, after: after.state, file: joined });
      console.log(`${shot.name} ${joined}`);
    }
  } finally {
    await new Promise(resolve => beforeServer.close(resolve));
    await new Promise(resolve => afterServer.close(resolve));
  }
  fs.writeFileSync(path.join(out, 'evidence-shots.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
})();
