// js/screens/log.js
import {RestTimer} from '../components/timer.js';
import {Numpad} from '../components/numpad.js';
import {api} from '../api.js';
import {storage} from '../storage.js';

let currentExercise = null;
let setHistory = [];
let setNum = 1;
let timer = null;
let numpad = null;
let selectedRestSecs = 120;

const TIMED_EXERCISES = ['棒式', '側棒式', '平板支撐', 'plank'];
const BODYWEIGHT_EXERCISES = ['引體向上', '雙槓撐體', '伏地挺身', '卷腹', '腹輪', '懸吊抬腿'];

function isTimed(ex) {
  if (!ex) return false;
  return TIMED_EXERCISES.some(k => (ex.exercise || '').toLowerCase().includes(k.toLowerCase()));
}

function isBodyweight(ex) {
  if (!ex) return false;
  return BODYWEIGHT_EXERCISES.some(k => (ex.exercise || '').includes(k));
}

export function setCurrentExercise(ex) {
  currentExercise = ex;
  setHistory = [];
  setNum = 1;
}

export function initLog(container) {
  if (!currentExercise) {
    container.innerHTML = '<div class="header"><div class="header-sub">記錄</div><h1>記錄</h1></div><div class="empty">請先從課表選擇一個動作</div>';
    return;
  }
  renderLog(container);
}

function isCardio(ex) {
  if (!ex) return false;
  if (ex.type === 'cardio') return true;
  const keywords = ['cardio', '跑步', '自行車', '有氧', 'hiit', '橢圓', '游泳', '跳繩', '划步'];
  return keywords.some(k => (ex.exercise || '').toLowerCase().includes(k));
}

function fmtSecs(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderLog(container) {
  const ex = currentExercise;
  const cardio = isCardio(ex);
  const presets = [60, 90, 120, 180];
  const presetLabels = {60: '1:00', 90: '1:30', 120: '2:00', 180: '3:00'};

  container.innerHTML = `
    <div class="header">
      <div class="header-sub">${ex.exercise}${cardio ? ' · 有氧' : ` · 第 ${setNum} 組`}</div>
      <h1>記錄</h1>
    </div>
    <div class="card log-timer">
      <div class="log-timer-label">組間休息</div>
      <div class="timer-presets">
        ${presets.map(s => `<button class="timer-preset${s === selectedRestSecs ? ' active' : ''}" data-secs="${s}">${presetLabels[s]}</button>`).join('')}
      </div>
      <div class="log-timer-time" id="timer-display">${fmtSecs(selectedRestSecs)}</div>
      <div class="log-timer-status" id="timer-status">完成一組後開始倒計時</div>
    </div>
    <div id="input-area"></div>
    <button class="btn-primary" id="log-btn">${cardio ? '完成有氧訓練 ✓' : '完成這組 ✓'}</button>
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
    }
  );

  // Input area
  if (cardio) {
    renderCardioInput(document.getElementById('input-area'), ex);
  } else {
    const mode = isTimed(ex) ? 'timed' : (isBodyweight(ex) ? 'bodyweight' : 'standard');
    numpad = new Numpad(document.getElementById('input-area'), {
      onWeightChange: () => {},
      onRepsChange: () => {}
    }, mode);
    if (ex.weightTarget || ex.reps) numpad.setDefaults(ex.weightTarget || 0, ex.reps);
  }

  document.getElementById('log-btn').addEventListener('click', () => logCurrentSet(container));
}

function renderCardioInput(container, ex) {
  container.innerHTML = `
    <div class="cardio-inputs">
      <div class="cardio-field">
        <label class="cardio-label">時間（分鐘）</label>
        <input type="number" id="cardio-duration" class="cardio-input"
          placeholder="${ex.duration || 30}" min="1" max="180"
          value="${ex.duration || ''}">
      </div>
      <div class="cardio-field">
        <label class="cardio-label">平均心率 bpm</label>
        <input type="number" id="cardio-hr" class="cardio-input"
          placeholder="145" min="60" max="220"
          value="${ex.targetHR || ''}">
      </div>
    </div>
  `;
}

async function logCurrentSet(container) {
  const ex = currentExercise;
  const cardio = isCardio(ex);
  const today = new Date().toISOString().split('T')[0];
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

  // Notify today screen to sync dots
  window.dispatchEvent(new CustomEvent('set-logged', {detail: {exercise: ex.exercise, setNum}}));

  setNum++;
  const header = container.querySelector('.header-sub');
  if (header && !cardio) header.textContent = `${ex.exercise} · 第 ${setNum} 組`;

  renderHistory();

  // Start countdown
  const timerEl = document.getElementById('timer-display');
  const statusEl = document.getElementById('timer-status');
  if (timerEl) timerEl.classList.remove('timer-done');
  if (statusEl) statusEl.textContent = '組間休息中...';
  timer.start(selectedRestSecs);
  if ('vibrate' in navigator) navigator.vibrate(50);

  try {
    await api.logSet(record);
  } catch {
    storage.queue(record);
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
