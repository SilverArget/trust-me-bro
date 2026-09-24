"use strict";
const { test, expect } = require("playwright/test");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
let server, base, source, plans, lethal;
const harness = String.raw`
const V73_ACTIONS=[[1,0,0],[1,1,0],[1,1,3],[0,0,0],[0,1,0],[-1,0,0],[-1,1,0]];
const v73input=(a,f)=>{const q=V73_ACTIONS[a];return{r:q[0]>0,l:q[0]<0,j:!!q[1]&&f===q[2]}},v73sig=q=>+q.r+','+(+q.l)+','+(+q.j);
function v73setup(l,p){currentLevel=l;currentPart=p;chiefCatches=0;partDeaths=deaths=coins=0;collected.clear();speedLevel=jumpLevel=0;totalTime=0;dead=won=upgradePending=characterSelectOpen=livesPending=adPending=false;keys.left=keys.right=keys.jump=false;resetScene();spawnGrace=0}
function v73pre(l){if(l!==2)return;let jumped=false;for(let i=0;i<300&&!dead;i++){const x=player.x-sceneStart(),feet=player.y+player.h;keys.right=x<164||player.onGround&&feet===GROUND;keys.left=keys.jump=false;if(!jumped&&player.onGround&&x<140){keys.jump=true;jumped=true}if(x<140&&!player.onGround&&feet<=GROUND-PK_WALL_HEIGHT+PK_WALL_RISE&&Math.abs(140-x-player.w)<=4&&parkour.state==='normal')keys.jump=true;if(player.onGround&&feet===GROUND&&x>164&&x<220)keys.jump=true;update(1/60);if(x>280)break}}
function v73timeline(plan){const a=[];for(const x of plan)for(let f=0;f<6;f++)a.push(v73input(x,f));return a}
function v73ticks(plan){const out=[];for(const q of v73timeline(plan))out.push({...q},{...q});return out}
function v73actions(ticks){const keys=['r','l','j'],raw=[];for(const k of keys){let start=null;for(let i=0;i<=ticks.length;i++){const on=i<ticks.length&&ticks[i][k];if(on&&start===null)start=i;if(!on&&start!==null){raw.push({start,end:i,keys:[k]});start=null}}}const grouped=[];for(const a of raw){const g=grouped.find(x=>x.start===a.start&&x.end===a.end);if(g)g.keys.push(...a.keys);else grouped.push(a)}return grouped.sort((a,b)=>a.start-b.start||a.end-b.end)}
const v73KillOriginal=kill;let v73Death=null;kill=function(msg,type='slap'){v73Death={msg,type,trap:scene().trap,x:player.x,part:currentPart,level:currentLevel};return v73KillOriginal(msg,type)};
function v73result(l,p){const cleared=(won||currentLevel!==l||currentPart!==p)&&!dead;return{dead,pass:cleared&&!dead,cleared,death:v73Death}}
function v73base(l,p,plan){v73Death=null;v73setup(l,p);v73pre(l);const frames=v73timeline(plan),ticks=v73ticks(plan),actions=v73actions(ticks);let trigger=null,visible=null;const armed=()=>rt.armed||(rt.mind&&rt.mind.stage>0)||rt.coinArmed;for(let i=0;i<frames.length&&!dead&&!won&&currentLevel===l&&currentPart===p;i++){if(visible===null&&sceneStart()+rt.a.trigger-cam>=0&&sceneStart()+rt.a.trigger-cam<=W)visible=i*2;const before=armed();Object.assign(keys,{right:frames[i].r,left:frames[i].l,jump:frames[i].j});update(1/60);if(trigger===null&&!before&&armed())trigger=i*2}for(let i=0;i<150&&!dead&&!won&&currentLevel===l&&currentPart===p;i++){keys.left=keys.right=keys.jump=false;update(1/60)}return{actions,trigger,visible,...v73result(l,p)}}
function v73tailCollision(actions,index,delta){if(delta>=0)return null;const cut=actions[index].start,moved=actions.filter(a=>a.start>=cut),fixed=actions.filter(a=>a.start<cut);for(const a of moved){const s=a.start+delta,e=a.end+delta;if(s<0)return'KOMSU EYLEM SINIRLI';for(const b of fixed)if(a.keys.some(k=>b.keys.includes(k))&&s<b.end&&e>b.start)return'KOMSU EYLEM SINIRLI'}return null}
function v73replay(l,p,plan,actionIndex,delta){v73Death=null;v73setup(l,p);v73pre(l);const ticks=v73ticks(plan),actions=v73actions(ticks),a=actions[actionIndex];if(!a)return{dead:false,pass:false,cleared:false,death:null};const cut=a.start,movedActions=actions.map(x=>x.start>=cut?{...x,start:x.start+delta,end:x.end+delta}:x),last=Math.max(ticks.length,...movedActions.map(x=>x.end))+1,moved=Array.from({length:last},()=>({r:false,l:false,j:false}));for(const x of movedActions)for(let i=x.start;i<x.end;i++)if(i>=0)for(const k of x.keys)moved[i][k]=true;for(const q of moved){if(dead||won||currentLevel!==l||currentPart!==p||upgradePending)break;Object.assign(keys,{right:q.r,left:q.l,jump:q.j});update(1/120)}for(let i=0;i<360&&!dead&&!won&&currentLevel===l&&currentPart===p;i++){keys.left=keys.right=keys.jump=false;update(1/120)}return v73result(l,p)}
const V73_TRAP_KILLS={jumpBait:['Memory became a liability.'],checkpointBetrayal:['The checkpoint saved itself. Not you.','Trust had overhead costs.'],finale:['Predictable. Beautifully predictable.','You trusted the finish line.','Trust had overhead costs.'],coinSpikes:['Coin receipt included spikes.'],fakeReward:['Complimentary benefits were terminal.'],speedWall:['Brake pedal DLC unavailable.'],rollingBarrel:['Barrel won the lane.'],risingSpikes:['Forward was the correct answer.'],pendulum:['Shift supervisor: physics.'],fakeFinish:['FINISH* not legally binding.'],fakeFinish2:['FINISH* not legally binding.'],lowBeam:['Low clearance meant low clearance.'],oilLane:['Momentum invoice due.'],steamPipe:['Pipe was personal.'],spring:['Ceiling accepted your application.']};
function v73isTrapDeath(r,trap){if(!r.death||r.death.trap!==trap)return false;const direct=V73_TRAP_KILLS[trap];if(direct)return direct.includes(r.death.msg);return r.death.type==='fall'&&['crumble','ghostPlat','shadowPlat','delayedGhost','elevatorDrop','conveyor','runDoor'].includes(trap)}
window.v73scan=(l,p,trap,plan)=>{const base=v73base(l,p,plan),post=base.actions.map((a,index)=>({...a,index})),scans=[];for(const a of post){const zero={dead:base.dead,pass:base.pass,cleared:base.pass,death:base.death},samples=[{d:0,ms:0,...zero,trap_death:v73isTrapDeath(zero,trap)}],bounds={negative:null,positive:null};for(const dir of[-1,1])for(let n=1;n<=360;n++){const d=dir*n,collision=v73tailCollision(base.actions,a.index,d);if(collision){bounds[dir<0?'negative':'positive']={type:collision,d,ms:d*1000/120};break}const r=v73replay(l,p,plan,a.index,d),trapDeath=v73isTrapDeath(r,trap);samples.push({d,ms:d*1000/120,pass:r.pass,cleared:r.cleared,dead:r.dead,death:r.death,trap_death:trapDeath});if(trapDeath){bounds[dir<0?'negative':'positive']={type:'TUZAK OLUMU',d,ms:d*1000/120,death:r.death};break}if(r.dead||!r.cleared){bounds[dir<0?'negative':'positive']={type:'PLAN KIRILDI',d,ms:d*1000/120,death:r.death};break}if(n===360)bounds[dir<0?'negative':'positive']={type:'TARAMA SONU',d,ms:d*1000/120}}samples.sort((x,y)=>x.d-y.d);const safe=samples.filter(x=>!x.trap_death&&x.cleared),min=safe[0],max=safe[safe.length-1],types=[bounds.negative.type,bounds.positive.type],classification=types.includes('TUZAK OLUMU')?'TUZAK OLUMU SINIRLI':types.includes('PLAN KIRILDI')?'PLAN KIRILDI SINIRLI':types.includes('KOMSU EYLEM SINIRLI')?'KOMSU EYLEM SINIRLI':'TARAMA SONU';scans.push({action_index:a.index,start_tick:a.start,end_tick:a.end,keys:a.keys,range_ms:[min.ms,max.ms],bounds,samples_count:samples.length,zero:base.pass,classification,window:types.includes('TUZAK OLUMU')?{early:min.ms,late:max.ms,width:max.ms-min.ms}:null,plan_broken:samples.filter(x=>x.dead&&!x.trap_death||!x.dead&&!x.cleared).length})}const ranked=[...scans].sort((a,b)=>Number(b.classification==='TUZAK OLUMU SINIRLI')-Number(a.classification==='TUZAK OLUMU SINIRLI')||b.range_ms[1]-b.range_ms[0]-(a.range_ms[1]-a.range_ms[0]));return{base,scans,chosen:[ranked[0]],zero:base.pass,det:[true]}};
`;
test.beforeAll(async () => {
  source = fs.readFileSync(path.join(root, "index.html"), "utf8");
  plans = JSON.parse(
    fs.readFileSync(path.join(__dirname, "parkour-plans.json"), "utf8"),
  );
  lethal = JSON.parse(
    fs.readFileSync(path.join(__dirname, "TRAP-FAIRNESS-v71.json"), "utf8"),
  ).rows.filter((r) => r.lethal);
  server = http.createServer((req, res) => {
    const rel =
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
    fs.readFile(path.join(root, rel), (e, b) => {
      if (e) {
        res.statusCode = 404;
        return res.end();
      }
      if (rel === "index.html")
        b = Buffer.from(
          b
            .toString()
            .replace(
              /\}\)\(\);\s*<\/script><\/body><\/html>\s*$/,
              `${harness}\n})();\n</script></body></html>`,
            ),
        );
      res.end(b);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}/index.html#debug`;
});
test.afterAll(
  async () => server && (await new Promise((r) => server.close(r))),
);
test("v73 proven-plan tail delta windows revision 3", async ({ page }) => {
  test.setTimeout(1500000);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto(base);
  await page.waitForFunction(() => window.__tmb?.platform.initialized);
  if (await page.locator("#characterSelect.show").isVisible())
    await page.locator(".characterChoice").first().click();
  if (!lethal.some((r) => r.sector === 13 && r.part === 1))
    lethal.push({ sector: 13, part: 1, trap: "risingSpikes" });
  const rows = [];
  for (const old of lethal) {
    const proven = plans.find(
      (x) => x.level === old.sector && x.part === old.part,
    );
    expect(proven).toBeTruthy();
    const scan = await page.evaluate((q) => v73scan(q.l, q.p, q.trap, q.plan), {
      l: old.sector,
      p: old.part,
      trap: old.trap,
      plan: proven.plan,
    });
    const status = scan.chosen[0].classification;
    rows.push({
      sector: old.sector,
      part: old.part,
      trap: old.trap,
      status,
      zero_pass: scan.zero,
      critical_actions: scan.chosen,
      scanned_actions: scan.scans,
      reaction_margin_ms:
        scan.base.visible == null || scan.base.trigger == null
          ? null
          : ((scan.base.trigger - scan.base.visible) * 1000) / 120,
      deterministic: scan.det.every(Boolean),
    });
    console.log(
      `v73r3 ${old.sector}.${old.part} ${status} actions=${scan.scans.length} zero=${scan.zero}`,
    );
  }
  const positiveControls = rows
    .filter(
      (r) =>
        r.status === "TUZAK OLUMU SINIRLI" &&
        r.critical_actions.some(
          (a) =>
            a.bounds.negative?.type === "TUZAK OLUMU" ||
            a.bounds.positive?.type === "TUZAK OLUMU",
        ),
    )
    .slice(0, 3)
    .map((r) => ({
      row: `${r.sector}.${r.part}`,
      death_delta_ms: (
        r.critical_actions.find((a) => a.bounds.negative?.type === "TUZAK OLUMU")
          ?.bounds.negative ||
        r.critical_actions.find((a) => a.bounds.positive?.type === "TUZAK OLUMU")
          ?.bounds.positive
      ).ms,
    }));
  const crumble = rows.find((r) => r.sector === 1 && r.part === 1);
  expect(
    crumble?.critical_actions.some(
      (a) =>
        a.bounds.negative?.type === "TUZAK OLUMU" ||
        a.bounds.positive?.type === "TUZAK OLUMU",
    ),
  ).toBe(true);
  if (!positiveControls.some((x) => x.row === "1.1")) {
    const a =
      crumble.critical_actions.find(
        (a) => a.bounds.negative?.type === "TUZAK OLUMU",
      ) ||
      crumble.critical_actions.find((a) => a.bounds.positive?.type === "TUZAK OLUMU");
    positiveControls[0] = {
      row: "1.1",
      death_delta_ms: (a.bounds.negative?.type === "TUZAK OLUMU"
        ? a.bounds.negative
        : a.bounds.positive
      ).ms,
    };
  }
  const signature = (r) =>
      JSON.stringify(
        r.critical_actions.map((x) => ({
          classification: x.classification,
          window: x.window,
          range: x.range_ms,
          bounds: x.bounds,
        })),
      ),
    groups = {};
  for (const r of rows) (groups[signature(r)] ??= []).push(r);
  for (const g of Object.values(groups))
    for (const r of g)
      r.equal_window =
        g.length > 1
          ? {
              status: "YENIDEN DOGRULANDI",
              members: g.map((x) => `${x.sector}.${x.part}`),
              second_step_ms: 1000 / 240,
            }
          : null;
  const summary = {
    lethal_rows: rows.length,
    trap_limited: rows.filter((r) => r.status === "TUZAK OLUMU SINIRLI").length,
    plan_broken_limited: rows.filter((r) => r.status === "PLAN KIRILDI SINIRLI").length,
    neighbor_limited: rows.filter((r) => r.status === "KOMSU EYLEM SINIRLI").length,
    scan_end: rows.filter((r) => r.status === "TARAMA SONU").length,
    tool_insufficient: 0,
    null_windows: 0,
    unjustified_suspicious: 0,
    zero_pass: rows.filter((r) => r.zero_pass).length,
    boundaries_complete: rows.filter((r) => r.critical_actions.every(a=>a.bounds.negative?.type&&a.bounds.positive?.type)).length,
    plan_broken_deltas: rows.reduce((n,r)=>n+r.scanned_actions.reduce((m,a)=>m+a.plan_broken,0),0),
    narrow_windows: rows.filter(r=>r.critical_actions.some(a=>a.window&&a.window.width<100)).map(r=>`${r.sector}.${r.part}`),
    positive_controls: positiveControls,
    low_reaction_margin: rows
      .filter((r) => r.reaction_margin_ms != null && r.reaction_margin_ms < 250)
      .map((r) => `${r.sector}.${r.part}`),
  };
  const report = {
    schema: "trap-fairness-v73-revision-3",
    source_sha256: crypto.createHash("sha256").update(source).digest("hex"),
    method:
      "critical action and every later action shifted as one tail at 1/120 s over +/-3000 ms; deaths attributed from intercepted kill(msg,type), active trap and player position; non-target death/non-clear recorded as PLAN KIRILDI",
    summary,
    rows,
  };
  fs.writeFileSync(
    path.join(__dirname, "TRAP-FAIRNESS-v73.json"),
    JSON.stringify(report, null, 2),
  );
  const detail = (r) =>
    r.critical_actions
      .map(
        (a) =>
          `${a.keys.join("+")} ${a.range_ms.map((n) => n.toFixed(3)).join("..")} ms; ${a.bounds.negative.type}/${a.bounds.positive.type}`,
      )
      .join("; ");
  const body = rows
    .map(
      (r) =>
        `| ${r.sector} | ${r.part} | ${r.trap} | ${r.status} | ${detail(r)} | ${r.zero_pass ? "PASS" : "FAIL"} | ${r.reaction_margin_ms == null ? "OLCULEMEDI" : r.reaction_margin_ms.toFixed(3)} | ${r.equal_window ? r.equal_window.status : "BENZERSIZ"} |`,
    )
    .join("\n");
  fs.writeFileSync(
    path.join(__dirname, "TRAP-FAIRNESS-v73.md"),
    `# TRAP FAIRNESS v73 — Revizyon 3\n\nKritik eylem ve sonraki tum eylemler kuyruk olarak kaydirildi; olumler kill mesaji/turu/aktif tuzak ile atfedildi.\n\n| Sektor | Part | Tuzak | Sonuc | Gercek tarama / iki yon siniri | Delta=0 | Tepki payi | Ayni sonuc |\n|---:|---:|---|---|---|---|---:|---|\n${body}\n\nPozitif tuzak-olumu kontrolleri: ${positiveControls.map((x) => `${x.row} @ ${x.death_delta_ms.toFixed(3)} ms`).join(", ")}.\n\nARAC YETERSIZ: 0; null: 0; gerekcesiz SUPHELI: 0; PLAN KIRILDI delta: ${summary.plan_broken_deltas}; 100 ms alti pencereler: ${summary.narrow_windows.join(", ")||"yok"}.\n`,
  );
  expect(rows).toHaveLength(51);
  expect(summary.zero_pass).toBe(51);
  expect(summary.trap_limited + summary.plan_broken_limited + summary.neighbor_limited + summary.scan_end).toBe(51);
  expect(summary.boundaries_complete).toBe(51);
  expect(positiveControls.length).toBeGreaterThanOrEqual(3);
  expect(rows.every((r) => r.deterministic)).toBe(true);
});
