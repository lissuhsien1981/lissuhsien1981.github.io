// js/components/numpad.js
export class Numpad {
  constructor(container, {onWeightChange, onRepsChange}) {
    this.weightVal = '0';
    this.repsVal = '0';
    this.activeField = 'weight';
    this.onWeightChange = onWeightChange;
    this.onRepsChange = onRepsChange;
    this._render(container);
  }

  _render(container) {
    container.innerHTML = `
      <div class="input-row">
        <div class="input-group">
          <label>重量</label>
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

  _activate(field) {
    this.activeField = field;
    document.getElementById('weight-field').classList.toggle('active', field === 'weight');
    document.getElementById('reps-field').classList.toggle('active', field === 'reps');
  }

  _tap(key) {
    let val = this.activeField === 'weight' ? this.weightVal : this.repsVal;
    if (key === '⌫') val = val.length > 1 ? val.slice(0, -1) : '0';
    else if (key === '.') { if (!val.includes('.')) val += '.'; }
    else val = val === '0' ? key : val + key;

    if (this.activeField === 'weight') {
      this.weightVal = val;
      document.getElementById('weight-field').innerHTML = val + '<span class="input-unit">kg</span>';
      this.onWeightChange(parseFloat(val) || 0);
    } else {
      this.repsVal = val;
      document.getElementById('reps-field').innerHTML = val + '<span class="input-unit">reps</span>';
      this.onRepsChange(parseInt(val) || 0);
    }
  }

  setDefaults(weight, reps) {
    this.weightVal = String(weight || 0);
    this.repsVal = String(reps || 0);
    document.getElementById('weight-field').innerHTML = this.weightVal + '<span class="input-unit">kg</span>';
    document.getElementById('reps-field').innerHTML = this.repsVal + '<span class="input-unit">reps</span>';
  }

  get values() {
    return {weight: parseFloat(this.weightVal) || 0, reps: parseInt(this.repsVal) || 0};
  }
}
