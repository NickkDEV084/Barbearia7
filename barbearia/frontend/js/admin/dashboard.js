document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
  const date = document.getElementById('current-date');
  if (date) date.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  try {
    const data = await api.get('/admin/dashboard');
    document.getElementById('today-count').textContent = data.today_appointments;
    document.getElementById('today-revenue').textContent = formatCurrency(data.today_revenue);
    document.getElementById('week-revenue').textContent = formatCurrency(data.week_revenue);
    document.getElementById('month-revenue').textContent = formatCurrency(data.month_revenue);
    renderTopServices(data.top_services || []);
    renderUpcoming(data.upcoming || []);
  } catch (error) {
    showToast(error.message || 'Não foi possível carregar o painel.', 'error');
  }
}

function renderTopServices(services) {
  const container = document.getElementById('top-services');
  container.replaceChildren();
  if (!services.length) {
    container.appendChild(makeEmptyState('Ainda não há atendimentos registrados.'));
    return;
  }
  services.forEach((service, index) => {
    const row = document.createElement('div');
    row.className = 'top-service-row';
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('strong');
    name.textContent = service.name;
    const count = document.createElement('span');
    count.className = 'count-pill';
    count.textContent = `${service.count} ${service.count === 1 ? 'atendimento' : 'atendimentos'}`;
    row.append(rank, name, count);
    container.appendChild(row);
  });
}

function renderUpcoming(appointments) {
  const container = document.getElementById('upcoming-appointments');
  container.replaceChildren();
  if (!appointments.length) {
    container.appendChild(makeEmptyState('Nenhum horário reservado por enquanto.'));
    return;
  }
  appointments.forEach(appointment => {
    const card = document.createElement('a');
    card.className = 'appointment-card';
    card.href = `appointments.html?date=${appointment.date}`;
    const time = document.createElement('span');
    time.className = 'appointment-time';
    time.textContent = appointment.start_time;
    const detail = document.createElement('span');
    detail.className = 'appointment-info';
    const client = document.createElement('strong');
    client.textContent = appointment.client;
    const service = document.createElement('small');
    service.textContent = `${appointment.service} · ${appointment.barber} · ${formatDate(appointment.date)}`;
    detail.append(client, service);
    const status = document.createElement('span');
    status.className = `status-badge status-${appointment.status}`;
    status.textContent = ({ pending: 'Aguardando', completed: 'Concluído', rescheduled: 'Reagendado', confirmed: 'Confirmado' })[appointment.status] || appointment.status;
    card.append(time, detail, status);
    container.appendChild(card);
  });
}
