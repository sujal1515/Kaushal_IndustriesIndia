"""Prepare the home-hero product images (public/images/hero/<category-slug>.png).

The catalogue photos are small (278 px) shots on white. For the hero, each one is:
  1. cut out from its white backdrop (flood fill from the borders, so white parts *inside* the
     product stay), with soft anti-aliased edges and the white fringe removed;
  2. upscaled in 2x Lanczos steps on premultiplied alpha, sharpened lightly after each step;
  3. placed on a square canvas at a consistent size and baseline, over a soft contact shadow.
Photos that are not product shots (castings) become a rounded photo card instead.

Usage: python scripts/prepare-hero-images.py
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "images" / "products"
OUT = ROOT / "public" / "images" / "hero"

CANVAS = 1200  # output size (px); the hero shows it at up to ~24rem, so this covers 2x screens
BASELINE = 0.9  # product bottom, as a fraction of the canvas height
MAX_W, MAX_H = 0.94, 0.8  # product box, as fractions of the canvas
SHADOW = (53, 19, 3)  # chocolate, from the palette

ITEMS = {
    "diesel-engines": ("high-speed-air-cooled-single.png", "cutout"),
    "generating-sets": ("air-cooled-generating-set.png", "cutout"),
    "pumps": ("centrifugal-water-pump.png", "cutout"),
    "agricultural-machinery": ("corn-grinder.png", "cutout"),
    "castings": ("castings-foundry.png", "photo"),
    "spare-parts": ("spare-parts.png", "cutout"),
}


def matte(rgb: np.ndarray, t_bg: float = 26.0) -> np.ndarray:
    """Alpha (0..1) for a product shot on white."""
    h, w, _ = rgb.shape
    deficit = 255.0 - rgb.min(axis=2)  # 0 on pure white, large on colour or dark
    cand = deficit < t_bg
    bg = np.zeros((h, w), bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    # Background trapped between parts: enclosed pockets of near-pure white. White parts of the
    # product itself (filters, pistons) carry shading, so their average deficit is well above this.
    seen = bg.copy()
    for sy, sx in zip(*np.nonzero(cand & ~bg)):
        if seen[sy, sx]:
            continue
        pocket = [(sy, sx)]
        seen[sy, sx] = True
        i = 0
        while i < len(pocket):
            y, x = pocket[i]
            i += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    pocket.append((ny, nx))
        ys, xs = zip(*pocket)
        if len(pocket) > 80 and deficit[ys, xs].mean() < 3.0:
            bg[ys, xs] = True
    alpha = np.where(bg, 0.0, 1.0)
    # Soft edge: background pixels right next to the product keep partial coverage.
    product = Image.fromarray(((~bg) * 255).astype(np.uint8))
    near = np.asarray(product.filter(ImageFilter.MaxFilter(5))) > 0
    soft = np.clip((deficit - 7.0) / (t_bg - 7.0), 0.0, 1.0)
    alpha = np.where(bg & near, soft, alpha)
    # Drop specks: tiny opaque islands left in the background.
    a_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(a_img).astype(np.float32) / 255.0


def unwhite(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Remove the white the edge pixels were blended with (colour decontamination)."""
    a = np.clip(alpha, 1e-3, 1.0)[..., None]
    out = (rgb - (1.0 - a) * 255.0) / a
    return np.clip(np.where(alpha[..., None] > 0.995, rgb, out), 0, 255)


def upscale(rgba: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Lanczos in ~2x steps on premultiplied alpha, sharpening after each step."""
    arr = np.asarray(rgba).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    pre = np.concatenate([arr[..., :3] * a, arr[..., 3:4]], axis=2)
    img = Image.fromarray(np.clip(pre, 0, 255).astype(np.uint8), "RGBA")
    w, h = img.size
    while w * 2 < size[0]:
        w, h = w * 2, h * 2
        img = img.resize((w, h), Image.LANCZOS)
        rgb = img.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=3))
        img = Image.merge("RGBA", (*rgb.split(), img.getchannel("A")))
    img = img.resize(size, Image.LANCZOS)
    rgb = img.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    arr = np.asarray(Image.merge("RGBA", (*rgb.split(), img.getchannel("A")))).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    un = np.where(a > 0, arr[..., :3] / np.clip(a, 1e-3, 1), 0)
    return Image.fromarray(np.clip(np.concatenate([un, arr[..., 3:4]], axis=2), 0, 255).astype(np.uint8), "RGBA")


def shadow_layer(footprint: tuple[int, int, int], spread: float, opacity: float, blur: float) -> Image.Image:
    """An elliptical shadow centred under the product's footprint."""
    x0, x1, y = footprint
    cx, w = (x0 + x1) / 2, (x1 - x0) * spread
    layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - w / 2, y - w * 0.045, cx + w / 2, y + w * 0.045), fill=(*SHADOW, int(255 * opacity)))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def place_cutout(src: Path) -> Image.Image:
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    alpha = matte(rgb)
    clean = unwhite(rgb, alpha)
    rgba = Image.fromarray(np.concatenate([clean, alpha[..., None] * 255], axis=2).astype(np.uint8), "RGBA")
    rgba = rgba.crop(rgba.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    scale = min(CANVAS * MAX_W / rgba.width, CANVAS * MAX_H / rgba.height)
    product = upscale(rgba, (round(rgba.width * scale), round(rgba.height * scale)))
    left = (CANVAS - product.width) // 2
    top = round(CANVAS * BASELINE) - product.height
    # Footprint: the product's width across its lowest rows.
    a = np.asarray(product.getchannel("A")) > 64
    rows = np.where(a.any(axis=1))[0]
    base = a[max(rows[-1] - product.height // 12, 0) : rows[-1] + 1].any(axis=0)
    cols = np.where(base)[0]
    foot = (left + cols[0], left + cols[-1], top + rows[-1])
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(shadow_layer(foot, 1.25, 0.16, 28))  # soft ambient
    canvas.alpha_composite(shadow_layer(foot, 0.95, 0.30, 9))  # contact
    canvas.alpha_composite(product, (left, top))
    return canvas


def place_photo(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGB")
    side = round(CANVAS * 0.74)
    photo = upscale(img.convert("RGBA"), (side, side))
    radius = 18
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, side - 1, side - 1), radius=radius, fill=255)
    photo.putalpha(mask)
    left = (CANVAS - side) // 2
    top = round(CANVAS * BASELINE) - side
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    drop = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    ImageDraw.Draw(drop).rounded_rectangle((left + 10, top + 36, left + side - 10, top + side + 26), radius=radius, fill=(*SHADOW, 70))
    canvas.alpha_composite(drop.filter(ImageFilter.GaussianBlur(34)))
    canvas.alpha_composite(photo, (left, top))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (name, kind) in ITEMS.items():
        out = (place_cutout if kind == "cutout" else place_photo)(SRC / name)
        path = OUT / f"{slug}.png"
        out.save(path, optimize=True)
        print(f"{path.relative_to(ROOT)}  {out.size}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
