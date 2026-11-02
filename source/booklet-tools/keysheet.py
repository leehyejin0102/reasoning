import sys, json, os
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype(sys.argv[2] if len(sys.argv)>2 else '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 26)
task = sys.argv[1]; d = json.load(open(f'/home/claude/work/data/{task}.json')); files=[]
for k, it in d.items():
    im = Image.open(f'/home/claude/work/clean/{task}_{k}.png').convert('RGB'); dr = ImageDraw.Draw(im); hs = it['hs']
    good = []
    if task == 'picture_concepts':
        off=0
        for ri,row in enumerate(it['rows']): good.append(off+it['ans'][ri]); off+=len(row)
    elif task == 'length':
        A = it['ans'] if isinstance(it['ans'], list) else [it['ans']]
        good = [i for i,L in enumerate(it['hs_obj']) if L in A]
        for i,(x,y,w,h) in enumerate(hs): dr.text((x+6,y+40), it['hs_obj'][i], fill='blue', font=F)
    elif task == 'picture_arrangement':
        for order, ci in enumerate(it['ans']):
            x,y,w,h = hs[ci]; dr.text((x+w//2-10, y+h//2), str(order+1), fill=(0,160,0), font=ImageFont.truetype(F.path, 90))
    elif task != 'predictive':
        good = [it['ans']]
    for i,(x,y,w,h) in enumerate(hs):
        dr.rectangle([x,y,x+w,y+h], outline=(0,170,0) if i in good else (230,0,0), width=7 if i in good else 2)
    txt = k + '  ' + str(it.get('question',''))[:40]
    if 'opts' in it and task!='predictive': txt += ' → ' + str(it['opts'][it['ans']])
    if task=='picture_arrangement': txt += ' → ' + ' / '.join(it['cards'][c][:8] for c in it['ans'])
    if task=='picture_concepts': txt += ' → ' + str(it['rule'])
    dr.rectangle([0,0,im.width,44], fill='white'); dr.text((8,6), txt, fill='black', font=F)
    f=f'/tmp/claude-0/key_{task}_{k}.jpg'; im.resize((664,443)).save(f); files.append(f)
os.system(f"montage {' '.join(files)} -tile 4x -geometry +2+2 /tmp/claude-0/KEY_{task}.jpg")
