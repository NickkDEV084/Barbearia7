const booking = {
  step: 1,
  service: null,
  barber: null,
  date: null,
  time: null,
  slotRequest: 0,
};

document.addEventListener('DOMContentLoaded', initBooking);

async function initBooking() {
  document.getElementById('btn-next').addEventListener('click', nextBookingStep);
  document.getElementById('btn-back').addEventListener('click', previousBookingStep);
  document.getElementById('booking-form').addEventListener('submit', submitBooking);
  applyPhoneMask(document.getElementById('client-phone'));
  await loadBookingServices();
}

function updateBookingNavigation() {
  document.querySelectorAll('[data-step-indicator]').forEach(indicator => {
    const number = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle('active', number === booking.step);
    indicator.classList.toggle('completed', number < booking.step);
    const dot = indicator.querySelector('.step-dot');
    if (dot) dot.textContent = number < booking.step ? '✓' : String(number);
  });
  const back = document.getElementById('btn-back');
  const next = document.getElementById('btn-next');
  back.hidden = booking.step === 1;
  next.hidden = booking.step === 4;
  refreshNextState();
}

function refreshNextState() {
  const next = document.getElementById('btn-next');
  if (!next) return;
  const ready = booking.step === 1 ? Boolean(booking.service)
    : booking.step === 2 ? Boolean(booking.barber)
      : booking.step === 3 ? Boolean(booking.date && booking.time) : false;
  next.disabled = !ready;
}

function showBookingStep(step) {
  booking.step = step;
  document.querySelectorAll('.booking-step').forEach(section => {
    section.classList.toggle('active', section.id === `step-${step}`);
  });
  updateBookingNavigation();
  if (step === 2) loadBookingBarbers();
  if (step === 3) prepareDatePicker();
  if (step === 4) renderBookingSummary();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextBookingStep() {
  if (booking.step === 1 && booking.service) showBookingStep(2);
  else if (booking.step === 2 && booking.barber) showBookingStep(3);
  else if (booking.step === 3 && booking.date && booking.time) showBookingStep(4);
}

function previousBookingStep() {
  if (booking.step > 1) showBookingStep(booking.step - 1);
}

async function loadBookingServices() {
  const container = document.getElementById('booking-services');
  try {
    const services = await api.get('/services');
    container.replaceChildren();
    if (!services.length) {
      container.appendChild(makeEmptyState('Nenhum serviço disponível no momento.'));
      return;
    }
    const presetId = Number(new URLSearchParams(location.search).get('service'));
    services.forEach(service => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'select-card';
      card.setAttribute('aria-pressed', 'false');
      const detail = document.createElement('span');
      const title = document.createElement('h3');
      title.textContent = service.name;
      const duration = document.createElement('p');
      duration.textContent = `${service.duration_minutes} min`;
      detail.append(title, duration);
      const price = document.createElement('span');
      price.className = 'select-price';
      price.textContent = formatCurrency(service.price);
      card.append(detail, price);
      card.addEventListener('click', () => {
        booking.service = service;
        container.querySelectorAll('.select-card').forEach(item => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        refreshNextState();
      });
      container.appendChild(card);
      if (presetId && presetId === service.id) card.click();
    });
  } catch (error) {
    container.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar os serviços.'));
  }
}

async function loadBookingBarbers() {
  const container = document.getElementById('booking-barbers');
  if (container.dataset.loaded === 'true') return;
  try {
    const barbers = await api.get('/barbers');
    container.replaceChildren();
    container.dataset.loaded = 'true';
    if (!barbers.length) {
      container.appendChild(makeEmptyState('Nenhum profissional disponível.'));
      return;
    }
    barbers.forEach(barber => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'select-card barber-select';
      const avatar = document.createElement('span');
      avatar.className = 'barber-avatar';
      if (barber.photo_url) {
        const image = document.createElement('img');
        image.src = barber.photo_url;
        image.alt = '';
        avatar.appendChild(image);
      } else avatar.textContent = barber.name.slice(0, 1).toUpperCase();
      const text = document.createElement('span');
      const title = document.createElement('h3');
      title.textContent = barber.name;
      const caption = document.createElement('p');
      caption.textContent = 'Ver horários disponíveis';
      text.append(title, caption);
      card.append(avatar, text);
      card.addEventListener('click', () => {
        booking.barber = barber;
        container.querySelectorAll('.select-card').forEach(item => item.classList.remove('selected'));
        card.classList.add('selected');
        refreshNextState();
      });
      container.appendChild(card);
    });
  } catch (error) {
    container.replaceChildren(makeEmptyState(error.message || 'Não foi possível carregar os profissionais.'));
  }
}

