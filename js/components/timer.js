// js/components/timer.js — countdown timer with done callback
export class RestTimer {
  constructor(onTick, onDone) {
    this.onTick = onTick;
    this.onDone = onDone || (() => {});
    this.remaining = 0;
    this._interval = null;
  }

  start(seconds) {
    clearInterval(this._interval);
    this._interval = null;
    this.remaining = seconds;
    this._emit(false);
    this._interval = setInterval(() => {
      this.remaining = Math.max(0, this.remaining - 1);
      const done = this.remaining === 0;
      this._emit(done);
      if (done) {
        clearInterval(this._interval);
        this._interval = null;
        this.onDone();
      }
    }, 1000);
  }

  _emit(done) {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this.onTick(`${m}:${String(s).padStart(2, '0')}`, this.remaining, done);
  }

  stop() {
    clearInterval(this._interval);
    this._interval = null;
  }

  get isRunning() { return this._interval !== null; }
}
