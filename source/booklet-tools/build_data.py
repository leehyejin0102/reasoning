import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
import openpyxl
from overlay import opts_of
XL = '/home/claude/src/chu/추론/추론 능력 검사 (1).xlsx'
wb = openpyxl.load_workbook(XL, data_only=True)
LIM = {'연습': 0, '하': 20, '중': 30, '상': 50, '최상': 50}
def S(v): return '' if v is None else str(v).strip()
def key_of(c):
    c = S(c)
    if c.startswith('연습'): return 'ex' + c.split()[-1]
    return f'{int(float(c)):02d}'
def grouped(ws, r0, r1, colc='C'):
    """items start where column C has a value; following rows are options"""
    out = []; cur = None
    for r in range(r0, r1):
        c = ws[f'{colc}{r}'].value
        if c is not None and S(c) not in ('', '번호'):
            cur = {'key': key_of(c), 'row': r, 'opts': []}; out.append(cur)
        elif cur is not None and any(ws.cell(r, k).value is not None for k in range(4, 8)):
            cur['opts'].append(r)
    return out
def nm(s): return re.sub(r'\(.*?\)', '', s).strip()

def build(task):
    det = json.load(open(f'/home/claude/work/det/{task}.json'))
    items = {}
    def base(k, diff):
        d = det[k]; return {'key': k, 'diff': diff, 'limit': LIM[diff], 'hs': opts_of(task, k, d), 'bbox': d['bbox'], 'page': d['page']}
    if task == 'picture_concepts':
        ws = wb['1-1. 공통그림찾기']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); diff = S(ws[f'D{r}'].value)
            rows = [[nm(x) for x in line.split('/')] for line in S(ws[f'E{r}'].value).split('\n') if line.strip()]
            ans = [nm(x) for x in S(ws[f'G{r}'].value).split('/')]
            idx = []
            for ri, row in enumerate(rows):
                hit = [i for i, x in enumerate(row) if x in ans]
                assert len(hit) == 1, (k, row, ans); idx.append(hit[0])
            it = base(k, diff); it.update(rows=rows, ans=idx, rule=S(ws[f'F{r}'].value))
            assert len(it['hs']) == sum(len(x) for x in rows), (k, len(it['hs']))
            items[k] = it
    elif task == 'problem_solving':
        ws = wb['4-2. 문제해결']
        for g in grouped(ws, 10, 118):
            r = g['row']; it = base(g['key'], S(ws[f'D{r}'].value))
            opts = [S(ws[f'E{x}'].value) for x in g['opts']]; marks = [S(ws[f'G{x}'].value) for x in g['opts']]
            it.update(question=S(ws[f'E{r}'].value), opts=opts, ans=marks.index('정답'))
            assert len(opts) == len(it['hs']), (g['key'], opts); items[g['key']] = it
    elif task == 'raven':
        ws = wb['3-2. 레이븐 추론']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            it.update(question=S(ws[f'E{r}'].value), ans=int(float(S(ws[f'G{r}'].value).split('\n')[0])) - 1)
            if k.startswith('ex'): it['expl_xl'] = S(ws[f'G{r}'].value)
            items[k] = it
    elif task == 'verbal_cue':
        ws = wb['2-2. 언어 단서 결합 추론 과제']
        for g in grouped(ws, 10, 76):
            r = g['row']; rows = [r] + g['opts']; it = base(g['key'], S(ws[f'D{r}'].value))
            opts = [S(ws[f'F{x}'].value) for x in rows]; ans = S(ws[f'H{r}'].value)
            it.update(question=S(ws[f'E{r}'].value), opts=opts, ans=opts.index(ans)); items[g['key']] = it
    elif task == 'pattern':
        ws = wb['1-2. 패턴검사_반복성장']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            it.update(question=S(ws[f'F{r}'].value), ptype=S(ws[f'E{r}'].value), ans=int(float(ws[f'H{r}'].value)) - 1); items[k] = it
    elif task == 'analogy':
        ws = wb['2-1. AB = CD']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            opts = [S(ws[f'{c}{r}'].value) for c in 'KLMN']
            it.update(question=S(ws[f'E{r}'].value), rel=S(ws[f'F{r}'].value), opts=opts, ans='①②③④'.index(S(ws[f'O{r}'].value)),
                      err=S(ws[f'P{r}'].value)); items[k] = it
    elif task == 'rotation':
        ws = wb['3-1. 3차원 회전']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            it.update(question=S(ws[f'F{r}'].value).replace('\n', ' / '), ans=int(re.match(r'(\d)', S(ws[f'G{r}'].value)).group(1)) - 1); items[k] = it
    elif task == 'picture_arrangement':
        ws = wb['4-1. 차례맞추기(사회대처)']
        for g in grouped(ws, 10, 118):
            r = g['row']; it = base(g['key'], S(ws[f'D{r}'].value))
            cards = [S(ws[f'E{x}'].value) for x in g['opts']]; pos = [int(float(ws[f'F{x}'].value)) for x in g['opts']]
            seq = [pos.index(p) for p in range(1, len(pos) + 1)]  # card indices in correct order
            it.update(question=S(ws[f'E{r}'].value), cards=cards, ans=seq)
            assert len(cards) == len(it['hs']), (g['key'], len(cards), len(it['hs'])); items[g['key']] = it
    elif task == 'dls':
        ws = wb['2-4. 더비셔 언어 체계 검사']
        for g in grouped(ws, 10, 121):
            r = g['row']; it = base(g['key'], S(ws[f'D{r}'].value))
            opts = [S(ws[f'E{x}'].value) for x in g['opts']]; marks = [S(ws[f'G{x}'].value) or S(ws[f'F{x}'].value) for x in g['opts']]
            a = [i for i, m in enumerate(marks) if m.startswith('정답')]
            assert len(a) == 1 and len(opts) == 4, (g['key'], opts, marks)
            it.update(question=S(ws[f'E{r}'].value), opts=opts, ans=a[0]); items[g['key']] = it
    elif task == 'verbal_reasoning':
        ws = wb['2-3. 언어적 추론']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            txt = S(ws[f'E{r}'].value); lines = [l.strip() for l in txt.split('\n') if l.strip()]
            opts = [re.sub(r'^\d\.\s*', '', l) for l in lines if re.match(r'^\d\.', l)]
            prem = [l for l in lines if not re.match(r'^\d\.', l) and '알 수 있는 것' not in l]
            it.update(question=' '.join(prem), opts=opts, ans=int(float(ws[f'F{r}'].value)) - 1); assert len(opts) == 4, k; items[k] = it
    elif task == 'number_series':
        ws = wb['1-3. 숫자연속추론']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            seq, opt = S(ws[f'E{r}'].value).split('\n')[:2]; opts = [o.strip() for o in opt.split('/')]
            a = str(int(float(S(ws[f'G{r}'].value).split('\n')[0])))
            assert len(opts) == len(it['hs']) and opts.count(a) == 1, (k, opts, a)
            it.update(question=seq.strip(), opts=opts, ans=opts.index(a)); items[k] = it
    elif task == 'predictive':
        ws = wb['4-3. 예측추론 과제']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            ol = [l.strip() for l in S(ws[f'G{r}'].value).split('\n') if l.strip()]
            opts, scores = [], []
            for l in ol:
                m = re.match(r'^\d\.\s*(.*?)\s*\((\d)\)\s*$', l); opts.append(m.group(1)); scores.append(int(m.group(2)))
            assert sorted(scores) in ([0, 0, 1, 2],), (k, scores)
            it.update(question=S(ws[f'E{r}'].value), opts=opts, scores=scores, ans=scores.index(2), rule=S(ws[f'F{r}'].value)); items[k] = it
    elif task == 'length':
        ws = wb['3-3. 물리적 길이 전이 과제']
        for r in range(10, 32):
            k = key_of(ws[f'C{r}'].value); it = base(k, S(ws[f'D{r}'].value))
            chain = S(ws[f'E{r}'].value).split('\n')[-1]
            names = [nm(x) for x in re.findall(r'([^<()]+?)\s*\(([A-E])\)', chain) for x in [x[0]]]
            letters = re.findall(r'\(([A-E])\)', chain)
            it.update(objects=dict(zip(letters, [n.strip() for n in names])), question=S(ws[f'G{r}'].value), answer_text=S(ws[f'H{r}'].value).split('\n(')[0])
            items[k] = it
    return items

if __name__ == '__main__':
    for t in sys.argv[1:]:
        d = build(t); json.dump(d, open(f'/home/claude/work/data/{t}.json', 'w'), ensure_ascii=False, indent=1, default=int)
        print(t, len(d), list(d)[:3])
