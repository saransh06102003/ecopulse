(function apiModule() {
  const API_BASE = window.location.origin;
  const TOKEN_KEY = 'ecopulse_token';
  const USER_KEY = 'ecopulse_user';

  const authState = {
    initialized: false,
    mode: 'login',
    resolver: null,
    refs: {}
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function persistSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, options = {}) {
    const token = getToken();
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (response.headers.get('content-type')?.includes('text/csv')) {
      if (!response.ok) throw new Error('CSV export failed');
      return response.text();
    }

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      clearSession();
    }

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || 'Request failed');
    }

    return payload;
  }

  async function register(body) {
    return request('/api/auth/register', { method: 'POST', body });
  }

  async function login(body) {
    return request('/api/auth/login', { method: 'POST', body });
  }

  function setAuthMode(mode) {
    authState.mode = mode;
    const { tabLogin, tabRegister, nameWrap, roleWrap, submitBtn, error } = authState.refs;
    const isRegister = mode === 'register';

    tabLogin.classList.toggle('active', !isRegister);
    tabRegister.classList.toggle('active', isRegister);
    nameWrap.style.display = isRegister ? 'block' : 'none';
    roleWrap.style.display = isRegister ? 'block' : 'none';
    submitBtn.textContent = isRegister ? 'Create Account' : 'Login';
    error.textContent = '';
  }

  function setAuthError(message) {
    authState.refs.error.textContent = message || '';
  }

  function openAuthModal() {
    authState.refs.modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    authState.refs.email.focus();
  }

  function closeAuthModal() {
    authState.refs.modal.classList.remove('open');
    document.body.style.overflow = '';
    authState.refs.form.reset();
    setAuthError('');
    setAuthMode('login');
  }

  async function onAuthSubmit(event) {
    event.preventDefault();

    const {
      name,
      email,
      password,
      role,
      submitBtn
    } = authState.refs;

    const isRegister = authState.mode === 'register';
    const payload = {
      email: email.value.trim(),
      password: password.value
    };

    if (payload.password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }

    if (isRegister) {
      payload.name = name.value.trim() || 'EcoPulse User';
      payload.role = role.value;
    }

    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = isRegister ? 'Creating...' : 'Signing in...';
    setAuthError('');

    try {
      const result = isRegister ? await register(payload) : await login(payload);
      persistSession(result.data);
      closeAuthModal();
      if (authState.resolver) {
        authState.resolver(result.data.user);
        authState.resolver = null;
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  }

  function initAuthModal() {
    if (authState.initialized) return;

    authState.refs = {
      modal: document.getElementById('auth-modal'),
      form: document.getElementById('auth-form'),
      tabLogin: document.getElementById('auth-tab-login'),
      tabRegister: document.getElementById('auth-tab-register'),
      nameWrap: document.getElementById('auth-name-wrap'),
      roleWrap: document.getElementById('auth-role-wrap'),
      name: document.getElementById('auth-name'),
      email: document.getElementById('auth-email'),
      password: document.getElementById('auth-password'),
      role: document.getElementById('auth-role'),
      error: document.getElementById('auth-error'),
      submitBtn: document.getElementById('auth-submit')
    };

    authState.refs.tabLogin.addEventListener('click', () => setAuthMode('login'));
    authState.refs.tabRegister.addEventListener('click', () => setAuthMode('register'));
    authState.refs.form.addEventListener('submit', onAuthSubmit);

    setAuthMode('login');
    authState.initialized = true;
  }

  async function ensureAuth() {
    const token = getToken();
    const user = getCurrentUser();

    if (token && user) {
      return user;
    }

    initAuthModal();
    openAuthModal();

    return new Promise((resolve) => {
      authState.resolver = resolve;
    });
  }

  async function createLog(body) {
    const result = await request('/api/logs', { method: 'POST', body });
    return result.data;
  }

  async function getLogs(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.append(key, String(value));
    });
    const result = await request(`/api/logs?${query.toString()}`);
    return result.data;
  }

  async function getLogsCsv(params = {}) {
    const query = new URLSearchParams({ ...params, format: 'csv' });
    return request(`/api/logs?${query.toString()}`);
  }

  async function generateReport(body) {
    const result = await request('/api/generate-report', { method: 'POST', body });
    return result.data;
  }

  function logout() {
    clearSession();
    initAuthModal();
    openAuthModal();
  }

  window.EcoPulseAPI = {
    ensureAuth,
    getCurrentUser,
    logout,
    createLog,
    getLogs,
    getLogsCsv,
    generateReport
  };
})();
