const { load, source } = require('./phase3-verify.cjs');
const probe = load(source('WORKTREE'));
const reports = JSON.parse(probe('JSON.stringify(validateAllScenes())')).flat();
const bad = reports.filter(report => report.errors && report.errors.length);
console.log(JSON.stringify({ reports: reports.length, bad: bad.length, examples: bad.slice(0, 3) }));
if (reports.length !== 186 || bad.length) process.exitCode = 1;
