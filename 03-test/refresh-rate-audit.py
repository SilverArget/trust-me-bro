from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "03-test" / "manager-preview" / "crazy-sart"
RATES = [60, 120, 144, 165]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_):
        pass


def run_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


AUDIT_JS = r"""
(hz) => {
  const dt = 1 / hz;
  const round = n => Math.round((Number(n) || 0) * 100) / 100;
  const key = (name, down) => {
    const code = name === "ArrowRight" ? "ArrowRight" : name === "ArrowUp" ? "ArrowUp" : name;
    window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
      key: name, code, bubbles: true, cancelable: true
    }));
  };
  const release = () => { key("ArrowRight", false); key("ArrowUp", false); };
  const worldFor = id => id[0] === "F" ? "frozen" : "dock31";
  const state = () => __TMB_A12__.getState();
  const center = s => s.player.x + s.hitbox.w / 2;
  const feet = s => s.player.y + s.hitbox.h;
  const groundYAt = (route, x) => {
    const all = [...(route.groundSegments || []), ...(route.staticPlatforms || [])];
    const hits = all.filter(v => x >= v.x - 1 && x <= v.x + v.w + 1).sort((a, b) => a.y - b.y);
    return hits[0]?.y ?? 455;
  };
  const placeFeet = (x, y) => {
    const s = state();
    __TMB_A12__.placePlayer(x - s.hitbox.w / 2, y - s.hitbox.h);
    for (let i = 0; i < 8; i++) step();
  };
  const start = id => {
    release();
    __TMB_A12__.renderWorldOnRoute(worldFor(id), id);
    __TMB_A12__.startRoute(id);
    __TMB_A12__.disableChief();
    if (window.__tmbParkour) window.__tmbParkour.manual();
    if (window.__tmbResetFixedStep) window.__tmbResetFixedStep();
    return __TMB_A12__.routeDefinition(id);
  };
  const step = () => __tmbCampaignStep(dt);

  const runSpeed = () => {
    const route = start("D01");
    placeFeet(120, groundYAt(route, 120));
    key("ArrowRight", true);
    const startX = center(state());
    for (let i = 0; i < Math.round(2 / dt); i++) step();
    release();
    const s = state();
    return { outcome: s.dead ? "dead" : "ok", distancePx: round(center(s) - startX), endX: round(center(s)), deaths: s.deaths };
  };

  const jumpArc = () => {
    const route = start("D01");
    const ground = groundYAt(route, 120);
    placeFeet(120, ground);
    key("ArrowRight", true);
    key("ArrowUp", true);
    let minFeet = ground, wasAir = false, landing = null;
    for (let i = 0, t = 0; i < Math.round(3 / dt); i++, t += dt) {
      if (t >= 0.245 && t < 0.245 + dt) key("ArrowUp", false);
      step();
      const s = state(), f = feet(s);
      minFeet = Math.min(minFeet, f);
      if (!s.player.onGround) wasAir = true;
      if (wasAir && s.player.onGround && t > 0.25) {
        landing = { x: round(center(s)), feet: round(f), t: round(t) };
        break;
      }
    }
    release();
    const s = state();
    return { outcome: landing ? "landed" : s.dead ? "dead" : "timeout", jumpHeightPx: round(ground - minFeet), landingX: landing?.x ?? round(center(s)), landingFeet: landing?.feet ?? round(feet(s)), deaths: s.deaths };
  };

  const hermesArc = () => {
    const route = start("D09");
    const z = route.hermesLaunchZones[0];
    placeFeet(z.x2 - 20, z.landY);
    key("ArrowRight", true);
    let launched = false, landing = null, minFeet = feet(state());
    for (let i = 0; i < Math.round(4 / dt); i++) {
      step();
      const s = state(), c = center(s), f = feet(s);
      minFeet = Math.min(minFeet, f);
      launched ||= !!s.jumpRun?.hermes || (!s.player.onGround && c >= z.x1 - 8 && c <= z.landX + 70);
      if (launched && s.player.onGround && Math.abs(c - z.landX) <= 56 && Math.abs(f - z.landY) <= 10) {
        landing = { x: round(c), feet: round(f) };
        break;
      }
      if (c > z.landX + 140 && s.player.onGround) break;
    }
    release();
    const s = state();
    return { outcome: landing ? "landed" : s.dead ? "dead" : "miss", targetX: round(z.landX), landingX: landing?.x ?? round(center(s)), landingDeltaPx: round((landing?.x ?? center(s)) - z.landX), apexRisePx: round(z.landY - minFeet), deaths: s.deaths };
  };

  const wallJump = () => {
    const route = start("D16");
    const z = route.wallJumpZones[0];
    placeFeet((z.x1 + z.x2) / 2, z.yBottom);
    key("ArrowUp", true);
    let top = false, maxRise = 0, wallFrames = 0;
    const startFeet = feet(state());
    for (let i = 0, t = 0; i < Math.round(4.2 / dt); i++, t += dt) {
      if (t >= 0.045 && t < 0.045 + dt) key("ArrowUp", false);
      step();
      const s = state(), f = feet(s);
      if (s.parkour.state === "wallJump") wallFrames++;
      maxRise = Math.max(maxRise, startFeet - f);
      if (f <= z.exitY + 2 && s.player.x >= z.exitX - 44 && s.parkour.state !== "wallJump") { top = true; break; }
    }
    release();
    const s = state();
    return { outcome: top ? "top" : s.dead ? "dead" : "notTop", endX: round(center(s)), endFeet: round(feet(s)), risePx: round(maxRise), wallFrames, deaths: s.deaths };
  };

  const dive = () => {
    const route = start("D02");
    const z = route.diveZones[0];
    const startX = (z.x1 + z.x2) / 2;
    placeFeet(startX, groundYAt(route, startX));
    let released = false, diveSeen = false, landing = null;
    key("ArrowUp", true);
    for (let i = 0, t = 0; i < Math.round(3 / dt); i++, t += dt) {
      if (!released && t >= 0.045) {
        key("ArrowUp", false);
        released = true;
      }
      step();
      const s = state();
      diveSeen ||= !!s.diveRun || s.parkour.state === "dive";
      if (diveSeen && s.player.onGround && t > 0.08) {
        landing = { x: round(center(s)), feet: round(feet(s)) };
        break;
      }
    }
    release();
    const s = state();
    return { outcome: landing ? "landed" : s.dead ? "dead" : "timeout", diveSeen, targetX: round(z.landX), landingX: landing?.x ?? round(center(s)), landingFeet: landing?.feet ?? round(feet(s)), deaths: s.deaths };
  };

  return { hz, dtMs: round(dt * 1000), runSpeed: runSpeed(), jumpArc: jumpArc(), hermesArc: hermesArc(), wallJump: wallJump(), dive: dive() };
}
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = run_server()
    base = f"http://127.0.0.1:{server.server_port}/index.html#debug"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.goto(base)
            page.wait_for_function("() => window.__TMB_A12__ && window.__tmbCampaignStep")
            choice = page.locator(".characterChoice:visible").first
            if choice.count():
                choice.click()
            results = [page.evaluate(AUDIT_JS, hz) for hz in RATES]
            browser.close()
    finally:
        server.shutdown()
    out = {"rates": RATES, "results": results}
    (OUT / "refresh-rate-results.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
