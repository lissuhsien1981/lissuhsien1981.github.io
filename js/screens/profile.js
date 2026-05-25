// js/screens/profile.js
import {api} from '../api.js';

function showWatchModal(profile, container) {
  const today = new Date().toISOString().split('T')[0];
  const WORKOUT_TYPES = ['跑步', '重訓', '有氧', '游泳', '騎車', '健走', '其他'];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;-webkit-overflow-scrolling:touch;">
      <div class="modal-handle"></div>
      <h3 class="modal-title">⌚ Apple Watch 資料</h3>

      <label class="modal-label">日期</label>
      <input class="modal-input" id="w-date" type="date" value="${today}">

      <label class="modal-label">運動類型</label>
      <select class="modal-input" id="w-type" style="-webkit-appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%23888%27 stroke-width=%271.5%27 fill=%27none%27/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 14px center;">
        ${WORKOUT_TYPES.map(t => `<option>${t}</option>`).join('')}
      </select>

      <div class="modal-row">
        <div>
          <label class="modal-label">時長（分鐘）</label>
          <input class="modal-input" id="w-duration" type="number" min="1" max="300" placeholder="45">
        </div>
        <div>
          <label class="modal-label">消耗卡路里</label>
          <input class="modal-input" id="w-calories" type="number" min="0" placeholder="350">
        </div>
      </div>

      <div class="modal-row">
        <div>
          <label class="modal-label">平均心率 bpm</label>
          <input class="modal-input" id="w-avghr" type="number" min="40" max="220" placeholder="145">
        </div>
        <div>
          <label class="modal-label">最高心率 bpm</label>
          <input class="modal-input" id="w-maxhr" type="number" min="40" max="220" placeholder="175">
        </div>
      </div>

      <label class="modal-label">睡眠時長（小時）</label>
      <input class="modal-input" id="w-sleep" type="number" min="0" max="24" step="0.5" placeholder="7.5">

      <label class="modal-label">睡眠品質</label>
      <select class="modal-input" id="w-sleepq" style="-webkit-appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%23888%27 stroke-width=%271.5%27 fill=%27none%27/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 14px center;">
        <option value="">-- 不填 --</option>
        <option>優</option>
        <option>良</option>
        <option>一般</option>
        <option>差</option>
      </select>

      <button class="btn-primary" id="w-save" style="margin-top:8px">儲存</button>
      <button class="btn-cancel" id="w-cancel">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);

  function close() { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 250); }
  overlay.querySelector('#w-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#w-save').addEventListener('click', async () => {
    const date = overlay.querySelector('#w-date').value;
    const workoutType = overlay.querySelector('#w-type').value;
    const duration = overlay.querySelector('#w-duration').value;
    const calories = overlay.querySelector('#w-calories').value;
    const avgHR = overlay.querySelector('#w-avghr').value;
    const maxHR = overlay.querySelector('#w-maxhr').value;
    const sleepDuration = overlay.querySelector('#w-sleep').value;
    const sleepQuality = overlay.querySelector('#w-sleepq').value;

    if (!duration && !sleepDuration) { alert('請至少輸入時長或睡眠時長'); return; }

    const btn = overlay.querySelector('#w-save');
    btn.disabled = true;
    btn.textContent = '儲存中...';

    try {
      await api.logWatch({date, workoutType, duration, calories, avgHR, maxHR, sleepDuration, sleepQuality});
      profile.lastWatchImport = date;
      localStorage.setItem('fitcoach-profile', JSON.stringify(profile));
      close();
      const screenEl = document.getElementById('screen-profile');
      if (screenEl) renderProfile(screenEl);
      alert(`Apple Watch 資料已記錄 ✓`);
    } catch {
      btn.disabled = false;
      btn.textContent = '儲存';
      alert('記錄失敗，請確認網路連線後重試');
    }
  });
}

export function initProfile(container) {
  renderProfile(container);
}

