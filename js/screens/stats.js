// js/screens/stats.js
import {api} from '../api.js';

let activeTab = 'stats';
let todayFoodEntries = [];

export function initStats(container) {
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="header">
      <div class="header-sub">本月概覽</div>
      <h1>進度</h1>
    </div>
    <div class="stats-tab-bar">
      <button class="stats-tab-btn ${activeTab === 'stats' ? 'active' : ''}" data-tab="stats">📊 訓練進度</button>
      <button class="stats-tab-btn ${activeTab === 'food' ? 'active' : ''}" data-tab="food">🥗 飲食記錄</button>
    </div>
    <div id="tab-stats-content" style="display:${activeTab === 'stats' ? 'block' : 'none'}">
      <div id="stats-content"><div class="loading">載入中...</div></div>
      <div id="history-section"></div>
    </div>
    <div id="tab-food-content" style="display:${activeTab === 'food' ? 'block' : 'none'}">
      <div id="food-section"></div>
    </div>
  `;

  container.querySelectorAll('.stats-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      container.querySelectorAll('.stats-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      document.getElementById('tab-stats-content').style.display = activeTab === 'stats' ? 'block' : 'none';
      document.getElementById('tab-food-content').style.display = activeTab === 'food' ? 'block' : 'none';
    });
  });

  api.getStats().then(data => renderStats(data)).catch(() => {
    document.getElementById('stats-content').innerHTML = '<div class="empty">無法載入資料</div>';
  });
  api.getHistory().then(history => renderHistory(history)).catch(() => {});

  loadFoodSection(today);
}

// ── Food Tab ──────────────────────────────────────────────────────────────

function loadFoodSection(today) {
  const section = document.getElementById('food-section');
  if (!section) return;
  section.innerHTML = '<div class="loading">載入中...</div>';
  api.getTodayFood(today).then(entries => {
    todayFoodEntries = entries || [];
    renderFoodSection(today);
  }).catch(() => {
    todayFoodEntries = [];
    renderFoodSection(today);
  });
}

function renderFoodSection(today) {
  const section = document.getElementById('food-section');
  if (!section) return;

  const totals = todayFoodEntries.reduce((acc, e) => ({
    calories: acc.calories + (Number(e.calories) || 0),
    protein: acc.protein + (Number(e.protein) || 0),
    carbs: acc.carbs + (Number(e.carbs) || 0),
    fat: acc.fat + (Number(e.fat) || 0),
    water: acc.water + (Number(e.waterIntake) || 0)
  }), {calories: 0, protein: 0, carbs: 0, fat: 0, water: 0});

  const mealIcon = {早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 點心: '🍎', 消夜: '🌛'};

  section.innerHTML = `
    <div class="food-date-bar">${today}</div>

    ${todayFoodEntries.length === 0
      ? '<div class="empty">今天還沒有飲食記錄</div>'
      : todayFoodEntries.map(e => `
          <div class="food-entry-row">
            <div class="food-entry-left">
              <span class="meal-badge">${mealIcon[e.meal] || '🍽️'} ${e.meal}</span>
              <span class="food-entry-desc">${e.description}</span>
            </div>
            <span class="food-entry-cal">${e.calories ? e.calories + ' kcal' : '--'}</span>
          </div>
        `).join('')}

    ${todayFoodEntries.length > 0 ? `
      <div class="food-totals-card">
        <div class="food-totals-row">
          <div class="food-total-item accent">
            <div class="food-total-val">${totals.calories}</div>
            <div class="food-total-label">卡路里</div>
          </div>
          <div class="food-total-item">
            <div class="food-total-val">${totals.protein.toFixed(1)}g</div>
            <div class="food-total-label">蛋白質</div>
          </div>
          <div class="food-total-item">
            <div class="food-total-val">${totals.carbs.toFixed(1)}g</div>
            <div class="food-total-label">碳水</div>
          </div>
          <div class="food-total-item">
            <div class="food-total-val">${totals.fat.toFixed(1)}g</div>
            <div class="food-total-label">脂肪</div>
          </div>
        </div>
        ${totals.water > 0 ? `<div class="food-water-row">💧 今日水分 ${totals.water} ml</div>` : ''}
      </div>
    ` : ''}

    <button class="btn-primary" id="add-food-btn" style="margin-top:16px">＋ 新增飲食</button>

    <div id="food-form-area" style="display:none">
      <div class="card" style="margin-top:16px">
        <div class="section-label" style="padding:0 0 14px">新增飲食</div>

        <div class="food-form-row">
          <label class="food-form-label">餐別</label>
          <select id="food-meal" class="food-select">
            <option>早餐</option>
            <option>午餐</option>
            <option>晚餐</option>
            <option>點心</option>
            <option>消夜</option>
          </select>
        </div>

        <div class="food-form-row">
          <label class="food-form-label">食物描述</label>
          <input id="food-desc" class="food-input" type="text" placeholder="例：雞胸便當、燕麥牛奶">
        </div>

        <input type="file" id="food-image-input" accept="image/*" capture="environment" style="display:none">
        <button class="btn-camera" id="camera-btn">📷 拍照 AI 辨識</button>
        <button class="btn-ai-text" id="ai-text-btn">🤖 AI 分析文字</button>
        <div id="ai-status" class="ai-status-msg" style="display:none"></div>

        <div class="macro-grid">
          <div class="macro-input-group">
            <label class="food-form-label">卡路里 kcal</label>
            <input id="food-cal" class="food-input" type="number" placeholder="0">
          </div>
          <div class="macro-input-group">
            <label class="food-form-label">蛋白質 g</label>
            <input id="food-protein" class="food-input" type="number" step="0.1" placeholder="0">
          </div>
          <div class="macro-input-group">
            <label class="food-form-label">碳水 g</label>
            <input id="food-carbs" class="food-input" type="number" step="0.1" placeholder="0">
          </div>
          <div class="macro-input-group">
            <label class="food-form-label">脂肪 g</label>
            <input id="food-fat" class="food-input" type="number" step="0.1" placeholder="0">
          </div>
          <div class="macro-input-group macro-span2">
            <label class="food-form-label">水分 ml（可留空）</label>
            <input id="food-water" class="food-input" type="number" placeholder="0">
          </div>
        </div>

        <button class="btn-primary" id="submit-food-btn" style="margin-top:16px">記錄 ✓</button>
      </div>
    </div>
  `;

  document.getElementById('add-food-btn').addEventListener('click', () => {
    const form = document.getElementById('food-form-area');
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    document.getElementById('add-food-btn').textContent = isOpen ? '＋ 新增飲食' : '✕ 取消';
    if (!isOpen) bindFoodForm(today);
  });
}


function compressImage(file, maxPx = 1024) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
    };
    img.src = url;
  });
}

function bindFoodForm(today) {
  document.getElementById('camera-btn').addEventListener('click', () => {
    document.getElementById('food-image-input').click();
  });

  document.getElementById('ai-text-btn').addEventListener('click', async () => {
    const desc = document.getElementById('food-desc').value.trim();
    if (!desc) { alert('請先在「食物描述」欄輸入食物名稱'); document.getElementById('food-desc').focus(); return; }
    const btn = document.getElementById('ai-text-btn');
    const status = document.getElementById('ai-status');
    btn.disabled = true;
    btn.textContent = '🔄 AI 分析中...';
    status.style.display = 'block';
    status.textContent = `正在分析：${desc}`;
    try {
      const result = await api.analyzeFood({text: desc});
      if (result.error) throw new Error(result.error);
      if (result.description) document.getElementById('food-desc').value = result.description;
      if (result.calories) document.getElementById('food-cal').value = result.calories;
      if (result.protein) document.getElementById('food-protein').value = result.protein;
      if (result.carbs) document.getElementById('food-carbs').value = result.carbs;
      if (result.fat) document.getElementById('food-fat').value = result.fat;
      btn.textContent = '✅ 分析完成';
      status.textContent = '數據已填入，請確認後送出';
    } catch (err) {
      btn.textContent = '🤖 AI 分析文字';
      status.textContent = `❌ 分析失敗：${err.message || '請手動輸入'}`;
    }
    btn.disabled = false;
  });

  document.getElementById('food-image-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const btn = document.getElementById('camera-btn');
    const status = document.getElementById('ai-status');
    btn.disabled = true;
    btn.textContent = '🔄 AI 辨識中...';
    status.style.display = 'block';
    status.textContent = '壓縮圖片並送出辨識...';

    try {
      const base64 = await compressImage(file);
      status.textContent = '正在分析食物圖片...';
      const result = await api.recognizeFood({imageBase64: base64, mimeType: 'image/jpeg'});
      if (result.error) throw new Error(result.error);
      if (result.description) document.getElementById('food-desc').value = result.description;
      if (result.calories) document.getElementById('food-cal').value = result.calories;
      if (result.protein) document.getElementById('food-protein').value = result.protein;
      if (result.carbs) document.getElementById('food-carbs').value = result.carbs;
      if (result.fat) document.getElementById('food-fat').value = result.fat;
      btn.textContent = '✅ 辨識完成';
      status.textContent = '數據已填入，請確認後送出';
    } catch (err) {
      btn.textContent = '📷 重新拍照';
      status.textContent = `❌ 辨識失敗：${err.message || '請手動輸入'}`;
    }
    btn.disabled = false;
  });

  document.getElementById('submit-food-btn').addEventListener('click', async () => {
    const desc = document.getElementById('food-desc').value.trim();
    if (!desc) { alert('請輸入食物描述'); return; }
    const btn = document.getElementById('submit-food-btn');
    btn.disabled = true;
    btn.textContent = '送出中...';

    const data = {
      date: today,
      meal: document.getElementById('food-meal').value,
      description: desc,
      calories: document.getElementById('food-cal').value || '',
      protein: document.getElementById('food-protein').value || '',
      carbs: document.getElementById('food-carbs').value || '',
      fat: document.getElementById('food-fat').value || '',
      waterIntake: document.getElementById('food-water').value || ''
    };

    try {
      await api.logFood(data);
      todayFoodEntries.push(data);
      renderFoodSection(today);
    } catch {
      alert('記錄失敗，請重試');
      btn.disabled = false;
      btn.textContent = '記錄 ✓';
    }
  });
}

// ── Stats Tab ─────────────────────────────────────────────────────────────

function renderStats(data) {
  const metrics = data.bodyMetrics || [];
  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const first = metrics.length > 1 ? metrics[0] : null;
  const latestWeight = latest ? latest.weight : '--';
  const weightDelta = (first && latest) ? (latest.weight - first.weight).toFixed(1) : null;

  document.getElementById('stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card accent">
        <div class="stat-label">體重</div>
        <div class="stat-value accent">${latestWeight}<span class="stat-unit">kg</span></div>
        ${weightDelta !== null ? `<div class="stat-delta">${parseFloat(weightDelta) > 0 ? '↑' : '↓'} ${Math.abs(weightDelta)} kg 本月</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">本週訓練</div>
        <div class="stat-value">${data.weeklyWorkouts || 0}<span class="stat-unit">/6</span></div>
        <div class="stat-delta">天完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">總訓練次數</div>
        <div class="stat-value">${data.totalWorkouts || 0}<span class="stat-unit">次</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">平均 HR</div>
        <div class="stat-value">${data.avgHR || '--'}<span class="stat-unit">bpm</span></div>
      </div>
    </div>
    ${renderWeightChart(metrics)}
  `;
}

function renderWeightChart(metrics) {
  if (metrics.length < 2) return '';
  const weights = metrics.map(m => m.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;
  const last = metrics[metrics.length - 1];

  const points = metrics.map((m, i) => {
    const x = (i / (metrics.length - 1)) * 280 + 10;
    const y = 70 - ((m.weight - min) / range) * 60;
    return `${x},${y}`;
  }).join(' ');

  const lastX = (((metrics.length - 1) / (metrics.length - 1)) * 280 + 10);
  const lastY = 70 - ((last.weight - min) / range) * 60;

  return `
    <div class="chart-card">
      <div class="chart-title">體重趨勢（近30天）</div>
      <svg viewBox="0 0 300 80" style="width:100%;height:80px;overflow:visible">
        <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--accent)"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
        <span>${metrics[0].date}</span>
        <span style="color:var(--accent);font-weight:700">今日 ${last.weight} kg</span>
      </div>
    </div>
  `;
}

function renderHistory(history) {
  const section = document.getElementById('history-section');
  if (!section || !history || !history.length) return;
  const typeMap = {leg: 'leg', chest: 'chest', back: 'back', shoulder: 'shoulder'};
  section.innerHTML = `
    <div class="section-label">最近訓練</div>
    ${history.slice(0, 10).map(h => `
      <div class="history-row">
        <div>
          <div class="history-date">${h.date}</div>
          <div class="history-sub">${Array.isArray(h.exercises) ? h.exercises.join('、') : (h.dayType || '')}</div>
        </div>
        <span class="day-badge ${typeMap[(h.dayType || '').toLowerCase()] || ''}">${h.dayType || '訓練'}</span>
      </div>
    `).join('')}
  `;
}
