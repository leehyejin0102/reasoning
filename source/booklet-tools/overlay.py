import sys, json, cv2, os
sys.path.insert(0, os.path.dirname(__file__))
PC_COLS = {'ex1':3,'ex2':3, **{f'{i:02d}':(3 if i<=14 else 4) for i in range(1,21)}}
def opts_of(task, key, d):
    if task == 'picture_concepts':
        out=[]
        for ri,row in enumerate(d['rows']):
            x,y,w,h = row[0]; n = PC_COLS[key]
            for c in range(n): out.append([x+w*c//n+2, y+2, w//n-4, h-4])
        return out
    if task == 'length':
        out=[]
        for (x,y,w,h) in d['panels']:
            if w > h: out += [[x+3,y+3,w-6,h//2-3],[x+3,y+h//2,w-6,h//2-3]]
            else: out += [[x+3,y+3,w//2-3,h-6],[x+w//2,y+3,w//2-3,h-6]]
        return out
    return d.get('opts', [])
if __name__ == '__main__':
    task = sys.argv[1]; d = json.load(open(f'/home/claude/work/det/{task}.json'))
    os.makedirs('/tmp/claude-0/ov', exist_ok=True); files=[]
    for key, v in d.items():
        im = cv2.imread(f'/home/claude/work/clean/{task}_{key}.png')
        for i, (x,y,w,h) in enumerate(opts_of(task, key, v)):
            cv2.rectangle(im, (x,y), (x+w,y+h), (0,0,255), 3)
            cv2.putText(im, str(i+1), (x+8, y+40), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0,0,255), 3)
        cv2.putText(im, key, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 2, (255,0,0), 4)
        f = f'/tmp/claude-0/ov/{task}_{key}.jpg'; cv2.imwrite(f, cv2.resize(im, (443, 295))); files.append(f)
    os.system(f"montage {' '.join(files)} -tile 6x -geometry +2+2 /tmp/claude-0/ov_{task}.jpg")