function renderProfile(container) {
  const profile = JSON.parse(localStorage.getItem('fitcoach-profile') || '{}');

  container.innerHTML = `
    <div class="header">
      <div class="header-sub">你好，${profile.name || 'Sam'} 💪</div>
      <h1>設定</h1>
    </div>

    <div class="section-label">目標</div>
    <div class="goal-chips">
      <div class="chip active">恢復肌力</div>
      <div class="chip active">減脂</div>
      <div class="chip active">提升爆發力</div>
    </div>

    <div class="section-label">今日體重</div>
    <div class="card" style="display:flex;gap:8px;align-items:center;padding:12px 16px;">
      <input type="number" id="weight-input" placeholder="0.0" step="0.1" inputmode="decimal"
        style="flex:1;background:transparent;border:none;outline:none;font-size:28px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;min-width:0;"
        value="${profile.lastWeight || ''}">
      <span style="font-size:20px;font-weight:700;color:var(--text2);flex-shrink:0;">kg</span>
      <button class="btn-primary" id="save-weight-btn" style="margin:0;padding:12px 20px;width:auto;flex-shrink:0;">儲存</button>
    </div>

    <div class="section-label" style="margin-top:4px;">個人資料</div>
    <div class="profile-section">
      <div class="profile-section-title">基本</div>
      <div class="profile-row" id="edit-name-row">
        <span>姓名</span>
        <span class="profile-row-val">${profile.name || '--'} <span style="color:var(--text3);font-size:12px">✏️</span></span>
      </div>
      <div class="profile-row" id="edit-height-row">
        <span>身高</span>
        <span class="profile-row-val">${profile.height ? profile.height + ' cm' : '--'} <span style="color:var(--text3);font-size:12px">✏️</span></span>
      </div>
      <div class="profile-row" id="edit-targetweight-row">
        <span>目標體重</span>
        <span class="profile-row-val">${profile.targetWeight ? profile.targetWeight + ' kg' : '--'} <span style="color:var(--text3);font-size:12px">✏️</span></span>
      </div>
      <div class="profile-row" id="edit-phase-row">
        <span>目前週期</span>
        <span class="profile-row-val">${profile.phase || '傷後回歸'} <span style="color:var(--text3);font-size:12px">✏️</span></span>
      </div>
    </div>

    <button class="btn-complete" id="edit-all-btn" style="margin-top:4px">✏️ 編輯個人資料</button>

    <div class="profile-section" style="margin-top:8px">
      <div class="profile-section-title">資料連結</div>
      <div class="profile-row">
        <span>Google Sheets</span>
        <span class="profile-row-val ok" id="sheets-status">確認中...</span>
      </div>
      <div class="profile-row" id="watch-last-row">
        <span>Apple Watch 上次匯入</span>
        <span class="profile-row-val">${profile.lastWatchImport || '未設定'}</span>
      </div>
    </div>

    <button class="btn-complete" id="watch-import-btn" style="margin-top:4px">⌚ 輸入 Apple Watch 資料</button>
  `;

  document.getElementById('save-weight-btn').addEventListener('click', async () => {
    const w = parseFloat(document.getElementById('weight-input').value);
    if (!w) { alert('請輸入體重'); return; }
    const today = new Date().toISOString().split('T')[0];

    // Always save locally first
    profile.lastWeight = w;
    localStorage.setItem('fitcoach-profile', JSON.stringify(profile));

    try {
      await api.logBody({date: today, weight: w});
      alert(`體重 ${w} kg 已記錄 ✓`);
    } catch {
      alert(`體重 ${w} kg 已儲存（API 離線，下次同步）`);
    }
  });

  document.getElementById('edit-all-btn').addEventListener('click', () => showEditModal(profile, container));
  document.getElementById('watch-import-btn').addEventListener('click', () => showWatchModal(profile, container));

  api.getStats().then(() => {
    const el = document.getElementById('sheets-status');
    if (el) el.textContent = '已連結 ✓';
  }).catch(() => {
    const el = document.getElementById('sheets-status');
    if (el) { el.textContent = '連線失敗'; el.style.color = 'var(--red)'; }
  });
}

function showEditModal(profile, container) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const PHASES = ['傷後回歸', '增肌期', '減脂期', '維持期', '賽前備戰'];

  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h3 class="modal-title">編輯個人資料</h3>

      <label class="modal-label">姓名</label>
      <input class="modal-input" id="p-name" type="text" placeholder="Sam" value="${profile.name || ''}">

      <label class="modal-label">身高 (cm)</label>
      <input class="modal-input" id="p-height" type="number" min="100" max="250" step="0.1" placeholder="175" value="${profile.height || ''}">

      <label class="modal-label">目標體重 (kg)</label>
      <input class="modal-input" id="p-targetweight" type="number" min="30" max="200" step="0.1" placeholder="75" value="${profile.targetWeight || ''}">

      <label class="modal-label">目前訓練週期</label>
      <select class="modal-input" id="p-phase" style="-webkit-appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27 viewBox=%270 0 12 8%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%23888%27 stroke-width=%271.5%27 fill=%27none%27/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 14px center;">
        ${PHASES.map(p => `<option value="${p}"${(profile.phase || '傷後回歸') === p ? ' selected' : ''}>${p}</option>`).join('')}
      </select>

      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">每日營養目標</div>
        <div class="modal-row">
          <div>
            <label class="modal-label">卡路里 kcal</label>
            <input class="modal-input" id="p-cal" type="number" min="0" placeholder="2200" value="${profile.goalCalories || ''}">
          </div>
          <div>
            <label class="modal-label">蛋白質 g</label>
            <input class="modal-input" id="p-protein" type="number" min="0" placeholder="160" value="${profile.goalProtein || ''}">
          </div>
        </div>
        <div class="modal-row">
          <div>
            <label class="modal-label">碳水 g</label>
            <input class="modal-input" id="p-carbs" type="number" min="0" placeholder="220" value="${profile.goalCarbs || ''}">
          </div>
          <div>
            <label class="modal-label">脂肪 g</label>
            <input class="modal-input" id="p-fat" type="number" min="0" placeholder="65" value="${profile.goalFat || ''}">
          </div>
        </div>
      </div>

      <button class="btn-primary" id="p-save" style="margin-top:8px">儲存</button>
      <button class="btn-cancel" id="p-cancel">取消</button>
    </div>
  `;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);

  function close() { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 250); }
  overlay.querySelector('#p-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#p-save').addEventListener('click', () => {
    const name = overlay.querySelector('#p-name').value.trim();
    const height = parseFloat(overlay.querySelector('#p-height').value) || null;
    const targetWeight = parseFloat(overlay.querySelector('#p-targetweight').value) || null;
    const phase = overlay.querySelector('#p-phase').value;

    if (name) profile.name = name;
    if (height) profile.height = height;
    if (targetWeight) profile.targetWeight = targetWeight;
    profile.phase = phase;
    const cal = parseInt(overlay.querySelector('#p-cal').value); if (cal) profile.goalCalories = cal;
    const prot = parseInt(overlay.querySelector('#p-protein').value); if (prot) profile.goalProtein = prot;
    const carbs = parseInt(overlay.querySelector('#p-carbs').value); if (carbs) profile.goalCarbs = carbs;
    const fat = parseInt(overlay.querySelector('#p-fat').value); if (fat) profile.goalFat = fat;
    localStorage.setItem('fitcoach-profile', JSON.stringify(profile));
    close();
    // Re-render profile screen
    const screenEl = document.getElementById('screen-profile');
    if (screenEl) renderProfile(screenEl);
  });
}
