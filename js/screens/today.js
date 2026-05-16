// js/screens/today.js
import {api} from '../api.js';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function initToday(container) {
  const today = DAYS[new Date().getDay()];
  container.innerHTML = `
    <div class="header">
      <div class="header-sub">${formatDate()}</div>
      <h1>今日課表</h1>
    </div>
    <div id="today-content"><div class="loading">載入中...</div></div>
  `;

  api.getTodayWorkout(today).then(exercises => {
    renderToday(container, exercises, today);
  }).catch(() => {
    document.getElementById('today-content').innerHTML = '<div class="empty">無法載入課表，請確認網路連線</div>';
  });
}

function renderToday(container, exercises, day) {
  const content = document.getElementById('today-content');
  if (!exercises.length) {
    content.innerHTML = '<div class="empty">今日休息日 🛌</div>';
    return;
  }

  content.innerHTML = `
    <div class="today-banner">
      <div>
        <h2>${day} 訓練</h2>
        <p>${exercises.length} 個動作</p>
      </div>
      <div class="today-badge">${getDayLabel(day)}</div>
    </div>
    <div class="section-label">動作清單</div>
    <div id="exercise-list"></div>
    <button class="btn-add" id="add-exercise-btn">＋ 新增動作</button>
  `;

  const list = document.getElementById('exercise-list');
  exercises.forEach((ex, i) => list.appendChild(makeExerciseCard(ex, i, day)));

  document.getElementById('add-exercise-btn').addEventListener('click', () => {
    const name = prompt('動作名稱：');
    if (!name) return;
    const setsStr = prompt('組數：', '3');
    const repsStr = prompt('次數：', '12');
    const newEx = {exercise: name, sets: parseInt(setsStr)||3, reps: parseInt(repsStr)||12, weightTarget: 0, notes: '計劃外動作'};
    list.appendChild(makeExerciseCard(newEx, exercises.length, day));
    exercises.push(newEx);
  });
}

function makeExerciseCard(ex, index, day) {
  const card = document.createElement('div');
  card.className = 'card exercise-card';
  card.dataset.index = index;

  const sets = Array.from({length: ex.sets}, (_, i) => i + 1);
  card.innerHTML = `
    <div class="ex-name">${ex.exercise}</div>
    <div class="ex-target">${ex.sets} 組 × ${ex.reps} 下${ex.weightTarget ? ` · 目標 ${ex.weightTarget} kg` : ''}</div>
    <div class="ex-sets">
      ${sets.map(n => `<div class="set-dot" data-set="${n}">${n}</div>`).join('')}
      <div class="set-dot add-set-dot" data-action="add">＋</div>
    </div>
  `;

  card.querySelectorAll('.set-dot:not([data-action])').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      dot.classList.toggle('done');
      checkAllDone(card);
    });
  });

  card.querySelector('[data-action="add"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const newNum = card.querySelectorAll('.set-dot:not([data-action])').length + 1;
    const newDot = document.createElement('div');
    newDot.className = 'set-dot';
    newDot.dataset.set = newNum;
    newDot.dataset.extra = 'true';
    newDot.textContent = newNum;
    newDot.addEventListener('click', (ev) => { ev.stopPropagation(); newDot.classList.toggle('done'); checkAllDone(card); });
    card.querySelector('[data-action="add"]').before(newDot);
  });

  card.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navigate-to-log', {detail: {...ex, dayType: day}}));
  });

  return card;
}

function checkAllDone(card) {
  const dots = card.querySelectorAll('.set-dot:not([data-action])');
  const allDone = [...dots].every(d => d.classList.contains('done'));
  card.classList.toggle('done', allDone);
}

function getDayLabel(day) {
  const map = {Monday:'週一',Tuesday:'週二',Wednesday:'週三',Thursday:'週四',Friday:'週五',Saturday:'週六',Sunday:'週日'};
  return map[day] || day;
}

function formatDate() {
  return new Date().toLocaleDateString('zh-TW', {month:'long', day:'numeric', weekday:'long'});
}
