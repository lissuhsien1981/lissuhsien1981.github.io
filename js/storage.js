// js/storage.js
import {api} from './api.js';

const QUEUE_KEY = 'fitcoach-sync-queue';

// Local calendar date, not UTC. toISOString() rolls over at 08:00 Taipei time,
// which filed every pre-8am workout, meal and weigh-in under the previous day.
export function todayStr(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const storage = {
  queue(record) {
    const q = this.getQueue();
    q.push(record);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  },

  getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
  },

  async flush() {
    const q = this.getQueue();
    if (!q.length) return 0;
    const failed = [];
    for (const record of q) {
      try { await api.logSet(record); } catch { failed.push(record); }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    return q.length - failed.length;
  }
};

window.addEventListener('online', () => {
  storage.flush().then(n => { if (n) console.log(`同步 ${n} 筆離線記錄`); });
});
