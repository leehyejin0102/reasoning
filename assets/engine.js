/* ════════════════════════════════════════════════════════════════════════
   추론능력검사 소검사 공통 엔진 (13개 소검사 페이지가 모두 불러옵니다)

   ■ 페이지가 먼저 정의해야 하는 것
     window.TASK_DATA  — 같은 폴더의 data.js (문항 그림·선택 영역·정답, 자동 생성)
     window.CFG        — 페이지 안의 문구(검사명·지시문·예제 해설 등)와 응답 방식(kind)

   ■ 응답 방식(kind)
     choice   : 그림 속 보기 1개 선택 (문제해결·레이븐·언어 단서·패턴·A:B·3차원·더비셔·언어적 추론·숫자연속)
     rows     : 줄마다 그림 1개씩 선택 (공통그림찾기)
     sequence : 그림 카드를 순서대로 누름 + '처음부터 다시' (차례맞추기)
     length   : 자극 그림 속 사물을 직접 눌러 선택 (물리적 길이 전이)
     textopts : 전제 그림 + 글자 선지 4개, 선지별 0/1/2점 (예측추론)

   ■ 진행: 소검사 첫 화면 → 예제 1·해설 → 예제 2·해설 → 시작 안내('설명 다시 보기'/'검사 시작')
           → 전환 화면 → 본 문항(제한시간, '다음'으로 일찍 넘어가기) → 종료(VIT.finish)
   ■ 중지 규칙: 본 문항 연속 3문항 0점 (예측추론 1점은 0점이 아니므로 연속 횟수를 끊음)
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const { ParameterType } = jsPsychModule;
  const CFG = window.CFG, DATA = window.TASK_DATA || [], KIND = CFG.kind;
  const TEST_ID = CFG.id;
  const PRACTICE = DATA.filter((x) => x.k.startsWith("ex"));
  const ITEMS = DATA.filter((x) => !x.k.startsWith("ex"));
  const WARN_SEC = 5, STOP_AFTER = 3, USE_STOP_RULE = true;
  const T = Object.assign({
    startBtn: "시작하기", next: "다음", reset: "처음부터 다시", replayBtn: "설명 다시 보기", beginBtn: "검사 시작",
    timerIcon: "⏱", exampleWord: "예제", short: "가장 짧은 것", long: "가장 긴 것", shortTag: "짧은 것", longTag: "긴 것",
    notice: "각 문제에는 <b>제한시간</b>이 있어요. 제한시간이 지나면 자동으로 다음 문제로 넘어가고, 다 풀었으면 <b>‘다음’</b>을 누르세요.",
    practiceHint: "예제 문제예요. 답을 고른 뒤 <b>‘다음’</b>을 눌러 주세요.",
    ready: "이제 본 문제를 시작합니다.<br>각 문제에는 <b>제한시간</b>이 있어요. <b>제한시간이 지나면 자동으로 다음 문제로 넘어가고</b>, 다 풀었으면 <b>‘다음’</b>을 누르세요.<br>설명을 다시 보고 싶으면 <b>‘설명 다시 보기’</b>를 누르세요.",
    again: "예제를 다시 풀어 볼게요.",
    trans1: ["각 문제의 <b>제한시간</b>이 지나면", "자동으로 다음 문제로", "넘어가요."],
    trans2: ["다 풀었으면", "<b>‘다음’</b>을 눌러 주세요.", ""],
    progress: (i, n) => `문제 ${i} / ${n}`,
  }, CFG.text || {});

  // ── 고정 프레임 scale (샘플과 같은 방식) ──
  const FRAME_W = 1300, FRAME_H = 950;
  let currentScale = 1;
  function computeScale() {
    const margin = 12;
    currentScale = Math.min((window.innerWidth - margin * 2) / FRAME_W, (window.innerHeight - margin * 2) / FRAME_H);
    applyScale();
  }
  function applyScale() { document.querySelectorAll(".math-wrap").forEach((w) => { w.style.transform = `scale(${currentScale})`; }); }
  new MutationObserver(applyScale).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", computeScale);
  computeScale();

  function randomID(len = 10) {
    const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; let o = "";
    for (let i = 0; i < len; i++) o += c[Math.floor(Math.random() * c.length)];
    return o;
  }
  const subjectId = VIT.code() || randomID(10);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // 그림 미리 받기
  const _pre = []; DATA.forEach((it) => { const im = new Image(); im.src = it.img; _pre.push(im); });
  const loadImg = (u) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = u; if (im.complete) res(); });

  // ── 문항별 정답 정보 ──
  function rowOffsets(it) { const o = []; let s = 0; (it.rows || []).forEach((n) => { o.push(s); s += n; }); return o; }
  function keyIdx(it) {           // 정답으로 강조할 선택 영역 번호들
    if (KIND === "choice") return [it.ans];
    if (KIND === "rows") { const off = rowOffsets(it); return it.ans.map((a, r) => off[r] + a); }
    if (KIND === "sequence") return it.ans.slice();
    if (KIND === "length") { const A = Array.isArray(it.ans) ? it.ans : [it.ans]; return it.obj.map((L, i) => (A.includes(L) ? i : -1)).filter((i) => i >= 0); }
    return [];
  }
  function fit(it, maxW, maxH) { const s = Math.min(maxW / it.w, maxH / it.h); return { w: Math.round(it.w * s), h: Math.round(it.h * s) }; }

  // 그림 + 선택 영역. inner(i) 는 선택 영역 안에 넣을 HTML(순서 번호 등)
  function stageHTML(it, { maxW = 1120, maxH = 620, cls = () => "", inner = () => "", inert = false } = {}) {
    const d = fit(it, maxW, maxH);
    const hs = it.hs.map((r, i) => `<button class="hs ${cls(i)}" data-hs="${i}" ${inert ? 'tabindex="-1"' : ""} aria-label="${i + 1}"
        style="left:${r[0] * 100}%;top:${r[1] * 100}%;width:${r[2] * 100}%;height:${r[3] * 100}%">${inner(i)}</button>`).join("");
    return `<div class="stage-wrap ${inert ? "mockup-inert" : ""}"><div class="stage" style="width:${d.w}px;height:${d.h}px">
      <img src="${it.img}" alt="" draggable="false">${hs}</div></div>`;
  }
  function optsHTML(it, { cls = () => "", inert = false } = {}) {
    return `<div class="opt-list ${inert ? "mockup-inert" : ""}">${it.opts.map((t, i) => `<button class="opt ${cls(i)}" data-opt="${i}">
      <span class="num">${i + 1}</span><span class="sep"></span><span class="txt">${esc(t)}</span></button>`).join("")}</div>`;
  }
  // 예측추론: 책자 자극판(검은 테두리 상자)과 같은 모양으로 전제·질문을 글자로 표시
  function premiseHTML(it, small = false) {
    const lines = String(it.q || "").replace(/ㅇㅇ/g, "OO").split(/\n/).map((l) => l.trim());
    const html = lines.map((l) => (l ? esc(l) : "")).join("<br>").replace(/(<br>){2,}/g, '</p><p class="premise-q">');
    return `<div class="premise-box ${small ? "small" : ""}"><p>${html}</p></div>`;
  }
  function promptFor(it) {
    if (it.caption) return `<div class="prompt-line caption">${esc(it.caption)}</div>`;
    if (KIND === "length" && it.mode === "minmax") return "";
    const p = typeof CFG.prompt === "function" ? CFG.prompt(it) : CFG.prompt;
    return p ? `<div class="prompt-line">${p}</div>` : "";
  }
  // 정답 강조 화면(예제 해설용)
  function keyView(it, maxH) {
    const k = keyIdx(it);
    if (KIND === "textopts") return premiseHTML(it, true) + optsHTML(it, { inert: true, cls: (i) => (i === it.ans ? "key" : "") });
    if (it.caption) return stageHTML(it, { maxH: maxH - 50, inert: true, cls: (i) => (k.includes(i) ? "key" : "") }) + `<div class="prompt-line caption">${esc(it.caption)}</div>`;
    if (KIND === "sequence") return stageHTML(it, { maxH, inert: true, cls: () => "key", inner: (i) => `<span class="badge">${k.indexOf(i) + 1}</span>` });
    if (KIND === "length" && it.mode === "minmax") {
      return stageHTML(it, { maxH, inert: true, cls: (i) => (it.obj[i] === it.ans[0] ? "short" : it.obj[i] === it.ans[1] ? "long" : ""),
        inner: (i) => (it.obj[i] === it.ans[0] ? `<span class="tag">${T.shortTag}</span>` : it.obj[i] === it.ans[1] ? `<span class="tag">${T.longTag}</span>` : "") });
    }
    return stageHTML(it, { maxH, inert: true, cls: (i) => (k.includes(i) ? "key" : "") });
  }

  // ── 전환 화면 ──
  function transitionScreen(lines) {
    return `<div class="math-wrap"><div class="transition-stage"><div class="transition-cloud c1"></div><div class="transition-cloud c2"></div>
      <div class="transition-cloud c3"></div><div class="transition-circle"><div class="transition-text">${lines.join("<br>")}</div></div>
      <div class="transition-badge"><svg viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="#fff"/><rect x="11" y="9" width="2" height="6" fill="#4a74c4"/><circle cx="12" cy="17" r="1.2" fill="#4a74c4"/></svg></div></div></div>`;
  }

  // ── 안내 화면 플러그인 (첫 화면 / 해설 / 시작 안내) ──
  class InfoScreenPlugin {
    static info = {
      name: "info-screen", version: "2.0.0",
      parameters: {
        mode: { type: ParameterType.STRING, default: "info" },          // "title" | "info"
        tag: { type: ParameterType.STRING, default: "" },
        header_right: { type: ParameterType.HTML_STRING, default: "" },
        body_html: { type: ParameterType.HTML_STRING, default: "" },
        mockup_html: { type: ParameterType.HTML_STRING, default: "" },
        buttons: { type: ParameterType.STRING, array: true, default: ["→"] },
        use_arrow_nav: { type: ParameterType.BOOL, default: true },
      },
      data: { response: { type: ParameterType.STRING } },
    };
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(el, trial) {
      const done = (label) => this.jsPsych.finishTrial({ response: label });
      if (trial.mode === "title") {
        el.innerHTML = `<div class="math-wrap"><div class="title-card"><div class="ellipse"></div><div class="body">
          <div class="title-badge">${esc(CFG.badge)}</div><div class="title-name">${CFG.name}</div>
          <div class="title-instr">${CFG.instr}</div><div class="title-notice">${T.notice}</div>
          <button class="title-start" data-i="0"><span class="play"></span>${T.startBtn}</button></div></div></div>`;
      } else {
        const multi = trial.buttons.length > 1;
        const btns = trial.buttons.map((b, i) => `<button class="next-btn ${multi && i === 0 ? "secondary-btn" : ""}" data-i="${i}">${b}</button>`).join("");
        const nav = trial.use_arrow_nav && !multi
          ? `<div class="with-arrow">${trial.mockup_html}<button class="nav-arrow-btn" data-i="0" aria-label="다음">→</button></div>`
          : `${trial.mockup_html}<div class="btn-row">${btns}</div>`;
        el.innerHTML = `<div class="math-wrap"><div class="content-col">
          ${trial.tag ? `<div class="math-header"><div class="math-tag">${trial.tag}</div><div class="header-right">${trial.header_right}</div></div>` : ""}
          ${trial.body_html}${nav}</div></div>`;
      }
      el.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => done(trial.buttons[b.dataset.i] || "start")));
    }
  }

  // ── 문항 플러그인 (예제·본 문항 공통) ──
  class ItemPlugin {
    static info = {
      name: "reasoning-item", version: "1.0.0",
      parameters: {
        item: { type: ParameterType.COMPLEX, default: undefined },
        practice: { type: ParameterType.BOOL, default: false },
        limit_ms: { type: ParameterType.INT, default: 0 },
        progress: { type: ParameterType.STRING, default: "" },
      },
      data: {
        response: { type: ParameterType.STRING }, response_text: { type: ParameterType.STRING },
        correct: { type: ParameterType.BOOL }, omission: { type: ParameterType.BOOL }, false_alarm: { type: ParameterType.BOOL },
        partial: { type: ParameterType.BOOL }, score: { type: ParameterType.INT },
        rt: { type: ParameterType.INT }, decision_time: { type: ParameterType.INT }, total_rt: { type: ParameterType.INT },
        change_count: { type: ParameterType.INT }, response_history: { type: ParameterType.STRING },
      },
    };
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(el, trial) {
      const it = trial.item, n = it.hs.length;
      let finished = false, t0 = 0, firstT = null, timeoutId = null, tickId = null, changes = 0;
      const history = [];
      // 응답 상태
      let sel = null;                                    // choice / textopts / length(pair·nth)
      const rowSel = (it.rows || []).map(() => null);    // rows
      let order = [];                                    // sequence
      const slots = { short: null, long: null }; let active = "short";   // length(minmax)
      const minmax = KIND === "length" && it.mode === "minmax";
      const off = rowOffsets(it);
      const rowOf = (i) => { for (let r = off.length - 1; r >= 0; r--) if (i >= off[r]) return r; return 0; };

      const header = `<div class="math-header"><div class="math-tag">${CFG.tag}</div><div class="header-right"><div class="timer-badge" id="timer-badge"></div>
        <div class="math-progress ${trial.practice ? "practice" : ""}">${trial.progress}</div></div></div>`;
      const hint = trial.practice ? `<div class="info-box" style="padding:10px 24px;font-size:23px">${T.practiceHint}</div>` : "";
      const slotsHTML = minmax ? `<div class="slot-row"><button class="slot short active" data-slot="short"><span class="k">${T.short}</span><span class="v" id="v-short">—</span></button>
        <button class="slot long" data-slot="long"><span class="k">${T.long}</span><span class="v" id="v-long">—</span></button></div>` : "";
      const maxH = (trial.practice ? 560 : 640) - (it.caption ? 60 : 0) - (minmax ? 60 : 0) - (KIND === "textopts" ? 400 : 0) - (KIND === "rows" || KIND === "sequence" || KIND === "length" ? 40 : 0);
      const body = KIND === "textopts" ? premiseHTML(it) + optsHTML(it) : stageHTML(it, { maxH });
      el.innerHTML = `<div class="math-wrap"><div class="content-col">${header}${hint}${slotsHTML}
        ${it.caption ? "" : promptFor(it)}<div id="root" data-k="${it.k}" style="visibility:hidden">${body}</div>${it.caption ? promptFor(it) : ""}
        <div class="ctrl-row">${KIND === "sequence" ? `<button class="reset-pill" id="reset-btn" disabled>${T.reset}</button>` : ""}
          <button class="next-pill" id="next-btn" disabled>${T.next}</button></div></div></div>`;
      const root = el.querySelector("#root"), nextBtn = el.querySelector("#next-btn"), resetBtn = el.querySelector("#reset-btn"), badge = el.querySelector("#timer-badge");
      const hsBtns = [...el.querySelectorAll(".hs")], optBtns = [...el.querySelectorAll(".opt")];
      const nameOf = (L) => (it.names && it.names[L]) || L;

      const complete = () => {
        if (KIND === "rows") return rowSel.every((v) => v !== null);
        if (KIND === "sequence") return order.length === n;
        if (minmax) return slots.short !== null && slots.long !== null;
        return sel !== null;
      };
      const render = () => {
        if (KIND === "choice") hsBtns.forEach((b, i) => b.classList.toggle("sel", i === sel));
        if (KIND === "textopts") optBtns.forEach((b, i) => b.classList.toggle("sel", i === sel));
        if (KIND === "rows") hsBtns.forEach((b, i) => b.classList.toggle("sel", rowSel[rowOf(i)] === i - off[rowOf(i)]));
        if (KIND === "sequence") hsBtns.forEach((b, i) => { const p = order.indexOf(i); b.classList.toggle("sel", p >= 0); b.innerHTML = p >= 0 ? `<span class="badge">${p + 1}</span>` : ""; });
        if (KIND === "length" && !minmax) hsBtns.forEach((b, i) => b.classList.toggle("sel", it.obj[i] === sel));
        if (minmax) {
          hsBtns.forEach((b, i) => {
            const L = it.obj[i], s = L === slots.short, l = L === slots.long;
            b.classList.toggle("short", s); b.classList.toggle("long", l);
            b.innerHTML = s ? `<span class="tag">${T.shortTag}</span>` : l ? `<span class="tag">${T.longTag}</span>` : "";
          });
          el.querySelector("#v-short").textContent = slots.short ? nameOf(slots.short) : "—";
          el.querySelector("#v-long").textContent = slots.long ? nameOf(slots.long) : "—";
          el.querySelectorAll(".slot").forEach((s) => s.classList.toggle("active", s.dataset.slot === active));
        }
        nextBtn.disabled = !complete();
        if (resetBtn) resetBtn.disabled = order.length === 0;
      };
      const touch = () => { if (firstT === null) firstT = performance.now(); };

      const onHs = (i) => {
        if (finished) return; touch();
        if (KIND === "choice") { if (sel !== i) { if (sel !== null) changes++; sel = i; history.push(i + 1); } }
        else if (KIND === "rows") { const r = rowOf(i), c = i - off[r]; if (rowSel[r] !== c) { if (rowSel[r] !== null) changes++; rowSel[r] = c; history.push(`${r + 1}:${c + 1}`); } }
        else if (KIND === "sequence") { if (!order.includes(i)) { order.push(i); history.push(i + 1); } }
        else if (KIND === "length" && !minmax) { const L = it.obj[i]; if (sel !== L) { if (sel !== null) changes++; sel = L; history.push(nameOf(L)); } }
        else if (minmax) {
          const L = it.obj[i], other = active === "short" ? "long" : "short";
          if (slots[active] !== L) {
            if (slots[active] !== null) changes++;
            if (slots[other] === L) slots[other] = null;          // 같은 사물을 두 칸에 동시에 넣지 않음
            slots[active] = L; history.push(`${active === "short" ? T.shortTag : T.longTag}:${nameOf(L)}`);
          }
          if (slots[other] === null) active = other;
        }
        render();
      };
      hsBtns.forEach((b) => b.addEventListener("click", () => onHs(Number(b.dataset.hs))));
      optBtns.forEach((b) => b.addEventListener("click", () => {
        if (finished) return; touch(); const i = Number(b.dataset.opt);
        if (sel !== i) { if (sel !== null) changes++; sel = i; history.push(i + 1); } render();
      }));
      el.querySelectorAll(".slot").forEach((s) => s.addEventListener("click", () => { if (!finished) { active = s.dataset.slot; render(); } }));
      if (resetBtn) resetBtn.addEventListener("click", () => { if (finished || !order.length) return; order = []; changes++; history.push("R"); render(); });
      nextBtn.addEventListener("click", () => { if (complete()) end(false); });

      const end = (timedOut) => {
        if (finished) return;
        finished = true; clearTimeout(timeoutId); clearInterval(tickId);
        const endT = performance.now(), answered = firstT !== null;
        let correct = false, response = "", responseText = "", score = 0, partial = null;
        if (KIND === "choice") {
          correct = sel === it.ans; response = sel === null ? "" : String(sel + 1); responseText = sel !== null && it.opts ? it.opts[sel] : "";
        } else if (KIND === "textopts") {
          score = sel === null ? 0 : it.scores[sel]; correct = score === 2; partial = sel !== null && score === 1;
          response = sel === null ? "" : String(sel + 1); responseText = sel === null ? "" : it.opts[sel];
        } else if (KIND === "rows") {
          correct = rowSel.every((v, r) => v === it.ans[r]);
          response = answered ? rowSel.map((v) => (v === null ? "-" : v + 1)).join("-") : "";
          responseText = answered ? rowSel.map((v, r) => (v === null ? "-" : it.names[r][v])).join(" / ") : "";
        } else if (KIND === "sequence") {
          correct = order.length === n && order.every((v, i) => v === it.ans[i]);
          response = order.map((v) => v + 1).join("-"); responseText = order.map((v) => it.cards[v]).join(" → ");
        } else if (minmax) {
          correct = slots.short === it.ans[0] && slots.long === it.ans[1];
          response = answered ? `${slots.short || "-"}-${slots.long || "-"}` : "";
          responseText = answered ? `${T.shortTag}: ${slots.short ? nameOf(slots.short) : "-"} / ${T.longTag}: ${slots.long ? nameOf(slots.long) : "-"}` : "";
        } else {
          correct = sel === it.ans; response = sel || ""; responseText = sel ? nameOf(sel) : "";
        }
        if (KIND !== "textopts") score = correct ? 1 : 0;
        const rt = answered ? Math.round(firstT - t0) : null;
        const decision = answered ? Math.round(endT - firstT) : null;
        const falseAlarm = answered && !correct;
        this.jsPsych.finishTrial({
          response, response_text: responseText, correct, omission: !answered, false_alarm: falseAlarm, partial, score,
          rt, decision_time: decision, total_rt: answered ? rt + decision : null, timed_out: timedOut,
          change_count: answered ? changes : null, response_history: history.join(">"),
        });
      };
      Promise.all([loadImg(it.img)]).then(() => {
        root.style.visibility = "visible"; t0 = performance.now(); render();
        if (trial.limit_ms > 0) {
          tickId = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((trial.limit_ms - (performance.now() - t0)) / 1000));
            if (remaining <= WARN_SEC && remaining > 0) { badge.textContent = `${T.timerIcon} ${remaining}`; badge.classList.add("on"); }
          }, 200);
          timeoutId = setTimeout(() => end(true), trial.limit_ms);
        }
      });
    }
  }

  // ── 정답 표시용 문자열 ──
  function answerOf(it) {
    if (KIND === "choice") return { a: String(it.ans + 1), t: it.opts ? it.opts[it.ans] : "" };
    if (KIND === "textopts") return { a: String(it.ans + 1), t: it.opts[it.ans] };
    if (KIND === "rows") return { a: it.ans.map((v) => v + 1).join("-"), t: it.ans.map((v, r) => it.names[r][v]).join(" / ") };
    if (KIND === "sequence") return { a: it.ans.map((v) => v + 1).join("-"), t: it.ans.map((v) => it.cards[v]).join(" → ") };
    if (KIND === "length" && it.mode === "minmax") return { a: it.ans.join("-"), t: `짧은 것: ${it.names[it.ans[0]]} / 긴 것: ${it.names[it.ans[1]]}` };
    return { a: it.ans, t: it.names[it.ans] };
  }

  // ── 결과 CSV (source/CSV_FORMAT.md) ──
  const CSV_COLUMNS = ["code_name", "language", "item_index", "difficulty", "question", "time_limit_sec", "correct_answer", "answer_text",
    "response", "response_text", "correct", "omission", "false_alarm", "partial", "score", "rt", "decision_time", "total_rt",
    "change_count", "change_count_correct", "change_count_false_alarm", "response_history", "administered", "valid_trial", "interruption_count"];
  function csvEscape(v) { if (v === undefined || v === null) return ""; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  window.buildFilteredCSVString = function () {
    const rows = jsPsych.data.get().filter({ phase: `${TEST_ID}_item` }).values(), by = {};
    rows.forEach((r) => { by[r.item_index] = r; });
    const lines = [CSV_COLUMNS.join(",")];
    ITEMS.forEach((it) => {
      const a = answerOf(it), r = by[it.n];
      const base = { code_name: subjectId, language: CFG.lang, item_index: it.n, difficulty: it.diff, question: it.q, time_limit_sec: it.limit,
        correct_answer: a.a, answer_text: a.t };
      const row = r ? { ...r, ...base, administered: true,
        change_count_correct: r.correct ? r.change_count : null, change_count_false_alarm: r.false_alarm ? r.change_count : null,
        partial: KIND === "textopts" ? r.partial : null } : { ...base, administered: false };
      lines.push(CSV_COLUMNS.map((c) => csvEscape(row[c])).join(","));
    });
    return lines.join("\n");
  };

  // ── 타임라인 ──
  const jsPsych = window.jsPsych = initJsPsych({ on_finish: () => VIT.finish() });
  const timeline = [{ type: InfoScreenPlugin, mode: "title", buttons: [T.startBtn] }];
  let rounds = 0;
  const practiceBlock = [{
    timeline: [{ type: InfoScreenPlugin, tag: CFG.tag, body_html: `<div class="info-box">${T.again}<br>${CFG.instr}</div>`, mockup_html: "",
      buttons: ["→"], use_arrow_nav: false }],
    conditional_function: () => rounds > 0,
  }];
  PRACTICE.forEach((it, i) => {
    practiceBlock.push({ type: ItemPlugin, item: it, practice: true, progress: `${T.exampleWord} ${i + 1}`, data: { phase: `${TEST_ID}_practice`, practice_index: i + 1 } });
    practiceBlock.push({
      type: InfoScreenPlugin, tag: CFG.tag, header_right: `<div class="math-progress practice">${T.exampleWord} ${i + 1}</div>`,
      body_html: `<div class="info-box">${CFG.explain[i]}</div>`, mockup_html: keyView(it, KIND === "textopts" ? 200 : 520), buttons: ["→"],
    });
  });
  practiceBlock.push({
    type: InfoScreenPlugin, tag: CFG.tag, body_html: `<div class="info-box" style="font-size:28px;padding:30px 36px">${T.ready}</div>`,
    mockup_html: "", buttons: [T.replayBtn, T.beginBtn], use_arrow_nav: false,
    on_finish: () => { rounds++; },
  });
  timeline.push({ timeline: practiceBlock, loop_function: (d) => { const v = d.values(); return v[v.length - 1].response === T.replayBtn; } });
  timeline.push({ type: jsPsychHtmlKeyboardResponse, stimulus: () => transitionScreen(T.trans1), choices: "NO_KEYS", trial_duration: 2500 });
  timeline.push({ type: jsPsychHtmlKeyboardResponse, stimulus: () => transitionScreen(T.trans2), choices: "NO_KEYS", trial_duration: 2500 });

  let consecutiveZero = 0;
  ITEMS.forEach((it, idx) => {
    timeline.push({
      conditional_function: () => !(USE_STOP_RULE && consecutiveZero >= STOP_AFTER),
      timeline: [{
        type: ItemPlugin, item: it, limit_ms: it.limit * 1000, progress: T.progress(idx + 1, ITEMS.length),
        data: { phase: `${TEST_ID}_item`, item_index: it.n },
        on_finish: (d) => { consecutiveZero = d.score > 0 ? 0 : consecutiveZero + 1; },
      }],
    });
  });
  timeline.push({ type: jsPsychHtmlKeyboardResponse, stimulus: VIT.endStimulus(), choices: [" "], trial_duration: VIT.endDuration() });
  jsPsych.run(timeline);
})();
