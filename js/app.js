// js/app.js
import {initToday} from './screens/today.js';
import {initLog, setCurrentExercise} from './screens/log.js';
import {initStats} from './screens/stats.js';
import {initProfile} from './screens/profile.js';

// One-time profile migration — 2026 減脂期 targets. Overwrites saved nutrition
// goals so the new numbers land on a device that already has old ones stored;
// bump the key to push a revised set.
const CUT_PHASE_KEY = 'fitcoach-migration-cut-2026';
if (!localStorage.getItem(CUT_PHASE_KEY)) {
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem('fitcoach-profile') || '{}'); } catch {}
  Object.assign(profile, {
    height: 174,
    targetWeight: 80,
    phase: '減脂期',
    goalCalories: 2100,
    goalProtein: 175,
    goalCarbs: 190,
    goalFat: 70,
  });
  localStorage.setItem('fitcoach-profile', JSON.stringify(profile));
  localStorage.setItem(CUT_PHASE_KEY, '1');
}

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
