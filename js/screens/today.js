// js/screens/today.js
import {api} from '../api.js';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_ZH = {Monday:'週一',Tuesday:'週二',Wednesday:'週三',Thursday:'週四',Friday:'週五',Saturday:'週六',Sunday:'週日'};

export function initToday(container) {
  const todayIdx = new Date().getDay();
  let selectedDay = DAYS[todayIdx];

  container.innerHTML = `
    <div class="today-fixed-top">
      <div class="header">
        <div class="header-sub">${formatDate()}</div>
        <h1>課表</h1>
      </div>
      <div class="day-switcher">
        ${DAYS.filter(d => d !== 'Sunday').concat(['Sunday']).map(d => `
          <button class="day-btn${d === selectedDay ? ' active' : ''}" data-day="${d}">${DAY_ZH[d]}</button>
        `).join('')}
      </div>
    </div>
    <div id="today-content" class="today-scroll"><div class="loading">載入中...</div></div>
  `;

  function loadDay(day) {
    selectedDay = day;
    container.querySelectorAll('.day-btn').forEach(b => b.classList.toggle('active', b.dataset.day === day));
    document.getElementById('today-content').innerHTML = '<div class="loading">載入中...</div>';
    api.getTodayWorkout(day).then(exercises => {
      renderToday(container, exercises, day);
    }).catch(() => {
      document.getElementById('today-content').innerHTML = '<div class="empty">無法載入課表，請確認網路連線</div>';
    });
  }

  container.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => loadDay(btn.dataset.day));
  });

  loadDay(selectedDay);
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
        <h2>${getDayLabel(day)} 訓練</h2>
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
    showExerciseModal(null, (newEx) => {
      list.appendChild(makeExerciseCard(newEx, exercises.length, day));
      exercises.push(newEx);
    });
  });
}

function makeExerciseCard(ex, index, day) {
  const card = document.createElement('div');
  card.className = 'card exercise-card';
  card.dataset.index = index;

  function renderCard() {
    const sets = Array.from({length: ex.sets}, (_, i) => i + 1);
    card.innerHTML = `
      <div class="ex-header">
        <div class="ex-name">${ex.exercise}</div>
        <button class="ex-edit-btn" title="調整">✏️</button>
      </div>
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

    card.querySelector('.ex-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showExerciseModal(ex, (updated) => {
        Object.assign(ex, updated);
        renderCard();
      });
    });

    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate-to-log', {detail: {...ex, dayType: day}}));
    });
  }

  renderCard();
  return card;
}

function showExerciseModal(ex, onSave) {
  const isNew = !ex;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h3 class="modal-title">${isNew ? '新增動作' : '調整動作'}</h3>
      <label class="modal-label">動作名稱</label>
      <input class="modal-input" id="m-name" type="text" placeholder="例：深蹲" value="${isNew ? '' : ex.exercise}">
      <div class="modal-row">
        <div>
          <label class="modal-label">組數</label>
          <input class="modal-input" id="m-sets" type="number" min="1" max="20" value="${isNew ? 3 : ex.sets}">
        </div>
        <div>
          <label class="modal-label">次數</label>
          <input class="modal-input" id="m-reps" type="number" min="1" max="100" value="${isNew ? 12 : ex.reps}">
        </div>
        <div>
          <label class="modal-label">目標重量 kg</label>
          <input class="modal-input" id="m-weight" type="number" min="0" step="2.5" value="${isNew ? 0 : ex.weightTarget}">
        </div>
      </div>
      <button class="btn-primary" id="m-save">${isNew ? '新增' : '儲存'}</button>
      <button class="btn-cancel" id="m-cancel">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);

  const nameInput = overlay.querySelector('#m-name');
  nameInput.focus();

  function close() {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 250);
  }

  overlay.querySelector('#m-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#m-save').addEventListener('click', () => {
    const name = overlay.querySelector('#m-name').value.trim();
    if (!name) { overlay.querySelector('#m-name').focus(); return; }
    onSave({
      exercise: name,
      sets: parseInt(overlay.querySelector('#m-sets').value) || 3,
      reps: parseInt(overlay.querySelector('#m-reps').value) || 12,
      weightTarget: parseFloat(overlay.querySelector('#m-weight').value) || 0,
      notes: isNew ? '計劃外動作' : (ex.notes || '')
    });
    close();
  });
}

function checkAllDone(card) {
  const dots = card.querySelectorAll('.set-dot:not([data-action])');
  const allDone = [...dots].every(d => d.classList.contains('done'));
  card.classList.toggle('done', allDone);
}

function getDayLabel(day) {
  return DAY_ZH[day] || day;
}

function formatDate() {
  return new Date().toLocaleDateString('zh-TW', {month:'long', day:'numeric', weekday:'long'});
}
