# 异种敌人：色相偏移 + 暗紫描边光晕（程序化，源自自有 GenerateImage 敌人图）
import sys, os, numpy as np
from PIL import Image, ImageFilter
A = '/workspace/game/app/public/assets/'
def hue_shift(im, deg):
    rgb = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    a = rgb[..., 3:]; hsv = np.asarray(Image.fromarray((rgb[..., :3] * 255).astype(np.uint8)).convert('HSV')).astype(np.int32)
    hsv[..., 0] = (hsv[..., 0] + int(deg / 360 * 255)) % 256; hsv[..., 1] = np.clip(hsv[..., 1] * 1.25, 0, 255)
    out = np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB')).astype(np.float32) / 255
    return Image.fromarray((np.concatenate([out, a], -1) * 255).astype(np.uint8), 'RGBA')
def glow(im, col):
    a = im.split()[3]; g = a.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(6))
    layer = Image.new('RGBA', im.size, col + (0,)); layer.putalpha(g.point(lambda v: int(v * 0.85)))
    return Image.alpha_composite(layer, im)
n = 0
for f in sorted(os.listdir(A + 'enemy')):
    if f.startswith('v_') or not f.endswith('.webp'): continue
    im = Image.open(A + 'enemy/' + f).convert('RGBA'); k = n % 4
    deg = [150, 210, 90, 270][k]; col = [(170, 90, 255), (255, 70, 60), (80, 220, 255), (255, 200, 60)][k]
    out = glow(hue_shift(im, deg), col); out.save(A + 'enemy/v_' + f, 'WEBP', quality=86, method=5); n += 1
print('variants', n)
