// js/screens/today.js
import {api} from '../api.js';

// Workout sessions — decoupled from calendar days so Sam can pick any day's workout
const SESSIONS = [
  {day: 'Monday',    label: '腿日',     short: '腿日'},
  {day: 'Tuesday',   label: '胸+三頭',  short: '胸三'},
  {day: 'Wednesday', label: '背+二頭',  short: '背二'},
  {day: 'Thursday',  label: '肩+核心',  short: '肩核'},
  {day: 'Friday',    label: '有氧輕腿', short: '有氧1'},
  {day: 'Saturday',  label: '有氧輕上', short: '有氧2'},
  {day: 'Sunday',    label: '休息日',   short: '休息'},
];
const CALENDAR_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const EXERCISE_STRENGTH = ['深蹲','腿壓','羅馬尼亞硬舉','腿彎舉','腿伸展','小腿提踵','哈克深蹲','保加利亞分腿蹲','弓步蹲','硬舉','臥推','上斜臥推','下斜臥推','飛鳥','引體向上','坐姿划船','高位下拉','單臂啞鈴划船','T-Bar划船','三頭下壓','法式彎舉','窄握臥推','雙槓撐體','二頭彎舉','錘式彎舉','集中彎舉','肩推','側平舉','前平舉','臉拉','聳肩','卷腹','棒式','腹輪','懸吊抬腿'];
const EXERCISE_CARDIO = ['跑步','自行車','橢圓機','游泳','跳繩','划步機','爬山機','拳擊有氧','高強度間歇'];

function isCardioEx(ex) {
  if (!ex) return false;
  if (ex.type === 'cardio') return true;
  const kw = ['cardio', '跑步', '自行車', '有氧', 'hiit', '橢圓', '游泳', '跳繩', '划步'];
  return kw.some(k => (ex.exercise || '').toLowerCase().includes(k));
}

// ── Dot-state persistence ─────────────────────────────────────────────────
function dotKey(day, exercise) {
  return `fitcoach-sets-${new Date().toISOString().split('T')[0]}-${day}-${exercise}`;
}
function getDotState(day, exercise) { return parseInt(localStorage.getItem(dotKey(day, exercise)) || '0'); }
function saveDotState(day, exercise, count) { localStorage.setItem(dotKey(day, exercise), count); }

// ── Completion state ──────────────────────────────────────────────────────
function completeKey(day) { return `fitcoach-complete-${new Date().toISOString().split('T')[0]}-${day}`; }
function isDayComplete(day) { return localStorage.getItem(completeKey(day)) === '1'; }
function markDayComplete(day) { localStorage.setItem(completeKey(day), '1'); }

// ── Init ──────────────────────────────────────────────────────────────────
export function initToday(container) {
  const todayDayName = CALENDAR_DAYS[new Date().getDay()];
  const defaultSession = SESSIONS.find(s => s.day === todayDayName) || SESSIONS[0];
  let selectedSession = defaultSession;

  container.innerHTML = `
    <div class="today-fixed-top">
      <div class="header">
        <div class="header-sub">${formatDate()}</div>
        <h1>課表</h1>
      </div>
      <div class="day-switcher">
        ${SESSIONS.map(s => `
          <button class="day-btn${s.day === selectedSession.day ? ' active' : ''}" data-day="${s.day}">${s.short}</button>
        `).join('')}
      </div>
    </div>
    <div id="today-content" class="today-scroll"><div class="loading">載入中...</div></div>
  `;

  // Sync log-screen set completions → dot state
  window.addEventListener('set-logged', (e) => {
    const {exercise, setNum} = e.detail;
    const card = container.querySelector(`.exercise-card[data-exercise="${CSS.escape(exercise)}"]`);
    if (!card) return;
    const dots = card.querySelectorAll('.set-dot:not([data-action])');
    const dot = dots[setNum - 1];
    if (dot && !dot.classList.contains('done')) {
      dot.classList.add('done');
      const count = [...dots].filter(d => d.classList.contains('done')).length;
      saveDotState(selectedSession.day, exercise, count);
      checkAllDone(card);
    }
  });

  function loadDay(session) {
    selectedSession = session;
    container.querySelectorAll('.day-btn').forEach(b => b.classList.toggle('active', b.dataset.day === session.day));
    document.getElementById('today-content').innerHTML = '<div class="loading">載入中...</div>';
    api.getTodayWorkout(session.day).then(exercises => {
      renderToday(container, exercises, session);
    }).catch(() => {
      document.getElementById('today-content').innerHTML = '<div class="empty">無法載入課表，請確認網路連線</div>';
    });
  }

  container.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => loadDay(SESSIONS.find(s => s.day === btn.dataset.day)));
  });

  loadDay(selectedSession);
}

