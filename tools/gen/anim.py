# 程序化动画帧生成：对单张立绘做分层网格形变（呼吸/奔跑/攻击/跳跃/受击/施法），并生成换色皮肤与区域异色敌人
# 产物全部写入 app/public/assets/anim/ 与 spr/skin/ 与 enemy/r/ ，由 action/engine.js 按状态播放
import os, sys, json, numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import map_coordinates
from multiprocessing import Pool
A='/workspace/game/app/public/assets/'
def load(p): return np.asarray(Image.open(A+p+'.webp').convert('RGBA')).astype(np.float32)/255
def fit(arr,H):
    im=Image.fromarray((arr*255).clip(0,255).astype(np.uint8),'RGBA'); w,h=im.size
    if h!=H: im=im.resize((max(1,round(w*H/h)),H),Image.LANCZOS)
    return np.asarray(im).astype(np.float32)/255
def warp(src, sy=1, sx=1, lean=0, sway=0, pad=0.3):
    h,w=src.shape[:2]; W=int(w*(1+pad)); Hh=int(h*1.08)
    out_cx=W/2; cx=w/2; Hb=Hh-1
    yy,xx=np.mgrid[0:Hh,0:W].astype(np.float32)
    u=np.clip((Hb-yy)/h,0,1.2)
    ys=(h-1)-(Hb-yy)/sy
    xs=cx+(xx-out_cx-lean*(u**1.3)*h-sway*h*u)/sx
    pm=src.copy(); pm[...,:3]*=pm[...,3:4]
    o=np.stack([map_coordinates(pm[...,c],[ys,xs],order=1,mode='constant',cval=0) for c in range(4)],-1)
    a=o[...,3:4]; o[...,:3]=np.where(a>1e-3,o[...,:3]/np.maximum(a,1e-3),0)
    return o
def tint(o, col, k):
    o=o.copy(); o[...,:3]=o[...,:3]*(1-k)+np.array(col)*k; return o
def glow(o, col, k):
    im=Image.fromarray((o*255).clip(0,255).astype(np.uint8),'RGBA'); a=im.getchannel('A').filter(ImageFilter.GaussianBlur(6))
    g=np.zeros_like(o); g[...,:3]=col; g[...,3]=np.asarray(a).astype(np.float32)/255*k
    out=g.copy(); al=o[...,3:4]; out[...,:3]=o[...,:3]*al+g[...,:3]*g[...,3:4]*(1-al); out[...,3:4]=al+g[...,3:4]*(1-al)
    out[...,:3]=np.where(out[...,3:4]>1e-3,out[...,:3]/np.maximum(out[...,3:4],1e-3),0); return out
def save(o,p,q=76):
    os.makedirs(os.path.dirname(A+p),exist_ok=True)
    im=Image.fromarray((o*255).clip(0,255).astype(np.uint8),'RGBA'); bb=im.getchannel('A').getbbox()
    im.save(A+p+'.webp',quality=q,method=4)
S=np.sin; PI=np.pi
HERO={'idle':6,'run':8,'atk':6,'jump':2,'hurt':2,'cast':4}
FOE={'idle':4,'walk':6,'atk':4,'hurt':2}
def frames(src, kind, el=(1,.8,.4)):
    out=[]
    if kind=='hero':
        for i in range(6): p=2*PI*i/6; out.append(('idle',i,warp(src,1+.018*S(p),1-.01*S(p),.012*S(p))))
        for i in range(8): p=2*PI*i/8; out.append(('run',i,warp(src,1+.035*abs(S(p))-.02,1-.02*abs(S(p)),.1+.025*S(2*p),.018*S(p))))
        L=[-.06,-.1,.17,.22,.12,.04]; X=[.97,.95,1.1,1.13,1.05,1.0]; Y=[1.02,1.03,.96,.95,.98,1.0]
        for i in range(6): out.append(('atk',i,warp(src,Y[i],X[i],L[i])))
        out.append(('jump',0,warp(src,1.08,.94,.04))); out.append(('jump',1,warp(src,.97,1.03,-.03)))
        out.append(('hurt',0,tint(warp(src,.97,1.02,-.13),(1,.25,.2),.35))); out.append(('hurt',1,warp(src,.99,1.01,-.07)))
        for i in range(4): out.append(('cast',i,glow(warp(src,1+.02*i,1-.01*i,-.03-.012*i),el,.35+.18*i)))
    else:
        # 敌人原画朝左：前倾方向取反
        def warp_(src,sy=1,sx=1,lean=0,sway=0,pad=.25): return warp(src,sy,sx,-lean,-sway,pad)
        for i in range(4): p=2*PI*i/4; out.append(('idle',i,warp_(src,1+.03*S(p),1-.02*S(p),.015*S(p),pad=.25)))
        for i in range(6): p=2*PI*i/6; out.append(('walk',i,warp_(src,1+.04*abs(S(p))-.02,1+.02*S(2*p),.06+.03*S(p),.015*S(p),pad=.25)))
        L=[-.08,-.12,.18,.08]; X=[.96,.94,1.14,1.04]; Y=[1.03,1.05,.94,.99]
        for i in range(4): out.append(('atk',i,warp_(src,Y[i],X[i],L[i],pad=.25)))
        out.append(('hurt',0,tint(warp_(src,.96,1.03,-.12,pad=.25),(1,1,1),.45))); out.append(('hurt',1,warp_(src,.98,1.01,-.06,pad=.25)))
    return out
