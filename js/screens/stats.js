// js/screens/stats.js
import {api} from '../api.js';

export function initStats(container) {
  container.innerHTML = `
    <div class="header">
      <div class="header-sub">本月概覽</div>
      <h1>進度</h1>
    </div>
    <div id="stats-content"><div class="loading">載入中...</div></div>
    <div id="history-section"></div>
  `;

  api.getStats().then(data => renderStats(data)).catch(() => {
    document.getElementById('stats-content').innerHTML = '<div class="empty">無法載入資料</div>';
  });

  api.getHistory().then(history => renderHistory(history)).catch(() => {});
}

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

  const lastX = 290;
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
  const typeMap = {leg:'leg', chest:'chest', back:'back', shoulder:'shoulder'};
  section.innerHTML = `
    <div class="section-label">最近訓練</div>
    ${history.slice(0, 10).map(h => `
      <div class="history-row">
        <div>
          <div class="history-date">${h.date}</div>
          <div class="history-sub">${Array.isArray(h.exercises) ? h.exercises.join('、') : (h.dayType || '')}</div>
        </div>
        <span class="day-badge ${typeMap[(h.dayType||'').toLowerCase()] || ''}">${h.dayType || '訓練'}</span>
      </div>
    `).join('')}
  `;
}