// ── Render day ────────────────────────────────────────────────────────────
function renderToday(container, exercises, session) {
  const content = document.getElementById('today-content');
  const complete = isDayComplete(session.day);

  if (!exercises.length) {
    content.innerHTML = `
      <div class="empty" style="padding-top:60px">今日休息日 🛌</div>
      ${complete ? '<div class="completion-banner">✅ 今日已記錄完成</div>' : ''}
    `;
    return;
  }

  content.innerHTML = `
    ${complete ? '<div class="completion-banner">✅ 今日訓練已完成！</div>' : ''}
    <div class="today-banner">
      <div>
        <h2>${session.label}</h2>
        <p>${exercises.length} 個動作</p>
      </div>
      <div class="today-badge">${session.short}</div>
    </div>
    <div class="section-label">動作清單</div>
    <div id="exercise-list"></div>
    <button class="btn-add" id="add-exercise-btn">＋ 新增動作</button>
    ${!complete ? '<button class="btn-complete" id="complete-day-btn">✓ 完成今日訓練</button>' : ''}
  `;

  const list = document.getElementById('exercise-list');
  exercises.forEach((ex, i) => list.appendChild(makeExerciseCard(ex, i, session)));

  document.getElementById('add-exercise-btn').addEventListener('click', () => {
    showExerciseModal(null, (newEx) => {
      list.appendChild(makeExerciseCard(newEx, exercises.length, session));
      exercises.push(newEx);
    });
  });

  const completeBtn = document.getElementById('complete-day-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      markDayComplete(session.day);
      completeBtn.remove();
      const banner = document.createElement('div');
      banner.className = 'completion-banner';
      banner.textContent = '✅ 今日訓練已完成！';
      content.insertBefore(banner, content.firstChild);
    });
  }
}

// ── Exercise card ─────────────────────────────────────────────────────────
function makeExerciseCard(ex, index, session) {
  const card = document.createElement('div');
  card.className = 'card exercise-card';
  card.dataset.index = index;
  card.dataset.exercise = ex.exercise;

  const cardio = isCardioEx(ex);

  function renderCard() {
    const completedSets = getDotState(session.day, ex.exercise);
    const numDots = cardio ? 1 : ex.sets;
    const targetStr = cardio
      ? `${ex.duration || 30} 分鐘${ex.targetHR ? ` · 目標 ${ex.targetHR} bpm` : ''}`
      : `${ex.sets} 組 × ${ex.reps} 下${ex.weightTarget ? ` · 目標 ${ex.weightTarget} kg` : ''}`;

    card.innerHTML = `
      <div class="ex-header">
        <div>
          <div class="ex-name">${ex.exercise}${cardio ? ' <span class="ex-type-badge">有氧</span>' : ''}</div>
          <div class="ex-target">${targetStr}</div>
        </div>
        <button class="ex-edit-btn" title="調整">✏️</button>
      </div>
      <div class="ex-sets">
        ${Array.from({length: numDots}, (_, i) => {
          const done = i < completedSets;
          return `<div class="set-dot${done ? ' done' : ''}" data-set="${i + 1}">${i + 1}</div>`;
        }).join('')}
        ${!cardio ? '<div class="set-dot add-set-dot" data-action="add">＋</div>' : ''}
      </div>
    `;

    card.querySelectorAll('.set-dot:not([data-action])').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        dot.classList.toggle('done');
        const dots = card.querySelectorAll('.set-dot:not([data-action])');
        saveDotState(session.day, ex.exercise, [...dots].filter(d => d.classList.contains('done')).length);
        checkAllDone(card);
      });
    });

    const addDot = card.querySelector('[data-action="add"]');
    if (addDot) {
      addDot.addEventListener('click', (e) => {
        e.stopPropagation();
        const dots = card.querySelectorAll('.set-dot:not([data-action])');
        const num = dots.length + 1;
        const newDot = document.createElement('div');
        newDot.className = 'set-dot';
        newDot.dataset.set = num;
        newDot.textContent = num;
        newDot.addEventListener('click', (ev) => {
          ev.stopPropagation();
          newDot.classList.toggle('done');
          const allDots = card.querySelectorAll('.set-dot:not([data-action])');
          saveDotState(session.day, ex.exercise, [...allDots].filter(d => d.classList.contains('done')).length);
          checkAllDone(card);
        });
        addDot.before(newDot);
      });
    }

    card.querySelector('.ex-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showExerciseModal(ex, (updated) => { Object.assign(ex, updated); renderCard(); });
    });

    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('navigate-to-log', {detail: {...ex, dayType: session.day}}));
    });

    checkAllDone(card);
  }

  renderCard();
  return card;
}

