# booklet page numbers (1-based) per subtest: title, instr, ex1, ex1_expl, ex2, ex2_expl, items(20)
def block(src, title, items_start, ex=None):
    # ex pages follow instr: title+1 instr, +2 ex1, +3 ex1expl, +4 ex2, +5 ex2expl
    return dict(src=src, title=title, instr=title+1, ex=[title+2, title+4], ex_expl=[title+3, title+5],
                items=list(range(items_start, items_start+20)))
PAGES = {
  'picture_concepts': block('core', 2, 8),
  'problem_solving':  block('core', 29, 35),
  'raven':            block('core', 56, 62),
  'verbal_cue':       block('core', 83, 89),
  'pattern':          block('core', 110, 116),
  'analogy':          dict(src='abcd', title=1, instr=2, ex=[3,5], ex_expl=[4,6], items=list(range(7,27))),
  'rotation':         block('core', 164, 170),
  'picture_arrangement': block('core', 191, 197),
  'dls':              block('supp', 2, 8),
  'verbal_reasoning': block('supp', 29, 35),
  'number_series':    block('supp', 56, 62),
  'predictive':       block('supp', 83, 89),
  'length':           block('supp', 110, 116),
}
def path(src, p):
    w = 3 if src in ('core','supp') else 2
    return f'/home/claude/work/pages/{src}/p-{p:0{w}d}.png'
