# 由 6 张 GenerateImage 道具图集切出 96 个底图，再按 5 品质合成 405 件装备图标
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
R='/workspace/game/art_raw/v20/'; O='/workspace/game/app/public/assets/icon/'
for d in ['gb','gen','ex']: os.makedirs(O+d,exist_ok=True)
def alpha_dark(im,lo=12,hi=48):
    a=np.asarray(im.convert('RGB')).astype(np.float32); m=a.max(2)
    al=np.clip((m-lo)/(hi-lo),0,1); return Image.fromarray(np.dstack([a,al*255]).astype(np.uint8),'RGBA')
bases=[]
for s in range(6):
    im=Image.open(R+f'gearsheet_{s}.jpg').convert('RGB'); c=im.width/4
    for i in range(16):
        x,y=(i%4)*c,(i//4)*c
        cell=alpha_dark(im.crop((int(x+4),int(y+4),int(x+c-4),int(y+c-4))))
        bb=cell.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox() or (0,0,cell.width,cell.height)
        cell=cell.crop(bb); w,h=cell.size; sc=112/max(w,h); cell=cell.resize((max(1,round(w*sc)),max(1,round(h*sc))),Image.LANCZOS)
        out=Image.new('RGBA',(128,128)); out.alpha_composite(cell,((128-cell.width)//2,(128-cell.height)//2))
        bases.append(out)
for i,b in enumerate(bases): b.save(O+f'gb/{i}.webp',quality=85,method=6)
EX=['lampwick','hp','mp','peach','egg_dragon','egg_fox','egg_bird','egg_beast','egg_spirit','key','gold','scroll','hammer','starmarrow','lucky','talisman']
for i,n in enumerate(EX): bases[80+i].save(O+f'ex/{n}.webp',quality=85,method=6)
RC=[(201,194,176),(127,208,138),(111,182,255),(196,140,255),(255,207,90)]
TC=[(255,140,60),(90,220,150),(80,210,220),(220,160,80),(240,235,210),(190,110,255),(255,200,60),(130,190,255),(170,120,255)]
def frame(r,t):
    S=128; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    col=RC[r]; yy,xx=np.mgrid[0:S,0:S]; dist=np.sqrt((xx-64)**2+(yy-64)**2)/64
    g=np.clip(1-dist,0,1)**1.6*(0.35+0.12*r)
    bg=np.zeros((S,S,4),np.float32); bg[...,:3]=np.array(col)*0.55+np.array([14,10,8]); bg[...,3]=255*np.clip(0.88,0,1)
    bg[...,:3]=bg[...,:3]*g[...,None]+np.array([16,12,10])*(1-g[...,None])
    im=Image.fromarray(bg.clip(0,255).astype(np.uint8),'RGBA'); d=ImageDraw.Draw(im)
    w=2+(r>=3); d.rounded_rectangle((1,1,S-2,S-2),10,outline=col+(255,),width=w)
    if r>=2: d.rounded_rectangle((5,5,S-6,S-6),8,outline=col+(110,),width=1)
    if r>=4:
        for (x,y) in [(6,6),(S-7,6),(6,S-7),(S-7,S-7)]: d.regular_polygon((x,y,5),4,fill=col+(255,))
    # tier pips
    tc=TC[t]
    for j in range(min(t+1,9)): d.ellipse((S-12-j*7,S-13,S-7-j*7,S-8),fill=tc+(230,))
    return im
n=0
for t in range(9):
    for si,slot in enumerate('wac'):
        for k in range(3):
            b=bases[t*9+si*3+k]
            for r in range(5):
                f=frame(r,t)
                if r>=3:
                    gl=b.getchannel('A').filter(ImageFilter.GaussianBlur(5)); glow=Image.new('RGBA',(128,128),RC[r]+(0,)); glow.putalpha(gl.point(lambda v:int(v*0.8)))
                    f.alpha_composite(glow)
                f.alpha_composite(b.resize((116,116),Image.LANCZOS),(6,4))
                f.save(O+f'gen/g_{slot}{t}{k}{r}.webp',quality=82,method=6); n+=1
print('bases',len(bases),'gear',n)
