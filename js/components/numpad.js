// js/components/numpad.js
// mode: 'standard' (weight+reps), 'bodyweight' (weight optional), 'timed' (seconds only)
export class Numpad {
  constructor(container, {onWeightChange, onRepsChange} = {}, mode = 'standard') {
    this.mode = mode;
    this.weightVal = '0';
    this.repsVal = '0';
    this.activeField = mode === 'timed' ? 'time' : 'weight';
    this.onWeightChange = onWeightChange || (() => {});
    this.onRepsChange = onRepsChange || (() => {});
    this._render(container);
  }

  _render(container) {
    if (this.mode === 'timed') {
      container.innerHTML = `
        <div class="input-row">
          <div class="input-group" style="flex:1">
            <label>持續時間（秒）</label>
            <div class="input-field active" id="time-field">0<span class="input-unit">秒</span></div>
          </div>
        </div>
        <div class="numpad">
          ${['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k =>
            k ? `<button class="numpad-btn${k==='⌫'?' accent':''}" data-key="${k}">${k}</button>`
              : `<button class="numpad-btn" disabled style="opacity:0;pointer-events:none"></button>`
          ).join('')}
        </div>
      `;
      container.querySelectorAll('.numpad-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => this._tapTimed(btn.dataset.key));
      });
    } else {
      const weightLabel = this.mode === 'bodyweight' ? '重量（0 = 自體重量）' : '重量';
      container.innerHTML = `
        <div class="input-row">
          <div class="input-group">
            <label>${weightLabel}</label>
            <div class="input-field active" id="weight-field">0<span class="input-unit">kg</span></div>
          </div>
          <div class="input-group">
            <label>次數</label>
            <div class="input-field" id="reps-field">0<span class="input-unit">reps</span></div>
          </div>
        </div>
        <div class="numpad">
          ${['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k =>
            `<button class="numpad-btn${k==='⌫'?' accent':''}" data-key="${k}">${k}</button>`
          ).join('')}
        </div>
      `;
      container.querySelector('#weight-field').addEventListener('click', () => this._activate('weight'));
      container.querySelector('#reps-field').addEventListener('click', () => this._activate('reps'));
      container.querySelectorAll('.numpad-btn').forEach(btn => {
        btn.addEventListener('click', () => this._tap(btn.dataset.key));
      });
    }
  }

  _tapTimed(key) {
    let val = this.repsVal;
    if (key === '⌫') val = val.length > 1 ? val.slice(0, -1) : '0';
    else val = val === '0' ? key : val + key;
    this.repsVal = val;
    const el = document.getElementById('time-field');
    if (el) el.innerHTML = val + '<span class="input-unit">秒</span>';
  }

  _activate(field) {
    this.activeField = field;
    const wf = document.getElementById('weight-field');
    const rf = document.getElementById('reps-field');
    if (wf) wf.classList.toggle('active', field === 'weight');
    if (rf) rf.classList.toggle('active', field === 'reps');
  }

  _tap(key) {
    let val = this.activeField === 'weight' ? this.weightVal : this.repsVal;
    if (key === '⌫') val = val.length > 1 ? val.slice(0, -1) : '0';
    else if (key === '.') { if (!val.includes('.')) val += '.'; }
    else val = val === '0' ? key : val + key;

    if (this.activeField === 'weight') {
      this.weightVal = val;
      const el = document.getElementById('weight-field');
      if (el) el.innerHTML = val + '<span class="input-unit">kg</span>';
      this.onWeightChange(parseFloat(val) || 0);
    } else {
      this.repsVal = val;
      const el = document.getElementById('reps-field');
      if (el) el.innerHTML = val + '<span class="input-unit">reps</span>';
      this.onRepsChange(parseInt(val) || 0);
    }
  }

  setDefaults(weight, reps) {
    if (this.mode === 'timed') {
      this.repsVal = String(reps || 0);
      const el = document.getElementById('time-field');
      if (el) el.innerHTML = this.repsVal + '<span class="input-unit">秒</span>';
    } else {
      this.weightVal = String(weight || 0);
      this.repsVal = String(reps || 0);
      const wf = document.getElementById('weight-field');
      const rf = document.getElementById('reps-field');
      if (wf) wf.innerHTML = this.weightVal + '<span class="input-unit">kg</span>';
      if (rf) rf.innerHTML = this.repsVal + '<span class="input-unit">reps</span>';
    }
  }

  get values() {
    return {weight: parseFloat(this.weightVal) || 0, reps: parseInt(this.repsVal) || 0};
  }
}
