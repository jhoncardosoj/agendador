/* main.js
   - Carrega serviços & slots (localStorage)
   - Reserva slot ao confirmar
   - Gera link WhatsApp
   - Notificação local (admin polling via localStorage)
*/

const STORAGE = { SLOTS: 'bp_slots_v1', BOOKINGS: 'bp_bookings_v1', SERVICES: 'bp_services_v1', LAST_COUNT: 'bp_last_count_v1' };
const DEFAULT_WHATSAPP = '5599999999999'; // **mude para seu número (DDDNÚMERO)**

function loadOr(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveOr(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// init defaults
if (!loadOr(STORAGE.SERVICES, null)) {
  saveOr(STORAGE.SERVICES, ['Corte Premium', 'Corte Navalhado', 'Barba Deluxe', 'Combo Corte + Barba']);
}
if (!loadOr(STORAGE.SLOTS, null)) {
  const slots = []; const now = new Date();
  for (let d = 1; d <= 7; d++) {
    const day = new Date(now); day.setDate(now.getDate() + d);
    const dateStr = day.toISOString().slice(0, 10);
    ['09:00', '10:30', '13:00', '15:30', '17:00'].forEach(t => slots.push({ id: dateStr + '-' + t, date: dateStr, time: t }));
  }
  saveOr(STORAGE.SLOTS, slots);
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // populate services & slots on booking page
  const svc = document.getElementById('service');
  if (svc) {
    const services = loadOr(STORAGE.SERVICES, []);
    services.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; svc.appendChild(o); });
    populateSlots();
    setupBookingForm();
    loadMyBookings();
  }

  // fade-in observe
  const fadeEls = document.querySelectorAll('.fade-in');
  const obs = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); }); }, { threshold: 0.12 });
  fadeEls.forEach(e => obs.observe(e));

  // admin notification sound trigger for browser notifications
  if (window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
  // keep last count
  if (!localStorage.getItem(STORAGE.LAST_COUNT)) localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS, []).length));
  setInterval(checkNewBookings, 2000);
});

// populate slots
function populateSlots() {
  const wrap = document.getElementById('slots'); if (!wrap) return;
  wrap.innerHTML = '';
  const slots = loadOr(STORAGE.SLOTS, []);
  if (!slots.length) { wrap.textContent = 'Sem horários disponíveis.'; return; }
  slots.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'slot'; b.dataset.id = s.id; b.textContent = s.date + ' ⏱ ' + s.time;
    b.addEventListener('click', () => { document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); });
    wrap.appendChild(b);
  });
}

// booking form
function setupBookingForm() {
  const form = document.getElementById('bookingForm'); if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const service = document.getElementById('service').value;
    const notes = document.getElementById('notes').value.trim();
    const sel = document.querySelector('.slot.selected');
    if (!name || !service || !sel) { showMsg('Preencha nome, serviço e escolha um horário.'); return; }
    const slotId = sel.dataset.id;
    const [date, time] = slotId.split('-').slice(0, 2);
    const bookings = loadOr(STORAGE.BOOKINGS, []);
    const id = Date.now().toString(36);
    bookings.push({ id, name, phone, service, date, time, notes, created: new Date().toISOString() });
    saveOr(STORAGE.BOOKINGS, bookings);
    // remove slot
    let slots = loadOr(STORAGE.SLOTS, []);
    slots = slots.filter(s => s.id !== slotId);
    saveOr(STORAGE.SLOTS, slots);
    populateSlots(); loadMyBookings(); showMsg('Agendamento confirmado!');
    // update last count for admin
    const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
    // prepare whatsapp button
    const waBtn = document.getElementById('waBtn');
    const number = phone.length >= 8 ? phone : DEFAULT_WHATSAPP;
    const msg = `Olá! Gostaria de confirmar meu agendamento.%0A%0ANome: ${encodeURIComponent(name)}%0AServiço: ${encodeURIComponent(service)}%0AData: ${date}%0AHorário: ${time}%0AObservações: ${encodeURIComponent(notes)}`;
    if (waBtn) waBtn.href = `https://wa.me/${number}?text=${msg}`;
    // play sound
    const sfx = document.getElementById('notifSound'); if (sfx) sfx.play().catch(()=>{});
    form.reset();
  });

  // export
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(loadOr(STORAGE.BOOKINGS, []), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'agendamentos.json'; a.click(); URL.revokeObjectURL(url);
  });
}

function loadMyBookings() {
  const list = document.getElementById('myBookings'); if (!list) return; list.innerHTML = '';
  loadOr(STORAGE.BOOKINGS, []).forEach(b => {
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(b.service)} <br><span class="muted">${b.date} ${b.time}</span></div>
                    <div><button class="btn ghost" onclick="cancelBooking('${b.id}')">Cancelar</button></div>`;
    list.appendChild(li);
  });
}

function cancelBooking(id) {
  if (!confirm('Cancelar este agendamento?')) return;
  let bookings = loadOr(STORAGE.BOOKINGS, []);
  const bk = bookings.find(b => b.id === id);
  bookings = bookings.filter(b => b.id !== id);
  saveOr(STORAGE.BOOKINGS, bookings);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS, []);
  slots.push({ id: bk.date + '-' + bk.time, date: bk.date, time: bk.time });
  saveOr(STORAGE.SLOTS, slots);
  populateSlots(); loadMyBookings();
  showMsg('Agendamento cancelado.');
}

function showMsg(txt) { const el = document.getElementById('msg'); if (!el) return; el.textContent = txt; setTimeout(() => { el.textContent = ''; }, 3500); }

// notifications for admin (polling localStorage)
function checkNewBookings() {
  const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
  const bookings = loadOr(STORAGE.BOOKINGS, []);
  if (bookings.length > last) {
    const news = bookings.slice(last);
    news.forEach(b => {
      // browser notification
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Novo agendamento', { body: `${b.name} — ${b.service} ${b.date} ${b.time}` });
      }
      // visual floating notif in admin page
      const floating = document.getElementById('floatingNotif');
      if (floating) { floating.textContent = `Novo agendamento: ${b.name} — ${b.service}`; floating.classList.add('show'); floating.style.display = 'block';
        setTimeout(() => { floating.classList.remove('show'); floating.style.display = 'none'; }, 4500);
      }
      // admin sound if present
      const adminS = document.getElementById('adminSound'); if (adminS) adminS.play().catch(()=>{});
    });
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
  }
}

// small utils
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }
