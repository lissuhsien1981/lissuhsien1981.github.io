// js/screens/profile.js
import {api} from '../api.js';

export function initProfile(container) {
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
    <div class="card" style="display:flex;gap:12px;align-items:center;padding:12px 16px;">
      <input type="number" id="weight-input" placeholder="kg" step="0.1"
        style="flex:1;background:transparent;border:none;outline:none;font-size:28px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;"
        value="${profile.lastWeight || ''}">
      <button class="btn-primary" id="save-weight-btn" style="margin:0;padding:12px 20px;width:auto;flex-shrink:0;">儲存</button>
    </div>

    <div class="section-label" style="margin-top:4px;">個人資料</div>
    <div class="profile-section">
      <div class="profile-section-title">基本</div>
      <div class="profile-row">
        <span>身高</span>
        <span class="profile-row-val">${profile.height || '--'} cm</span>
      </div>
      <div class="profile-row">
        <span>目標體重</span>
        <span class="profile-row-val">${profile.targetWeight || '--'} kg</span>
      </div>
      <div class="profile-row">
        <span>目前週期</span>
        <span class="profile-row-val">${profile.phase || '傷後回歸'}</span>
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">資料連結</div>
      <div class="profile-row">
        <span>Google Sheets</span>
        <span class="profile-row-val ok" id="sheets-status">確認中...</span>
      </div>
      <div class="profile-row">
        <span>Apple Watch 上次匯入</span>
        <span class="profile-row-val">${profile.lastWatchImport || '未設定'}</span>
      </div>
    </div>
  `;

  document.getElementById('save-weight-btn').addEventListener('click', async () => {
    const w = parseFloat(document.getElementById('weight-input').value);
    if (!w) { alert('請輸入體重'); return; }
    const today = new Date().toISOString().split('T')[0];
    try {
      await api.logBody({date: today, weight: w});
      profile.lastWeight = w;
      localStorage.setItem('fitcoach-profile', JSON.stringify(profile));
      alert(`體重 ${w} kg 已記錄 ✓`);
    } catch {
      alert('儲存失敗，請確認網路連線');
    }
  });

  api.getStats().then(() => {
    const el = document.getElementById('sheets-status');
    if (el) el.textContent = '已連結 ✓';
  }).catch(() => {
    const el = document.getElementById('sheets-status');
    if (el) { el.textContent = '連線失敗'; el.style.color = 'var(--red)'; }
  });
}
