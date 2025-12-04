// main.js - booking flow + notifications + localStorage management
const STORAGE = { SLOTS: 'bp_slots_v1', BOOKINGS: 'bp_bookings_v1', SERVICES: 'bp_services_v1', BARBERS: 'bp_barbers_v1', LAST_COUNT: 'bp_last_count_v1' };
const DEFAULT_WHATSAPP = '5599999999999'; // <--- Troque para seu número se quiser fallback

function loadOr(key, def){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
function saveOr(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// defaults
if(!loadOr(STORAGE.BARBERS, null)){
  saveOr(STORAGE.BARBERS, [{ id: 'rafael', name: 'Rafael Santos', phone: '5599999999999' }]);
}
if(!loadOr(STORAGE.SERVICES, null)){
  saveOr(STORAGE.SERVICES, ['Corte Premium', 'Corte Navalhado', 'Barba Deluxe', 'Combo Corte + Barba']);
}
if(!loadOr(STORAGE.SLOTS, null)){
  const slots = []; const now = new Date();
  for(let d=1; d<=7; d++){
    const day = new Date(now); day.setDate(now.getDate()+d);
    const dateStr = day.toISOString().slice(0,10);
    ['09:00','10:30','13:00','15:30','17:00'].forEach(t => slots.push({ id: `${dateStr}-${t}-rafael`, date: dateStr, time: t, barberId: 'rafael' }));
  }
  saveOr(STORAGE.SLOTS, slots);
}

document.addEventListener('DOMContentLoaded', () => {
  populateBookingPage();
  const fadeEls = document.querySelectorAll('.fade-in');
  const obs = new IntersectionObserver(entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.12 });
  fadeEls.forEach(e => obs.observe(e));

  if(!localStorage.getItem(STORAGE.LAST_COUNT)) localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS,[]).length));
  if(window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') Notification.requestPermission();
  setInterval(checkNewBookings, 2000);
});

function populateBookingPage(){
  // barbers select
  const barberSel = document.getElementById('barber');
  const svcSel = document.getElementById('service');
  if(barberSel){
    barberSel.innerHTML = '';
    loadOr(STORAGE.BARBERS, []).forEach(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.name; barberSel.appendChild(o); });
    barberSel.addEventListener('change', populateSlots);
  }
  if(svcSel){
    svcSel.innerHTML = '';
    loadOr(STORAGE.SERVICES, []).forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; svcSel.appendChild(o); });
  }
  populateSlots();
  setupBookingForm();
  loadMyBookings();
}

function populateSlots(){
  const wrap = document.getElementById('slots'); if(!wrap) return;
  wrap.innerHTML = '';
  const barberId = document.getElementById('barber') ? document.getElementById('barber').value : null;
  const slots = loadOr(STORAGE.SLOTS, []).filter(s => !barberId || s.barberId === barberId);
  if(slots.length === 0){ wrap.textContent = 'Sem horários disponíveis.'; return; }
  slots.forEach(s => {
    const b = document.createElement('button'); b.type='button'; b.className='slot'; b.dataset.id = s.id; b.textContent = `${s.date} ⏱ ${s.time}`;
    b.addEventListener('click', () => { document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected')); b.classList.add('selected'); });
    wrap.appendChild(b);
  });
}

function setupBookingForm(){
  const form = document.getElementById('bookingForm'); if(!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const barberId = document.getElementById('barber').value;
    const service = document.getElementById('service').value;
    const notes = document.getElementById('notes').value.trim();
    const sel = document.querySelector('.slot.selected'); if(!name || !service || !sel){ showMsg('Preencha nome, selecione barbeiro, serviço e horário.'); return; }
    const slotId = sel.dataset.id;
    const idParts = slotId.split('-'); const date = idParts[0]; const time = idParts[1];
    const bookings = loadOr(STORAGE.BOOKINGS, []);
    const id = Date.now().toString(36);
    const bobj = { id, name, phone, barberId, service, date, time, notes, created: new Date().toISOString() };
    bookings.push(bobj); saveOr(STORAGE.BOOKINGS, bookings);
    // remove slot
    let slots = loadOr(STORAGE.SLOTS, []); slots = slots.filter(s => s.id !== slotId); saveOr(STORAGE.SLOTS, slots);
    populateSlots(); loadMyBookings(); showMsg('Agendamento confirmado!');
    // update last count for admin
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
    // send whatsapp to barber and optionally client
    const barber = loadOr(STORAGE.BARBERS, []).find(x => x.id === barberId);
    const barberPhone = barber && barber.phone ? barber.phone : DEFAULT_WHATSAPP;
    const text = `Olá! Novo agendamento:%0ANome: ${encodeURIComponent(name)}%0AServiço: ${encodeURIComponent(service)}%0AData: ${date}%0AHora: ${time}%0AObservações: ${encodeURIComponent(notes)}`;
    window.open(`https://wa.me/${barberPhone}?text=${text}`, '_blank');
    if(phone && phone.length >= 8) window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    // play sound
    const sfx = document.getElementById('notifSound'); if(sfx) sfx.play().catch(()=>{});
    form.reset();
  });

  const exportBtn = document.getElementById('exportBtn'); if(exportBtn) exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(loadOr(STORAGE.BOOKINGS, []), null, 2);
    const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='agendamentos.json'; a.click(); URL.revokeObjectURL(url);
  });
}

function loadMyBookings(){
  const ul = document.getElementById('myBookings'); if(!ul) return; ul.innerHTML='';
  loadOr(STORAGE.BOOKINGS, []).forEach(b => {
    const barber = loadOr(STORAGE.BARBERS, []).find(x => x.id === b.barberId);
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(b.service)} <br><span class="muted">${b.date} ${b.time} • ${barber ? barber.name : ''}</span></div>
                    <div><button class="btn ghost" onclick="cancelBooking('${b.id}')">Cancelar</button></div>`;
    ul.appendChild(li);
  });
}

function cancelBooking(id){
  if(!confirm('Cancelar este agendamento?')) return;
  let bookings = loadOr(STORAGE.BOOKINGS, []); const bk = bookings.find(b => b.id === id);
  bookings = bookings.filter(b => b.id !== id); saveOr(STORAGE.BOOKINGS, bookings);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS, []); slots.push({ id: `${bk.date}-${bk.time}-${bk.barberId}`, date: bk.date, time: bk.time, barberId: bk.barberId }); saveOr(STORAGE.SLOTS, slots);
  populateSlots(); loadMyBookings(); showMsg('Agendamento cancelado.');
}

function showMsg(txt){ const el = document.getElementById('msg'); if(!el) return; el.textContent = txt; setTimeout(()=> el.textContent = '', 3500); }

function checkNewBookings(){
  const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
  const bookings = loadOr(STORAGE.BOOKINGS, []);
  if(bookings.length > last){
    const newOnes = bookings.slice(last);
    newOnes.forEach(b => {
      // browser notification
      if(window.Notification && Notification.permission === 'granted') new Notification('Novo agendamento', { body: `${b.name} — ${b.service} ${b.date} ${b.time}` });
      // floating visual (shown in admin page)
      const floating = document.getElementById('floatingNotif'); if(floating){ floating.textContent = `Novo agendamento: ${b.name} — ${b.service}`; floating.classList.add('show'); floating.style.display='block'; setTimeout(()=>{ floating.classList.remove('show'); floating.style.display='none'; }, 4000); }
      // admin sound
      const adminS = document.getElementById('adminSound'); if(adminS) adminS.play().catch(()=>{});
    });
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
