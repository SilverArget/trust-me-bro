#!/usr/bin/env python3
"""Append the approved 4x2 chief grab sheets as row 9 of the chief atlases."""

from __future__ import annotations

import hashlib
import io
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "sprites" / "raw" / "a5-ai"
OUT = ROOT / "sprites" / "chiefs"
EVIDENCE = ROOT / "03-test" / "manager-preview" / "tur16c"
CHIEFS = ("securityTall", "classicChief", "robotGuard", "bouncer")
CELL, COLS, OLD_ROWS = 80, 8, 8


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline_atlas(path: Path, fallback: Image.Image) -> Image.Image:
    """Load the approved pre-fix atlas for the old/new evidence sheet."""
    try:
        data = subprocess.check_output(
            ["git", "show", f"aafff7d:{path.relative_to(ROOT).as_posix()}"],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
        return Image.open(io.BytesIO(data)).convert("RGBA")
    except (OSError, subprocess.CalledProcessError):
        return fallback


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


def connected_components(mask: np.ndarray) -> list[dict[str, object]]:
    """Return 8-connected foreground components as horizontal pixel runs."""
    remaining = mask.copy()
    height, width = remaining.shape
    components: list[dict[str, object]] = []
    while remaining.any():
        seed = int(np.flatnonzero(remaining)[0])
        stack = [(seed % width, seed // width)]
        runs: list[tuple[int, int, int]] = []
        size = 0
        x0, y0, x1, y1 = width, height, 0, 0
        weighted_x = weighted_y = 0.0
        while stack:
            x, y = stack.pop()
            if not remaining[y, x]:
                continue
            left = x
            while left and remaining[y, left - 1]:
                left -= 1
            right = x + 1
            while right < width and remaining[y, right]:
                right += 1
            remaining[y, left:right] = False
            run_size = right - left
            runs.append((y, left, right))
            size += run_size
            x0, y0, x1, y1 = min(x0, left), min(y0, y), max(x1, right), max(y1, y + 1)
            weighted_x += (left + right - 1) * run_size / 2
            weighted_y += y * run_size
            for near_y in (y - 1, y + 1):
                if near_y < 0 or near_y >= height:
                    continue
                near_left, near_right = max(0, left - 1), min(width, right + 1)
                row = remaining[near_y, near_left:near_right]
                starts = np.flatnonzero(row & np.concatenate(([True], ~row[:-1])))
                stack.extend((near_left + int(start), near_y) for start in starts)
        components.append({
            "runs": runs,
            "size": size,
            "bbox": (x0, y0, x1, y1),
            "center": (weighted_x / size, weighted_y / size),
        })
    return components


def component_distance(a: dict[str, object], b: dict[str, object]) -> tuple[float, float]:
    ax0, ay0, ax1, ay1 = a["bbox"]
    bx0, by0, bx1, by1 = b["bbox"]
    dx = max(bx0 - ax1, ax0 - bx1, 0)
    dy = max(by0 - ay1, ay0 - by1, 0)
    acx, acy = a["center"]
    bcx, bcy = b["center"]
    return dx * dx + dy * dy, (acx - bcx) ** 2 + (acy - bcy) ** 2


def split_sheet(path: Path) -> list[Image.Image]:
    source = Image.open(path).convert("RGBA")
    if source.size != (1774, 887):
        raise SystemExit(f"unexpected source size: {path} {source.size}")
    keyed = key_green(source)
    pixels = np.asarray(keyed)
    components = connected_components(pixels[..., 3] > 0)
    bodies: list[dict[str, object]] = []
    for row in range(2):
        row_components = [component for component in components
                          if (component["center"][1] < source.height / 2) == (row == 0)]
        if len(row_components) < 4:
            raise SystemExit(f"fewer than four bodies in source row {row + 1}: {path}")
        bodies.extend(sorted(sorted(row_components, key=lambda c: c["size"], reverse=True)[:4],
                             key=lambda c: c["center"][0]))
    assignments: list[list[dict[str, object]]] = [[] for _ in bodies]
    body_ids = {id(body): index for index, body in enumerate(bodies)}
    for component in components:
        owner = body_ids.get(id(component))
        if owner is None:
            owner = min(range(len(bodies)), key=lambda index: component_distance(component, bodies[index]))
        assignments[owner].append(component)
    frames: list[Image.Image] = []
    for assigned in assignments:
        x0 = min(component["bbox"][0] for component in assigned)
        y0 = min(component["bbox"][1] for component in assigned)
        x1 = max(component["bbox"][2] for component in assigned)
        y1 = max(component["bbox"][3] for component in assigned)
        padding = 4
        frame = np.zeros((y1 - y0 + 2 * padding, x1 - x0 + 2 * padding, 4), dtype=np.uint8)
        for component in assigned:
            for y, left, right in component["runs"]:
                frame[y - y0 + padding, left - x0 + padding:right - x0 + padding] = pixels[y, left:right]
        frames.append(Image.fromarray(frame, "RGBA"))
    return frames


def render_scaled(source: Image.Image, scale: float) -> Image.Image:
    size = (max(1, round(source.width * scale)), max(1, round(source.height * scale)))
    return key_green(source.resize(size, Image.Resampling.LANCZOS))


def fit_scale(sources: list[Image.Image], initial: float) -> float:
    scale = initial
    for _ in range(5):
        boxes = [render_scaled(source, scale).getchannel("A").getbbox() for source in sources]
        factor = min(1.0, *(78 / (box[2] - box[0]) for box in boxes),
                     *(73 / (box[3] - box[1]) for box in boxes))
        if factor >= 1:
            break
        scale *= factor * .995
    return scale


def frame_component_metrics(image: Image.Image) -> tuple[list[int], int]:
    alpha = np.asarray(image.getchannel("A")) > 0
    sizes = sorted((int(component["size"]) for component in connected_components(alpha)), reverse=True)
    detached = sizes[1:]
    edge_alpha = int(np.count_nonzero(alpha[0]) + np.count_nonzero(alpha[-1])
                     + np.count_nonzero(alpha[1:-1, 0]) + np.count_nonzero(alpha[1:-1, -1]))
    return detached, edge_alpha


def repair_resampling_disconnects(image: Image.Image) -> tuple[Image.Image, list[int]]:
    """Bridge one-pixel resampling gaps; source-sheet ownership is unchanged."""
    pixels = np.asarray(image).copy()
    repaired: list[int] = []
    while True:
        components = connected_components(pixels[..., 3] > 0)
        main = max(components, key=lambda component: component["size"])
        detached = [component for component in components
                    if component is not main and component["size"] >= 10]
        if not detached:
            return Image.fromarray(pixels, "RGBA"), repaired
        component = max(detached, key=lambda item: item["size"])
        main_points = np.array([(x, y) for y, left, right in main["runs"] for x in range(left, right)])
        loose_points = np.array([(x, y) for y, left, right in component["runs"] for x in range(left, right)])
        distances = ((main_points[:, None, :] - loose_points[None, :, :]) ** 2).sum(axis=2)
        main_index, loose_index = np.unravel_index(int(np.argmin(distances)), distances.shape)
        start, end = main_points[main_index], loose_points[loose_index]
        steps = int(max(abs(end - start)))
        if steps > 3:
            raise SystemExit(f"detached component is not a resampling gap: size={component['size']} distance={steps}")
        color = ((pixels[start[1], start[0]].astype(np.uint16)
                  + pixels[end[1], end[0]].astype(np.uint16)) // 2).astype(np.uint8)
        for step in range(1, steps):
            x, y = np.rint(start + (end - start) * step / steps).astype(int)
            if pixels[y, x, 3] == 0:
                pixels[y, x] = color
        repaired.append(int(component["size"]))


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
        baseline = baseline_atlas(atlas_path, old)
        old_idle = baseline.crop((0, 0, CELL, CELL))
        old_grab = [baseline.crop((i * CELL, 8 * CELL, (i + 1) * CELL, 9 * CELL)) for i in range(8)]
        legacy_rows = np.asarray(old.crop((0, 0, 640, 640))).copy()
        idle_heights = [alpha_metrics(frame)[1] for frame in idle]
        idle_height = round(sum(idle_heights) / len(idle_heights))
        cells = split_sheet(RAW / f"{chief}-grab.png")
        standing_heights = [alpha_metrics(cells[i])[1] for i in (6, 7)]
        target_standing_height = min(idle_height, 73)
        scale = target_standing_height / (sum(standing_heights) / 2)
        # LANCZOS creates a narrow partially-transparent outline. Calibrate on
        # the rendered result so the visible standing silhouette matches idle.
        for _ in range(3):
            rendered_standing = []
            for i in (6, 7):
                probe = render_scaled(cells[i], scale)
                rendered_standing.append(alpha_metrics(probe)[1])
            scale *= target_standing_height / (sum(rendered_standing) / 2)
        common_scale = fit_scale(cells, scale)
        common_standing = sum(alpha_metrics(render_scaled(cells[i], common_scale))[1] for i in (6, 7)) / 2
        use_common_scale = abs(common_standing - idle_height) * 100 / idle_height <= 5
        row_scale = common_scale if use_common_scale else scale
        rendered: list[Image.Image] = []
        frames = []
        individual_fit_frames = []
        for index, source in enumerate(cells):
            frame_scale = row_scale
            resized = render_scaled(source, frame_scale)
            box = resized.getchannel("A").getbbox()
            if not box:
                raise SystemExit(f"empty source: {chief} frame {index + 1}")
            if box[2] - box[0] > 78 or box[3] - box[1] > 73:
                frame_scale = fit_scale([source], frame_scale)
                resized = render_scaled(source, frame_scale)
                box = resized.getchannel("A").getbbox()
                individual_fit_frames.append(index + 1)
            # Every pose shares the atlas' [40,74] ground anchor. Wide lunges
            # are scaled rather than clipped so both feet and reaching hands survive.
            x = round(40 - (box[0] + box[2]) / 2)
            y = 74 - box[3]
            frame = Image.new("RGBA", (CELL, CELL))
            frame.alpha_composite(resized, (x, y))
            frame = key_green(frame)
            frame, repaired_components = repair_resampling_disconnects(frame)
            out_box, height, green = alpha_metrics(frame)
            detached, edge_alpha = frame_component_metrics(frame)
            frames.append({"frame": index + 1, "bbox": out_box, "height": height, "scale": round(frame_scale, 8),
                           "foot": out_box[3] if out_box else None, "green": green,
                           "empty": out_box is None, "detachedComponents": detached,
                           "detachedAtLeast10": sum(size >= 10 for size in detached),
                           "edgeAlpha": edge_alpha, "repairedComponents": repaired_components})
            rendered.append(frame)
        atlas = Image.new("RGBA", (640, 720))
        atlas.alpha_composite(old.crop((0, 0, 640, 640)), (0, 0))
        for index, frame in enumerate(rendered):
            atlas.alpha_composite(frame, (index * CELL, 640))
        if not np.array_equal(np.asarray(atlas.crop((0, 0, 640, 640))), legacy_rows):
            raise SystemExit(f"legacy rows changed: {chief}")
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
            "detachedAtLeast10": sum(f["detachedAtLeast10"] for f in frames),
            "smallDetachedComponents": [{"frame": f["frame"], "sizes": f["detachedComponents"]}
                                        for f in frames if f["detachedComponents"]],
            "edgeAlpha": sum(f["edgeAlpha"] for f in frames),
            "individualFitFrames": individual_fit_frames,
            "resamplingRepairs": [{"frame": f["frame"], "sizes": f["repairedComponents"]}
                                  for f in frames if f["repairedComponents"]],
            "legacyRowsEqual": True,
            "atlasBytes": asset["bytes"], "atlasSha256": asset["sha256"],
        }
        strip = Image.new("RGBA", (18 * CELL, CELL), (20, 24, 31, 255))
        strip.alpha_composite(old_idle, (0, 0))
        for index, frame in enumerate(old_grab): strip.alpha_composite(frame, ((index + 1) * CELL, 0))
        strip.alpha_composite(idle[0], (9 * CELL, 0))
        for index, frame in enumerate(rendered): strip.alpha_composite(frame, ((index + 10) * CELL, 0))
        contacts.append(strip)
    contract.update(version=2, atlas=[640, 720], rows=9)
    contract["motions"]["grab"] = {"row": 8, "fps": 8}
    contract_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sheet = Image.new("RGBA", (18 * CELL, 4 * (CELL + 20)), (20, 24, 31, 255))
    draw = ImageDraw.Draw(sheet)
    for row, (chief, strip) in enumerate(zip(CHIEFS, contacts)):
        top = row * (CELL + 20)
        draw.text((4, top + 4), f"{chief}  OLD (aafff7d)", fill=(255, 255, 255, 255))
        draw.text((9 * CELL + 4, top + 4), f"{chief}  NEW", fill=(255, 255, 255, 255))
        sheet.alpha_composite(strip, (0, top + 20))
        draw.line((9 * CELL - 1, top, 9 * CELL - 1, top + CELL + 19), fill=(255, 190, 60, 255), width=2)
    sheet.save(EVIDENCE / "contact.png", optimize=True, compress_level=9)
    (EVIDENCE / "import.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for chief, data in report["chiefs"].items():
        if (data["emptyFrames"] or data["greenPixels"] or data["heightDifferencePercent"] > 5
                or data["maxFootDifference"] > 2 or data["detachedAtLeast10"] or data["edgeAlpha"]):
            raise SystemExit(f"validation failed: {chief}: {data}")
        print(chief, json.dumps({k:data[k] for k in ("detachedAtLeast10", "smallDetachedComponents", "edgeAlpha", "idleHeight", "standingHeight", "heightDifferencePercent", "maxFootDifference", "greenPixels", "emptyFrames", "individualFitFrames", "atlasBytes")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
