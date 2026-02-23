const BASE_URL = process.env.REACT_APP_API_URL || 'https://sk-production-dca4.up.railway.app/api';

const getToken = () => localStorage.getItem('sk_career_token');

const request = async (method, path, body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  register: (name, email, password) =>
    request('POST', '/auth/register', { name, email, password }),

  forgotPassword: (email) =>
    request('POST', '/auth/forgot-password', { email }),
};

// ── Companies ─────────────────────────────────────────────────
export const companyAPI = {
  getAll: () =>
    request('GET', '/companies', null, true),

  add: (name, announceLink, careerLink) =>
    request('POST', '/companies', { name, announceLink, careerLink }, true),

  remove: (id) =>
    request('DELETE', `/companies/${id}`, null, true),

  getUpdates: () =>
    request('GET', '/companies/updates', null, true),

  checkNow: () =>
    request('POST', '/companies/check', null, true),
  
  updateJobStatus: (companyId, updateId, status) =>
    request('PATCH', `/companies/${companyId}/updates/${updateId}`, { status }, true),
};