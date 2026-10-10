#!/usr/bin/env python3
"""Append the approved 4x2 chief grab sheets as row 9 of the chief atlases."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "sprites" / "raw" / "a5-ai"
OUT = ROOT / "sprites" / "chiefs"
EVIDENCE = ROOT / "03-test" / "manager-preview" / "tur16"
CHIEFS = ("securityTall", "classicChief", "robotGuard", "bouncer")
CELL, COLS, OLD_ROWS = 80, 8, 8


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def green_mask(rgb: np.ndarray) -> np.ndarray:
    p = rgb.astype(np.int32)
    r, g, b = p[..., 0], p[..., 1], p[..., 2]
    return (g >= 105) & (g >= r + 32) & (g >= b + 32)


def key_green(image: Image.Image) -> Image.Image:
    a = np.asarray(image.convert("RGBA")).copy()
    a[green_mask(a[..., :3]), 3] = 0
    opaque = a[..., 3] > 0
    edge = np.zeros_like(opaque)
    edge[1:] |= ~opaque[:-1]
    edge[:-1] |= ~opaque[1:]
    edge[:, 1:] |= ~opaque[:, :-1]
    edge[:, :-1] |= ~opaque[:, 1:]
    p = a[..., :3].astype(np.int16)
    spill = opaque & edge & (p[..., 1] > 80) & (p[..., 1] - np.maximum(p[..., 0], p[..., 2]) > 24)
    rb = np.maximum(p[..., 0], p[..., 2])
    a[..., 1][spill] = np.clip(rb[spill] + 8, 0, 255).astype(np.uint8)
    return Image.fromarray(a, "RGBA")


def alpha_metrics(image: Image.Image) -> tuple[list[int] | None, int, int]:
    box = image.getchannel("A").getbbox()
    if not box:
        return None, 0, 0
    arr = np.asarray(image)
    green = int(np.count_nonzero((arr[..., 3] > 0) & green_mask(arr[..., :3])))
    return list(box), box[3] - box[1], green


def split_sheet(path: Path) -> list[Image.Image]:
    source = Image.open(path).convert("RGBA")
    if source.size != (1774, 887):
        raise SystemExit(f"unexpected source size: {path} {source.size}")
    xb = [(i * source.width + 2) // 4 for i in range(5)]
    yb = [(i * source.height + 1) // 2 for i in range(3)]
    return [key_green(source.crop((xb[i % 4], yb[i // 4], xb[i % 4 + 1], yb[i // 4 + 1]))) for i in range(8)]


def main() -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    contract_path = OUT / "chief-contract.json"
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    report: dict[str, object] = {"schema": 1, "chiefs": {}}
    contacts: list[Image.Image] = []
    for chief in CHIEFS:
        atlas_path = OUT / f"{chief}-full.png"
        old = Image.open(atlas_path).convert("RGBA")
        if old.size not in ((640, 640), (640, 720)):
            raise SystemExit(f"unexpected atlas size: {atlas_path} {old.size}")
        idle = [old.crop((i * CELL, 0, (i + 1) * CELL, CELL)) for i in range(8)]
        idle_heights = [alpha_metrics(frame)[1] for frame in idle]
        idle_height = round(sum(idle_heights) / len(idle_heights))
        cells = split_sheet(RAW / f"{chief}-grab.png")
        standing_heights = [alpha_metrics(cells[i])[1] for i in (6, 7)]
        scale = idle_height / (sum(standing_heights) / 2)
        # LANCZOS creates a narrow partially-transparent outline. Calibrate on
        # the rendered result so the visible standing silhouette matches idle.
        for _ in range(3):
            rendered_standing = []
            for i in (6, 7):
                probe = key_green(cells[i].resize((round(cells[i].width * scale), round(cells[i].height * scale)), Image.Resampling.LANCZOS))
                rendered_standing.append(alpha_metrics(probe)[1])
            scale *= idle_height / (sum(rendered_standing) / 2)
        rendered: list[Image.Image] = []
        frames = []
        for index, source in enumerate(cells):
            source_box = source.getchannel("A").getbbox()
            frame_scale = min(scale, 78 / (source_box[2] - source_box[0]))
            resized = key_green(source.resize((round(source.width * frame_scale), round(source.height * frame_scale)), Image.Resampling.LANCZOS))
            box = resized.getchannel("A").getbbox()
            if not box:
                raise SystemExit(f"empty source: {chief} frame {index + 1}")
            # Every pose shares the atlas' [40,74] ground anchor. Wide lunges
            # deliberately crop their trailing side so the reaching hands stay visible.
            x = round(40 - (box[0] + box[2]) / 2)
            y = 74 - box[3]
            frame = Image.new("RGBA", (CELL, CELL))
            frame.alpha_composite(resized, (x, y))
            frame = key_green(frame)
            out_box, height, green = alpha_metrics(frame)
            frames.append({"frame": index + 1, "bbox": out_box, "height": height, "scale": round(frame_scale, 8),
                           "foot": out_box[3] if out_box else None, "green": green,
                           "empty": out_box is None})
            rendered.append(frame)
        atlas = Image.new("RGBA", (640, 720))
        atlas.alpha_composite(old.crop((0, 0, 640, 640)), (0, 0))
        for index, frame in enumerate(rendered):
            atlas.alpha_composite(frame, (index * CELL, 640))
        atlas.save(atlas_path, optimize=True, compress_level=9)
        asset = next(a for a in contract["assets"] if a["id"] == chief)
        asset.update(bytes=atlas_path.stat().st_size, sha256=digest(atlas_path),
                     cacheVersion=digest(atlas_path)[:16], size=[640, 720])
        standing = round(sum(frames[i]["height"] for i in (6, 7)) / 2, 2)
        report["chiefs"][chief] = {
            "source": f"sprites/raw/a5-ai/{chief}-grab.png", "sourceSize": [1774, 887],
            "scale": round(scale, 8), "idleHeight": idle_height, "standingHeight": standing,
            "heightDifferencePercent": round(abs(standing - idle_height) * 100 / idle_height, 2),
            "emptyFrames": sum(f["empty"] for f in frames), "greenPixels": sum(f["green"] for f in frames),
            "maxFootDifference": max(abs(f["foot"] - 74) for f in frames), "frames": frames,
            "atlasBytes": asset["bytes"], "atlasSha256": asset["sha256"],
        }
        strip = Image.new("RGBA", (9 * CELL, CELL), (20, 24, 31, 255))
        strip.alpha_composite(idle[0], (0, 0))
        for index, frame in enumerate(rendered): strip.alpha_composite(frame, ((index + 1) * CELL, 0))
        contacts.append(strip)
    contract.update(version=2, atlas=[640, 720], rows=9)
    contract["motions"]["grab"] = {"row": 8, "fps": 8}
    contract_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sheet = Image.new("RGBA", (9 * CELL, 4 * CELL), (20, 24, 31, 255))
    draw = ImageDraw.Draw(sheet)
    for row, (chief, strip) in enumerate(zip(CHIEFS, contacts)):
        sheet.alpha_composite(strip, (0, row * CELL))
        draw.text((4, row * CELL + 4), chief, fill=(255, 255, 255, 255))
    sheet.save(EVIDENCE / "chief-grab-contact.png", optimize=True, compress_level=9)
    (EVIDENCE / "import.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for chief, data in report["chiefs"].items():
        if data["emptyFrames"] or data["greenPixels"] or data["heightDifferencePercent"] > 5 or data["maxFootDifference"] > 2:
            raise SystemExit(f"validation failed: {chief}: {data}")
        print(chief, json.dumps({k:data[k] for k in ("idleHeight", "standingHeight", "heightDifferencePercent", "maxFootDifference", "greenPixels", "emptyFrames", "atlasBytes")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