function prepareDatePicker() {
  if (booking.date) return loadAvailableSlots(booking.date);
  const container = document.getElementById('date-chips');
  container.replaceChildren();
  const today = new Date();
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const iso = localDateISO(date);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'date-chip';
    chip.dataset.date = iso;
    const weekday = document.createElement('span');
    weekday.textContent = offset === 0 ? 'Hoje' : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const day = document.createElement('strong');
    day.textContent = String(date.getDate()).padStart(2, '0');
    const month = document.createElement('span');
    month.textContent = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    chip.append(weekday, day, month);
    chip.addEventListener('click', () => {
      booking.date = iso;
      booking.time = null;
      container.querySelectorAll('.date-chip').forEach(item => item.classList.toggle('selected', item === chip));
      refreshNextState();
      loadAvailableSlots(iso);
    });
    container.appendChild(chip);
    if (offset === 0) chip.click();
  }
}

async function loadAvailableSlots(targetDate) {
  const requestId = ++booking.slotRequest;
  const container = document.getElementById('time-slots');
  const empty = document.getElementById('no-slots-message');
  container.replaceChildren();
  empty.hidden = true;
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-label', 'Carregando horários');
  loading.appendChild(spinner);
  container.appendChild(loading);
  try {
    const params = new URLSearchParams({ barber_id: booking.barber.id, target_date: targetDate, service_id: booking.service.id });
    const slots = await api.get(`/appointments/available-slots?${params}`);
    if (requestId !== booking.slotRequest) return;
    container.replaceChildren();
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
        booking.time = slot;
        container.querySelectorAll('.time-slot').forEach(item => item.classList.toggle('selected', item === button));
        refreshNextState();
      });
      container.appendChild(button);
    });
  } catch (error) {
    if (requestId !== booking.slotRequest) return;
    container.replaceChildren();
    empty.hidden = false;
    empty.textContent = error.message || 'Não foi possível buscar os horários.';
  }
}

function renderBookingSummary() {
  const summary = document.getElementById('booking-summary');
  summary.replaceChildren();
  const values = [
    ['Serviço', booking.service.name],
    ['Profissional', booking.barber.name],
    ['Data', formatDateFull(booking.date)],
    ['Horário', booking.time],
    ['Duração', `${booking.service.duration_minutes} min`],
  ];
  values.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    const name = document.createElement('span');
    name.textContent = label;
    const detail = document.createElement('strong');
    detail.textContent = value;
    item.append(name, detail);
    summary.appendChild(item);
  });
  const total = document.createElement('div');
  total.className = 'summary-total';
  const label = document.createElement('span');
  label.textContent = 'Valor';
  const amount = document.createElement('strong');
  amount.textContent = formatCurrency(booking.service.price);
  total.append(label, amount);
  summary.appendChild(total);
}

async function submitBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = document.getElementById('confirm-booking');
  button.disabled = true;
  button.textContent = 'Confirmando…';
  const payload = {
    service_id: booking.service.id,
    barber_id: booking.barber.id,
    date: booking.date,
    start_time: booking.time,
    client_name: document.getElementById('client-name').value.trim(),
    client_phone: document.getElementById('client-phone').value.trim(),
  };
  try {
    const result = await api.post('/appointments', payload);
    sessionStorage.setItem('gama_last_booking', JSON.stringify(result));
    window.location.href = 'confirmation.html';
  } catch (error) {
    showToast(error.message || 'Não foi possível confirmar. Escolha outro horário.', 'error');
    if (error.message.toLowerCase().includes('horário')) {
      booking.time = null;
      await loadAvailableSlots(booking.date);
    }
    button.disabled = false;
    button.textContent = 'Confirmar agendamento ↗';
  }
}
