// js/diag.js
// Captures what a phone can't otherwise tell us: uncaught errors survive into
// localStorage, so a freeze can be read back after the app is restarted.
// Imported first in app.js so the handlers are up before anything else runs.

export const BUILD = '2026-08-26.1';

const LOG_KEY = 'fitcoach-diag-log';
const MAX_ENTRIES = 25;

function read() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; }
}

export function record(kind, detail) {
  try {
    const log = read();
    log.push({t: new Date().toISOString(), kind, detail: String(detail).slice(0, 400)});
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
  } catch { /* storage full or blocked — diagnostics must never break the app */ }
}

export function clearLog() {
  try { localStorage.removeItem(LOG_KEY); } catch {}
}

window.addEventListener('error', e => {
  record('error', `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`);
});

window.addEventListener('unhandledrejection', e => {
  const r = e.reason;
  record('reject', r && r.message ? `${r.name}: ${r.message}` : r);
});

function bytes(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }

export async function snapshot() {
  const lines = [];
  lines.push(`build: ${BUILD}`);

  let cacheNames = [];
  try { cacheNames = await caches.keys(); } catch {}
  lines.push(`sw cache: ${cacheNames.join(', ') || '(none)'}`);
  lines.push(`sw controlled: ${!!(navigator.serviceWorker && navigator.serviceWorker.controller)}`);

  lines.push(`viewport: ${innerWidth}x${innerHeight}  dpr ${devicePixelRatio}`);
  lines.push(`standalone: ${!!(navigator.standalone || matchMedia('(display-mode: standalone)').matches)}`);
  lines.push(`online: ${navigator.onLine}`);

  let total = 0, biggest = '';
  let biggestLen = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const len = (localStorage.getItem(k) || '').length;
      total += len;
      if (len > biggestLen) { biggestLen = len; biggest = k; }
    }
    lines.push(`localStorage: ${localStorage.length} keys, ${bytes(total)} (largest ${biggest} ${bytes(biggestLen)})`);
  } catch (e) { lines.push(`localStorage: UNREADABLE ${e.message}`); }

  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const key = `fitcoach-food-cache-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  try {
    const cache = JSON.parse(localStorage.getItem(key) || '[]');
    lines.push(`food cache today: ${cache.length} entries`);
  } catch (e) { lines.push(`food cache today: CORRUPT (${e.message})`); }

  try {
    const q = JSON.parse(localStorage.getItem('fitcoach-sync-queue') || '[]');
    lines.push(`sync queue: ${q.length} pending`);
  } catch (e) { lines.push(`sync queue: CORRUPT (${e.message})`); }

  const log = read();
  lines.push(`--- captured errors: ${log.length} ---`);
  log.slice(-12).forEach(e => lines.push(`${e.t.slice(5, 19)} [${e.kind}] ${e.detail}`));

  return lines.join('\n');
}
