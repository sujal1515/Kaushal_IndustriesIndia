"""Remove the baked checkerboard from heroenginetransparent.mp4 and export a cropped,
transparent WebP frame sequence for the scroll-scrubbed hero.

usage: python scripts/key-hero-frames.py <src.mp4> <out_dir> <step> <out_width> <quality> [--preview]
  pip install numpy opencv-python-headless imageio-ffmpeg pillow
  python scripts/key-hero-frames.py ../assets1/heroenginetransparent.mp4 public/hero-engine 2 720 70
FRAME_COUNT / FRAME_W / FRAME_H in src/components/site/hero-engine.tsx must match the output.
"""
import sys, os, json
import numpy as np, cv2, imageio_ffmpeg
from PIL import Image

src, out_dir, step, out_w, quality = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
preview = "--preview" in sys.argv
os.makedirs(out_dir, exist_ok=True)

def frames():
    gen = imageio_ffmpeg.read_frames(src)
    meta = next(gen)
    w, h = meta["size"]
    for i, b in enumerate(gen):
        yield i, np.frombuffer(b, np.uint8).reshape(h, w, 3)

def alpha_mask(rgb):
    rgb16 = rgb.astype(np.int16)
    mn, mx = rgb16.min(2), rgb16.max(2)
    cand = ((mn >= 226) & (mx - mn <= 12)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(cand, connectivity=8)
    h, w = cand.shape
    # checkerboard tone bands (~238 and ~253)
    tone = ((mn >= 232) & (mn <= 244)) | (mn >= 248)
    tone_frac = np.bincount(labels.ravel(), weights=tone.ravel().astype(float), minlength=n) / np.maximum(stats[:, cv2.CC_STAT_AREA], 1)
    bg_labels = np.zeros(n, bool)
    for l in range(1, n):
        x, y, bw, bh, area = stats[l]
        touches = x == 0 or y == 0 or x + bw >= w or y + bh >= h
        if (touches and area >= 20) or (area >= 150 and tone_frac[l] >= 0.85):
            bg_labels[l] = True
    bg = bg_labels[labels]
    fg = (~bg).astype(np.uint8)
    # drop speckles of foreground floating in the background
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    small = np.zeros(n2, bool)
    small[1:] = st2[1:, cv2.CC_STAT_AREA] < 60
    fg[small[lab2]] = 0
    a = fg.astype(np.float32) * 255
    a = cv2.GaussianBlur(a, (0, 0), 0.9)
    # Fade anything touching the left/right/bottom frame edges (the rails) so it doesn't end in a hard cut.
    fade = 140
    xs = np.arange(w, dtype=np.float32)
    ys = np.arange(h, dtype=np.float32)
    fx = np.clip(np.minimum(xs, w - 1 - xs) / fade, 0, 1)
    fy = np.clip((h - 1 - ys) / fade, 0, 1)
    smooth = lambda t: t * t * (3 - 2 * t)
    a *= smooth(fx)[None, :] * smooth(fy)[:, None]
    return np.clip(a, 0, 255).astype(np.uint8)

# Pass 1: union bounding box of the foreground across sampled frames
x0 = y0 = 10**9; x1 = y1 = 0
for i, rgb in frames():
    if i % 12: continue
    a = alpha_mask(rgb)
    ys, xs = np.where(a > 40)
    if len(xs):
        x0, x1 = min(x0, xs.min()), max(x1, xs.max())
        y0, y1 = min(y0, ys.min()), max(y1, ys.max())
H, W = 1920, 1080
pad = 24
x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)
# expand to a 4:5 box (tile aspect), centred on the foreground
cw, ch = x1 - x0, y1 - y0
if cw / ch > 4 / 5:
    nh = int(round(cw * 5 / 4)); cy = (y0 + y1) // 2; y0, y1 = cy - nh // 2, cy - nh // 2 + nh
else:
    nw = int(round(ch * 4 / 5)); cx = (x0 + x1) // 2; x0, x1 = cx - nw // 2, cx - nw // 2 + nw
print("crop box", x0, y0, x1, y1, "size", x1 - x0, y1 - y0)

out_h = int(round(out_w * 5 / 4))
written = 0; total = 0
stone = np.array([229, 235, 237], np.float32)  # BGR of #edebe5 for preview
for i, rgb in frames():
    if i % step: continue
    if preview and i not in (0, 60, 120, 190): continue
    a = alpha_mask(rgb)
    rgba = np.dstack([rgb, a])
    # crop with transparent padding where the box exceeds the frame
    canvas = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    sx0, sy0, sx1, sy1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = rgba[sy0:sy1, sx0:sx1]
    img = Image.fromarray(canvas, "RGBA").resize((out_w, out_h), Image.LANCZOS)
    name = f"f{written:03d}.webp"
    img.save(os.path.join(out_dir, name), "WEBP", quality=quality, alpha_quality=80, method=6)
    total += os.path.getsize(os.path.join(out_dir, name))
    if preview:
        arr = np.asarray(img).astype(np.float32)
        al = arr[..., 3:4] / 255
        comp = arr[..., :3] * al + stone[::-1] * (1 - al)
        Image.fromarray(comp.astype(np.uint8)).save(os.path.join(out_dir, f"preview_{i}.png"))
    written += 1

print(json.dumps({"frames": written, "width": out_w, "height": out_h, "bytes": total, "avg_kb": round(total / max(written, 1) / 1024, 1)}))
