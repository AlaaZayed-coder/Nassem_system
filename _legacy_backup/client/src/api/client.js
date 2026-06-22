const API = '/api';

export function token() {
  return localStorage.getItem('token');
}

export async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

export const api = {
  login: body => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  dashboard: () => request('/dashboard'),
  items: q => request(`/items?${new URLSearchParams(q)}`),
  item: code => request(`/items/${encodeURIComponent(code)}`),
  saveItem: (code, body) => request(`/items/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) }),
  approve: code => request(`/items/${encodeURIComponent(code)}/approve`, { method: 'POST', body: '{}' }),
  unlock: (code, reason) => request(`/items/${encodeURIComponent(code)}/unlock`, { method: 'POST', body: JSON.stringify({ reason }) }),
  status: (code, body) => request(`/items/${encodeURIComponent(code)}/status`, { method: 'POST', body: JSON.stringify(body) }),
  next: q => request(`/items/next?${new URLSearchParams(q || {})}`),
  bulk: body => request('/items/bulk/update', { method: 'POST', body: JSON.stringify(body) }),
  bulkLock: codes => request('/items/bulk/lock', { method: 'POST', body: JSON.stringify({ codes }) }),
  bulkUnlock: (codes, reason) => request('/items/bulk/unlock', { method: 'POST', body: JSON.stringify({ codes, reason }) }),
  categories: () => request('/categories'),
  addCategory: body => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  previewImport: form => request('/import/preview', { method: 'POST', body: form }),
  confirmImport: filePath => request('/import/confirm', { method: 'POST', body: JSON.stringify({ filePath }) }),
  exportFile: body => request('/export', { method: 'POST', body: JSON.stringify(body) }),
  audit: q => request(`/audit?${new URLSearchParams(q)}`),
  reports: () => request('/reports'),
  settings: () => request('/settings'),
  saveSettings: body => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  backup: () => request('/settings/backup', { method: 'POST', body: '{}' }),
  autoCategorize: () => request('/settings/auto-categorize', { method: 'POST', body: '{}' }),
  users: () => request('/users'),
  createUser: body => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  resetPassword: (id, password) => request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  priceHistory: code => request(`/items/${encodeURIComponent(code)}/price-history`),
};
