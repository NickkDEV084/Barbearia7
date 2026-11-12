document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = window.location.pathname.endsWith('/login.html');
  if (isLoginPage) initLogin();
  else initProtectedAdminPage();
});

async function initLogin() {
  if (api.getToken()) {
    try {
      await api.get('/auth/me');
      window.location.replace('/admin/index.html');
      return;
    } catch (error) {
      api.clearToken();
    }
  }
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    const errorMessage = document.getElementById('login-error');
    button.disabled = true;
    button.textContent = 'Entrando…';
    errorMessage.hidden = true;
    try {
      const result = await api.post('/auth/login', {
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
      });
      api.setToken(result.access_token);
      window.location.assign('/admin/index.html');
    } catch (error) {
      errorMessage.textContent = error.message || 'Não foi possível entrar.';
      errorMessage.hidden = false;
      button.disabled = false;
      button.textContent = 'Entrar no painel →';
    }
  });
}

async function initProtectedAdminPage() {
  if (!api.getToken()) {
    window.location.replace('/admin/login.html');
    return;
  }
  try {
    const current = await api.get('/auth/me');
    document.querySelectorAll('[data-admin-user]').forEach(element => {
      element.textContent = current.username;
    });
  } catch (error) {
    api.clearToken();
    window.location.replace('/admin/login.html');
    return;
  }

  const logout = document.getElementById('btn-logout');
  if (logout) logout.addEventListener('click', () => {
    api.clearToken();
    window.location.assign('/admin/login.html');
  });

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', () => sidebar.classList.remove('open')));
  }
}
