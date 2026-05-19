// js/api.js
export async function apiFetch(params) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set('token', CONFIG.token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {redirect: 'follow'});
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(body) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    redirect: 'follow',
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
  analyzeFood: (data) => apiPost({action: 'analyzeFood', ...data}),
  recognizeFood: (data) => apiPost({action: 'recognizeFoodImage', ...data}),
  logWatch: (data) => apiPost({action: 'logWatch', ...data})
};
