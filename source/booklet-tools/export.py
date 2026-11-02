import json, os, sys
from PIL import Image
TASKS = ['picture_concepts','problem_solving','raven','verbal_cue','pattern','analogy','rotation','picture_arrangement',
         'dls','verbal_reasoning','number_series','predictive','length']
REPO = '/home/claude/reasoning'
det_all = {t: json.load(open(f'/home/claude/work/det/{t}.json')) for t in TASKS}
total = 0
import numpy as np
from scipy import ndimage
def scrub_label(im, t):
    a = np.array(im); g = a.mean(2); lim = (120, 66) if t == 'analogy' else (235, 125)
    m = g < 250; lab, n = ndimage.label(m)
    for i, s in enumerate(ndimage.find_objects(lab), 1):
        if s[1].stop <= lim[0] + 2 and s[0].stop <= lim[1] + 2 and (s[0].stop - s[0].start) <= 40:
            a[max(0,s[0].start-3):s[0].stop+3, max(0,s[1].start-3):s[1].stop+3] = 255
    return Image.fromarray(a)
for t in TASKS:
    d = json.load(open(f'/home/claude/work/data/{t}.json')); det = det_all[t]
    out_dir = f'{REPO}/ko/{t}/images'; os.makedirs(out_dir, exist_ok=True)
    items = []
    for k, it in d.items():
        im = Image.open(f'/home/claude/work/clean/{t}_{k}.png').convert('RGB')
        im = scrub_label(im, t)
        x0, y0, x1, y1 = it['bbox']; pad = 14
        if t == 'dls':
            o = det[k]['outer']; y1 = o[1] + o[3] + 2
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
        crop = im.crop((x0, y0, x1, y1)); W, H = crop.size
        f = f'{k}.jpg'; crop.save(f'{out_dir}/{f}', quality=86, optimize=True, progressive=True)
        total += os.path.getsize(f'{out_dir}/{f}')
        hs = [[round((x - x0) / W, 4), round((y - y0) / H, 4), round(w / W, 4), round(h / H, 4)] for x, y, w, h in it['hs']]
        rec = {'k': k, 'n': 0 if k.startswith('ex') else int(k), 'diff': it['diff'], 'limit': it['limit'], 'img': 'images/' + f, 'w': W, 'h': H, 'hs': hs,
               'q': it.get('question', '')}
        if t == 'picture_concepts': rec['q'] = ' | '.join('/'.join(r) for r in it['rows']); rec.update(rows=[len(r) for r in it['rows']], names=it['rows'], ans=it['ans'])
        elif t == 'picture_arrangement': rec.update(cards=it['cards'], ans=it['ans'])
        elif t == 'length': rec.update(obj=it['hs_obj'], names=it['objects'], mode=it['mode'], ans=it['ans'])
        elif t == 'predictive': rec.update(opts=it['opts'], scores=it['scores'], ans=it['ans'], hs=[])
        else:
            rec['ans'] = it['ans']
            if 'opts' in it: rec['opts'] = it['opts']
        if t == 'dls': rec['caption'] = it['question'].replace('가리켜주세요', '눌러 주세요').replace('가리켜 주세요', '눌러 주세요').strip()
        items.append(rec)
    js = '/* 자동 생성 파일 (work/tools/export.py) — 문항 그림·선택 영역·정답. 직접 고치지 마세요. */\nwindow.TASK_DATA = ' + json.dumps(items, ensure_ascii=False) + ';\n'
    open(f'{REPO}/ko/{t}/data.js', 'w').write(js)
    print(t, len(items))
print('images MB', round(total / 1e6, 1))
