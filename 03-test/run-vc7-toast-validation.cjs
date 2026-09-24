"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const runs = [];
for (let run = 1; run <= 12; run++) {
  const result = spawnSync(
    process.execPath,
    [
      "C:/Users/Arget/AppData/Roaming/npm/node_modules/playwright/cli.js",
      "test",
      "03-test/vc7-tur1.spec.cjs",
      "-g",
      "canvas PNG evidence",
      "--workers=1",
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        NODE_PATH: "C:/Users/Arget/AppData/Roaming/npm/node_modules",
        VC7_PRIME_DEATH_TOAST: "1",
      },
      encoding: "utf8",
      timeout: 120000,
    },
  );
  const match = (result.stdout || "").match(/VC7_TUR1B_PNG (.*)$/m);
  const values = match ? JSON.parse(match[1]) : null;
  const row = {
    run,
    passed: result.status === 0,
    status: result.status,
    error: result.status === 0 ? null : `${result.stdout || ""}\n${result.stderr || ""}`.slice(-4000),
    values: values
      ? {
          "16x9": {
            ratio: values["16x9"].spikeChangedRatio,
            orange: values["16x9"].telegraphOrangePixels,
          },
          "9x16": {
            ratio: values["9x16"].spikeChangedRatio,
            orange: values["9x16"].telegraphOrangePixels,
          },
        }
      : null,
  };
  runs.push(row);
  process.stdout.write(JSON.stringify(row) + "\n");
}
fs.writeFileSync(
  path.join(__dirname, "vc7-tur2", "toast-validation.json"),
  JSON.stringify({ runs }, null, 2),
);
if (runs.some((x) => !x.passed)) process.exitCode = 1;
