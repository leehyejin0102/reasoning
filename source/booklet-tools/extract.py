import sys, json, os; sys.path.insert(0, os.path.dirname(__file__))
from pagemap import *; from detect import *
import numpy as np, cv2
from scipy import ndimage

def clean_label(im, g, src):
    lim = (120, 66) if src=='abcd' else (235, 125)
    m = g < 200; lab, n = ndimage.label(m)
    for i, s in enumerate(ndimage.find_objects(lab), 1):
        if s[1].stop <= lim[0] and s[0].stop <= lim[1] and (s[0].stop-s[0].start) <= 34:
            im[lab==i] = 255; g[lab==i] = 255
    return im, g

def inside(r, o, pad=6):
    return r[0]>=o[0]-pad and r[1]>=o[1]-pad and r[0]+r[2]<=o[0]+o[2]+pad and r[1]+r[3]<=o[1]+o[3]+pad and r!=o

def rowmajor(rs):
    rs = sorted(rs, key=lambda r: r[1]); rows=[]
    for r in rs:
        if rows and abs(rows[-1][0][1]-r[1]) < 40: rows[-1].append(r)
        else: rows.append([r])
    return [r for row in rows for r in sorted(row, key=lambda q: q[0])]

def hotspots(task, g, page_kind):
    H, W = g.shape; R = rects(g)
    big = R[0] if R else None
    if task == 'picture_concepts':
        rows = sorted([r for r in R if inside(r, big) and r[2] > big[2]*0.9 and r[3] > 80], key=lambda r: r[1])
        return {'rows': [[list(r)] for r in rows]}  # columns split later with counts
    if task in ('problem_solving', 'picture_arrangement', 'dls', 'verbal_cue'):
        # outer box = largest rect that contains >=2 rects
        for o in R:
            cells = [r for r in R if inside(r, o) and r[2]*r[3] > o[2]*o[3]*0.08]
            # drop nested duplicates
            cells = [c for c in cells if not any(inside(c, d) for d in cells)]
            if len(cells) >= 2: return {'outer': list(o), 'opts': [list(c) for c in rowmajor(cells)]}
        return {'opts': []}
    if task in ('raven', 'analogy'):
        cand = [r for r in R if r[1] > H*0.45 and r[3] > 60]
        cand = [c for c in cand if not any(inside(c, d) for d in cand)]
        cand = sorted(cand, key=lambda r: -r[2]*r[3])
        n = 4 if task=='analogy' else 3
        top = cand[:n]
        return {'opts': [list(r) for r in sorted(top, key=lambda r: r[0])]}
    if task == 'pattern':
        o = big
        c = [r for r in R if inside(r, o) and r[3] > o[3]*0.18 and r[2] < o[2]*0.35 and r[2] > o[2]*0.08]
        c = [x for x in c if not any(inside(x, d) for d in c)]
        return {'opts': [list(r) for r in sorted(c, key=lambda r: r[0])]}
    if task == 'number_series':
        wide = sorted([r for r in R if r[2] > W*0.3], key=lambda r: r[1])
        o = wide[-1]
        c = [r for r in R if inside(r, o) and r[3] > o[3]*0.6]
        c = [x for x in c if not any(inside(x, d) for d in c)]
        return {'outer': list(o), 'opts': [list(r) for r in sorted(c, key=lambda r: r[0])]}
    if task == 'rotation':
        o = big; y0 = o[1]+o[3]+8
        sub = g[y0:, :] < 160
        ys, xs = np.where(sub)
        cols = np.zeros(W, bool); cols[np.unique(xs)] = True
        # group columns with gaps > 30
        groups=[]; start=None; last=None
        for x in range(W):
            if cols[x]:
                if start is None: start=x
                elif x-last > 30: groups.append((start,last)); start=x
                last=x
        if start is not None: groups.append((start,last))
        groups=[gr for gr in groups if gr[1]-gr[0] > 60]
        out=[]
        for a,b in groups:
            m = sub[:, a:b+1]; yy = np.where(m.any(1))[0]
            out.append([a-8, y0+yy.min()-8, b-a+16, yy.max()-yy.min()+16])
        return {'opts': out}
    if task == 'verbal_reasoning':
        o = big; y0 = o[1]+o[3]+10
        sub = g[y0:, :] < 150
        rowsum = sub.any(1); bands=[]; s=None
        for y,v in enumerate(rowsum):
            if v and s is None: s=y
            if not v and s is not None:
                if y-s>4: bands.append((s,y))
                s=None
        bands = bands[-4:]
        xs = np.where(sub[bands[0][0]:bands[-1][1]].any(0))[0]
        x0, x1 = xs.min(), xs.max()
        out=[]
        for a,b in bands:
            h=b-a; out.append([int(x0)-14, int(y0+a-h*0.45), int(x1-x0)+28, int(h*1.9)])
        return {'outer': list(o), 'opts': out}
    if task == 'length':
        panels = [r for r in R if r[3] > 100 and r[2] > 100]
        panels = [p for p in panels if not any(inside(p, q) for q in panels)]
        return {'panels': [list(p) for p in rowmajor(panels)]}
    return {}

def process(task):
    v = PAGES[task]; out = {}
    pages = [('ex1', v['ex'][0]), ('ex2', v['ex'][1])] + [(f'{i+1:02d}', p) for i, p in enumerate(v['items'])]
    for key, p in pages:
        im, g = load(path(v['src'], p)); im, g = clean_label(im, g, v['src'])
        info = hotspots(task, g, key)
        out[key] = {'page': p, **info}
        out[key]['bbox'] = list(content_bbox(g, skip_label=False))
        out[key]['_img'] = path(v['src'], p)
        cv2.imwrite(f'/home/claude/work/clean/{task}_{key}.png', im)
    return out

if __name__ == '__main__':
    os.makedirs('/home/claude/work/clean', exist_ok=True); os.makedirs('/home/claude/work/det', exist_ok=True)
    tasks = sys.argv[1:] or list(PAGES)
    for t in tasks:
        d = process(t); json.dump(d, open(f'/home/claude/work/det/{t}.json', 'w'), ensure_ascii=False, indent=0, default=int)
        counts = {k: len(x.get('opts', x.get('rows', x.get('panels', [])))) for k, x in d.items()}
        print(t, counts)
