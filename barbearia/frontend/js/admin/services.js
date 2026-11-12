let adminServices = [];

document.addEventListener('DOMContentLoaded', initServicesAdmin);

function initServicesAdmin() {
  document.getElementById('new-service-btn').addEventListener('click', () => openServiceModal());
  document.getElementById('service-form').addEventListener('submit', saveAdminService);
  document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeServiceModal));
  document.getElementById('service-modal').addEventListener('click', event => {
    if (event.target.id === 'service-modal') closeServiceModal();
  });
  loadAdminServices();
}

async function loadAdminServices() {
  const container = document.getElementById('services-list');
  try {
    adminServices = await api.get('/admin/services');
    renderAdminServices();
  } catch (error) {
    container.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar os serviços.'));
  }
}

function renderAdminServices() {
  const container = document.getElementById('services-list');
  container.replaceChildren();
  if (!adminServices.length) {
    container.appendChild(makeEmptyState('Cadastre o primeiro serviço do estúdio.'));
    return;
  }
  adminServices.forEach(service => {
    const row = document.createElement('article');
    row.className = 'admin-service-card';
    const info = document.createElement('div');
    const name = document.createElement('h3');
    name.textContent = service.name;
    const meta = document.createElement('div');
    meta.className = 'service-meta';
    const duration = document.createElement('span');
    duration.textContent = `${service.duration_minutes} min`;
    const price = document.createElement('span');
    price.textContent = formatCurrency(service.price);
    meta.append(duration, price);
    info.append(name, meta);
    const actions = document.createElement('div');
    actions.className = 'service-actions';
    const badge = document.createElement('span');
    badge.className = service.active ? 'status-badge' : 'status-badge status-cancelled';
    badge.textContent = service.active ? 'Ativo' : 'Inativo';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-action';
    edit.setAttribute('aria-label', `Editar ${service.name}`);
    edit.textContent = '✎';
    edit.addEventListener('click', () => openServiceModal(service));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'icon-action danger';
    toggle.setAttribute('aria-label', service.active ? `Desativar ${service.name}` : `Reativar ${service.name}`);
    toggle.textContent = service.active ? '×' : '↻';
    toggle.addEventListener('click', () => toggleService(service));
    actions.append(badge, edit, toggle);
    row.append(info, actions);
    container.appendChild(row);
  });
}

function openServiceModal(service = null) {
  document.getElementById('service-id').value = service ? service.id : '';
  document.getElementById('service-name').value = service ? service.name : '';
  document.getElementById('service-price').value = service ? service.price : '';
  document.getElementById('service-duration').value = service ? service.duration_minutes : 30;
  document.getElementById('service-active').checked = service ? service.active : true;
  document.getElementById('modal-title').textContent = service ? 'Editar serviço' : 'Novo serviço';
  document.getElementById('service-modal').classList.add('open');
}

function closeServiceModal() {
  document.getElementById('service-modal').classList.remove('open');
}

async function saveAdminService(event) {
  event.preventDefault();
  const id = document.getElementById('service-id').value;
  const payload = {
    name: document.getElementById('service-name').value.trim(),
    price: Number(document.getElementById('service-price').value),
    duration_minutes: Number(document.getElementById('service-duration').value),
    active: document.getElementById('service-active').checked,
  };
  try {
    if (id) await api.put(`/admin/services/${id}`, payload);
    else await api.post('/admin/services', payload);
    closeServiceModal();
    showToast(id ? 'Serviço atualizado.' : 'Serviço cadastrado.');
    loadAdminServices();
  } catch (error) {
    showToast(error.message || 'Não foi possível salvar o serviço.', 'error');
  }
}

async function toggleService(service) {
  const payload = {
    name: service.name,
    price: service.price,
    duration_minutes: service.duration_minutes,
    active: !service.active,
  };
  try {
    await api.put(`/admin/services/${service.id}`, payload);
    showToast(service.active ? 'Serviço desativado.' : 'Serviço reativado.');
    loadAdminServices();
  } catch (error) {
    showToast(error.message || 'Não foi possível atualizar o serviço.', 'error');
  }
}
