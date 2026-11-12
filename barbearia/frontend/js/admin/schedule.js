const scheduleDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
let scheduleBarbers = [];
let scheduleConfigs = [];

document.addEventListener('DOMContentLoaded', initSchedulePage);

async function initSchedulePage() {
  document.getElementById('save-schedule').addEventListener('click', saveScheduleConfig);
  document.getElementById('add-day-off').addEventListener('click', createDayOff);
  const date = document.getElementById('day-off-date');
  date.min = localDateISO();
  try {
    const [barbers, configs] = await Promise.all([api.get('/barbers'), api.get('/admin/schedule/config')]);
    scheduleBarbers = barbers;
    scheduleConfigs = configs;
    fillDayOffBarbers();
    renderScheduleGrid();
    await loadDaysOff();
  } catch (error) {
    document.getElementById('schedule-grid').replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar o expediente.'));
  }
}

function fillDayOffBarbers() {
  const select = document.getElementById('day-off-barber');
  scheduleBarbers.forEach(barber => {
    const option = document.createElement('option');
    option.value = barber.id;
    option.textContent = barber.name;
    select.appendChild(option);
  });
}

function renderScheduleGrid() {
  const container = document.getElementById('schedule-grid');
  container.replaceChildren();
  if (!scheduleBarbers.length) {
    container.appendChild(makeEmptyState('Cadastre um profissional para configurar os horários.'));
    return;
  }
  const table = document.createElement('div');
  table.className = 'schedule-table';
  const columns = scheduleBarbers.length;
  const heading = document.createElement('div');
  heading.className = 'schedule-row schedule-heading';
  heading.style.setProperty('--columns', columns);
  const dayHeader = document.createElement('div');
  dayHeader.className = 'schedule-cell';
  dayHeader.textContent = 'Dia';
  heading.appendChild(dayHeader);
  scheduleBarbers.forEach(barber => {
    const cell = document.createElement('div');
    cell.className = 'schedule-cell';
    cell.textContent = barber.name;
    heading.appendChild(cell);
  });
  table.appendChild(heading);

  scheduleDays.forEach((dayName, dayIndex) => {
    const row = document.createElement('div');
    row.className = 'schedule-row';
    row.style.setProperty('--columns', columns);
    const dayCell = document.createElement('div');
    dayCell.className = 'schedule-cell schedule-day';
    dayCell.textContent = dayName;
    row.appendChild(dayCell);
    scheduleBarbers.forEach(barber => {
      const config = scheduleConfigs.find(item => item.barber_id === barber.id && item.day_of_week === dayIndex) || {
        barber_id: barber.id, day_of_week: dayIndex, start_time: '09:00', end_time: dayIndex === 5 ? '17:00' : '19:00',
        break_start: '12:00', break_end: '13:00', is_active: dayIndex < 6,
      };
      row.appendChild(scheduleCell(config));
    });
    table.appendChild(row);
  });
  container.appendChild(table);
}

function scheduleCell(config) {
  const cell = document.createElement('div');
  cell.className = 'schedule-cell schedule-config';
  cell.dataset.barber = config.barber_id;
  cell.dataset.day = config.day_of_week;
  const toggle = document.createElement('label');
  toggle.className = 'schedule-toggle';
  const active = document.createElement('input');
  active.type = 'checkbox';
  active.className = 'schedule-active';
  active.checked = Boolean(config.is_active);
  const label = document.createElement('span');
  label.textContent = 'Atende neste dia';
  toggle.append(active, label);
  const times = document.createElement('div');
  times.className = 'schedule-times';
  times.append(
    timeField('Abre', 'schedule-start', config.start_time),
    timeField('Fecha', 'schedule-end', config.end_time),
    timeField('Início intervalo', 'schedule-break-start', config.break_start || ''),
    timeField('Fim intervalo', 'schedule-break-end', config.break_end || ''),
  );
  cell.append(toggle, times);
  return cell;
}

function timeField(labelText, className, value) {
  const label = document.createElement('label');
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'time';
  input.className = `form-input ${className}`;
  input.value = (value || '').slice(0, 5);
  label.appendChild(input);
  return label;
}

async function saveScheduleConfig() {
  const configs = [];
  document.querySelectorAll('.schedule-config').forEach(cell => {
    configs.push({
      barber_id: Number(cell.dataset.barber),
      day_of_week: Number(cell.dataset.day),
      start_time: cell.querySelector('.schedule-start').value,
      end_time: cell.querySelector('.schedule-end').value,
      break_start: cell.querySelector('.schedule-break-start').value || null,
      break_end: cell.querySelector('.schedule-break-end').value || null,
      is_active: cell.querySelector('.schedule-active').checked,
    });
  });
  try {
    scheduleConfigs = await api.put('/admin/schedule/config', configs);
    showToast('Expediente atualizado.');
  } catch (error) {
    showToast(error.message || 'Não foi possível salvar o expediente.', 'error');
  }
}

async function loadDaysOff() {
  const container = document.getElementById('days-off-list');
  const daysOff = await api.get('/admin/schedule/days-off');
  container.replaceChildren();
  if (!daysOff.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Nenhuma folga cadastrada.';
    container.appendChild(empty);
    return;
  }
  daysOff.forEach(dayOff => {
    const row = document.createElement('div');
    row.className = 'day-off-row';
    const detail = document.createElement('span');
    const date = document.createElement('strong');
    date.textContent = formatDateFull(dayOff.date);
    const barber = scheduleBarbers.find(item => item.id === dayOff.barber_id);
    const scope = document.createElement('small');
    scope.textContent = barber ? barber.name : 'Todos';
    detail.append(date, scope);
    if (dayOff.reason) {
      const reason = document.createElement('small');
      reason.textContent = dayOff.reason;
      detail.appendChild(reason);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger btn-sm';
    remove.textContent = 'Remover';
    remove.addEventListener('click', () => deleteDayOff(dayOff.id));
    row.append(detail, remove);
    container.appendChild(row);
  });
}

async function createDayOff() {
  const date = document.getElementById('day-off-date').value;
  if (!date) {
    showToast('Escolha uma data para a folga.', 'error');
    return;
  }
  const barberValue = document.getElementById('day-off-barber').value;
  const payload = {
    date,
    barber_id: barberValue ? Number(barberValue) : null,
    reason: document.getElementById('day-off-reason').value.trim() || null,
  };
  try {
    await api.post('/admin/schedule/days-off', payload);
    document.getElementById('day-off-date').value = '';
    document.getElementById('day-off-reason').value = '';
    showToast('Folga adicionada.');
    await loadDaysOff();
  } catch (error) {
    showToast(error.message || 'Não foi possível adicionar a folga.', 'error');
  }
}

async function deleteDayOff(id) {
  try {
    await api.delete(`/admin/schedule/days-off/${id}`);
    showToast('Folga removida.');
    await loadDaysOff();
  } catch (error) {
    showToast(error.message || 'Não foi possível remover a folga.', 'error');
  }
}
