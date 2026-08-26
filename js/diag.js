// js/diag.js
// Captures what a phone can't otherwise tell us: uncaught errors survive into
// localStorage, so a freeze can be read back after the app is restarted.
// Imported first in app.js so the handlers are up before anything else runs.

export const BUILD = '2026-08-26.4';

const LOG_KEY = 'fitcoach-diag-log';
const MAX_ENTRIES = 60;   // taps fill this quickly; keep enough to span a freeze

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

function describe(el) {
  if (!el) return 'null';
  const id = el.id ? '#' + el.id : '';
  const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
  return (el.tagName || '?').toLowerCase() + id + cls;
}

// A tap that never reaches its button leaves no error behind, so record where
// every tap actually lands and what sits on top of that point. If something is
// covering the screen this is the only place it shows up.
// Both families: if one of them never fires on iOS, the other still reports.
function onTap(kind, x, y, target) {
  bumpTaps();
  const top = document.elementFromPoint(x, y);
  const hitsTarget = top === target || (top && target && top.contains(target));
  lastTap = `${kind} ${describe(target)}${hitsTarget ? '' : ' BLOCKED-BY ' + describe(top)}`;
  record('tap', `${kind} ${Math.round(x)},${Math.round(y)} on ${describe(target)}` +
    (hitsTarget ? '' : ` BLOCKED-BY ${describe(top)}`));
  updateStrip();
}

addEventListener('pointerdown', e => onTap('pointer', e.clientX, e.clientY, e.target), true);
addEventListener('touchstart', e => {
  const t = e.touches[0];
  if (t) onTap('touch', t.clientX, t.clientY, e.target);
}, true);
addEventListener('click', e => onTap('click', e.clientX, e.clientY, e.target), true);

// Scroll ability at the moment of a touch: "won't scroll" is otherwise
// indistinguishable from "already at the bottom".
addEventListener('touchend', () => {
  const s = document.querySelector('.screen.active');
  if (s) record('scroll', `${describe(s)} at ${s.scrollTop}/${s.scrollHeight - s.clientHeight}`);
}, true);

// In-flight requests. A promise that never settles produces no error either.
const inflight = new Map();
let seq = 0;
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const id = ++seq;
  let action = 'unknown';
  try {
    action = (init && init.method === 'POST')
      ? JSON.parse(init.body).action
      : new URL(String(input)).searchParams.get('action') || String(input).split('/').pop();
  } catch {}
  inflight.set(id, {action, start: Date.now()});
  const t0 = Date.now();
  try {
    const res = await nativeFetch(input, init);
    inflight.delete(id);
    if (!res.ok) record('http', `${action} -> ${res.status} in ${Date.now() - t0}ms`);
    return res;
  } catch (err) {
    inflight.delete(id);
    record('netfail', `${action} ${err.name}: ${err.message} after ${Date.now() - t0}ms`);
    throw err;
  }
};

export function inflightReport() {
  if (!inflight.size) return 'none';
  const now = Date.now();
  return [...inflight.values()].map(r => `${r.action} pending ${Math.round((now - r.start) / 1000)}s`).join(', ');
}

// Main-thread stalls. If the timer is late by seconds, the UI was blocked.
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const late = now - lastTick - 1000;
  if (late > 2500) record('stall', `main thread blocked ~${Math.round(late / 1000)}s`);
  lastTick = now;
}, 1000);

// A cumulative tap count that clearLog() deliberately does not reset, so
// "no taps were recorded" can be told apart from "the log was cleared".
const TAP_KEY = 'fitcoach-diag-taps';
function bumpTaps() {
  try { localStorage.setItem(TAP_KEY, String((+localStorage.getItem(TAP_KEY) || 0) + 1)); } catch {}
}
export function tapCount() { try { return +localStorage.getItem(TAP_KEY) || 0; } catch { return 0; } }

// The readout has to live on the screen that fails: if the page can't be
// scrolled or tapped, navigating to 設定 to read a log is exactly the thing
// that isn't working. Fixed to the top so it shows even when nothing scrolls.
let strip, lastTap = '-';
function ensureStrip() {
  if (strip) return strip;
  strip = document.createElement('div');
  strip.id = 'diag-strip';
  strip.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
    'background:rgba(232,255,71,0.92);color:#000;font:600 10px/1.35 ui-monospace,Menlo,monospace;' +
    'padding:3px 6px;white-space:pre-wrap;pointer-events:none;text-align:left';
  document.body.appendChild(strip);
  return strip;
}

function updateStrip() {
  const el = ensureStrip();
  const s = document.querySelector('.screen.active');
  const scrollable = s ? s.scrollHeight - s.clientHeight : 0;
  el.textContent =
    `${BUILD} | scroll ${s ? s.scrollTop : '-'}/${scrollable} (content ${s ? s.scrollHeight : '-'} vs ${s ? s.clientHeight : '-'})\n` +
    `taps ${tapCount()} | last ${lastTap}`;
}

addEventListener('touchmove', updateStrip, true);
addEventListener('scroll', updateStrip, true);
setInterval(updateStrip, 1000);

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

  lines.push(`in-flight requests: ${inflightReport()}`);

  // Anything covering the screen that shouldn't be there.
  const overlays = [...document.querySelectorAll('body *')].filter(el => {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'absolute') return false;
    const r = el.getBoundingClientRect();
    return r.width > innerWidth * 0.8 && r.height > innerHeight * 0.5 && s.display !== 'none';
  }).map(describe);
  lines.push(`full-screen layers: ${overlays.join(', ') || 'none'}`);

  const log = read();
  lines.push(`taps since install: ${tapCount()} (survives clear)`);
  lines.push(`--- events: ${log.length} ---`);
  log.slice(-16).forEach(e => lines.push(`${e.t.slice(11, 19)} [${e.kind}] ${e.detail}`));

  return lines.join('\n');
}