// ── Exercise modal ────────────────────────────────────────────────────────
function showExerciseModal(ex, onSave) {
  const isNew = !ex;
  let selectedType = ex ? (ex.type || (isCardioEx(ex) ? 'cardio' : 'strength')) : 'strength';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h3 class="modal-title">${isNew ? '新增動作' : '調整動作'}</h3>
      <div class="ex-type-toggle">
        <button class="type-toggle-btn${selectedType === 'strength' ? ' active' : ''}" data-type="strength">🏋️ 重訓</button>
        <button class="type-toggle-btn${selectedType === 'cardio' ? ' active' : ''}" data-type="cardio">🏃 有氧</button>
      </div>
      <label class="modal-label">動作名稱</label>
      <input class="modal-input" id="m-name" type="text" placeholder="輸入或選擇動作"
        value="${isNew ? '' : ex.exercise}" autocomplete="off" list="ex-datalist">
      <datalist id="ex-datalist">
        ${[...EXERCISE_STRENGTH, ...EXERCISE_CARDIO].map(e => `<option value="${e}">`).join('')}
      </datalist>
      <div id="strength-fields" style="display:${selectedType === 'strength' ? 'block' : 'none'}">
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
            <input class="modal-input" id="m-weight" type="number" min="0" step="2.5" value="${isNew ? 0 : (ex.weightTarget || 0)}">
          </div>
        </div>
      </div>
      <div id="cardio-fields" style="display:${selectedType === 'cardio' ? 'block' : 'none'}">
        <div class="modal-row">
          <div>
            <label class="modal-label">時間（分鐘）</label>
            <input class="modal-input" id="m-duration" type="number" min="1" max="180" value="${isNew ? 30 : (ex.duration || 30)}">
          </div>
          <div>
            <label class="modal-label">目標心率 bpm</label>
            <input class="modal-input" id="m-targethr" type="number" min="60" max="220" value="${isNew ? 140 : (ex.targetHR || 140)}">
          </div>
        </div>
      </div>
      <button class="btn-primary" id="m-save" style="margin-top:8px">${isNew ? '新增' : '儲存'}</button>
      <button class="btn-cancel" id="m-cancel">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);
  overlay.querySelector('#m-name').focus();

  overlay.querySelectorAll('.type-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      overlay.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.type === selectedType));
      document.getElementById('strength-fields').style.display = selectedType === 'strength' ? 'block' : 'none';
      document.getElementById('cardio-fields').style.display = selectedType === 'cardio' ? 'block' : 'none';
    });
  });

  function close() { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 250); }
  overlay.querySelector('#m-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#m-save').addEventListener('click', () => {
    const name = overlay.querySelector('#m-name').value.trim();
    if (!name) { overlay.querySelector('#m-name').focus(); return; }
    if (selectedType === 'cardio') {
      onSave({
        exercise: name, type: 'cardio',
        duration: parseInt(overlay.querySelector('#m-duration').value) || 30,
        targetHR: parseInt(overlay.querySelector('#m-targethr').value) || 140,
        sets: 1, reps: 0, weightTarget: 0,
        notes: ex?.notes || '有氧'
      });
    } else {
      onSave({
        exercise: name, type: 'strength',
        sets: parseInt(overlay.querySelector('#m-sets').value) || 3,
        reps: parseInt(overlay.querySelector('#m-reps').value) || 12,
        weightTarget: parseFloat(overlay.querySelector('#m-weight').value) || 0,
        notes: ex?.notes || ''
      });
    }
    close();
  });
}

function checkAllDone(card) {
  const dots = card.querySelectorAll('.set-dot:not([data-action])');
  card.classList.toggle('done', dots.length > 0 && [...dots].every(d => d.classList.contains('done')));
}

function formatDate() {
  return new Date().toLocaleDateString('zh-TW', {month: 'long', day: 'numeric', weekday: 'long'});
}
