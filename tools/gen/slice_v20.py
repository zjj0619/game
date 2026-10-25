import json, os, sys
sys.path.insert(0,'/workspace/game/art_raw/v11')
from PIL import Image
R='/workspace/game/art_raw/v20/'; O='/workspace/game/app/public/assets/'
order=json.load(open('/tmp/skorder.json')) if os.path.exists('/tmp/skorder.json') else json.load(open(R+'skorder.json'))
json.dump(order,open(R+'skorder.json','w'))
ST=['burn','freeze','poison','stun','shield','haste','slow','bleed','curse','regen','rage','lamp']
os.makedirs(O+'icon/sk',exist_ok=True); os.makedirs(O+'icon/st',exist_ok=True)
n=0
for s in range(7):
    im=Image.open(R+f'sksheet_{s}.jpg').convert('RGB'); c=im.width/4
    for i in range(16):
        x,y=(i%4)*c,(i//4)*c; m=c*0.075
        cell=im.crop((int(x+m),int(y+m),int(x+c-m),int(y+c-m))).resize((128,128),Image.LANCZOS)
        k=s*16+i
        if k<len(order): cell.save(O+f'icon/sk/{order[k]}.webp',quality=84,method=6); n+=1
        else: cell.save(O+f'icon/st/{ST[k-len(order)]}.webp',quality=84,method=6); n+=1
print('icons',n)
