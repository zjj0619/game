# 关卡卡面（99 关 + 塔/连战/每日）、成就徽章（64）、区域地面纹理（9×8）
import os, json, math, random, zlib, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
A='/workspace/game/app/public/assets/'
D=json.load(open(os.path.join(os.path.dirname(__file__),'cards.json')))
RI=['jincheng','qingqiu','donghai','changyang','kunlun','hundun','yugu','beihai','guixu']
def ld(p): return Image.open(A+p+'.webp').convert('RGBA')
def card(s, out):
    W,H=512,220; rnd=random.Random(zlib.crc32(s['id'].encode()))
    bg=ld('bg/'+(s.get('bg') or 'jincheng')); bw,bh=bg.size; sc=max(H/bh,W/bw)*rnd.uniform(1.15,1.5); bg=bg.resize((int(bw*sc),int(bh*sc)),Image.LANCZOS)
    ox=rnd.randint(0,max(0,bg.width-W)); oy=rnd.randint(0,max(0,bg.height-H)); c=bg.crop((ox,oy,ox+W,oy+H))
    idx=(s.get('idx') or 0)%11+1; r=s['region']
    for k,(sc2,yo) in {'far':(.5,0),'mid':(.5,8)}.items():
        try: l=ld(f'px/{r}_{idx}_{k}'); l=l.resize((int(l.width*sc2*H/256*0.9),int(l.height*sc2*H/256*0.9))); c.alpha_composite(l,(-rnd.randint(0,max(0,l.width-W)),H-l.height+yo))
        except Exception: pass
    sp=s.get('boss') or s.get('foe')
    if sp:
        if not s.get('boss') and sp.startswith('enemy/') and len(sp)==8 and r in RI and RI.index(r)>0: sp=f'enemy/r/{RI.index(r)}_{sp[6:]}'
        try:
            im=ld(sp); hh=int(H*(0.95 if s.get('boss') else 0.7)); im=im.resize((int(im.width*hh/im.height),hh),Image.LANCZOS)
            sh=Image.new('RGBA',im.size,(0,0,0,0)); sh.putalpha(im.getchannel('A').point(lambda v:v*0.6)); sh=sh.filter(ImageFilter.GaussianBlur(6))
            x=W-im.width-rnd.randint(10,40); c.alpha_composite(sh,(x+6,H-hh+4)); c.alpha_composite(im,(x,H-hh+2))
        except Exception as e: print('x',sp,e)
    g=np.zeros((H,W,4),np.uint8); xs=np.linspace(1,0,W)**1.6; g[...,3]=(xs[None,:]*190).astype(np.uint8); g[...,:3]=(8,6,10); c.alpha_composite(Image.fromarray(g))
    v=np.zeros((H,W,4),np.uint8); yy=np.linspace(-1,1,H)[:,None]; xx=np.linspace(-1,1,W)[None,:]; v[...,3]=(np.clip((xx**2*.3+yy**2)-.4,0,1)*160).astype(np.uint8); c.alpha_composite(Image.fromarray(v))
    c.convert('RGB').save(A+out+'.webp',quality=78,method=4)
FONT='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
def badge(a):
    S=160; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im); k=a['id']
    pal=((255,210,120),(150,90,30)) if k.startswith('end') or k in('all_endings','codex_all') else ((255,140,110),(130,30,30)) if k.startswith('ch') or k=='first_light' else ((200,220,255),(60,80,130)) if k.startswith(('win','nohit','weak','ult')) else ((170,240,180),(30,100,60)) if k.startswith(('craft','rich','codex','lv')) else ((220,180,255),(80,40,120))
    hi,lo=pal; cx=cy=S/2
    n=8 if k.startswith('end') else 12
    pts=[(cx+math.cos(t)*(S*.48 if i%2==0 else S*.42),cy+math.sin(t)*(S*.48 if i%2==0 else S*.42)) for i,t in enumerate(np.linspace(0,2*math.pi,n*2,endpoint=False))]
    d.polygon(pts,fill=lo+(255,))
    for r,col in [(S*.40,hi),(S*.37,lo),(S*.34,tuple(int(v*.45) for v in lo))]: d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=col+(255,))
    a_=np.asarray(im).astype(np.float32); yy=np.linspace(-1,1,S)[:,None]; sh=np.clip(1-(yy+1)*.35,.55,1.2); a_[...,:3]*=sh[...,None]; im=Image.fromarray(np.clip(a_,0,255).astype(np.uint8))
    d=ImageDraw.Draw(im); ch=a['name'][0]; f=ImageFont.truetype(FONT,int(S*.36))
    bb=d.textbbox((0,0),ch,font=f); tw,th=bb[2]-bb[0],bb[3]-bb[1]
    d.text((cx-tw/2-bb[0]+2,cy-th/2-bb[1]+2),ch,font=f,fill=(0,0,0,160)); d.text((cx-tw/2-bb[0],cy-th/2-bb[1]),ch,font=f,fill=hi+(255,))
    im.save(A+'ui/ach/'+k+'.webp',quality=85,method=4)
GR={'jincheng':((58,46,36),(30,24,20)),'qingqiu':((46,62,40),(22,30,20)),'donghai':((54,62,70),(24,30,36)),'changyang':((70,52,36),(34,24,16)),'kunlun':((180,190,205),(80,88,104)),
    'hundun':((60,44,72),(28,20,36)),'yugu':((110,66,34),(50,28,14)),'beihai':((150,185,210),(60,84,110)),'guixu':((34,30,52),(14,12,24))}
def ground(r,v):
    W,H=512,64; rnd=np.random.default_rng(zlib.crc32(f'{r}{v}'.encode())); top,bot=GR[r]
    n=rnd.random((H//4,W//8)); n=np.asarray(Image.fromarray((n*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(np.float32)/255
    n2=rnd.random((H,W)).astype(np.float32)
    y=np.linspace(0,1,H)[:,None]; base=np.array(top)[None,None,:]*(1-y[...,None])+np.array(bot)[None,None,:]*y[...,None]
    c=base*(0.75+0.4*n[...,None])*(0.92+0.12*n2[...,None])
    im=Image.fromarray(np.clip(c,0,255).astype(np.uint8)); d=ImageDraw.Draw(im); R=random.Random(v*31+len(r))
    for _ in range(R.randint(10,24)):
        x=R.uniform(0,W); yy=R.uniform(10,H); s=R.uniform(3,10); f_=R.uniform(.7,1.15); col=tuple(max(0,min(255,int(t*f_))) for t in top); s*=0.6; d.ellipse([x-s,yy-s*.6,x+s,yy+s*.6],fill=col)
    if r in('jincheng','changyang'):
        for x in range(0,W,R.randint(48,80)): d.line([(x,6),(x+R.randint(-6,6),H)],fill=tuple(int(t*.6) for t in bot),width=2)
    d.line([(0,0),(W,0)],fill=tuple(min(255,int(t*1.6)) for t in top),width=2)
    im.save(A+f'ground/{r}_{v}.webp',quality=80,method=4)
if __name__=='__main__':
    os.makedirs(A+'stagecard',exist_ok=True); os.makedirs(A+'ui/ach',exist_ok=True); os.makedirs(A+'ground',exist_ok=True)
    for s in D['stages']: card(s,'stagecard/'+s['id'])
    for s in D['extra']: card(s,'stagecard/'+s['id'])
    for a in D['ach']: badge(a)
    for r in GR:
        for v in range(8): ground(r,v)
    print(len(D['stages'])+len(D['extra']), len(D['ach']), 72)
