#!/usr/bin/env python3
"""Generate multi-pose 晏归 portraits from existing art (no MiniMax)."""
import os, math
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageOps

A = '/workspace/game/app/public/assets/'
OUT = A + 'por/pose/'
os.makedirs(OUT, exist_ok=True)
RAW = '/workspace/game/art_raw/'

def load(p):
    return Image.open(p).convert('RGBA')

def save(im, name, q=88):
    path = OUT + name + '.webp'
    im.save(path, 'WEBP', quality=q, method=5)
    print('wrote', path, im.size)
    return path

def to_arr(im):
    return np.asarray(im).astype(np.float32) / 255

def from_arr(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA')

def grade(im, warm=0, cool=0, bright=1.0, contrast=1.0, sat=1.0, shadow=(0,0,0,0)):
    im = im.copy()
    if bright != 1: im = ImageEnhance.Brightness(im).enhance(bright)
    if contrast != 1: im = ImageEnhance.Contrast(im).enhance(contrast)
    if sat != 1: im = ImageEnhance.Color(im).enhance(sat)
    a = to_arr(im)
    if warm:
        a[..., 0] = np.clip(a[..., 0] + warm * a[..., 3], 0, 1)
        a[..., 1] = np.clip(a[..., 1] + warm * 0.55 * a[..., 3], 0, 1)
    if cool:
        a[..., 2] = np.clip(a[..., 2] + cool * a[..., 3], 0, 1)
        a[..., 0] = np.clip(a[..., 0] - cool * 0.25 * a[..., 3], 0, 1)
    if shadow[3]:
        a[..., 0] = a[..., 0] * (1 - shadow[3]) + shadow[0] * shadow[3] * a[..., 3] / 255
        # simpler multiply dark
    return from_arr(a)

def crop_focus(im, box, size=(600, 800)):
    """box = (l,t,r,b) fractions 0-1"""
    w, h = im.size
    l, t, r, b = box
    c = im.crop((int(l*w), int(t*h), int(r*w), int(b*h)))
    return c.resize(size, Image.LANCZOS)

def lean_warp(im, lean=0.06, stretch_y=1.0, stretch_x=1.0):
    """Simple perspective-ish lean via affine."""
    w, h = im.size
    dx = int(lean * w)
    coeffs = (
        1, lean * 0.35, -dx * 0.3,
        0, stretch_y, (1 - stretch_y) * h * 0.5,
    )
    # use transform with mesh
    a = to_arr(im)
    hh, ww = a.shape[:2]
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    u = yy / max(hh - 1, 1)
    xs = (xx - ww/2) / stretch_x + ww/2 - lean * (u ** 1.2) * ww
    ys = (yy - hh) / stretch_y + hh
    from scipy.ndimage import map_coordinates
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    o = np.stack([map_coordinates(pm[..., c], [ys, xs], order=1, mode='constant', cval=0) for c in range(4)], -1)
    al = o[..., 3:4]
    o[..., :3] = np.where(al > 1e-3, o[..., :3] / np.maximum(al, 1e-3), 0)
    return from_arr(o)

def add_glow(im, color=(255, 180, 80), strength=0.45, blur=18):
    a = im.split()[3]
    g = a.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new('RGBA', im.size, color + (0,))
    layer.putalpha(g.point(lambda v: int(v * strength)))
    return Image.alpha_composite(layer, im)

def vignette(im, strength=0.35):
    a = to_arr(im)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cy, cx = (h-1)/2, (w-1)/2
    r = np.sqrt(((yy-cy)/cy)**2 + ((xx-cx)/cx)**2)
    m = np.clip(1 - (r - 0.55) * strength * 2, 0.55, 1)
    a[..., :3] *= m[..., None]
    return from_arr(a)

def extract_chroma(im, key=(0, 255, 0), tol=55):
    a = np.asarray(im.convert('RGBA'))
    rgb = a[..., :3].astype(np.int16)
    d = np.abs(rgb - np.array(key, dtype=np.int16)).sum(-1)
    # also catch near-green
    gdom = (rgb[..., 1] > rgb[..., 0] + 30) & (rgb[..., 1] > rgb[..., 2] + 30) & (rgb[..., 1] > 80)
    mask = (d < tol * 3) | gdom
    out = a.copy()
    out[mask, 3] = 0
    # fringe clean
    alpha = Image.fromarray(out[..., 3], 'L').filter(ImageFilter.MinFilter(3))
    out[..., 3] = np.asarray(alpha)
    return Image.fromarray(out, 'RGBA')

def composite_lamp(base, lamp, place=(0.62, 0.55), scale=0.28):
    b = base.copy()
    lw = int(b.width * scale)
    lamp = lamp.copy()
    lamp.thumbnail((lw, int(lw * lamp.height / lamp.width)), Image.LANCZOS)
    # glow behind lamp
    glow = Image.new('RGBA', b.size, (0,0,0,0))
    cx = int(place[0] * b.width); cy = int(place[1] * b.height)
    d = ImageDraw.Draw(glow)
    for r, al in [(90, 40), (55, 70), (30, 110)]:
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255, 170, 60, al))
    b = Image.alpha_composite(b, glow)
    x = cx - lamp.width // 2; y = cy - lamp.height // 2
    b.alpha_composite(lamp, (x, y))
    return b

