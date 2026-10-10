from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RUNNERS = ("tall", "compact", "bruiser", "athlete")
BASELINE = "76e9aa1d573bdebb5a55219066918e430b76a9cd"


def git_bytes(path: str) -> bytes:
    return subprocess.run(
        ["git", "show", f"{BASELINE}:{path}"], cwd=ROOT, check=True, capture_output=True
    ).stdout


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


current_js = (ROOT / "js/a12-campaign.js").read_text(encoding="utf-8")
baseline_js = git_bytes("js/a12-campaign.js").decode("utf-8")
normalized_js = current_js
for runner in RUNNERS:
    normalized_js = normalized_js.replace(
        f'{runner}: {{ id: "{runner}", legacy:',
        f'{runner}: {{ id: "{runner}", legacy:',
    )
    start = normalized_js.index(f'    {runner}: {{ id: "{runner}"')
    end = normalized_js.index("\n", start)
    line = normalized_js[start:end]
    normalized_js = normalized_js[:start] + line.replace("outfitLocked: false", "outfitLocked: true") + normalized_js[end:]
assert normalized_js == baseline_js, "a12 changed outside the four outfitLocked flags"
assert (ROOT / "index.html").read_text(encoding="utf-8") == git_bytes("index.html").decode("utf-8"), "index.html changed"

for runner in ("male", "female"):
    for path in sorted((ROOT / "sprites/a5").glob(f"{runner}-*.png")):
        rel = path.relative_to(ROOT).as_posix()
        assert path.read_bytes() == git_bytes(rel), f"protected atlas changed: {rel}"

contract = json.loads((ROOT / "sprites/a5/atlas-contract.json").read_text(encoding="utf-8"))
contract_by_path = {asset["path"]: asset for asset in contract["assets"]}
for rel, asset in contract_by_path.items():
    data = (ROOT / rel).read_bytes()
    actual = digest(data)
    assert len(data) == asset["bytes"], f"byte count: {rel}"
    assert actual == asset["sha256"], f"sha256: {rel}"
    assert actual[:16] == asset["cacheVersion"], f"cacheVersion: {rel}"
    assert len(data) <= contract["maxBytesPerFile"], f"byte budget: {rel}"

report = json.loads((ROOT / "03-test/manager-preview/tur17/import.json").read_text(encoding="utf-8"))
for key in report["generated"]:
    row = report["pages"][key]
    assert row["green_count"] == 0, key
    assert row["empty_count"] == 0, key
    assert row["detached_at_least_10"] == 0, key
    assert row["edge_alpha"] == 0, key
    assert row["overflow_count"] == 0, key
    assert row["max_height_diff_pct"] <= 5, key
    assert row["max_foot_diff"] <= 2, key
    assert f"sprites/a5/{key}-full.png" in contract_by_path, key

print(json.dumps({
    "status": "PASS",
    "generated": len(report["generated"]),
    "missing": len(report["missing"]),
    "contract_assets": len(contract["assets"]),
    "protected": ["index.html", "male/female atlases", "all a12 except four outfitLocked flags"],
}, ensure_ascii=False))
