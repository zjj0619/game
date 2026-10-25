# 程序化视差层：99 关 × (远景 far / 中景 mid / 前景 near)，按区域主题与关卡种子生成剪影，输出 assets/px/<stageId>_<layer>.webp
import zlib, os, math, random, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from multiprocessing import Pool
A='/workspace/game/app/public/assets/px/'; os.makedirs(A,exist_ok=True)
W,H=2048,512
REG={ # 远景色, 中景色, 前景色, 主题
 'jincheng':((70,52,60),(38,26,30),(14,10,12),'city'), 'qingqiu':((60,82,74),(26,44,36),(8,16,12),'forest'),
 'donghai':((50,78,104),(22,40,60),(6,14,24),'sea'), 'changyang':((96,70,50),(50,34,24),(18,12,8),'war'),
 'kunlun':((150,165,190),(80,92,118),(28,32,44),'snow'), 'hundun':((74,54,96),(38,26,56),(14,8,22),'chaos'),
 'yugu':((140,80,40),(76,38,20),(26,12,6),'sun'), 'beihai':((110,150,180),(50,80,110),(14,26,40),'ice'), 'guixu':((40,36,64),(20,16,36),(6,4,12),'abyss')}
def ridge(rnd, base, amp, oct=5):
    xs=np.arange(W); y=np.full(W,base,np.float32)
    for o in range(oct):
        f=(o+1)*rnd.uniform(.6,1.4)*2*math.pi/W*(2**o); ph=rnd.uniform(0,6.28); y+=amp/(1.8**o)*np.sin(xs*f+ph)
    return y
def poly(d, y, col):
    pts=[(0,H)]+[(int(x),int(v)) for x,v in zip(range(0,W,4),y[::4])]+[(W,H)]; d.polygon(pts,fill=col)
def tree(d,x,y,s,col,rnd):
    d.rectangle([x-s*.06,y-s*.5,x+s*.06,y],fill=col)
    for k in range(4): r=s*(.38-.07*k); cy=y-s*.45-k*s*.18; d.ellipse([x-r+rnd.uniform(-4,4),cy-r*.7,x+r,cy+r*.7],fill=col)
def pine(d,x,y,s,col):
    for k in range(4): w=s*(.42-.09*k); t=y-s*(.2+.22*k); d.polygon([(x-w,t+s*.28),(x+w,t+s*.28),(x,t-s*.12)],fill=col)
    d.rectangle([x-s*.04,y-s*.2,x+s*.04,y],fill=col)
def roof(d,x,y,s,col,rnd):
    w=s*.5; d.rectangle([x-w*.7,y-s*.55,x+w*.7,y],fill=col)
    for k in range(rnd.randint(1,3)):
        t=y-s*.55-k*s*.32; ww=w*(1-.18*k); d.polygon([(x-ww-s*.12,t+s*.06),(x-ww,t-s*.04),(x,t-s*.2),(x+ww,t-s*.04),(x+ww+s*.12,t+s*.06)],fill=col)
        if k<2: d.rectangle([x-ww*.6,t-s*.02,x+ww*.6,t+s*.12],fill=col)
def lantern(d,x,y,col): d.ellipse([x-6,y-8,x+6,y+8],fill=col)
def spike(d,x,y,s,col,rnd): w=s*rnd.uniform(.12,.25); d.polygon([(x-w,y),(x+w,y),(x+rnd.uniform(-w,w),y-s)],fill=col)
def spear(d,x,y,s,col,rnd): a=rnd.uniform(-.5,.5); d.line([(x,y),(x+math.sin(a)*s,y-math.cos(a)*s)],fill=col,width=max(2,int(s*.03))); d.polygon([(x+math.sin(a)*s-5,y-math.cos(a)*s),(x+math.sin(a)*s+5,y-math.cos(a)*s),(x+math.sin(a)*(s+22),y-math.cos(a)*(s+22))],fill=col)
def rock(d,x,y,s,col,rnd):
    pts=[(x+math.cos(a)*s*rnd.uniform(.6,1)*(1.3 if abs(math.cos(a))>.5 else 1),y-abs(math.sin(a))*s*rnd.uniform(.5,1)) for a in np.linspace(0,math.pi,9)]
    d.polygon([(x-s*1.3,y)]+pts+[(x+s*1.3,y)],fill=col)
def float_rock(d,x,y,s,col,rnd):
    d.polygon([(x-s,y),(x+s,y),(x+s*.5,y+s*.9),(x+rnd.uniform(-.2,.2)*s,y+s*1.4),(x-s*.6,y+s*.8)],fill=col); d.ellipse([x-s,y-s*.2,x+s,y+s*.2],fill=col)
def pillar(d,x,y,s,col): w=s*.12; d.rectangle([x-w,y-s,x+w,y],fill=col); d.rectangle([x-w*1.6,y-s-10,x+w*1.6,y-s],fill=col)
def wave(d,y,col,rnd,amp=10):
    ph=rnd.uniform(0,6); pts=[(0,H)]+[(x,y+amp*math.sin(x/rnd.uniform(40,70)+ph)+4*math.sin(x/13)) for x in range(0,W+8,8)]+[(W,H)]; d.polygon(pts,fill=col)
