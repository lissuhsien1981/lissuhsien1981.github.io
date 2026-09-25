// js/api.js
// Apps Script can take 15s+ to answer, and on gym wifi a request sometimes
// never lands at all. Without a deadline those hang forever, which left the
// 完成這組 button disabled and the offline queue never engaged.
const TIMEOUT_MS = 20000;
// AI calls run a model round-trip, so they get a longer leash.
const AI_TIMEOUT_MS = 60000;

// The access token used to sit in config.js, which GitHub Pages serves to
// anyone. Each device now keeps its own copy in localStorage, entered once.
const TOKEN_KEY = 'fc_token';
let asked = false;

function getToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  // Ask at most once per page load, so a cancelled prompt doesn't come back
  // for every request a screen fires off.
  if (!token && !asked) {
    asked = true;
    token = (window.prompt('請輸入 FitCoach 存取權杖') || '').trim();
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }
  return token || '';
}

// A wrong or rotated token comes back as a 200 with {error: 'Unauthorized'}.
// Forget it so the next call asks again, and throw so callers treat it as a
// failed request: logSet then goes to the offline queue instead of being
// counted as synced, and 已連結 ✓ isn't shown for a rejected token.
function checkAuth(data) {
  if (data && data.error === 'Unauthorized') {
    localStorage.removeItem(TOKEN_KEY);
    asked = false;
    throw new Error('Unauthorized');
  }
  return data;
}

export async function apiFetch(params, timeout = TIMEOUT_MS) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set('token', getToken());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {redirect: 'follow', signal: AbortSignal.timeout(timeout)});
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return checkAuth(await res.json());
}

export async function apiPost(body, timeout = TIMEOUT_MS) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({token: getToken(), ...body})
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return checkAuth(await res.json());
}

export const api = {
  getTodayWorkout: (day) => apiFetch({action: 'getTodayWorkout', day}),
  getStats: () => apiFetch({action: 'getStats'}),
  getHistory: () => apiFetch({action: 'getHistory'}),
  logSet: (data) => apiPost({action: 'logSet', ...data}),
  logBody: (data) => apiPost({action: 'logBody', ...data}),
  logFood: (data) => apiPost({action: 'logFood', ...data}),
  getTodayFood: (date) => apiFetch({action: 'getTodayFood', date}),
  getExerciseLog: (exercise = '', limit = 3) => apiFetch({action: 'getExerciseLog', exercise, limit}),
  analyzeFood: (data) => apiPost({action: 'analyzeFood', ...data}, AI_TIMEOUT_MS),
  recognizeFood: (data) => apiPost({action: 'recognizeFoodImage', ...data}, AI_TIMEOUT_MS),
  logWatch: (data) => apiPost({action: 'logWatch', ...data})
};
