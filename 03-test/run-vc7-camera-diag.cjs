"use strict";
const { spawnSync } = require("node:child_process");
for (let run = 1; run <= 12; run++) {
  const result = spawnSync(
    process.execPath,
    ["C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js", "test", "03-test/vc7-tur1.spec.cjs", "-g", "canvas PNG evidence", "--workers=1"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_PATH: "C:/Users/Arget/AppData/Roaming/npm/node_modules",
        VC7_FLAKE_DIAG: "1",
      },
      encoding: "utf8",
      timeout: 120000,
    },
  );
  const match = (result.stdout || "").match(/VC7_TUR1B_PNG .*$/m);
  console.log(`run=${run} status=${result.status} ${match ? match[0] : "NO_JSON"}`);
  if (result.status !== 0) console.error((result.stderr || "").slice(-1000));
}