def layer(region, idx, kind):
    far,mid,near,th=REG[region]; rnd=random.Random(zlib.crc32(f"{region}{idx}{kind}".encode()))
    jitter=lambda c,k=8: tuple(max(0,min(255,v+rnd.randint(-k,k))) for v in c)
    if kind=='far':
        im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
        c1=jitter(far)+(115,); c2=tuple(int(v*.8) for v in far)+(170,)
        if th in('snow','ice'): poly(d,ridge(rnd,H*.45,70),c1); poly(d,ridge(rnd,H*.6,50),c2)
        elif th=='sea': poly(d,ridge(rnd,H*.62,30,3),c1); wave(d,H*.72,c2,rnd,6)
        elif th=='chaos':
            for _ in range(10): float_rock(d,rnd.uniform(0,W),rnd.uniform(H*.15,H*.55),rnd.uniform(20,60),c1,rnd)
            poly(d,ridge(rnd,H*.7,40),c2)
        elif th=='abyss':
            for _ in range(14): pillar(d,rnd.uniform(0,W),H*rnd.uniform(.75,.95),rnd.uniform(120,300),c1)
            poly(d,ridge(rnd,H*.8,20),c2)
        else: poly(d,ridge(rnd,H*.5,60),c1); poly(d,ridge(rnd,H*.62,45),c2)
        if th in('snow','ice'):
            a=np.asarray(im).copy(); op=a[...,3]>0; top=np.where(op.any(0),op.argmax(0),H)
            yy=np.arange(H)[:,None]; k=np.clip(1-(yy-top[None,:])/34,0,1)*op; a[...,:3]=np.clip(a[...,:3]+k[...,None]*80,0,255).astype(np.uint8); im=Image.fromarray(a)
        return im.filter(ImageFilter.GaussianBlur(1.5))
    if kind=='mid':
        im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); c=jitter(mid)+(235,); gy=H*.86
        poly(d,ridge(rnd,gy,10,3),c)
        n=rnd.randint(9,16)
        for _ in range(n):
            x=rnd.uniform(0,W); s=rnd.uniform(90,220)
            if th=='city': roof(d,x,gy+6,s,c,rnd)
            elif th=='forest': tree(d,x,gy+6,s*1.3,c,rnd)
            elif th=='sea': rock(d,x,gy+8,s*.4,c,rnd)
            elif th=='war': (spear(d,x,gy+4,s*.6,c,rnd) if rnd.random()<.6 else rock(d,x,gy+6,s*.3,c,rnd))
            elif th=='snow': pine(d,x,gy+6,s,c)
            elif th=='chaos': float_rock(d,x,rnd.uniform(H*.2,H*.6),s*.25,c,rnd)
            elif th=='sun': (tree(d,x,gy+6,s*.9,c,rnd) if rnd.random()<.3 else rock(d,x,gy+6,s*.35,c,rnd))
            elif th=='ice': spike(d,x,gy+6,s*1.1,c,rnd)
            else: pillar(d,x,gy+6,s*1.2,c)
        if th=='city':
            lc=(255,190,90,230)
            for _ in range(n*2): lantern(d,rnd.uniform(0,W),rnd.uniform(H*.45,H*.8),lc)
        if th=='sea': wave(d,gy+10,jitter(mid)+(200,),rnd,8)
        return im.filter(ImageFilter.GaussianBlur(.8))
    im=Image.new('RGBA',(W,256),(0,0,0,0)); d=ImageDraw.Draw(im); c=jitter(near,4)+(255,)
    for _ in range(rnd.randint(6,11)):
        x=rnd.uniform(0,W); s=rnd.uniform(30,90)
        if th in('forest','sun','war','city'):
            for k in range(rnd.randint(6,14)): xx=x+rnd.uniform(-60,60); d.polygon([(xx-4,256),(xx+4,256),(xx+rnd.uniform(-25,25),256-rnd.uniform(40,130))],fill=c)
        elif th in('ice','snow'): spike(d,x,256,s*1.6,c,rnd)
        elif th=='sea':
            for k in range(5): xx=x+rnd.uniform(-40,40); d.line([(xx,256)]+[(xx+12*math.sin(t/6+k),256-t*6) for t in range(1,int(s/3))],fill=c,width=5)
        else: rock(d,x,256,s*.7,c,rnd)
    return im.filter(ImageFilter.GaussianBlur(2.2))
def job(a):
    region,idx=a; n=0
    for kind in('far','mid','near'):
        layer(region,idx,kind).save(A+f'{region}_{idx}_{kind}.webp',quality=80,method=4); n+=1
    return n
if __name__=='__main__':
    jobs=[(r,i) for r in REG for i in range(1,12)]
    with Pool(7) as p: print(sum(p.map(job,jobs)))