# —— 换色：保留肤色（低饱和暖色）只旋转服饰/特效色相 ——
import colorsys
def rgb2hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; mx=np.max(a[...,:3],-1); mn=np.min(a[...,:3],-1); d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))/6; s=np.where(mx>0,(mx-mn)/(mx+1e-6),0); return h,s,mx
def hsv2rgb(h,s,v):
    i=np.floor(h*6)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    r=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[v,q,p,p,t,v]); g=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[t,v,v,q,p,p]); b=np.select([i==0,i==1,i==2,i==3,i==4,i==5],[p,p,t,v,v,q]); return np.stack([r,g,b],-1)
def recolor(src, dh, ds=1.0, dv=1.0, keep_skin=True):
    h,s,v=rgb2hsv(src); skin=(h>0.01)&(h<0.12)&(s<0.55)&(v>0.35) if keep_skin else np.zeros_like(h,bool)
    h2=np.where(skin,h,(h+dh)%1); s2=np.where(skin,s,np.clip(s*ds,0,1)); v2=np.where(skin,v,np.clip(v*dv,0,1))
    o=src.copy(); o[...,:3]=hsv2rgb(h2,s2,v2); return o
SKINS=[(0,1,1,None),(.5,1.1,1,(.5,.9,1)),(.83,1.1,.95,(.8,.5,1)),(.33,1.05,1,(.5,1,.6)),(.12,1.2,1.08,(1,.85,.4)),(0,.15,1.15,(.95,.95,1)),(.62,1.2,.8,(.4,.5,1)),(.95,1.3,.95,(1,.35,.3))]
def job(args):
    kind=args[0]; n=0
    if kind=='hero':
        _,hid,el=args; base=fit(load('spr/p_'+hid),220)
        for si,(dh,ds,dv,gc) in enumerate(SKINS):
            src=base if si==0 else recolor(base,dh,ds,dv)
            if gc: src=glow(src,gc,.35)
            save(fit(src,300) if False else src, f'spr/skin/p_{hid}_s{si}',82); n+=1
            for st,i,o in frames(src,'hero',el): save(o,f'anim/p_{hid}_s{si}/{st}{i}'); n+=1
    elif kind=='foe':
        _,path=args; src=fit(load(path),200); key=path.replace('/','_')
        for st,i,o in frames(src,'foe'): save(o,f'anim/{key}/{st}{i}'); n+=1
    elif kind=='region':
        _,b,ri,(dh,ds,dv,gc)=args; src=fit(load('enemy/'+b),240); src=recolor(src,dh,ds,dv,False)
        if gc: src=glow(src,gc,.3)
        save(src,f'enemy/r/{ri}_{b}',80); n+=1
        src2=fit(src,200)
        for st,i,o in frames(src2,'foe'): save(o,f'anim/enemy_r_{ri}_{b}/{st}{i}'); n+=1
    return n
REG=[(0,1,1,None),(.3,1,1,(.4,1,.6)),(.5,1,1,(.4,.9,1)),(.08,1.1,.95,(1,.7,.3)),(0,.35,1.2,(.95,.95,.85)),(.75,1.2,1,(.8,.4,1)),(.1,1.3,1.1,(1,.8,.2)),(.55,.6,1.1,(.7,.9,1)),(.7,1.1,.75,(.6,.4,1))]
if __name__=='__main__':
    what=sys.argv[1]; jobs=[]
    EL={'fire':(1,.55,.25),'wood':(.45,1,.6),'metal':(.9,.92,1),'earth':(1,.8,.4),'water':(.5,.85,1),'dark':(.7,.45,1),'light':(1,.9,.5)}
    if what=='hero':
        for hid,el in json.loads(sys.argv[2]).items(): jobs.append(('hero',hid,EL.get(el,(1,.8,.4))))
    if what=='foe':
        for p in sys.argv[2].split(','): jobs.append(('foe',p))
    if what=='region':
        for b in sys.argv[2].split(','):
            for ri in range(1,9): jobs.append(('region',b,ri,REG[ri]))
    with Pool(7) as pool: print(what, sum(pool.map(job,jobs)))
