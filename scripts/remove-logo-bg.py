#!/usr/bin/env python3
"""Remove solid black / checkerboard backgrounds from OEM logos → transparent PNG."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CARS = ROOT / "frontend" / "public" / "partners" / "cars"

# mode: black = knock out near-black plate; checker = knock out checker tiles; edge = edge flood only (keep interior black)
JOBS = [
    ("_src_byd.png", "byd.png", "black"),
    ("_src_aston-martin.png", "aston-martin.png", "black"),
    ("_src_vinfast.png", "vinfast.png", "black"),
    ("_src_mini.jpg", "mini.png", "edge"),
    ("_src_lotus.jpg", "lotus.png", "black"),
    ("_src_ferrari.jpg", "ferrari.png", "checker"),
    ("_src_maserati.jpg", "maserati.png", "checker"),
    ("_src_bentley.jpg", "bentley.png", "checker"),
    ("_src_mahindra.jpg", "mahindra.png", "black"),
    ("_src_lamborghini.jpg", "lamborghini.png", "checker"),
]


def is_near_black(r: int, g: int, b: int, thr: int = 40) -> bool:
    return r <= thr and g <= thr and b <= thr


def is_checker(r: int, g: int, b: int) -> bool:
    # baked transparency checker: white / light-gray / mid-gray neutrals
    if abs(r - g) > 14 or abs(g - b) > 14:
        return False
    if r >= 235 and g >= 235 and b >= 235:
        return True
    if 95 <= r <= 215:
        return True
    return False


def edge_flood(arr: np.ndarray, pred, soft_tol: int = 22) -> np.ndarray:
    """Return boolean mask of background reachable from image border."""
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    mask = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_seed(y: int, x: int) -> None:
        if mask[y, x]:
            return
        r, g, b = map(int, rgb[y, x])
        if pred(r, g, b):
            mask[y, x] = True
            q.append((y, x))

    for x in range(w):
        for y in range(min(4, h)):
            try_seed(y, x)
            try_seed(h - 1 - y, x)
    for y in range(h):
        for x in range(min(4, w)):
            try_seed(y, x)
            try_seed(y, w - 1 - x)

    while q:
        y, x = q.popleft()
        pr, pg, pb = map(int, rgb[y, x])
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = y + dy, x + dx
            if not (0 <= ny < h and 0 <= nx < w) or mask[ny, nx]:
                continue
            r, g, b = map(int, rgb[ny, nx])
            if pred(r, g, b):
                mask[ny, nx] = True
                q.append((ny, nx))
            elif abs(r - pr) <= soft_tol and abs(g - pg) <= soft_tol and abs(b - pb) <= soft_tol:
                if pred(r, g, b) or is_near_black(r, g, b, 50) or is_checker(r, g, b):
                    mask[ny, nx] = True
                    q.append((ny, nx))
    return mask


def remove_bg(img: Image.Image, mode: str) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)

    if mode == "black":
        # Global knockout of near-black plate (safe when logo is colored/chrome)
        mask = (
            (rgb[:, :, 0] <= 42)
            & (rgb[:, :, 1] <= 42)
            & (rgb[:, :, 2] <= 42)
        )
        # also clear pure white plate if any
        white = (rgb[:, :, 0] >= 250) & (rgb[:, :, 1] >= 250) & (rgb[:, :, 2] >= 250)
        # only keep white if connected to border (avoid wiping highlights) — skip global white
        arr[mask, 3] = 0
        # fringe: darken-to-clear soft blacks near cleared pixels
        fringe = (
            (rgb[:, :, 0] <= 55)
            & (rgb[:, :, 1] <= 55)
            & (rgb[:, :, 2] <= 55)
            & (arr[:, :, 3] > 0)
        )
        # only fringe if majority of 3x3 neighbors already transparent
        # simple: also clear very dark leftovers near edges via edge flood
        edge = edge_flood(arr, lambda r, g, b: is_near_black(r, g, b, 55))
        arr[edge, 3] = 0
        arr[fringe & edge, 3] = 0

    elif mode == "checker":
        mask = np.zeros((h, w), dtype=bool)
        for y in range(h):
            for x in range(w):
                r, g, b = map(int, rgb[y, x])
                if is_checker(r, g, b):
                    mask[y, x] = True
        # Only clear checker pixels connected to border (preserve silver chrome that looks gray)
        edge = edge_flood(arr, is_checker, soft_tol=18)
        arr[edge, 3] = 0
        # also clear any leftover checker-looking border islands
        # second pass: global checker that is near already-transparent pixels
        alpha = arr[:, :, 3]
        for _ in range(2):
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if alpha[y, x] == 0:
                        continue
                    r, g, b = map(int, rgb[y, x])
                    if not is_checker(r, g, b):
                        continue
                    if (
                        alpha[y - 1, x] == 0
                        or alpha[y + 1, x] == 0
                        or alpha[y, x - 1] == 0
                        or alpha[y, x + 1] == 0
                    ):
                        arr[y, x, 3] = 0
            alpha = arr[:, :, 3]

    else:  # edge — keep interior blacks (MINI disc)
        edge = edge_flood(
            arr,
            lambda r, g, b: is_near_black(r, g, b, 35) or is_checker(r, g, b),
            soft_tol=20,
        )
        arr[edge, 3] = 0

    # crop to content
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return Image.fromarray(arr)
    pad = 8
    l, r = max(0, int(xs.min()) - pad), min(w, int(xs.max()) + pad + 1)
    t, b = max(0, int(ys.min()) - pad), min(h, int(ys.max()) + pad + 1)
    cropped = Image.fromarray(arr[t:b, l:r])
    mw = max(cropped.size)
    if mw > 640:
        scale = 640 / mw
        cropped = cropped.resize(
            (max(1, int(cropped.width * scale)), max(1, int(cropped.height * scale))),
            Image.Resampling.LANCZOS,
        )
    return cropped


def main() -> None:
    for src_name, out_name, mode in JOBS:
        src = CARS / src_name
        if not src.exists():
            print("MISSING", src_name)
            continue
        result = remove_bg(Image.open(src), mode)
        out = CARS / out_name
        result.save(out, "PNG", optimize=True)
        a = np.array(result)
        trans = float((a[:, :, 3] < 10).mean())
        print(f"OK {out_name} mode={mode} {result.size} transparent={trans:.0%} bytes={out.stat().st_size}")

    # cleanup temp sources
    for p in CARS.glob("_src_*"):
        p.unlink()
        print("deleted", p.name)


if __name__ == "__main__":
    main()
