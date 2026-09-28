"""A5c1 destructive acceptance probes, performed on in-memory copies only."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
src = (root / "js/a12-campaign.js").read_text(encoding="utf-8")

def red(name, mutated, rejects):
    if not rejects(mutated):
        raise SystemExit(f"FAIL: {name} mutation was not rejected")
    print(f"RED PASS: {name}")

red("RU question placeholder", src.replace('idle: "ОЖИДАНИЕ"', 'idle: "???"', 1), lambda s: 'idle: "???"' in s)
red("translated call replaced by literal", src.replace('t("samePhysics")', '"Same physics. Shared wallet. Your runner."', 1), lambda s: s.count('"Same physics. Shared wallet. Your runner."') > 1)
red("getter analytics emission", src.replace('getState: debugState,', 'getState:()=>{emitGame("getter_read");return debugState()},', 1), lambda s: 'emitGame("getter_read")' in s)
print("CLEAN: mutations remained in memory; source write count 0")
