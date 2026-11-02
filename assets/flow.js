/* ════════════════════════════════════════════════════════════════════════
   소검사 페이지 공통 스크립트 (12개 검사 페이지가 모두 불러옵니다)

   ■ 역할
     - 소검사 페이지는 "셸"(루트 index.html) 안에서 iframe 으로 실행됩니다 (주소에 ?embed=1&code=코드).
       검사가 끝나면 이 파일이 문항별 결과(CSV 문자열)를 셸(부모 창)로 보내고,
       저장(DataPipe)·JSON·엑셀 변환은 모두 셸이 한 번에 처리합니다.
     - 소검사 페이지를 단독으로 열어 개발·점검할 때(주소에 embed 없음)는 끝나면 CSV 를 내려받습니다.
     - 셸이 "중단"을 누르면 그 시점까지의 결과(CSV)를 요청하는데, 아래 'snapshot' 응답이 그것을 보냅니다.

   ■ 페이지가 사용하는 것
     VIT.code()          참가자 코드 (?code= → 없으면 임의 ID)
     VIT.endStimulus()   마지막 화면(없음)       VIT.endDuration()   마지막 화면 길이(ms)
     VIT.finish()        검사 종료 시 jsPsych on_finish 에서 호출
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  const qs = new URLSearchParams(location.search);
  const embedded = qs.get("embed") === "1" && window.parent !== window;
  const parts = location.pathname.split("/").filter(Boolean);
  if (/\.html?$/i.test(parts[parts.length - 1] || "")) parts.pop();
  const testId = parts[parts.length - 1] || "";
  const lang = parts.includes("vi") ? "vi" : "ko";
  const TEXT = {
    ko: { saving: "결과를 정리하고 있습니다…", solo: "검사가 종료되었습니다. 결과 CSV 를 내려받았습니다.", again: "CSV 다시 내려받기" },
    vi: { saving: "Đang tổng hợp kết quả…", solo: "Bài kiểm tra đã kết thúc. Đã tải tệp CSV kết quả.", again: "Tải lại tệp CSV" },
  }[lang];


  // ── 화면 전환·창 크기 변경 감시 (기준 검사와 같은 방식) ────────────────
  // 문항(phase 가 *_item 또는 motor_test)이 진행되는 동안 화면 전환(hidden)·창 이탈(blur)·창 크기 변경(resize)이
  // 있으면 그 문항을 valid_trial=false 로 표시하고, 문항이 끝난 뒤 "계속하기" 화면을 보여 줍니다.
  // (제외된 문항은 요약 계산에서 빠지고 원자료·엑셀에는 남습니다.)
  const NOTICE = {
    ko: { text: "화면 전환이 감지되었습니다. 준비되면 계속해 주세요. 해당 문항은 기록에 표시됩니다.", btn: "계속하기" },
    vi: { text: "Đã phát hiện chuyển màn hình. Nhấn tiếp tục khi sẵn sàng. Câu này sẽ được đánh dấu.", btn: "Tiếp tục" },
  }[lang];
  const ITEM_PHASES = /(_item|motor_test)$/;
  let interruptions = 0;
  const bump = () => { interruptions++; };
  document.addEventListener("visibilitychange", () => { if (document.hidden) bump(); });
  window.addEventListener("blur", bump);
  window.addEventListener("resize", bump);
  const env = () => ({ w: innerWidth, h: innerHeight });
  function showNotice(jsPsych) {
    let host = document.getElementById("vit-notice");
    if (host) return;
    host = document.createElement("div"); host.id = "vit-notice";
    host.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(244,246,251,.97);display:flex;align-items:center;justify-content:center;font-family:'Noto Sans KR','Segoe UI',sans-serif;";
    host.innerHTML = `<div style="max-width:560px;background:#fff;border:2px solid #2554c7;border-radius:20px;padding:34px 40px;text-align:center;box-shadow:0 10px 24px rgba(37,84,199,.08);"><p style="color:#1c3f94;font-size:20px;line-height:1.7;margin:0 0 22px;">${NOTICE.text}</p><button id="vit-notice-btn" style="font-size:18px;padding:12px 28px;border:0;border-radius:999px;background:#2554c7;color:#fff;cursor:pointer;">${NOTICE.btn}</button></div>`;
    document.body.appendChild(host);
    document.getElementById("vit-notice-btn").addEventListener("click", () => { host.remove(); try { jsPsych.resumeExperiment(); } catch (e) {} });
  }
  // 각 검사 페이지가 부르는 initJsPsych 를 감싸서 모든 문항에 같은 규칙을 적용합니다(페이지 수정 불필요).
  const rawInit = window.initJsPsych;
  if (typeof rawInit === "function") {
    window.initJsPsych = function (opts) {
      const o = Object.assign({}, opts || {});
      const userStart = o.on_trial_start, userFinish = o.on_trial_finish;
      let snap = null, inst = null;
      o.on_trial_start = function (trial) { snap = { n: interruptions, e: env() }; if (userStart) userStart.apply(this, arguments); };
      o.on_trial_finish = function (data) {
        if (data && ITEM_PHASES.test(String(data.phase || "")) && snap) {
          const now = env(), same = now.w === snap.e.w && now.h === snap.e.h;
          data.interruption_count = interruptions - snap.n;
          data.valid_trial = interruptions === snap.n && same;
          if (!data.valid_trial && inst) { try { inst.pauseExperiment(); } catch (e) {} showNotice(inst); }
        }
        if (userFinish) userFinish.apply(this, arguments);
      };
      inst = rawInit.call(this, o);
      return inst;
    };
  }

  function code() {
    const fromUrl = (qs.get("code") || "").trim();
    if (fromUrl) return fromUrl;
    try { return (localStorage.getItem("vit_participant_code") || "").trim(); } catch (e) { return ""; }
  }
  function buildCsv() {
    return typeof window.buildFilteredCSVString === "function" ? window.buildFilteredCSVString() : "";
  }
  function download(csv) {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${code() || "test"}_${testId}_${lang}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const target = () => document.querySelector(".jspsych-display-element") || document.body;
  const box = (inner) => `<div style="text-align:center;font-family:'Noto Sans KR','Segoe UI',sans-serif;padding:0 24px;">${inner}</div>`;

  function finish() {
    const csv = buildCsv();
    if (embedded) {
      target().innerHTML = box(`<p style="color:#667;font-size:20px;">${TEXT.saving}</p>`);
      window.parent.postMessage({ vit: true, type: "done", testId, lang, csv }, "*");
      return;
    }
    download(csv);
    target().innerHTML = box(`<h1 style="color:#1c3f94;font-size:30px;">${TEXT.solo}</h1><button id="vit-again" style="font-size:18px;padding:10px 22px;border-radius:10px;border:0;background:#2554c7;color:#fff;cursor:pointer;">${TEXT.again}</button>`);
    const b = document.getElementById("vit-again"); if (b) b.addEventListener("click", () => download(csv));
  }

  window.addEventListener("message", (ev) => {
    if (!embedded || ev.source !== window.parent || !ev.data || ev.data.vit !== true) return;
    if (ev.data.type === "snapshot") {
      let csv = "";
      try { csv = buildCsv(); } catch (e) { csv = ""; }
      window.parent.postMessage({ vit: true, type: "snapshot", testId, lang, csv }, "*");
    }
  });
  // 숫자/알파벳이 아닌 키(스크롤 등)로 iframe 이 움직이지 않게, 스페이스 기본 동작은 각 검사 페이지가 처리합니다.

  window.VIT = {
    testId, lang, embedded, code,
    endStimulus: () => "",     // 마지막 "스페이스 바" 화면은 없음 — 바로 종료 처리
    endDuration: () => 50,
    finish,
  };
})();
