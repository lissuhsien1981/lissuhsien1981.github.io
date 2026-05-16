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

function renderLog(container) {
  const ex = currentExercise;
  container.innerHTML = `
    <div class="header">
      <div class="header-sub">${ex.exercise} · 第 ${setNum} 組</div>
      <h1>記錄</h1>
    </div>
    <div class="card log-timer">
      <div class="log-timer-label">休息計時</div>
      <div class="log-timer-time" id="timer-display">0:00</div>
    </div>
    <div id="numpad-area"></div>
    <button class="btn-primary" id="log-btn">完成這組 ✓</button>
    <div class="card" id="history-area">
      <div class="section-label" style="padding:0 0 10px">本日記錄</div>
      <div id="history-list"><div class="empty" style="padding:8px 0">尚無記錄</div></div>
    </div>
  `;

  if (timer) timer.stop();
  timer = new RestTimer((t) => {
    const el = document.getElementById('timer-display');
    if (el) el.textContent = t;
  });

  numpad = new Numpad(document.getElementById('numpad-area'), {
    onWeightChange: () => {},
    onRepsChange: () => {}
  });

  if (ex.weightTarget) numpad.setDefaults(ex.weightTarget, ex.reps);

  document.getElementById('log-btn').addEventListener('click', () => logCurrentSet(container));
}

async function logCurrentSet(container) {
  if (!numpad) return;
  const {weight, reps} = numpad.values;
  if (!weight || !reps) { alert('請輸入重量和次數'); return; }

  const today = new Date().toISOString().split('T')[0];
  const isExtra = setNum > currentExercise.sets;
  const record = {
    date: today,
    dayType: currentExercise.dayType || '',
    exercise: currentExercise.exercise,
    setNum,
    weight,
    reps,
    extraSet: isExtra
  };

  setHistory.push(record);
  setNum++;

  const header = container.querySelector('.header-sub');
  if (header) header.textContent = `${currentExercise.exercise} · 第 ${setNum} 組`;

  renderHistory();
  timer.start();

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
    const isPR = i > 0 && r.weight > Math.max(...setHistory.slice(0, i).map(x => x.weight));
    return `
      <div class="set-history-row">
        <span class="set-history-label">第 ${r.setNum} 組${r.extraSet ? ' ＋' : ''}</span>
        <span class="set-history-val${isPR ? ' pr' : ''}">${r.weight} kg × ${r.reps}${isPR ? ' 🏆' : ''}</span>
      </div>
    `;
  }).join('');
}
