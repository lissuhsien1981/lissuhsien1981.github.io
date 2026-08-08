// js/components/timer.js — countdown timer with done callback
//
// Counts down against the wall clock, not against tick count. Background tabs
// get their intervals throttled (and iOS suspends them outright on screen
// lock), so decrementing a counter once per tick made the timer stall exactly
// when it mattered — during the rest period, with the phone in a pocket.
export class RestTimer {
  constructor(onTick, onDone) {
    this.onTick = onTick;
    this.onDone = onDone || (() => {});
    this.remaining = 0;
    this.deadline = 0;
    this._interval = null;
    this._onVisible = () => { if (this._interval) this._sync(); };
  }

  // `deadline` lets a running timer be restored after a reload or a trip
  // through another screen — see log.js.
  start(seconds, deadline) {
    this.stop();
    this.deadline = deadline || (Date.now() + seconds * 1000);
    this.remaining = this._secondsLeft();
    this._emit(this.remaining === 0);
    if (this.remaining === 0) { this.onDone(); return; }
    // Polls faster than 1s so the displayed second flips promptly after the
    // page becomes visible again; _sync only repaints when the value changes.
    this._interval = setInterval(() => this._sync(), 250);
    document.addEventListener('visibilitychange', this._onVisible);
  }

  _secondsLeft() {
    return Math.max(0, Math.round((this.deadline - Date.now()) / 1000));
  }

  _sync() {
    const remaining = this._secondsLeft();
    if (remaining === this.remaining) return;
    this.remaining = remaining;
    const done = remaining === 0;
    this._emit(done);
    if (done) {
      this.stop();
      this.onDone();
    }
  }

  _emit(done) {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this.onTick(`${m}:${String(s).padStart(2, '0')}`, this.remaining, done);
  }

  stop() {
    clearInterval(this._interval);
    this._interval = null;
    document.removeEventListener('visibilitychange', this._onVisible);
  }

  get isRunning() { return this._interval !== null; }
}
