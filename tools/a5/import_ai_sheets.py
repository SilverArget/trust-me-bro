#!/usr/bin/env python3
"""Import A5 AI sheets into deterministic 8x8 RGBA atlases.

The transform is deliberately page-global: no frame is independently centred
or grounded.  Cell coordinates are first normalized to 64x64, then one scale
per runner and one translation per source page are applied to all 64 frames.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "sprites" / "raw" / "a5-ai"
OUT = ROOT / "sprites" / "a5"
EVIDENCE = ROOT / "03-test" / "a5e-evidence"
RUNNERS = ("male", "female")
OUTFITS = ("default", "dockCrew", "nightShift", "hazardRunner")
EXPECTED = {
    "male-default": "5855e15f", "male-dockCrew": "6c0759a0",
    "male-nightShift": "7b1a85c9", "male-hazardRunner": "204a0910",
    "female-default": "5a9cc190", "female-dockCrew": "a611545b",
    "female-nightShift": "aeab88d6", "female-hazardRunner": "02939de5",
}
RESAMPLE = Image.Resampling.LANCZOS


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bounds(length: int) -> list[int]:
    """Fractional 8-way split, rounded only at boundaries."""
    return [(i * length + 4) // 8 for i in range(9)]


def green_candidate(rgb: np.ndarray) -> np.ndarray:
    p = rgb.astype(np.int32)
    r, g, b = p[..., 0], p[..., 1], p[..., 2]
    dist = np.sqrt(r * r + (255 - g) ** 2 + b * b)
    return ((g >= 105) & (g >= r + 32) & (g >= b + 32) & (dist <= 205))


def border_connected(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        if mask[0, x]: q.append((0, x))
        if mask[h - 1, x]: q.append((h - 1, x))
    for y in range(h):
        if mask[y, 0]: q.append((y, 0))
        if mask[y, w - 1]: q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if seen[y, x] or not mask[y, x]:
            continue
        seen[y, x] = True
        if y: q.append((y - 1, x))
        if y + 1 < h: q.append((y + 1, x))
        if x: q.append((y, x - 1))
        if x + 1 < w: q.append((y, x + 1))
    return seen


def segment(cell: Image.Image) -> Image.Image:
    arr = np.asarray(cell.convert("RGBA")).copy()
    connected = border_connected(green_candidate(arr[..., :3]))
    arr[connected, 3] = 0
    # Decontaminate only the one-pixel alpha boundary. Interior costume greens
    # are intentionally untouched.
    opaque = arr[..., 3] > 0
    adjacent_clear = np.zeros_like(opaque)
    adjacent_clear[1:] |= ~opaque[:-1]
    adjacent_clear[:-1] |= ~opaque[1:]
    adjacent_clear[:, 1:] |= ~opaque[:, :-1]
    adjacent_clear[:, :-1] |= ~opaque[:, 1:]
    edge = opaque & adjacent_clear
    p = arr[..., :3].astype(np.int16)
    dominance = p[..., 1] - np.maximum(p[..., 0], p[..., 2])
    spill = edge & (p[..., 1] > 80) & (dominance > 24)
    # Remove the green excess rather than deleting edge opacity.
    rb = np.maximum(p[..., 0], p[..., 2])
    arr[..., 1][spill] = np.clip(rb[spill] + 8, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def alpha_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    return im.getchannel("A").getbbox()


def clean_edge_fragments(im: Image.Image) -> tuple[Image.Image, int, int]:
    """Drop small, disconnected crop-edge debris without touching the actor."""
    arr = np.asarray(im).copy()
    mask = arr[..., 3] > 0
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    components = []
    for sy, sx in zip(*np.nonzero(mask)):
        if seen[sy, sx]:
            continue
        q = deque([(int(sy), int(sx))]); seen[sy, sx] = True; pixels = []
        while q:
            y, x = q.popleft(); pixels.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if (dy or dx) and 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        components.append(pixels)
    if not components:
        return im, 0, 0
    main = max(components, key=len)
    my = [p[0] for p in main]; mx = [p[1] for p in main]
    mb = (min(mx), min(my), max(mx), max(my))
    removed = removed_area = 0
    for comp in components:
        if comp is main:
            continue
        ys = [p[0] for p in comp]; xs = [p[1] for p in comp]
        cb = (min(xs), min(ys), max(xs), max(ys))
        dx = max(mb[0] - cb[2] - 1, cb[0] - mb[2] - 1, 0)
        dy = max(mb[1] - cb[3] - 1, cb[1] - mb[3] - 1, 0)
        near_main = max(dx, dy) <= 3
        touches_edge = cb[0] == 0 or cb[1] == 0 or cb[2] == w - 1 or cb[3] == h - 1
        if touches_edge and not near_main and len(comp) < len(main) * .03:
            for y, x in comp:
                arr[y, x, 3] = 0
            removed += 1; removed_area += len(comp)
    return Image.fromarray(arr, "RGBA"), removed, removed_area


def median(values: list[float]) -> float:
    a = sorted(values)
    n = len(a)
    return (a[n // 2] if n & 1 else (a[n // 2 - 1] + a[n // 2]) / 2)


def load_pages() -> dict[str, dict]:
    pages = {}
    for runner in RUNNERS:
        for outfit in OUTFITS:
            key = f"{runner}-{outfit}"
            path = RAW / f"{key}.png"
            if not path.is_file():
                raise SystemExit(f"STOP: missing source {path}")
            digest = sha256(path)
            if digest[:8] != EXPECTED[key]:
                raise SystemExit(f"STOP: source SHA mismatch {key}: {digest[:8]} != {EXPECTED[key]}")
            src = Image.open(path).convert("RGBA")
            xb, yb = bounds(src.width), bounds(src.height)
            cells, boxes, page_cleanup = [], [], []
            for row in range(8):
                for col in range(8):
                    im = segment(src.crop((xb[col], yb[row], xb[col + 1], yb[row + 1])))
                    im, removed_components, removed_area = clean_edge_fragments(im)
                    box = alpha_bbox(im)
                    cells.append(im)
                    boxes.append(box)
                    page_cleanup.append({"removed_components": removed_components, "removed_alpha_pixels": removed_area})
            pages[key] = {"path": path, "source_sha256": digest, "size": src.size,
                          "cells": cells, "boxes": boxes, "cleanup": page_cleanup}
    return pages


def calibrate(pages: dict[str, dict]) -> dict[str, float]:
    scales = {}
    for runner in RUNNERS:
        heights = []
        for outfit in OUTFITS:
            page = pages[f"{runner}-{outfit}"]
            for i in range(8):
                box = page["boxes"][i]
                if box:
                    heights.append((box[3] - box[1]) * 64.0 / page["cells"][i].height)
        if len(heights) != 32:
            raise SystemExit(f"STOP: empty idle calibration frame for {runner}")
        scales[runner] = 48.0 / median(heights)
        if scales[runner] < 0.70:
            raise SystemExit(f"STOP: runner-global scale below 0.70 for {runner}: {scales[runner]:.6f}")
    return scales


def page_translation(page: dict, scale: float) -> tuple[float, float]:
    idle_centres, contacts = [], []
    for i in range(8):
        box = page["boxes"][i]
        if box:
            idle_centres.append(((box[0] + box[2]) / 2) * 64.0 / page["cells"][i].width)
    for i in range(16):  # idle + run are the only grounded calibration rows
        box = page["boxes"][i]
        if box:
            contacts.append(box[3] * 64.0 / page["cells"][i].height)
    if len(idle_centres) != 8 or len(contacts) != 16:
        raise SystemExit("STOP: missing idle/run calibration frame")
    return 32.0 - scale * median(idle_centres), 56.0 - scale * median(contacts)


def boundary_halo_count(im: Image.Image) -> int:
    a = np.asarray(im)
    opaque = a[..., 3] > 0
    clear_neighbour = np.zeros_like(opaque)
    clear_neighbour[1:] |= ~opaque[:-1]
    clear_neighbour[:-1] |= ~opaque[1:]
    clear_neighbour[:, 1:] |= ~opaque[:, :-1]
    clear_neighbour[:, :-1] |= ~opaque[:, 1:]
    p = a[..., :3].astype(np.int16)
    return int(np.count_nonzero(opaque & clear_neighbour & (p[..., 1] > 80) &
                                  (p[..., 1] - np.maximum(p[..., 0], p[..., 2]) > 24)))


def render_cell(cell: Image.Image, scale: float, tx: float, ty: float) -> tuple[Image.Image, bool]:
    sx, sy = 64.0 / cell.width, 64.0 / cell.height
    nw = max(1, round(cell.width * sx * scale))
    nh = max(1, round(cell.height * sy * scale))
    resized = cell.resize((nw, nh), RESAMPLE)
    # Resampling can recreate a thin green-biased fringe; clean only pixels
    # directly bordering transparency, never interior costume pixels.
    arr = np.asarray(resized).copy()
    opaque = arr[..., 3] > 0
    adjacent_clear = np.zeros_like(opaque)
    adjacent_clear[1:] |= ~opaque[:-1]
    adjacent_clear[:-1] |= ~opaque[1:]
    adjacent_clear[:, 1:] |= ~opaque[:, :-1]
    adjacent_clear[:, :-1] |= ~opaque[:, 1:]
    p = arr[..., :3].astype(np.int16)
    edge_spill = opaque & adjacent_clear & (p[..., 1] > 80) & (
        p[..., 1] - np.maximum(p[..., 0], p[..., 2]) > 24)
    rb = np.maximum(p[..., 0], p[..., 2])
    arr[..., 1][edge_spill] = np.clip(rb[edge_spill] + 8, 0, 255).astype(np.uint8)
    resized = Image.fromarray(arr, "RGBA")
    x, y = round(tx), round(ty)
    box = resized.getchannel("A").getbbox()
    overflow = bool(box and (x + box[0] < 0 or y + box[1] < 0 or x + box[2] > 64 or y + box[3] > 64))
    out = Image.new("RGBA", (64, 64))
    out.alpha_composite(resized, (x, y))
    arr = np.asarray(out).copy()
    opaque = arr[..., 3] > 0
    adjacent_clear = np.zeros_like(opaque)
    adjacent_clear[1:] |= ~opaque[:-1]
    adjacent_clear[:-1] |= ~opaque[1:]
    adjacent_clear[:, 1:] |= ~opaque[:, :-1]
    adjacent_clear[:, :-1] |= ~opaque[:, 1:]
    p = arr[..., :3].astype(np.int16)
    edge_spill = opaque & adjacent_clear & (p[..., 1] > 80) & (
        p[..., 1] - np.maximum(p[..., 0], p[..., 2]) > 24)
    rb = np.maximum(p[..., 0], p[..., 2])
    arr[..., 1][edge_spill] = np.clip(rb[edge_spill] + 8, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    return out, overflow


def save_png(im: Image.Image, path: Path) -> None:
    im.save(path, format="PNG", optimize=True, compress_level=9)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    pages = load_pages()
    scales = calibrate(pages)
    report = {"schema": 1, "calibration": {"idle_height_px": 48, "contact_y": 56,
              "idle_center_x": 32}, "runner_scales": scales, "pages": {}}
    failures = []
    for runner in RUNNERS:
        for outfit in OUTFITS:
            key = f"{runner}-{outfit}"
            page, scale = pages[key], scales[runner]
            tx, ty = page_translation(page, scale)
            atlas = Image.new("RGBA", (512, 512))
            frames, rendered = [], []
            for i, cell in enumerate(page["cells"]):
                out, overflow = render_cell(cell, scale, tx, ty)
                atlas.alpha_composite(out, ((i % 8) * 64, (i // 8) * 64))
                rendered.append(out)
                alpha_pixels = int(np.count_nonzero(np.asarray(out.getchannel("A"))))
                halo = boundary_halo_count(out)
                box = alpha_bbox(out)
                item = {"index": i, "row": i // 8, "column": i % 8,
                        "alpha_pixels": alpha_pixels,
                        "alpha_ratio": round(alpha_pixels / 4096.0, 8),
                        "bbox": list(box) if box else None, "overflow": overflow,
                        "boundary_green_halo_pixels": halo, "empty": box is None}
                item.update(page["cleanup"][i])
                frames.append(item)
                if item["empty"] or overflow or halo:
                    failures.append(f"{key} frame {i}: empty={item['empty']} overflow={overflow} halo={halo}")
            atlas_path = OUT / f"{key}-full.png"
            save_png(atlas, atlas_path)
            contact = Image.new("RGBA", (1024, 1024), (20, 24, 31, 255))
            draw = ImageDraw.Draw(contact)
            for i, frame in enumerate(rendered):
                tile = frame.resize((128, 128), Image.Resampling.NEAREST)
                x, y = (i % 8) * 128, (i // 8) * 128
                contact.alpha_composite(tile, (x, y))
                draw.rectangle((x, y, x + 127, y + 127), outline=(53, 61, 75, 255), width=1)
            contact_path = EVIDENCE / f"contact-{key}.png"
            save_png(contact, contact_path)
            page_report = {"source": str(page["path"].relative_to(ROOT)).replace("\\", "/"),
                           "source_sha256": page["source_sha256"], "source_size": list(page["size"]),
                           "runner_global_scale": round(scale, 8),
                           "page_translation": [round(tx, 8), round(ty, 8)], "frames": frames,
                           "empty_count": sum(f["empty"] for f in frames),
                           "overflow_count": sum(f["overflow"] for f in frames),
                           "halo_count": sum(f["boundary_green_halo_pixels"] for f in frames),
                           "removed_component_count": sum(f["removed_components"] for f in frames),
                           "removed_alpha_pixels": sum(f["removed_alpha_pixels"] for f in frames),
                           "atlas": str(atlas_path.relative_to(ROOT)).replace("\\", "/"),
                           "atlas_sha256": sha256(atlas_path), "atlas_bytes": atlas_path.stat().st_size,
                           "contact": str(contact_path.relative_to(ROOT)).replace("\\", "/")}
            if page_report["atlas_bytes"] > 524288:
                failures.append(f"{key}: {page_report['atlas_bytes']} bytes exceeds 524288")
            report["pages"][key] = page_report
    report_path = EVIDENCE / "import.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if failures:
        raise SystemExit("STOP: " + "; ".join(failures[:12]))
    for key, data in report["pages"].items():
        print(f"{key} {data['atlas_sha256'][:16]} {data['atlas_bytes']}")
    print("scales " + " ".join(f"{k}={v:.8f}" for k, v in scales.items()))


if __name__ == "__main__":
    main()