# —— sources ——
por = load(A + 'por/yangui.webp')
por_rgb = load(RAW + 'por_rgb/yangui.webp') if os.path.exists(RAW + 'por_rgb/yangui.webp') else por
p_raw = load(RAW + 'p_yangui.jpg')
spr = load(RAW + 'v11/spr_yangui.jpg')
lamp = load(A + 'spr/o_lamp_lit.webp')

# 1 idle — clean hub default (slight crop, soft grade)
idle = crop_focus(por, (0.02, 0.0, 0.98, 0.98))
idle = grade(idle, warm=0.02, bright=1.02, contrast=1.05, sat=0.95)
idle = vignette(idle, 0.25)
save(idle, 'yangui_idle')

# 2 lamp — chibi holding lantern (chroma extract) + also portrait with lamp boost
chibi = extract_chroma(spr)
# fit into 600x800 canvas
canvas = Image.new('RGBA', (600, 800), (0, 0, 0, 0))
ch = chibi.copy()
ch.thumbnail((560, 760), Image.LANCZOS)
# trim empty
bb = ch.getchannel('A').getbbox()
if bb: ch = ch.crop(bb)
ch.thumbnail((560, 760), Image.LANCZOS)
ox = (600 - ch.width) // 2; oy = 800 - ch.height - 10
canvas.alpha_composite(ch, (ox, oy))
canvas = add_glow(canvas, (255, 160, 50), 0.35, 22)
save(canvas, 'yangui_lamp')

# portrait lamp (waist-up with stronger lantern glow)
lamp_por = grade(por, warm=0.06, bright=1.04, contrast=1.06, sat=1.05)
lamp_por = add_glow(lamp_por, (255, 170, 60), 0.28, 28)
lamp_por = composite_lamp(lamp_por, lamp, (0.72, 0.72), 0.22)
save(lamp_por, 'yangui_lamp_por')

# 3 battle — lean forward, cooler/red grade, tighter crop
battle = crop_focus(por, (0.08, 0.02, 1.0, 0.92))
battle = lean_warp(battle, lean=0.09, stretch_y=0.97, stretch_x=1.04)
battle = grade(battle, warm=0.04, cool=0.02, bright=1.0, contrast=1.15, sat=1.1)
battle = add_glow(battle, (255, 90, 50), 0.22, 16)
save(battle, 'yangui_battle')

# 4 think — face-focused crop, cool blue
think = crop_focus(por, (0.12, 0.0, 0.88, 0.72))
think = lean_warp(think, lean=-0.04, stretch_y=1.02, stretch_x=0.98)
think = grade(think, cool=0.08, bright=0.96, contrast=1.08, sat=0.85)
think = vignette(think, 0.4)
save(think, 'yangui_think')

# 5 smile / clear — warmer, brighter eyes region
smile = crop_focus(p_raw if p_raw else por, (0.05, 0.02, 0.95, 0.95))
smile = smile.resize((600, 800), Image.LANCZOS)
smile = grade(smile, warm=0.08, bright=1.08, contrast=1.05, sat=1.08)
# soft gold dust overlay
dust = Image.new('RGBA', smile.size, (0,0,0,0))
dr = ImageDraw.Draw(dust)
rng = np.random.default_rng(7)
for _ in range(80):
    x, y = int(rng.integers(0, 600)), int(rng.integers(0, 800))
    r = int(rng.integers(1, 3)); al = int(rng.integers(40, 120))
    dr.ellipse([x-r, y-r, x+r, y+r], fill=(255, 210, 120, al))
smile = Image.alpha_composite(smile.convert('RGBA'), dust)
save(smile, 'yangui_smile')

# 6 hurt / solemn — red tint, darker
hurt = crop_focus(por, (0.06, 0.04, 0.96, 0.96))
hurt = lean_warp(hurt, lean=-0.1, stretch_y=0.98, stretch_x=1.03)
hurt = grade(hurt, warm=0.05, bright=0.88, contrast=1.12, sat=0.9)
a = to_arr(hurt)
a[..., 0] = np.clip(a[..., 0] + 0.12 * a[..., 3], 0, 1)
a[..., 1] = np.clip(a[..., 1] * 0.9, 0, 1)
hurt = from_arr(a)
hurt = vignette(hurt, 0.5)
save(hurt, 'yangui_hurt')

# 7 cast / solemn ritual — purple-blue glow
cast = crop_focus(por, (0.04, 0.0, 0.96, 0.94))
cast = lean_warp(cast, lean=0.03, stretch_y=1.04, stretch_x=0.97)
cast = grade(cast, cool=0.1, bright=0.98, contrast=1.1, sat=1.05)
cast = add_glow(cast, (120, 140, 255), 0.4, 24)
save(cast, 'yangui_cast')

# 8 title / key — slightly wider scenic crop from p_raw with lamp glow
title = crop_focus(p_raw, (0.0, 0.0, 1.0, 1.0))
title = title.resize((600, 800), Image.LANCZOS)
title = grade(title, warm=0.04, bright=1.03, contrast=1.08, sat=1.0)
title = add_glow(title, (255, 180, 80), 0.2, 30)
save(title, 'yangui_title')

# also write manifest
manifest = '''idle 待机/枢纽默认
lamp 持灯（Q版全身，枢纽可选）
lamp_por 持灯（半身强化灯火）
battle 战斗前倾
think 思索近景
smile 通关/温暖
hurt 受伤/凝重
cast 施法/仪式
title 标题/宣传
'''
open(OUT + 'MANIFEST.txt', 'w').write(manifest)
print('DONE poses')
