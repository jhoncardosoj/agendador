/* main.js — Booking logic (Ultra Professional) */
const STORAGE = {
  BARBERS: 'lux_barbers_v1',
  SERVICES: 'lux_services_v1',
  SLOTS: 'lux_slots_v1',
  BOOKINGS: 'lux_bookings_v1',
  LAST_COUNT: 'lux_last_count_v1'
};
const WHATSAPP_DEFAULT = '5599999999999'; // <-- Troque aqui pelo número do barber/loja

function loadOr(k, def){ try{ const v = localStorage.getItem(k); return v? JSON.parse(v): def } catch { return def } }
function saveOr(k,v){ localStorage.setItem(k, JSON.stringify(v)) }

// default data (first run)
if(!loadOr(STORAGE.BARBERS, null)){
  saveOr(STORAGE.BARBERS, [
    { id:'rafael', name:'Rafael Santos', phone: WHATSAPP_DEFAULT },
    { id:'marco', name:'Marcos Oliveira', phone: WHATSAPP_DEFAULT }
  ]);
}
if(!loadOr(STORAGE.SERVICES, null)){
  saveOr(STORAGE.SERVICES, [
    { id:'corte_premium', name:'Corte Premium', duration: 45, price: 60 },
    { id:'barba_deluxe', name:'Barba Deluxe', duration: 30, price: 35 },
    { id:'combo', name:'Combo Corte + Barba', duration: 75, price: 90 }
  ]);
}
// For slots we maintain basic available times per barber (id format: date-time-barber)
if(!loadOr(STORAGE.SLOTS, null)){
  // create next 7 days 09:00..17:00 slots template for each barber (each slot start)
  const slots=[];
  const now = new Date();
  for(let d=1; d<=14; d++){
    const day = new Date(now); day.setDate(now.getDate()+d);
    const dateStr = day.toISOString().slice(0,10);
    const times = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
    loadOr(STORAGE.BARBERS, []).forEach(b=>{
      times.forEach(t=> slots.push({ id:`${dateStr}-${t}-${b.id}`, date:dateStr, time:t, barberId:b.id }));
    });
  }
  saveOr(STORAGE.SLOTS, slots);
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderHome();
  setupBookingUI();
  if(!localStorage.getItem(STORAGE.LAST_COUNT)) localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS,[]).length));
  // ask permission for notifications
  if('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') Notification.requestPermission();
  setInterval(checkNewBookings, 2000);
});

/* RENDER HOME SERVICES & BARBERS */
function renderHome(){
  const services = loadOr(STORAGE.SERVICES,[]);
  const barbers = loadOr(STORAGE.BARBERS,[]);
  const homeServices = document.getElementById('homeServices');
  const homeBarbers = document.getElementById('homeBarbers');
  if(homeServices){
    homeServices.innerHTML = services.map(s=>`<div class="service"><strong>${s.name}</strong><div class="muted">${s.duration} min — R$ ${s.price}</div></div>`).join('');
  }
  if(homeBarbers){
    homeBarbers.innerHTML = barbers.map(b=>`<div class="barber"><strong>${b.name}</strong><div class="muted">${b.phone}</div></div>`).join('');
  }
  const whatsHome = document.getElementById('whatsHome');
  if(whatsHome) whatsHome.href = `https://wa.me/${WHATSAPP_DEFAULT}?text=${encodeURIComponent('Olá, gostaria de informações sobre agendamentos')}`;
}

