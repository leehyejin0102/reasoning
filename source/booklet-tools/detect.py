import cv2, numpy as np
def load(p):
    im = cv2.imread(p); g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY); return im, g
def rects(g, min_w=40, min_h=40, thr=140):
    """bordered rectangles from contour tree"""
    b = (g < thr).astype(np.uint8)*255
    cnts, hier = cv2.findContours(b, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    out=[]
    for c in cnts:
        x,y,w,h = cv2.boundingRect(c)
        if w<min_w or h<min_h: continue
        peri = cv2.arcLength(c, True); ap = cv2.approxPolyDP(c, 0.02*peri, True)
        if len(ap)!=4: continue
        area = cv2.contourArea(c)
        if area < 0.85*w*h: continue
        out.append((x,y,w,h))
    # dedupe near-identical (inner/outer edge of same line)
    out.sort(key=lambda r: -r[2]*r[3]); res=[]
    for r in out:
        if any(abs(r[0]-q[0])<12 and abs(r[1]-q[1])<12 and abs(r[2]-q[2])<24 and abs(r[3]-q[3])<24 for q in res): continue
        res.append(r)
    return res
def content_bbox(g, thr=235, skip_label=True):
    H,W = g.shape; m = g < thr
    if skip_label: m[:int(H*0.075), :int(W*0.12)] = False
    ys,xs = np.where(m)
    return int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
