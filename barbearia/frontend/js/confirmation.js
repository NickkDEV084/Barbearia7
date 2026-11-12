document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('gama_last_booking');
  const details = document.getElementById('confirmation-details');
  if (!raw) {
    details.appendChild(makeEmptyState('Não encontramos este agendamento nesta sessão. Volte ao início para consultar ou fazer uma nova reserva.'));
    document.getElementById('whatsapp-share').hidden = true;
    document.getElementById('save-calendar').hidden = true;
    return;
  }
  const appointment = JSON.parse(raw);
  if (appointment.status === 'confirmed') {
    document.getElementById('confirmation-title').textContent = 'Seu horário está confirmado.';
    document.getElementById('confirmation-message').textContent = 'Salve os detalhes ou envie uma mensagem para ter tudo à mão.';
  }
  const rows = [
    ['Serviço', appointment.service.name],
    ['Profissional', appointment.barber.name],
    ['Dia', formatDateFull(appointment.date)],
    ['Horário', `${appointment.start_time} — ${appointment.end_time}`],
    ['Nome', appointment.client.name],
    ['Valor', formatCurrency(appointment.service.price)],
  ];
  rows.forEach(([label, value]) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    const key = document.createElement('span');
    key.textContent = label;
    const content = document.createElement('strong');
    content.textContent = value;
    item.append(key, content);
    details.appendChild(item);
  });

  const message = [
    'Oi! Enviei uma solicitação de horário no Gama Estúdio ®.',
    `Serviço: ${appointment.service.name}`,
    `Profissional: ${appointment.barber.name}`,
    `Data: ${formatDateFull(appointment.date)} às ${appointment.start_time}`,
    'Local: região 55 da Cohab',
  ].join('\n');
  document.getElementById('whatsapp-share').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  document.getElementById('save-calendar').addEventListener('click', () => downloadCalendarEvent(appointment));
});

function escapeCalendarText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function calendarDate(value, time) {
  return `${value.replaceAll('-', '')}T${time.replace(':', '')}00`;
}

function downloadCalendarEvent(appointment) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const content = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gama Estudio//Agendamentos//PT-BR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:gama-${appointment.id}@ogamaestudio`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=America/Sao_Paulo:${calendarDate(appointment.date, appointment.start_time)}`,
    `DTEND;TZID=America/Sao_Paulo:${calendarDate(appointment.date, appointment.end_time)}`,
    `SUMMARY:${escapeCalendarText(`${appointment.service.name} · Gama Estúdio`)}`,
    'LOCATION:Região 55 da Cohab',
    `DESCRIPTION:${escapeCalendarText(`Atendimento com ${appointment.barber.name}.`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gama-estudio-${appointment.date}.ics`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Arquivo de agenda pronto para salvar.');
}
