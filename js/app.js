// js/app.js
import {initToday} from './screens/today.js';
import {initLog, setCurrentExercise} from './screens/log.js';
import {initStats} from './screens/stats.js';
import {initProfile} from './screens/profile.js';

const screens = {
  today: {init: initToday, initialized: false},
  log: {init: initLog, initialized: false},
  stats: {init: initStats, initialized: false},
  profile: {init: initProfile, initialized: false}
};

function navigateTo(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const screenEl = document.getElementById(`screen-${name}`);
  if (!screenEl) return;
  screenEl.classList.add('active');

  const navBtn = document.querySelector(`[data-target="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  if (name === 'log' || !screens[name].initialized) {
    screens[name].init(screenEl);
    screens[name].initialized = true;
  }
}

// Navigate to log when exercise card tapped
window.addEventListener('navigate-to-log', (e) => {
  setCurrentExercise(e.detail);
  navigateTo('log');
});

// Bottom nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.target));
});

// Service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Init
navigateTo('today');
