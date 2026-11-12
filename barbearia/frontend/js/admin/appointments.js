const agendaState = {
  date: localDateISO(),
  view: 'day',
  rescheduling: null,
  newTime: null,
  request: 0,
  slotRequest: 0,
};

document.addEventListener('DOMContentLoaded', initAppointmentsPage);

async function initAppointmentsPage() {
  const params = new URLSearchParams(location.search);
  const initial = params.get('date');
  if (initial && /^\d{4}-\d{2}-\d{2}$/.test(initial)) agendaState.date = initial;
  const dateInput = document.getElementById('agenda-date');
  dateInput.value = agendaState.date;
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    agendaState.date = dateInput.value;
    renderDateTabs();
    loadAgenda();
  });
  document.querySelectorAll('.view-mode').forEach(button => button.addEventListener('click', () => {
    agendaState.view = button.dataset.view;
    document.querySelectorAll('.view-mode').forEach(item => item.classList.toggle('active', item === button));
    loadAgenda();
  }));
  document.getElementById('barber-filter').addEventListener('change', loadAgenda);
  document.getElementById('status-filter').addEventListener('change', loadAgenda);
  document.getElementById('btn-confirm-reschedule').addEventListener('click', saveReschedule);
  document.getElementById('reschedule-date').addEventListener('change', loadRescheduleSlots);
  document.querySelectorAll('[data-close-reschedule]').forEach(button => button.addEventListener('click', closeReschedule));
  document.getElementById('reschedule-modal').addEventListener('click', event => {
    if (event.target.id === 'reschedule-modal') closeReschedule();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReschedule(); });
  renderDateTabs();
  await loadBarberFilter();
  loadAgenda();
}

function renderDateTabs() {
  const container = document.getElementById('date-tabs');
  container.replaceChildren();
  const selected = dateFromISO(agendaState.date);
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + offset);
    const iso = localDateISO(date);
    const button = document.createElement('button');
    button.className = `date-tab${offset === 0 ? ' active' : ''}`;
    button.type = 'button';
    const weekday = document.createElement('small');
    weekday.textContent = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const day = document.createElement('strong');
    day.textContent = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    button.append(weekday, day);
    button.addEventListener('click', () => {
      agendaState.date = iso;
      document.getElementById('agenda-date').value = iso;
      renderDateTabs();
      loadAgenda();
    });
    container.appendChild(button);
  }
}

async function loadBarberFilter() {
  try {
    const barbers = await api.get('/barbers');
    const select = document.getElementById('barber-filter');
    barbers.forEach(barber => {
      const option = document.createElement('option');
      option.value = barber.id;
      option.textContent = barber.name;
      select.appendChild(option);
    });
  } catch (error) {
    showToast('Não foi possível carregar os profissionais.', 'error');
  }
}

async function loadAgenda() {
  const request = ++agendaState.request;
  const container = document.getElementById('appointments-list');
  container.replaceChildren();
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  loading.appendChild(spinner);
  container.appendChild(loading);

  const params = new URLSearchParams();
  if (agendaState.view === 'day') params.set('target_date', agendaState.date);
  else {
    params.set('date_from', agendaState.date);
    const end = dateFromISO(agendaState.date);
    end.setDate(end.getDate() + 6);
    params.set('date_to', localDateISO(end));
  }
  const barberId = document.getElementById('barber-filter').value;
  const status = document.getElementById('status-filter').value;
  if (barberId) params.set('barber_id', barberId);
  if (status) params.set('status', status);

  try {
    const appointments = await api.get(`/admin/appointments?${params}`);
    if (request !== agendaState.request) return;
    document.getElementById('agenda-caption').textContent = agendaState.view === 'day'
      ? formatDateFull(agendaState.date)
      : `${formatDateFull(agendaState.date)} — ${formatDateFull(params.get('date_to'))}`;
    renderAgenda(appointments);
  } catch (error) {
    if (request !== agendaState.request) return;
    container.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar a agenda.'));
  }
}

function renderAgenda(appointments) {
  const container = document.getElementById('appointments-list');
  container.replaceChildren();
  if (!appointments.length) {
    container.appendChild(makeEmptyState('Nenhum agendamento encontrado para este período.'));
    return;
  }
  appointments.forEach(item => {
    const card = document.createElement('article');
    card.className = 'appointment-card';
    const time = document.createElement('span');
    time.className = 'appointment-time';
    time.textContent = item.start_time;
    const info = document.createElement('span');
    info.className = 'appointment-info';
    const client = document.createElement('strong');
    client.textContent = item.client.name;
    const service = document.createElement('small');
    const dateLabel = agendaState.view === 'week' ? `${formatDate(item.date)} · ` : '';
    service.textContent = `${dateLabel}${item.service.name} · ${item.barber.name} · ${formatCurrency(item.service.price)}`;
    info.append(client, service);
    const actions = document.createElement('div');
    actions.className = 'appointment-actions';
    const badge = document.createElement('span');
    badge.className = `status-badge status-${item.status}`;
    badge.textContent = appointmentStatusLabel(item.status);
    actions.appendChild(badge);
    if (['pending', 'rescheduled'].includes(item.status)) actions.appendChild(actionButton('Confirmar', 'confirm', item));
    if (['pending', 'confirmed', 'rescheduled'].includes(item.status)) {
      if (item.status !== 'pending') actions.appendChild(actionButton('Concluir', 'complete', item));
      actions.appendChild(actionButton('Reagendar', 'reschedule', item));
      actions.appendChild(actionButton('Cancelar', 'cancel', item));
    }
    card.append(time, info, actions);
    container.appendChild(card);
  });
}

