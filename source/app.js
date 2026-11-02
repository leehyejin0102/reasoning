/* 추론능력검사 셸 — 첫 화면·참가자 정보·소검사 순차 실행·결과 저장/내보내기·복구
   소검사 화면(ko/·vi/ 폴더)은 iframe 으로 열고, 끝나면 문항별 CSV 를 postMessage 로 받아 한 세션으로 묶습니다. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), C = BATTERY_CONFIG, E = BatteryExport, U = BatteryUpload, I = BatteryParticipant, T = BatteryTasks, A = BatteryAnalysis;
  const STORE = 'vit-battery-session-v1', SETTINGS = 'vit-battery-settings-v1';
  let language = C.defaultLanguage || 'ko', session = null, running = false, queue = [], qIndex = 0, frame = null, waiter = null;
  let settings = { dataPipeExperimentId: C.dataPipeExperimentId, autoUpload: C.autoUpload };
  try { const c = JSON.parse(localStorage.getItem(SETTINGS) || '{}'); const id = typeof c?.dataPipeExperimentId === 'string' ? c.dataPipeExperimentId.trim() : ''; if (id) settings = { ...settings, ...c, dataPipeExperimentId: id }; } catch { /* 설정 저장 불가 시 기본값 */ }

  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const t = (key, vars = {}) => { let text = (BATTERY_TEXT[language] || BATTERY_TEXT.ko)[key] || key; for (const [k, v] of Object.entries(vars)) text = text.replaceAll('{' + k + '}', String(v)); return text; };
  const taskName = task => task.name[language] || task.name.ko;
  const app = { t, get session() { return session; }, get language() { return language; } };
  window.batteryApp = app;

  // ── 임시 보관(복구용) ────────────────────────────────────────────
  function localSave() {
    if (!session) return;
    try { localStorage.setItem(STORE, JSON.stringify(session)); }
    catch { if (!$('#storage-warning')) { const b = document.createElement('div'); b.id = 'storage-warning'; b.className = 'storage-warning'; b.textContent = t('storageUnavailable'); document.body.prepend(b); } }
  }
  // ── 화면 전환·창 크기 변경 기록(원자료의 interruptions) ───────────
  function monitor(type) { if (running && session) { session.interruptions.push({ type, task: queue[qIndex]?.folder || null, time_iso: new Date().toISOString() }); localSave(); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) monitor('hidden'); });
  window.addEventListener('blur', () => monitor('blur'));
  window.addEventListener('resize', () => monitor('resize'));
  document.addEventListener('fullscreenchange', () => monitor('fullscreenchange'));
  window.addEventListener('beforeunload', ev => { if (running) { localSave(); ev.preventDefault(); ev.returnValue = ''; } });

  // ── 첫 화면 ──────────────────────────────────────────────────────
  function renderCards() {
    const prev = Object.fromEntries([...document.querySelectorAll('.task-grid input')].map(i => [i.dataset.folder, i.checked]));
    const card = task => {
      const on = task.folder in prev ? prev[task.folder] : task.group === 'core';   // 핵심 = 처음부터 선택, 보충 = 검사자가 직접 선택
      return `<label class="task-card"><input type="checkbox" data-folder="${task.folder}" id="select-${task.folder}" ${on ? 'checked' : ''}><div class="card-heading"><span class="card-number">${task.number}</span><span class="task-check">✓</span></div>${task.age ? `<span class="age-tag">${escape(task.age[language] || task.age.ko)}</span>` : ''}<h2>${escape(taskName(task))}</h2><p>${escape(task.desc[language] || task.desc.ko)}</p><div class="card-meta"><span>${escape(task.code)}</span><span>${escape(task.meta[language] || task.meta.ko)}</span></div></label>`;
    };
    $('#core-grid').innerHTML = C.tasks.filter(t => t.group === 'core').map(card).join('');
    $('#supp-grid').innerHTML = C.tasks.filter(t => t.group !== 'core').map(card).join('');
    $('#supp-grid').classList.add('supp');
  }
  function updateLanguage(lang) {
    language = lang; document.documentElement.lang = lang; document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $('#lang-change').textContent = t('langChange');
    $('#participant').placeholder = lang === 'ko' ? '예: P001' : 'Ví dụ: P001'; $('#run-stop').textContent = t('stop'); renderCards();
  }
  // ── 표지 → 언어 선택 → 검사 선택 ─────────────────────────────────
  function showScreen(id) { ['#cover', '#lang-select', '#home'].forEach(s => { $(s).hidden = s !== id; }); $('#lang-change').hidden = id !== '#home'; window.scrollTo(0, 0); }
  $('#cover-start').onclick = () => showScreen('#lang-select');
  document.querySelectorAll('.lang-card').forEach(b => b.onclick = () => {
    const lang = b.dataset.lang, ready = (C.readyLanguages || ['ko']).includes(lang);
    $('#lang-pending').hidden = ready;
    if (!ready) return;
    updateLanguage(lang); showScreen('#home'); checkRecovery();
  });
  $('#lang-change').onclick = () => { if (!running) { $('#lang-pending').hidden = true; showScreen('#lang-select'); } };
  $('#settings-open').onclick = () => { $('#pipe-id').value = settings.dataPipeExperimentId || ''; $('#auto-upload').checked = settings.autoUpload !== false; $('#settings-dialog').showModal(); };
  $('#save-settings').onclick = () => { settings = { dataPipeExperimentId: $('#pipe-id').value.trim(), autoUpload: $('#auto-upload').checked }; try { localStorage.setItem(SETTINGS, JSON.stringify(settings)); } catch { /* 무시 */ } $('#settings-dialog').close(); };

  // ── 소검사 실행 ──────────────────────────────────────────────────
  function showRun(on) { $('#home').hidden = on; $('#lang-change').hidden = on; $('#run-shell').hidden = !on; document.body.classList.toggle('running', on); }
  function runTask(i) {
    qIndex = i; const task = queue[i];
    $('#run-label').textContent = taskName(task); $('#run-progress').textContent = (i + 1) + ' / ' + queue.length;
    const host = $('#experiment'); host.innerHTML = '';
    frame = document.createElement('iframe'); frame.title = taskName(task); frame.allow = 'fullscreen';
    frame.src = `${language}/${task.folder}/index.html?embed=1&code=${encodeURIComponent(session.participant_id)}`;
    frame.onerror = () => { host.innerHTML = `<div class="between"><p>${escape(t('frameError'))}</p></div>`; };
    session.current = { folder: task.folder, started_at: new Date().toISOString() }; localSave();
    host.appendChild(frame);
  }
  function record(csv, completed) {
    const task = queue[qIndex];
    session.task_data[task.folder] = { csv: csv || '', started_at: session.current?.started_at || null, completed_at: new Date().toISOString(), completed };
    delete session.current; localSave();
  }
  function between() {
    const next = queue[qIndex + 1], done = queue[qIndex];
    frame = null;
    $('#experiment').innerHTML = `<div class="between"><h2>${escape(t('taskFinished', { name: taskName(done) }))}</h2><p>${escape(t('nextTask', { name: taskName(next) }))}<br>${escape(t('nextHint'))}</p><button class="primary" id="between-next">${escape(t('continue'))}</button></div>`;
    $('#between-next').onclick = () => runTask(qIndex + 1);
  }
  window.addEventListener('message', ev => {
    const m = ev.data;
    if (!running || !frame || ev.source !== frame.contentWindow || !m || m.vit !== true) return;
    if (m.type === 'snapshot' && waiter) { const w = waiter; waiter = null; w(m.csv); return; }
    if (m.type !== 'done') return;
    record(m.csv, true);
    if (qIndex + 1 < queue.length) between(); else finish(false);
  });
  function requestSnapshot() {
    return new Promise(resolve => {
      if (!frame) return resolve('');
      const timer = setTimeout(() => { waiter = null; resolve(''); }, 1500);
      waiter = csv => { clearTimeout(timer); resolve(csv); };
      try { frame.contentWindow.postMessage({ vit: true, type: 'snapshot' }, '*'); } catch { clearTimeout(timer); waiter = null; resolve(''); }
    });
  }
  $('#run-stop').onclick = async () => {
    if (!running || !confirm(t('stopConfirm'))) return;
    const csv = frame ? await requestSnapshot() : '';
    if (frame && csv) record(csv, false);
    finish(true);
  };
  function finish(stopped) {
    running = false; frame = null; $('#experiment').innerHTML = '';
    session.session_complete = !stopped; session.completed_at = new Date().toISOString(); localSave(); showResults(stopped);
  }

  async function start() {
    if (running) return;
    const selected = C.tasks.filter(task => $('#select-' + task.folder).checked);   // 실시 순서 = config.js 의 순서
    const started_at = new Date().toISOString(), identity = I.validate({ participant_id: $('#participant').value, participant_name: $('#participant-name').value, birth_date: $('#birth-date').value }, I.testDate(started_at));
    if (!selected.length) { $('#form-error').textContent = t('selectTask'); return; }
    if (identity.error) { $('#form-error').textContent = t(identity.error); return; }
    if (innerWidth < 650) { $('#form-error').textContent = t('smallScreen'); return; }
    $('#form-error').textContent = '';
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
    session = { session_id: id, ...identity, language, run_mode: 'main', data_role: 'research', version: C.version, selected: selected.map(x => x.folder),
      started_at, session_complete: false, upload_status: 'not_attempted', user_agent: navigator.userAgent, screen_width: screen.width, screen_height: screen.height,
      pixel_ratio: devicePixelRatio, dataPipeExperimentId: settings.dataPipeExperimentId, autoUpload: settings.autoUpload, task_data: {}, interruptions: [] };
    session.filename = identity.participant_id + '_' + started_at.replace(/[:.]/g, '-') + '_' + String(id).slice(0, 8);
    queue = selected; running = true; $('#results').hidden = true; showRun(true); localSave(); runTask(0);
  }
  $('#start-form').onsubmit = ev => { ev.preventDefault(); start().catch(showRuntimeError); };

  // ── 결과 화면·내보내기 ────────────────────────────────────────────
  function download(content, name, type) { const blob = new Blob([content], { type }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  const exportWorkbook = (d = session) => download(E.workbookBytes(d), E.fileNames(d).workbook, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const exportResult = (d = session) => download(JSON.stringify(E.cleanResult(d), null, 2), E.fileNames(d).results, 'application/json;charset=utf-8');
  const exportRaw = (d = session) => download(JSON.stringify(E.rawSession(d), null, 2), E.fileNames(d).raw, 'application/json;charset=utf-8');
  const fmt = (v, d = 0) => v === null || v === undefined ? '—' : Number(v).toFixed(d);
  function resultTable() {
    const rows = A.packet(session).summary;
    if (!rows.length) return `<p>${escape(t('noMain'))}</p>`;
    return `<table class="summary-table"><thead><tr><th>${t('summaryTask')}</th><th>${t('summaryN')}</th><th>${t('summaryCorrect')}</th><th>${t('summaryFail')}</th><th>${t('summaryScore')}</th><th>${t('summaryRt')}</th></tr></thead><tbody>${rows.map(s => {
      const task = C.tasks.find(x => x.folder === s.task_name);
      return `<tr><td>${escape(taskName(task))}${s.task_complete === false ? ' *' : ''}</td><td>${s.n_trials} / ${s.n_items_total}</td><td>${s.n_correct}</td><td>${s.n_failures}</td><td>${s.total_score}</td><td>${fmt(s.rt_mean)} ms</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function showResults(stopped) {
    document.body.classList.remove('running'); $('#run-shell').hidden = true; $('#results').hidden = false;
    $('#results').innerHTML = `<div class="success-icon">${stopped ? '!' : '✓'}</div><div class="eyebrow">${stopped ? 'SESSION STOPPED' : 'SESSION COMPLETE'}</div><h1>${t(stopped ? 'doneStopped' : 'done')}</h1><p>${t('doneBody')}</p><div class="save-status" id="save-status" role="status"></div><div class="result-actions"><button class="primary" id="download-result-json">${t('downloadResultJson')}</button><button class="secondary" id="retry-save" hidden>${t('retry')}</button></div><details><summary>${t('researchResults')}</summary>${resultTable()}${session.interruptions.length ? `<p>${escape(t('interruptNote', { n: session.interruptions.length }))}</p>` : ''}<p class="result-meta">${escape(session.participant_id)} · ${escape(A.sessionId(session))}</p><button class="secondary" id="download-xlsx">${t('download')}</button> <button class="secondary" id="download-json">${t('downloadJson')}</button></details><div class="result-actions"><button class="secondary" id="new-session">${t('newSession')}</button><button class="text-button" id="clear-local">${t('clearLocal')}</button></div>`;
    $('#download-result-json').onclick = () => exportResult(); $('#download-json').onclick = () => exportRaw(); $('#download-xlsx').onclick = () => exportWorkbook();
    $('#new-session').onclick = () => { session = null; $('#results').hidden = true; showScreen('#cover'); checkRecovery(); };
    $('#clear-local').onclick = () => { if (confirm(t('clearConfirm'))) { try { localStorage.removeItem(STORE); } catch { /* 무시 */ } $('#clear-local').disabled = true; } };
    $('#retry-save').onclick = () => upload(true); upload(false);
  }
  async function upload(manual) {
    const status = $('#save-status'), retry = $('#retry-save');
    if (!session.dataPipeExperimentId) { status.textContent = t('saveDisabled'); return; }
    if (session.autoUpload === false && !manual) { status.textContent = t('saveLocal'); retry.hidden = false; return; }
    const files = E.files(session);
    await U.send(session, files, { onProgress: () => {
      const states = files.map(f => session.upload_files[f.key]), accepted = states.filter(s => ['saved', 'queued'].includes(s.status)).length;
      status.classList.toggle('error', session.upload_status === 'uncertain');
      status.textContent = session.upload_status === 'sending' ? t('savingFiles') : session.upload_status === 'saved' ? t('savedFiles') : session.upload_status === 'queued' ? t('queuedFiles') : t('saveFailedFiles') + (session.upload_error ? ' (' + session.upload_error + ')' : '');
      retry.hidden = session.upload_status !== 'uncertain' || states.every(s => ['saved', 'queued', 'needs_verify'].includes(s.status)); localSave();
    } });
  }
  function showRuntimeError(error) {
    console.error(error); running = false;
    if (session) { session.runtime_error = String(error); localSave(); }
    $('#experiment').innerHTML = `<div class="between"><p>${escape(error.message || error)}</p><button id="error-json" class="secondary">${t('downloadJson')}</button></div>`;
    $('#error-json').onclick = () => exportRaw();
  }
  function checkRecovery() {
    try {
      const rec = JSON.parse(localStorage.getItem(STORE) || 'null'), has = rec && rec.task_data && Object.keys(rec.task_data).length;
      $('#recovery').hidden = !has;
      if (has) { $('#recover-download').onclick = () => exportWorkbook(rec); $('#recover-result-json').onclick = () => exportResult(rec); $('#recover-json').onclick = () => exportRaw(rec); }
    } catch { $('#recovery').hidden = true; }
  }
  $('#birth-date').max = I.testDate(new Date().toISOString()); $('#version-label').textContent = 'v' + C.version;
  updateLanguage(language); showScreen('#cover');
})();
