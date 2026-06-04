const LOCAL_API_URL = 'http://localhost:5000/api';
const SAME_ORIGIN_API_URL = '/api';

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;

  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const resolveBaseUrls = () => {
  if (process.env.REACT_APP_API_URL) return [process.env.REACT_APP_API_URL];
  return isLocalBrowser() ? [LOCAL_API_URL, SAME_ORIGIN_API_URL] : [SAME_ORIGIN_API_URL];
};

const getToken = () => localStorage.getItem('sk_career_token');

const request = async (method, path, body = null, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  const baseUrls = resolveBaseUrls();
  let lastNetworkError = null;

  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      let data = null;

      if (contentType.includes('application/json') && rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const fallbackMessage = rawText && !contentType.includes('application/json')
          ? rawText.trim()
          : '';
        throw new Error(
          data?.message ||
          fallbackMessage ||
          `Request failed with status ${response.status} ${response.statusText}`
        );
      }

      return data || {};
    } catch (err) {
      if (err instanceof TypeError) {
        lastNetworkError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastNetworkError) {
    throw new Error(`Unable to reach the career API. Tried: ${baseUrls.join(', ')}.`);
  }
};

export const authAPI = {
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  register: (name, email, password) =>
    request('POST', '/auth/register', { name, email, password }),

  forgotPassword: (email) =>
    request('POST', '/auth/forgot-password', { email }),

  resetPassword: (token, password) =>
    request('POST', '/auth/reset-password', { token, password }),
};

export const companyAPI = {
  getAll: () =>
    request('GET', '/companies', null, true),

  add: (name, type, announceLink, careerLink) =>
    request('POST', '/companies', { name, type, announceLink, careerLink }, true),

  remove: (id) =>
    request('DELETE', `/companies/${id}`, null, true),

  getUpdates: () =>
    request('GET', '/companies/updates', null, true),

  checkNow: () =>
    request('POST', '/companies/check', null, true),

  updateJobStatus: (companyId, updateId, status) =>
    request('PATCH', `/companies/${companyId}/updates/${updateId}`, { status }, true),
};

export const agriStackAPI = {
  checkBatch: (rows) =>
    request('POST', '/agri-stack/check-batch', { rows }),
};