function actionButton(label, action, appointment) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = action === 'cancel' ? 'btn btn-danger btn-sm' : 'btn btn-outline btn-sm';
  button.textContent = label;
  button.addEventListener('click', () => {
    if (action === 'reschedule') openReschedule(appointment);
    else changeAppointmentStatus(appointment, action === 'complete' ? 'completed' : action === 'confirm' ? 'confirmed' : 'cancelled');
  });
  return button;
}

async function changeAppointmentStatus(appointment, status) {
  if (status === 'cancelled' && !window.confirm(`Cancelar o horário de ${appointment.client.name}?`)) return;
  try {
    await api.patch(`/admin/appointments/${appointment.id}/status`, { status });
    showToast(status === 'cancelled' ? 'Agendamento cancelado.' : status === 'completed' ? 'Atendimento concluído.' : 'Agendamento confirmado.');
    loadAgenda();
  } catch (error) {
    showToast(error.message || 'Não foi possível atualizar o agendamento.', 'error');
  }
}

function appointmentStatusLabel(status) {
  return ({ pending: 'Aguardando confirmação', confirmed: 'Confirmado', completed: 'Concluído', cancelled: 'Cancelado', rescheduled: 'Reagendado' })[status] || status;
}

function openReschedule(appointment) {
  agendaState.rescheduling = appointment;
  agendaState.newTime = null;
  const modal = document.getElementById('reschedule-modal');
  const date = document.getElementById('reschedule-date');
  const today = localDateISO();
  date.min = today;
  date.value = appointment.date >= today ? appointment.date : today;
  document.getElementById('btn-confirm-reschedule').disabled = true;
  modal.classList.add('open');
  loadRescheduleSlots();
}

function closeReschedule() {
  agendaState.slotRequest += 1;
  document.getElementById('reschedule-modal').classList.remove('open');
  agendaState.rescheduling = null;
  agendaState.newTime = null;
}

async function loadRescheduleSlots() {
  const request = ++agendaState.slotRequest;
  const appointment = agendaState.rescheduling;
  const targetDate = document.getElementById('reschedule-date').value;
  const slotsBox = document.getElementById('reschedule-slots');
  const empty = document.getElementById('reschedule-empty');
  const confirm = document.getElementById('btn-confirm-reschedule');
  agendaState.newTime = null;
  confirm.disabled = true;
  if (!appointment || !targetDate) return;
  slotsBox.replaceChildren();
  empty.hidden = true;
  try {
    const params = new URLSearchParams({ barber_id: appointment.barber.id, target_date: targetDate, service_id: appointment.service.id });
    const slots = await api.get(`/appointments/available-slots?${params}`);
    if (request !== agendaState.slotRequest || agendaState.rescheduling !== appointment) return;
    if (!slots.length) {
      empty.hidden = false;
      return;
    }
    slots.forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-slot';
      button.textContent = slot;
      button.addEventListener('click', () => {
        agendaState.newTime = slot;
        slotsBox.querySelectorAll('.time-slot').forEach(item => item.classList.toggle('selected', item === button));
        confirm.disabled = false;
      });
      slotsBox.appendChild(button);
    });
  } catch (error) {
    if (request !== agendaState.slotRequest || agendaState.rescheduling !== appointment) return;
    empty.hidden = false;
    empty.textContent = error.message || 'Não foi possível buscar horários.';
  }
}

async function saveReschedule() {
  if (!agendaState.rescheduling || !agendaState.newTime) return;
  const targetDate = document.getElementById('reschedule-date').value;
  const confirm = document.getElementById('btn-confirm-reschedule');
  confirm.disabled = true;
  try {
    await api.put(`/admin/appointments/${agendaState.rescheduling.id}/reschedule`, {
      date: targetDate, start_time: agendaState.newTime,
    });
    showToast('Agendamento reagendado.');
    closeReschedule();
    loadAgenda();
  } catch (error) {
    showToast(error.message || 'Não foi possível reagendar.', 'error');
    confirm.disabled = false;
  }
}
