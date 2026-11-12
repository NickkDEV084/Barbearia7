let allAdminClients = [];

document.addEventListener('DOMContentLoaded', initClientsPage);

function initClientsPage() {
  document.getElementById('client-search').addEventListener('input', renderClients);
  document.querySelectorAll('[data-close-client]').forEach(button => button.addEventListener('click', closeClientModal));
  document.getElementById('client-modal').addEventListener('click', event => {
    if (event.target.id === 'client-modal') closeClientModal();
  });
  loadClients();
}

async function loadClients() {
  const container = document.getElementById('clients-list');
  try {
    allAdminClients = await api.get('/admin/clients');
    document.getElementById('client-total').textContent = `${allAdminClients.length} ${allAdminClients.length === 1 ? 'cliente' : 'clientes'}`;
    renderClients();
  } catch (error) {
    container.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar os clientes.'));
  }
}

function renderClients() {
  const container = document.getElementById('clients-list');
  container.replaceChildren();
  const query = document.getElementById('client-search').value.trim().toLowerCase();
  const filtered = allAdminClients.filter(client =>
    client.name.toLowerCase().includes(query) || client.phone.includes(query.replace(/\D/g, '')) || client.phone.includes(query)
  );
  if (!filtered.length) {
    container.appendChild(makeEmptyState(query ? 'Nenhum cliente corresponde à busca.' : 'Os clientes aparecerão aqui após o primeiro agendamento.'));
    return;
  }
  const table = document.createElement('div');
  table.className = 'clients-table';
  const header = document.createElement('div');
  header.className = 'clients-head';
  ['Nome', 'Telefone', 'Atendimentos', 'Última visita'].forEach(value => {
    const cell = document.createElement('span');
    cell.textContent = value;
    header.appendChild(cell);
  });
  table.appendChild(header);
  filtered.forEach(client => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'clients-row';
    row.style.width = '100%';
    row.style.borderTop = '0';
    row.style.borderRight = '0';
    row.style.borderLeft = '0';
    row.style.color = 'inherit';
    row.style.background = 'transparent';
    row.style.textAlign = 'left';
    const values = [
      client.name,
      formatClientPhone(client.phone),
      String(client.appointment_count || 0),
      client.last_visit ? formatDate(client.last_visit) : '—',
    ];
    values.forEach(value => {
      const cell = document.createElement('span');
      cell.textContent = value;
      row.appendChild(cell);
    });
    row.addEventListener('click', () => openClientHistory(client.id));
    table.appendChild(row);
  });
  container.appendChild(table);
}

function formatClientPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
}

async function openClientHistory(id) {
  const modal = document.getElementById('client-modal');
  const history = document.getElementById('client-history');
  modal.classList.add('open');
  history.replaceChildren();
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  loading.appendChild(spinner);
  history.appendChild(loading);
  try {
    const client = await api.get(`/admin/clients/${id}`);
    document.getElementById('client-modal-name').textContent = client.name;
    document.getElementById('client-detail-phone').textContent = formatClientPhone(client.phone);
    history.replaceChildren();
    if (!client.appointments.length) {
      history.appendChild(makeEmptyState('Este cliente ainda não tem atendimentos registrados.'));
      return;
    }
    client.appointments.forEach(appointment => {
      const row = document.createElement('div');
      row.className = 'history-item';
      const detail = document.createElement('div');
      const service = document.createElement('strong');
      service.textContent = appointment.service.name;
      const sub = document.createElement('small');
      sub.textContent = `${formatDateFull(appointment.date)} · ${appointment.start_time} · ${appointment.barber.name} · ${formatCurrency(appointment.service.price)}`;
      detail.append(service, sub);
      const status = document.createElement('span');
      status.className = `status-badge status-${appointment.status}`;
      status.textContent = clientStatusLabel(appointment.status);
      row.append(detail, status);
      history.appendChild(row);
    });
  } catch (error) {
    history.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar o histórico.'));
  }
}

function clientStatusLabel(status) {
  return ({ pending: 'Aguardando confirmação', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado', rescheduled: 'Reagendado' })[status] || status;
}

function closeClientModal() {
  document.getElementById('client-modal').classList.remove('open');
}