/* BOOKING UI */
function setupBookingUI(){
  const selBarber = document.getElementById('selectBarber');
  const selService = document.getElementById('selectService');
  const dateEl = document.getElementById('selectDate');
  if(selBarber){
    selBarber.innerHTML = loadOr(STORAGE.BARBERS,[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
    selBarber.addEventListener('change', ()=> populateSlots());
  }
  if(selService){
    selService.innerHTML = loadOr(STORAGE.SERVICES,[]).map(s=>`<option value="${s.id}">${s.name} — ${s.duration}m</option>`).join('');
  }
  if(dateEl){
    dateEl.addEventListener('change', ()=> populateSlots());
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    dateEl.value = tomorrow.toISOString().slice(0,10);
  }
  populateSlots();
  document.getElementById('btnBook').addEventListener('click', handleBooking);
  document.getElementById('btnBookWhats').addEventListener('click', handleWhats);
  renderMyBookings();
}

/* Populate available slots computed by checking service duration and existing bookings */
function populateSlots(){
  const wrap = document.getElementById('slotsWrap');
  if(!wrap) return;
  wrap.innerHTML = '';
  const selectedDate = document.getElementById('selectDate').value;
  const barberId = document.getElementById('selectBarber').value;
  const serviceId = document.getElementById('selectService').value;
  if(!selectedDate || !barberId || !serviceId){ wrap.textContent = 'Escolha barbeiro, serviço e data'; return; }

  const service = loadOr(STORAGE.SERVICES,[]).find(s=>s.id===serviceId);
  const slots = loadOr(STORAGE.SLOTS,[]).filter(s=>s.date===selectedDate && s.barberId===barberId);
  // existing bookings for that barber/date
  const bookings = loadOr(STORAGE.BOOKINGS,[]).filter(b => b.barberId===barberId && b.date===selectedDate);

  // convert time "HH:MM" -> minutes
  const toMin = t => { const [hh,mm]=t.split(':').map(Number); return hh*60+mm; };
  // service needs: duration minutes; check if slot start + duration doesn't overlap bookings
  const available = slots.filter(s=>{
    const start = toMin(s.time);
    const end = start + service.duration;
    // check against each booking: bookingStart..bookingEnd overlap?
    for(const bk of bookings){
      const bkStart = toMin(bk.time);
      const bkService = loadOr(STORAGE.SERVICES,[]).find(x=>x.id===bk.serviceId);
      const bkEnd = bkStart + (bkService?bkService.duration:30);
      if(!(end <= bkStart || start >= bkEnd)) return false; // overlap
    }
    return true;
  });

  if(available.length===0){ wrap.textContent = 'Sem horários livres para esse dia.'; return; }
  available.forEach(s=>{
    const btn = document.createElement('button');
    btn.className = 'slot'; btn.textContent = `${s.time}`; btn.dataset.id = s.id;
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected'));
      btn.classList.add('selected');
    });
    wrap.appendChild(btn);
  });
}

/* HANDLE BOOKING */
function handleBooking(){
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const barberId = document.getElementById('selectBarber').value;
  const serviceId = document.getElementById('selectService').value;
  const date = document.getElementById('selectDate').value;
  const slotBtn = document.querySelector('.slot.selected');
  const notes = document.getElementById('notes').value.trim();
  const msgEl = document.getElementById('bookingMsg');

  if(!name || !barberId || !serviceId || !date || !slotBtn){ msgEl.textContent = 'Preencha todos os campos e escolha horário.'; return; }
  const slotId = slotBtn.dataset.id;
  const time = slotId.split('-')[1];

  // Save booking
  const bookings = loadOr(STORAGE.BOOKINGS,[]);
  const id = Date.now().toString(36);
  bookings.push({ id, name, phone, barberId, serviceId, date, time, notes, status: 'confirmado', created: new Date().toISOString() });
  saveOr(STORAGE.BOOKINGS, bookings);

  // remove used slot
  let slots = loadOr(STORAGE.SLOTS,[]);
  slots = slots.filter(s=>s.id !== slotId);
  saveOr(STORAGE.SLOTS, slots);

  // update UI
  populateSlots();
  renderMyBookings();
  msgEl.textContent = 'Agendamento confirmado! Enviando notificação ao barbeiro...';

  // notify admin + service worker
  notifyAdmin(`${name} — ${serviceId} ${date} ${time}`, { bookingId: id });
  // play local sound
  const sfx = document.getElementById('notifSound'); if(sfx) sfx.play().catch(()=>{});
  // update last count
  localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS,[]).length));
}

