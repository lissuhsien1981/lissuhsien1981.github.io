// js/components/timer.js
export class RestTimer {
  constructor(onTick) {
    this.seconds = 0;
    this.onTick = onTick;
    this._interval = null;
  }

  start() {
    this.seconds = 0;
    clearInterval(this._interval);
    this._interval = setInterval(() => {
      this.seconds++;
      this.onTick(this.format());
    }, 1000);
  }

  format() {
    const m = Math.floor(this.seconds / 60);
    const s = this.seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  stop() { clearInterval(this._interval); }
  reset() { this.seconds = 0; this.onTick('0:00'); }
}
