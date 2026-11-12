document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'home') loadPublicServices('services-preview', 3);
  if (page === 'services') loadPublicServices('services-list');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});

function buildServiceCard(service, index) {
  const card = document.createElement('article');
  card.className = 'service-card';

  const number = document.createElement('span');
  number.className = 'service-number';
  number.textContent = String(index + 1).padStart(2, '0');
  card.appendChild(number);

  const title = document.createElement('h3');
  title.textContent = service.name;
  card.appendChild(title);

  const duration = document.createElement('p');
  duration.className = 'service-time';
  duration.textContent = `${service.duration_minutes} min`;
  card.appendChild(duration);

  const bottom = document.createElement('div');
  bottom.className = 'service-bottom';
  const price = document.createElement('span');
  price.className = 'service-price';
  price.textContent = formatCurrency(service.price);
  bottom.appendChild(price);

  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = `booking.html?service=${encodeURIComponent(service.id)}`;
  link.textContent = 'Agendar →';
  bottom.appendChild(link);
  card.appendChild(bottom);
  return card;
}

async function loadPublicServices(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const services = await api.get('/services');
    container.replaceChildren();
    const shown = limit ? services.slice(0, limit) : services;
    if (!shown.length) {
      container.appendChild(makeEmptyState('Os serviços estarão disponíveis em breve.'));
      return;
    }
    shown.forEach((service, index) => container.appendChild(buildServiceCard(service, index)));
  } catch (error) {
    container.replaceChildren(makeEmptyState('Não foi possível carregar os serviços. Atualize a página para tentar novamente.'));
  }
}
