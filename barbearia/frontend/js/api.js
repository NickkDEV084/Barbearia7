const API_BASE = '/api';

const api = {
  async request(method, endpoint, data = undefined) {
    const headers = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const options = { method, headers };
    if (data !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (response.status === 401 || response.status === 403) {
      if (window.location.pathname.includes('/admin/') && !window.location.pathname.endsWith('/login.html')) {
        this.clearToken();
        window.location.href = '/admin/login.html';
      }
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const detail = Array.isArray(payload.detail)
        ? payload.detail.map(item => item.msg).join(', ')
        : payload.detail;
      throw new Error(detail || `Não foi possível concluir. (${response.status})`);
    }
    if (response.status === 204) return null;
    return response.json();
  },
  get(path) { return this.request('GET', path); },
  post(path, data) { return this.request('POST', path, data); },
  put(path, data) { return this.request('PUT', path, data); },
  patch(path, data) { return this.request('PATCH', path, data); },
  delete(path) { return this.request('DELETE', path); },
  setToken(token) { localStorage.setItem('gama_admin_token', token); },
  getToken() { return localStorage.getItem('gama_admin_token'); },
  clearToken() { localStorage.removeItem('gama_admin_token'); },
};

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromISO(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options = {}) {
  return dateFromISO(value).toLocaleDateString('pt-BR', {
    weekday: options.weekday || 'short', day: '2-digit', month: options.month || 'short',
  });
}

function formatDateFull(value) {
  return dateFromISO(value).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function applyPhoneMask(input) {
  input.addEventListener('input', event => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 10) event.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    else if (digits.length > 6) event.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    else if (digits.length > 2) event.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    else if (digits.length) event.target.value = `(${digits}`;
  });
}

function makeEmptyState(message) {
  const element = document.createElement('p');
  element.className = 'empty-state';
  element.textContent = message;
  return element;
}
