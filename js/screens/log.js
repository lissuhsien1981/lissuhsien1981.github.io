// js/screens/log.js
import {RestTimer} from '../components/timer.js';
import {Numpad} from '../components/numpad.js';
import {api} from '../api.js';
import {storage, todayStr} from '../storage.js';

let currentExercise = null;
let setHistory = [];
let setNum = 1;
let timer = null;
let numpad = null;
let selectedRestSecs = 120;
let logMode = 'strength'; // 'strength' | 'cardio' — user switches manually

const TIMED_EXERCISES = ['棒式', '側棒式', '平板支撐', 'plank'];
const BODYWEIGHT_EXERCISES = ['引體向上', '雙槓撐體', '伏地挺身', '卷腹', '腹輪', '懸吊抬腿'];

function isTimed(ex) {
  if (!ex) return false;
  // Training Plan rows encode timed (seconds) targets by starting Notes with "秒"
  // (e.g. 秒制循環 stations) — falls back to name matching for manually added exercises.
  if (typeof ex.notes === 'string' && ex.notes.trim().startsWith('秒')) return true;
  return TIMED_EXERCISES.some(k => (ex.exercise || '').toLowerCase().includes(k.toLowerCase()));
}

function isBodyweight(ex) {
  if (!ex) return false;
  return BODYWEIGHT_EXERCISES.some(k => (ex.exercise || '').includes(k));
}

// ── Session persistence ───────────────────────────────────────────────────
// setHistory used to live only in module memory, so it died on every reload —
// and setCurrentExercise wiped it unconditionally, meaning a trip back to the
// 課表 to check the dots reset the set counter to 1. Keyed per day+exercise so
// re-entering an exercise resumes where it left off.
function sessionKey(exercise) { return `fitcoach-log-${todayStr()}-${exercise}`; }

function loadSession(exercise) {
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey(exercise)) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

function saveSession(exercise) {
  localStorage.setItem(sessionKey(exercise), JSON.stringify(setHistory));
}

// Rest timer survives navigation and reloads by storing when it ends, not how
// much is left.
const REST_KEY = 'fitcoach-rest-deadline';
function saveRestDeadline(ms) { localStorage.setItem(REST_KEY, String(ms)); }
function loadRestDeadline() {
  const ms = parseInt(localStorage.getItem(REST_KEY) || '0');
  return ms > Date.now() ? ms : 0;
}
function clearRestDeadline() { localStorage.removeItem(REST_KEY); }

// Yesterday's keys are dead weight — drop them on the way in.
function pruneOldSessions() {
  const prefix = `fitcoach-log-${todayStr()}-`;
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('fitcoach-log-') && !k.startsWith(prefix)) localStorage.removeItem(k);
  }
}

export function setCurrentExercise(ex) {
  pruneOldSessions();
  currentExercise = ex;
  setHistory = loadSession(ex.exercise);
  setNum = setHistory.length + 1;
  logMode = ex.isCardio ? 'cardio' : 'strength';
}

export function initLog(container) {
  if (!currentExercise) {
    container.innerHTML = '<div class="header"><div class="header-sub">記錄</div><h1>記錄</h1></div><div class="empty">請先從課表選擇一個動作</div>';
    return;
  }
  renderLog(container);
}


