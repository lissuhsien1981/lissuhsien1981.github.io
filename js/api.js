// js/api.js
// Apps Script can take 15s+ to answer, and on gym wifi a request sometimes
// never lands at all. Without a deadline those hang forever, which left the
// 完成這組 button disabled and the offline queue never engaged.
const TIMEOUT_MS = 20000;
// AI calls run a model round-trip, so they get a longer leash.
const AI_TIMEOUT_MS = 60000;

export async function apiFetch(params, timeout = TIMEOUT_MS) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set('token', CONFIG.token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {redirect: 'follow', signal: AbortSignal.timeout(timeout)});
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(body, timeout = TIMEOUT_MS) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
    body: JSON.stringify({token: CONFIG.token, ...body})
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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
