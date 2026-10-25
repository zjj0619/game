from PIL import Image, ImageFilter, ImageChops
import os, numpy as np
R='art_raw/'; O='app/public/assets/'
def save(im,p,q=80): im.save(O+p,'WEBP',quality=q,method=6)
def alpha_from_dark(im, lo=18, hi=70, vign=True):
    a=np.asarray(im.convert('RGB')).astype(np.float32)
    m=a.max(axis=2)
    al=np.clip((m-lo)/(hi-lo),0,1)
    if vign:
        h,w=m.shape; yy,xx=np.mgrid[0:h,0:w]
        d=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2)
        al*=np.clip((1.02-d)/0.12,0,1)
    rgba=np.dstack([a,al*255]).astype(np.uint8)
    return Image.fromarray(rgba,'RGBA')
files=sorted(os.listdir(R))
for f in files:
    if not f.endswith('.jpg'): continue
    n=f[:-4]; im=Image.open(R+f).convert('RGB')
    if n.startswith('bg_'): save(im.resize((1280,720),Image.LANCZOS),'bg/'+n[3:]+'.webp',78)
    elif n.startswith('cg_') or n.startswith('end_'): save(im.resize((1280,720),Image.LANCZOS),'cg/'+n+'.webp',80)
    elif n.startswith('p_'): save(im.resize((600,800),Image.LANCZOS),'por/'+n[2:]+'.webp',82)
    elif n.startswith('b_'): save(alpha_from_dark(im.resize((640,640),Image.LANCZOS),14,60),'boss/'+n[2:]+'.webp',82)
    elif n=='title_keyart': save(im.resize((1600,int(1600*im.height/im.width)),Image.LANCZOS),'ui/title.webp',82)
    elif n=='worldmap': save(im.resize((1600,int(1600*im.height/im.width)),Image.LANCZOS),'ui/worldmap.webp',82)
    elif n.startswith('sheet_'):
        k=n[6:]; c=im.width//4
        for i in range(16):
            x,y=(i%4)*c,(i//4)*c; cell=im.crop((x+6,y+6,x+c-6,y+c-6)).resize((128,128),Image.LANCZOS)
            save(alpha_from_dark(cell,10,45,False),f'icon/{k}_{i}.webp',82)
    elif n.startswith('enemies_'):
        k=n[-1]; c=im.width//3
        for i in range(9):
            x,y=(i%3)*c,(i//3)*c; cell=im.crop((x+4,y+4,x+c-4,y+c-4)).resize((320,320),Image.LANCZOS)
            save(alpha_from_dark(cell,14,60),f'enemy/{k}{i}.webp',82)
print('ok')
