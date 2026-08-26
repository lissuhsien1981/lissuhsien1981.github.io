// js/screens/stats.js
import {api} from '../api.js';
import {todayStr} from '../storage.js';

let activeTab = 'stats';
let todayFoodEntries = [];

function foodCacheKey(date) { return `fitcoach-food-cache-${date}`; }
function saveFoodCache(date, entries) {
  localStorage.setItem(foodCacheKey(date), JSON.stringify(entries));
}
function loadFoodCache(date) {
  try { return JSON.parse(localStorage.getItem(foodCacheKey(date)) || '[]'); } catch { return []; }
}
function getNutritionGoals() {
  const p = JSON.parse(localStorage.getItem('fitcoach-profile') || '{}');
  return {
    calories: p.goalCalories || 2100,
    protein:  p.goalProtein  || 175,
    carbs:    p.goalCarbs    || 170,
    fat:      p.goalFat      || 80,
  };
}

export function initStats(container) {
  const today = todayStr();

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
  const cached = loadFoodCache(today);
  if (cached.length) {
    todayFoodEntries = cached;
    renderFoodSection(today);
  } else {
    section.innerHTML = '<div class="loading">載入中...</div>';
  }
  api.getTodayFood(today).then(entries => {
    if (Array.isArray(entries) && entries.length > 0) {
      todayFoodEntries = entries;
      saveFoodCache(today, todayFoodEntries);
      renderFoodSection(today);
    } else if (!cached.length) {
      todayFoodEntries = [];
      renderFoodSection(today);
    }
    // If API returns empty but cache had data, keep the cached display as-is
  }).catch(() => {
    if (!cached.length) { todayFoodEntries = []; renderFoodSection(today); }
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

  const goals = getNutritionGoals();
  const mealIcon = {早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 點心: '🍎', 消夜: '🌛'};

  function pct(val, goal) { return Math.min(100, Math.round((val / goal) * 100)); }
  function remainStr(val, goal, unit) {
    const rem = goal - val;
    return rem >= 0
      ? `<span class="food-goal-ok">剩餘 ${rem}${unit}</span>`
      : `<span class="food-goal-over">超出 ${Math.abs(rem)}${unit}</span>`;
  }
  function bar(val, goal) {
    const p = pct(val, goal);
    const over = val > goal;
    return `<div class="food-goal-bar-bg"><div class="food-goal-bar-fill${over ? ' over' : ''}" style="width:${p}%"></div></div>`;
  }

  section.innerHTML = `
    <div class="food-date-bar">${today}</div>

    <div class="food-goals-card">
      <div class="food-goals-title">今日目標</div>
      <div class="food-goal-row">
        <span class="food-goal-name">卡路里</span>
        <span class="food-goal-nums">${totals.calories} / ${goals.calories} kcal</span>
        ${remainStr(totals.calories, goals.calories, ' kcal')}
      </div>
      ${bar(totals.calories, goals.calories)}
      <div class="food-goal-row" style="margin-top:10px">
        <span class="food-goal-name">蛋白質</span>
        <span class="food-goal-nums">${totals.protein.toFixed(0)}g / ${goals.protein}g</span>
        ${remainStr(totals.protein, goals.protein, 'g')}
      </div>
      ${bar(totals.protein, goals.protein)}
      <div class="food-goal-row" style="margin-top:6px">
        <span class="food-goal-name">碳水</span>
        <span class="food-goal-nums">${totals.carbs.toFixed(0)}g / ${goals.carbs}g</span>
        ${remainStr(totals.carbs, goals.carbs, 'g')}
      </div>
      ${bar(totals.carbs, goals.carbs)}
      <div class="food-goal-row" style="margin-top:6px">
        <span class="food-goal-name">脂肪</span>
        <span class="food-goal-nums">${totals.fat.toFixed(0)}g / ${goals.fat}g</span>
        ${remainStr(totals.fat, goals.fat, 'g')}
      </div>
      ${bar(totals.fat, goals.fat)}
      ${totals.water > 0 ? `<div class="food-water-row" style="margin-top:10px">💧 今日水分 ${totals.water} ml</div>` : ''}
    </div>

    ${todayFoodEntries.length === 0
      ? '<div class="empty">今天還沒有飲食記錄</div>'
      : `<div class="section-label" style="margin-top:12px">今日記錄</div>` + todayFoodEntries.map(e => `
          <div class="food-entry-row">
            <div class="food-entry-left">
              <span class="meal-badge">${mealIcon[e.meal] || '🍽️'} ${e.meal}</span>
              <span class="food-entry-desc">${e.description}</span>
            </div>
            <span class="food-entry-cal">${e.calories ? e.calories + ' kcal' : '--'}</span>
          </div>
        `).join('')}

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

  // Every render replaces these nodes, so the form is wired exactly once, here.
  // Binding on each open instead stacked another full set of listeners on the
  // same nodes every time the form was reopened, and nothing removed the old
  // ones. After a handful of entries one tap on 拍照 / AI 分析 fired ten
  // parallel Gemini calls and ten blocking alert()s, which froze the page.
  const addBtn = document.getElementById('add-food-btn');
  const form = document.getElementById('food-form-area');
  bindFoodForm(today);
  addBtn.addEventListener('click', () => {
    const isOpen = form.style.display !== 'none';
    form.style.display = isOpen ? 'none' : 'block';
    addBtn.textContent = isOpen ? '＋ 新增飲食' : '✕ 取消';
  });
}


function compressImage(file, maxPx = 1024) {
  return new Promise((resolve, reject) => {
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
    // Without this the promise stayed pending forever on a photo the browser
    // can't decode, leaving 拍照 disabled with no way back.
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('無法讀取這張照片，請改從相簿選一張'));
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
      status.textContent = `⚠️ ${err.message || 'AI 暫時無法使用'}— 請手動填寫下方數值`;
      console.error('[FitCoach] analyzeFood failed:', err);
      document.getElementById('food-cal').focus();
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
      status.textContent = `⚠️ ${err.message || 'AI 暫時無法使用'}— 請手動填寫下方數值`;
      console.error('[FitCoach] recognizeFood failed:', err);
      document.getElementById('food-cal').focus();
    }
    btn.disabled = false;
    // Picking the same photo again fires no change event unless the input is
    // cleared, so a failed attempt could not be retried with that photo.
    e.target.value = '';
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
      saveFoodCache(today, todayFoodEntries);
      renderFoodSection(today);
    } catch {
      alert('記錄失敗，請重試');
      btn.disabled = false;
      btn.textContent = '記錄 ✓';
    }
  });
}

// ── Stats Tab ─────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

// Body Metrics dates arrive as String() of a Sheets Date cell — normally a full
// "Sun May 17 2026 00:00:00 GMT+0800 (…)" string, which is what used to get
// printed raw under the chart. getHistory formats its dates server-side;
// getStats doesn't, so both shapes are handled here rather than in Code.gs,
// which would need a manual redeploy.
function parseMetricDate(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtMD(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }
function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }

function toWeightPoints(metrics) {
  return metrics
    .map(m => ({date: parseMetricDate(m.date), weight: Number(m.weight)}))
    .filter(p => p.date && p.weight)
    .sort((a, b) => a.date - b.date);
}

// The old delta compared the first of the last 30 *rows* to the latest one and
// labelled it 本月. With weigh-ins this sparse that meant a 3-month change was
// being reported as a monthly one. Measure a real 30-day window instead, and
// when nothing else was logged inside it, name the date being compared against.
function weightSummary(points) {
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const windowStart = latest.date.getTime() - 30 * DAY_MS;
  const inWindow = points.filter(p => p.date.getTime() >= windowStart);
  const monthly = inWindow.length >= 2;
  const base = monthly ? inWindow[0] : points[points.length - 2];
  return {
    delta: latest.weight - base.weight,
    label: monthly ? '近 30 天' : `自 ${fmtMD(base.date)}`
  };
}

function renderStats(data) {
  const points = toWeightPoints(data.bodyMetrics || []);
  const latest = points.length ? points[points.length - 1] : null;
  const latestWeight = latest ? latest.weight : '--';
  const summary = weightSummary(points);
  const arrow = summary ? (summary.delta > 0 ? '↑' : summary.delta < 0 ? '↓' : '→') : '';

  document.getElementById('stats-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card accent">
        <div class="stat-label">體重</div>
        <div class="stat-value accent">${latestWeight}<span class="stat-unit">kg</span></div>
        ${summary ? `<div class="stat-delta">${arrow} ${Math.abs(summary.delta).toFixed(1)} kg ${summary.label}</div>` : ''}
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
    ${renderWeightChart(points)}
  `;
}

// A 7-day moving average only says anything when weigh-ins are roughly daily.
// Below this density it just retraces the raw line while implying a precision
// the data doesn't have, so it stays hidden and the card asks for daily entries.
const TREND_WINDOW_DAYS = 7;
const TREND_MIN_POINTS = 5;
const TREND_DENSITY_DAYS = 14;

function movingAverage(points) {
  return points.map(p => {
    const from = p.date.getTime() - TREND_WINDOW_DAYS * DAY_MS;
    const win = points.filter(q => q.date.getTime() > from && q.date <= p.date);
    return {date: p.date, weight: win.reduce((s, q) => s + q.weight, 0) / win.length};
  });
}

function renderWeightChart(points) {
  if (points.length < 2) return '';
  const last = points[points.length - 1];
  const first = points[0];
  const weights = points.map(p => p.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;

  // X by elapsed days, not row index. Index spacing drew a 77-day gap the same
  // width as two consecutive days, which hid exactly the stretch where the
  // tracking stopped.
  const span = daysBetween(first.date, last.date) || 1;
  const xOf = p => 10 + (daysBetween(first.date, p.date) / span) * 280;
  const yOf = w => 70 - ((w - min) / range) * 60;
  const path = pts => pts.map(p => `${xOf(p).toFixed(1)},${yOf(p.weight).toFixed(1)}`).join(' ');

  const recent = points.filter(p => daysBetween(p.date, last.date) <= TREND_DENSITY_DAYS);
  const showTrend = recent.length >= TREND_MIN_POINTS;

  return `
    <div class="chart-card">
      <div class="chart-title">體重趨勢（${fmtMD(first.date)} – ${fmtMD(last.date)}，${points.length} 筆）</div>
      <svg viewBox="0 0 300 80" style="width:100%;height:80px;overflow:visible">
        <polyline points="${path(points)}" fill="none" stroke="var(--accent)" stroke-width="2"
          stroke-linejoin="round" opacity="${showTrend ? '0.35' : '1'}"/>
        ${showTrend ? `<polyline points="${path(movingAverage(points))}" fill="none"
          stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>` : ''}
        ${points.map(p => `<circle cx="${xOf(p).toFixed(1)}" cy="${yOf(p.weight).toFixed(1)}" r="2.5"
          fill="var(--accent)" opacity="0.5"/>`).join('')}
        <circle cx="${xOf(last).toFixed(1)}" cy="${yOf(last.weight).toFixed(1)}" r="4" fill="var(--accent)"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3)">
        <span>${fmtMD(first.date)}</span>
        <span style="color:var(--accent);font-weight:700">${fmtMD(last.date)} ${last.weight} kg</span>
      </div>
      ${showTrend
        ? '<div style="font-size:11px;color:var(--text3);margin-top:6px">粗線為 7 日均線</div>'
        : '<div style="font-size:11px;color:var(--text3);margin-top:6px">每日量體重才會出現 7 日均線</div>'}
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
