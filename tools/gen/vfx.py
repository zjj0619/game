# 程序化特效序列帧：12 种形态 × 7 种五行/光暗配色 × 12 帧，输出 assets/vfx/<type>_<el>/<i>.webp（带透明，叠加混合播放）
import os, numpy as np
from PIL import Image
from multiprocessing import Pool
A='/workspace/game/app/public/assets/vfx/'
EL={'fire':((1,.95,.6),(1,.45,.1)),'water':((.8,.95,1),(.2,.55,1)),'wood':((.85,1,.7),(.25,.85,.3)),'metal':((1,1,1),(.75,.8,.95)),
    'earth':((1,.9,.6),(.8,.55,.2)),'dark':((.9,.75,1),(.5,.2,.9)),'light':((1,1,.85),(1,.85,.35))}
TYPES=['slash','burst','ring','spark','smoke','rune','pillar','shock','bolt','swirl','heal','shards']
N=12; R=128
yy,xx=np.mgrid[0:R,0:R].astype(np.float32); cx=cy=(R-1)/2; dx=xx-cx; dy=yy-cy; rr=np.hypot(dx,dy)/(R/2); th=np.arctan2(dy,dx)
rng=np.random.default_rng(7)
def col(a, core, edge, hot):
    a=np.clip(a,0,1); h=np.clip(hot,0,1)[...,None]; c=np.array(edge)*(1-h)+np.array(core)*h
    return np.dstack([c, a])
def ring_(r0,w): return np.exp(-((rr-r0)/w)**2)
def noise(seed):
    r=np.random.default_rng(seed); n=r.random((16,16)).astype(np.float32)
    return np.asarray(Image.fromarray((n*255).astype(np.uint8)).resize((R,R),Image.BICUBIC)).astype(np.float32)/255
NZ=[noise(i) for i in range(6)]
def frame(t, i, core, edge):
    p=i/(N-1); fade=1-p
    if t=='slash':
        a0=-1.2+min(1,p*1.8)*2.6; tl=a0-2.2*(1-p*.4); m=ring_(.72-.12*np.clip((a0-th)/2.2,0,1),.1+.06*np.clip((a0-th)/1.3,0,1))*((th>tl)&(th<a0))*np.clip((th-tl)/(a0-tl),0,1)**.7; a=m*1.6*(1-p**3); return col(a,core,edge,m**3)
    if t=='burst':
        r0=.15+.75*p; m=np.exp(-(rr/(r0+.05))**2*3)*(1-p)*1.6+ring_(r0,.08)*fade; return col(m,core,edge,np.exp(-(rr/(r0*.6+.05))**2*2))
    if t=='ring':
        r0=.2+.75*p; m=ring_(r0,.04+.04*p)*fade*1.3; return col(m,core,edge,m)
    if t=='spark':
        k=6; ang=np.abs(np.cos(th*k/2))**18; L=.25+.65*np.sqrt(p); m=ang*np.clip(1-rr/L,0,1)*2*fade+np.exp(-(rr/.12)**2)*fade*1.5; return col(m,core,edge,m)
    if t=='smoke':
        r0=.25+.55*p; n=NZ[i%6]*.6+.4; m=np.exp(-(rr/r0)**2*1.5)*n*(1-p**1.5)*1.6; c=np.dstack([np.full_like(rr,.35+.2*p)]*3)
        e=np.array(edge)*.35; return np.dstack([c*.6+e*.4, np.clip(m,0,1)])
    if t=='rune':
        ang=th+p*1.5; m=(ring_(.85,.03)+ring_(.62,.025)+ (np.abs(np.sin(ang*3))<.05)*(rr<.85)*(rr>.62)*1.0 + (np.abs(np.cos(ang*6))>.995)*(rr<.62))
        a=np.clip(m,0,1)*np.sin(np.pi*p)*1.3; return col(a,core,edge,a)
    if t=='pillar':
        w=.12+.3*np.sin(np.pi*min(1,p*1.6)); m=np.exp(-(np.abs(dx)/(R/2)/w)**2*2)*np.clip((yy/R)*1.2,0,1)*(.7+.3*NZ[i%6])*fade*1.5; return col(m,core,edge,np.exp(-(np.abs(dx)/(R/2)/(w*.4+.01))**2))
    if t=='shock':
        ey=np.abs(dy)/(R/2)*3; r0=.15+.8*p; m=np.exp(-((np.hypot(dx/(R/2),ey)-r0)/.07)**2)*fade*1.4*(yy>cy-8); return col(m,core,edge,m)
    if t=='bolt':
        r=np.random.default_rng(i*13); pts=[(cx+r.uniform(-20,20),0)]; y=0
        while y<R: y+=r.uniform(10,22); pts.append((cx+r.uniform(-24,24),y))
        im=Image.new('L',(R,R)); from PIL import ImageDraw, ImageFilter; d=ImageDraw.Draw(im); d.line(pts,fill=255,width=4)
        m=np.asarray(im.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)/255*2.5; core_=np.asarray(im).astype(np.float32)/255
        f=1 if i%3!=2 else .4; return col(np.clip(m+core_,0,1)*f*(1-p*.6),core,edge,core_)
    if t=='swirl':
        sp=(th+rr*5-p*6)%(2*np.pi); m=np.exp(-(sp-np.pi)**2*3)*(rr<.9)*(rr>.15)*fade*1.2; return col(m,core,edge,m**2)
    if t=='heal':
        cr=((np.abs(dx)<7)&(np.abs(dy)<22))|((np.abs(dy)<7)&(np.abs(dx)<22)); m=cr*np.sin(np.pi*p)*1.0+np.exp(-(rr/.6)**2)*.35*np.sin(np.pi*p)
        sh=np.roll(m,-int(p*20),axis=0); return col(sh,core,(.6,1,.6) if True else edge,cr*1.0)
    if t=='shards':
        r=np.random.default_rng(99); m=np.zeros_like(rr)
        for k in range(9):
            a=r.uniform(0,6.28); d=(.15+.7*p)*r.uniform(.7,1.1)*R/2; x0=cx+np.cos(a)*d; y0=cy+np.sin(a)*d+p*p*25
            ux,uy=np.cos(a),np.sin(a); px=(xx-x0)*ux+(yy-y0)*uy; py=-(xx-x0)*uy+(yy-y0)*ux
            m+=np.clip(1-np.abs(px)/7-np.abs(py)/2.5,0,1)
        return col(np.clip(m*1.6,0,1)*fade,core,edge,m)
def job(a):
    t,el=a; core,edge=EL[el]; d=A+f'{t}_{el}/'; os.makedirs(d,exist_ok=True)
    for i in range(N):
        o=frame(t,i,core,edge); Image.fromarray((np.clip(o,0,1)*255).astype(np.uint8),'RGBA').save(d+f'{i}.webp',quality=80,method=4)
    return N
if __name__=='__main__':
    with Pool(7) as p: print(sum(p.map(job,[(t,e) for t in TYPES for e in EL])))