function fmtSecs(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderLog(container) {
  const ex = currentExercise;
  const presets = [60, 90, 120, 180];
  const presetLabels = {60: '1:00', 90: '1:30', 120: '2:00', 180: '3:00'};

  container.innerHTML = `
    <div class="header">
      <div class="header-sub" id="log-header-sub">${ex.exercise} · ${logMode === 'cardio' ? '有氧' : `第 ${setNum} 組`}</div>
      <h1>記錄</h1>
      ${ex.notes ? `<div class="log-note">💡 ${ex.notes}</div>` : ''}
    </div>
    <div class="card log-timer">
      <div class="log-timer-label">組間休息</div>
      <div class="timer-presets">
        ${presets.map(s => `<button class="timer-preset${s === selectedRestSecs ? ' active' : ''}" data-secs="${s}">${presetLabels[s]}</button>`).join('')}
      </div>
      <div class="log-timer-time" id="timer-display">${fmtSecs(selectedRestSecs)}</div>
      <div class="log-timer-status" id="timer-status">完成一組後開始倒計時</div>
    </div>
    <div class="mode-toggle">
      <button class="mode-btn${logMode === 'strength' ? ' active' : ''}" data-mode="strength">重訓</button>
      <button class="mode-btn${logMode === 'cardio' ? ' active' : ''}" data-mode="cardio">有氧</button>
    </div>
    <div id="input-area"></div>
    <button class="btn-primary" id="log-btn">${logMode === 'cardio' ? '完成有氧訓練 ✓' : '完成這組 ✓'}</button>
    <div class="card" id="history-area">
      <div class="section-label" style="padding:0 0 10px">本日記錄</div>
      <div id="history-list"><div class="empty" style="padding:8px 0">尚無記錄</div></div>
    </div>
  `;

  // Timer preset buttons
  container.querySelectorAll('.timer-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRestSecs = parseInt(btn.dataset.secs);
      container.querySelectorAll('.timer-preset').forEach(b => b.classList.toggle('active', b === btn));
      if (timer && !timer.isRunning) {
        const el = document.getElementById('timer-display');
        if (el) { el.textContent = fmtSecs(selectedRestSecs); el.classList.remove('timer-done'); }
      }
    });
  });

  // Mode toggle buttons
  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode, container));
  });

  // Init countdown timer
  if (timer) timer.stop();
  timer = new RestTimer(
    (timeStr, remaining, done) => {
      const el = document.getElementById('timer-display');
      const status = document.getElementById('timer-status');
      if (el) {
        el.textContent = timeStr;
        el.classList.toggle('timer-done', done);
      }
      if (status && done) status.textContent = '✅ 休息結束，準備下一組！';
    },
    () => clearRestDeadline()
  );

  // A rest period started on another screen (or before a reload) is still
  // running against the wall clock — pick it up rather than showing a reset.
  const pending = loadRestDeadline();
  if (pending) {
    const status = document.getElementById('timer-status');
    if (status) status.textContent = '組間休息中...';
    timer.start(0, pending);
  }

  renderInputArea(ex);

  document.getElementById('log-btn').addEventListener('click', () => logCurrentSet(container));

  // Restore any sets already logged this session (e.g. after tab switch)
  renderHistory();
}

function renderInputArea(ex) {
  const area = document.getElementById('input-area');
  if (!area) return;
  if (logMode === 'cardio') {
    area.innerHTML = `
      <div class="cardio-inputs">
        <div class="cardio-field">
          <label class="cardio-label">時間（分鐘）</label>
          <input type="number" id="cardio-duration" class="cardio-input"
            placeholder="${ex.reps || ex.duration || 30}" min="1" max="180"
            value="${ex.reps || ex.duration || ''}">
        </div>
        <div class="cardio-field">
          <label class="cardio-label">平均心率 bpm</label>
          <input type="number" id="cardio-hr" class="cardio-input"
            placeholder="145" min="60" max="220"
            value="${ex.targetHR || ''}">
        </div>
      </div>
    `;
    numpad = null;
  } else {
    const mode = isTimed(ex) ? 'timed' : (isBodyweight(ex) ? 'bodyweight' : 'standard');
    numpad = new Numpad(area, {onWeightChange: () => {}, onRepsChange: () => {}}, mode);
    if (ex.weightTarget || ex.reps) numpad.setDefaults(ex.weightTarget || 0, ex.reps);
  }
}

