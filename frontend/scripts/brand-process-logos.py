"""One-off: turn the white-background Motorcart logo exports into transparent brand PNGs.

Outputs (frontend/public/brand):
  motorcart-lockup.png       icon + wordmark, navy text (light backgrounds)
  motorcart-lockup-dark.png  icon + wordmark, white text (dark backgrounds)
  motorcart-wordmark.png     text-only wordmark (header, light theme)
  motorcart-wordmark-dark.png  text-only wordmark, white text (header, dark theme)
  motorcart-emblem.png       icon only (optional 3rd argument)
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public" / "brand"
# ~3x the largest on-screen height — sharp on retina, small download.
LOCKUP_HEIGHT = 144
WORDMARK_HEIGHT = 96
EMBLEM_HEIGHT = 192


def color_to_alpha(rgb: np.ndarray) -> np.ndarray:
    """Remove white: alpha from distance to white, colours un-premultiplied (smooth edges)."""
    f = rgb.astype(np.float32) / 255.0
    alpha = np.clip((1.0 - f).max(axis=2), 0, 1)
    alpha = np.where(alpha < 0.04, 0, alpha)
    safe = np.where(alpha > 0, alpha, 1)[..., None]
    col = np.clip((f - (1 - alpha[..., None])) / safe, 0, 1)
    return np.dstack([col * 255, alpha * 255]).astype(np.uint8)


def border_background_mask(rgb: np.ndarray, thresh: int = 232) -> np.ndarray:
    """Near-white pixels connected to the image border (keeps white details inside the emblem)."""
    h, w, _ = rgb.shape
    white = (rgb >= thresh).all(axis=2)
    mask = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not mask[y, x]:
                mask[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not mask[ny, nx]:
                mask[ny, nx] = True
                q.append((ny, nx))
    return mask


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


def emblem_to_alpha(rgb: np.ndarray) -> np.ndarray:
    bg = border_background_mask(rgb)
    rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
    soft = color_to_alpha(rgb)
    edge = dilate(bg, 2) & ~bg
    rgba[bg] = 0
    rgba[edge] = soft[edge]
    return rgba


def crop_to_content(rgba: np.ndarray, pad: int = 4) -> np.ndarray:
    ys, xs = np.where(rgba[..., 3] > 8)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, rgba.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, rgba.shape[1])
    return rgba[y0:y1, x0:x1]


def navy_to_white(rgba: np.ndarray) -> np.ndarray:
    """Dark-mode variant: navy/dark-blue pixels become white, greens stay green."""
    out = rgba.copy()
    r, g, b = (out[..., i].astype(int) for i in range(3))
    navy = (b > r + 15) & (b >= g) & (r + g + b < 420)
    out[navy, 0:3] = 255
    return out


def find_split(rgb: np.ndarray) -> int:
    """First fully-white column gap after the emblem (emblem sits in the left ~30%)."""
    white_col = (rgb >= 235).all(axis=2).all(axis=0)
    w = rgb.shape[1]
    for x in range(int(w * 0.2), int(w * 0.4)):
        if white_col[x]:
            return x
    return int(w * 0.28)


def save(rgba: np.ndarray, name: str, height: int) -> None:
    im = Image.fromarray(rgba, "RGBA")
    if im.height > height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    im.quantize(colors=128, method=Image.Quantize.FASTOCTREE).save(OUT / name, optimize=True)


def main(lockup_path: str, wordmark_path: str, emblem_path: str | None = None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    lock = np.array(Image.open(lockup_path).convert("RGB"))
    split = find_split(lock)
    left = emblem_to_alpha(lock[:, :split])
    right = color_to_alpha(lock[:, split:])
    lockup = crop_to_content(np.concatenate([left, right], axis=1))
    save(lockup, "motorcart-lockup.png", LOCKUP_HEIGHT)
    save(navy_to_white(lockup), "motorcart-lockup-dark.png", LOCKUP_HEIGHT)

    word = np.array(Image.open(wordmark_path).convert("RGB"))
    wordmark = crop_to_content(color_to_alpha(word))
    save(wordmark, "motorcart-wordmark.png", WORDMARK_HEIGHT)
    save(navy_to_white(wordmark), "motorcart-wordmark-dark.png", WORDMARK_HEIGHT)

    names = [
        "motorcart-lockup.png",
        "motorcart-lockup-dark.png",
        "motorcart-wordmark.png",
        "motorcart-wordmark-dark.png",
    ]
    if emblem_path:
        emblem = np.array(Image.open(emblem_path).convert("RGB"))
        emblem_rgba = crop_to_content(emblem_to_alpha(emblem))
        save(emblem_rgba, "motorcart-emblem.png", EMBLEM_HEIGHT)
        save(navy_to_white(emblem_rgba), "motorcart-emblem-dark.png", EMBLEM_HEIGHT)
        names += ["motorcart-emblem.png", "motorcart-emblem-dark.png"]

    for name in names:
        im = Image.open(OUT / name)
        print(name, im.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