/* send prefilled whatsapp link (barber and user if phone provided) */
function handleWhats(){
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const barberId = document.getElementById('selectBarber').value;
  const serviceId = document.getElementById('selectService').value;
  const date = document.getElementById('selectDate').value;
  const slotBtn = document.querySelector('.slot.selected');
  if(!name || !serviceId || !slotBtn) return alert('Complete nome, serviço e selecione horário');
  const time = slotBtn.dataset.id.split('-')[1];
  const text = `Olá! Confirmando agendamento:%0ANome: ${name}%0AServiço: ${serviceId}%0AData: ${date}%0AHorário: ${time}`;
  const barber = loadOr(STORAGE.BARBERS,[]).find(b=>b.id===barberId) || { phone: WHATSAPP_DEFAULT };
  window.open(`https://wa.me/${barber.phone}?text=${encodeURIComponent(text)}`, '_blank');
  if(phone && phone.length>6) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

/* RENDER BOOKINGS (user side) */
function renderMyBookings(){
  const ul = document.getElementById('myBookings'); if(!ul) return; ul.innerHTML = '';
  loadOr(STORAGE.BOOKINGS,[]).forEach(b=>{
    const service = loadOr(STORAGE.SERVICES,[]).find(s=>s.id===b.serviceId) || {};
    const barber = loadOr(STORAGE.BARBERS,[]).find(x=>x.id===b.barberId) || {};
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(service.name||b.serviceId)} • ${escapeHtml(b.date)} ${escapeHtml(b.time)} • ${escapeHtml(barber.name||'') } 
      <button class="btn-ghost small" onclick="cancelBooking('${b.id}')">Cancelar</button>`;
    ul.appendChild(li);
  });
}

/* cancel booking */
function cancelBooking(id){
  if(!confirm('Confirma cancelamento?')) return;
  let bookings = loadOr(STORAGE.BOOKINGS,[]);
  const bk = bookings.find(b=>b.id===id);
  bookings = bookings.filter(b=>b.id!==id);
  saveOr(STORAGE.BOOKINGS, bookings);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS,[]); slots.push({ id:`${bk.date}-${bk.time}-${bk.barberId}`, date:bk.date, time:bk.time, barberId:bk.barberId }); saveOr(STORAGE.SLOTS, slots);
  renderMyBookings();
}

/* Notify admin (page & service worker) */
function notifyAdmin(body, extra){
  // Browser Notification
  if('Notification' in window && Notification.permission === 'granted'){
    new Notification('Novo agendamento', { body, icon: '/static/icons/icon-192.png' });
  }
  // Service worker notification
  if(navigator.serviceWorker && navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({ type:'SHOW_NOTIFICATION', title:'Novo agendamento', body, extra });
  } else if(navigator.serviceWorker && navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(reg=>{
      reg.active && reg.active.postMessage({ type:'SHOW_NOTIFICATION', title:'Novo agendamento', body, extra });
    });
  }
  // floating UI notification if admin page open will pick up via polling
}

/* check new bookings every 2s and trigger notification if new */
function checkNewBookings(){
  const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
  const bookings = loadOr(STORAGE.BOOKINGS, []);
  if(bookings.length > last){
    const newOnes = bookings.slice(last);
    newOnes.forEach(b=>{
      const s = loadOr(STORAGE.SERVICES,[]).find(x=>x.id===b.serviceId);
      notifyAdmin(`${b.name} - ${s? s.name: b.serviceId} ${b.date} ${b.time}`, { bookingId: b.id });
      // play sound (if admin has page open)
      const sound = document.getElementById('notifSound'); if(sound) sound.play().catch(()=>{});
    });
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