function switchMode(mode, container) {
  logMode = mode;
  container.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const btn = document.getElementById('log-btn');
  if (btn) btn.textContent = mode === 'cardio' ? '完成有氧訓練 ✓' : '完成這組 ✓';
  const headerSub = document.getElementById('log-header-sub');
  if (headerSub) headerSub.textContent = mode === 'cardio'
    ? `${currentExercise.exercise} · 有氧`
    : `${currentExercise.exercise} · 第 ${setNum} 組`;
  renderInputArea(currentExercise);
}

async function logCurrentSet(container) {
  const ex = currentExercise;
  const cardio = logMode === 'cardio';
  const today = todayStr();
  let record;

  if (cardio) {
    const duration = parseInt(document.getElementById('cardio-duration')?.value || 0);
    const hr = parseInt(document.getElementById('cardio-hr')?.value || 0);
    if (!duration) { alert('請輸入訓練時間（分鐘）'); return; }
    record = { date: today, dayType: ex.dayType || '', exercise: ex.exercise, setNum, weight: duration, reps: hr || 0, extraSet: false, notes: '有氧' };
  } else {
    if (!numpad) return;
    const {weight, reps} = numpad.values;
    if (isTimed(ex)) {
      if (!reps) { alert('請輸入持續時間（秒）'); return; }
      record = { date: today, dayType: ex.dayType || '', exercise: ex.exercise, setNum, weight: 0, reps, extraSet: setNum > ex.sets, notes: '計時' };
    } else {
      if (!reps) { alert('請輸入次數'); return; }
      record = { date: today, dayType: ex.dayType || '', exercise: ex.exercise, setNum, weight, reps, extraSet: setNum > ex.sets };
    }
  }

  setHistory.push(record);
  saveSession(ex.exercise);

  // Notify today screen to sync dots. Sends the total count rather than this
  // set's number so the dots stay right even when sets were logged out of
  // order or the counter was restored from a previous visit.
  window.dispatchEvent(new CustomEvent('set-logged', {
    detail: {exercise: ex.exercise, setNum, count: setHistory.length}
  }));

  setNum++;
  const headerSub = document.getElementById('log-header-sub');
  if (headerSub && !cardio) headerSub.textContent = `${ex.exercise} · 第 ${setNum} 組`;

  renderHistory();

  // Start countdown
  const timerEl = document.getElementById('timer-display');
  const statusEl = document.getElementById('timer-status');
  if (timerEl) timerEl.classList.remove('timer-done');
  if (statusEl) statusEl.textContent = '組間休息中...';
  const deadline = Date.now() + selectedRestSecs * 1000;
  saveRestDeadline(deadline);
  timer.start(selectedRestSecs, deadline);
  if ('vibrate' in navigator) navigator.vibrate(50);

  const btn = document.getElementById('log-btn');
  if (btn) btn.disabled = true;
  try {
    await api.logSet(record);
  } catch {
    storage.queue(record);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.innerHTML = setHistory.map((r, i) => {
    const isCardioRecord = r.notes === '有氧';
    const isTimedRecord = r.notes === '計時';
    const isPR = !isCardioRecord && !isTimedRecord && i > 0 && r.weight > Math.max(...setHistory.slice(0, i).map(x => x.weight));
    let val;
    if (isCardioRecord) {
      val = `${r.weight} 分鐘${r.reps ? ` · ${r.reps} bpm` : ''}`;
    } else if (isTimedRecord) {
      val = `${Math.floor(r.reps / 60)}:${String(r.reps % 60).padStart(2, '0')}`;
    } else {
      const weightStr = r.weight ? `${r.weight} kg` : '自體重量';
      val = `${weightStr} × ${r.reps}${isPR ? ' 🏆' : ''}`;
    }
    return `
      <div class="set-history-row">
        <span class="set-history-label">第 ${r.setNum} 組${r.extraSet ? ' ＋' : ''}</span>
        <span class="set-history-val${isPR ? ' pr' : ''}">${val}</span>
      </div>
    `;
  }).join('');
}
