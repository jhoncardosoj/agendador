/* main.js — booking logic using Firestore to sync */
const WHATSAPP_DEFAULT = '5599999999999'; // <- TROQUE para seu número (DDDNÚMERO)
const fb = window._fb;
const firestore = fb.firestore;

function loadOr(key, def){ try{ const v = localStorage.getItem(key); return v? JSON.parse(v): def }catch{return def} }
function saveOr(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// Setup UI on DOMContentLoaded
document.addEventListener('DOMContentLoaded', ()=>{
  renderHomeData();
  setupBookingUI();
});

function renderHomeData(){
  // render services and barbers from Firestore-like local defaults if needed
  // we use localStorage for initial data to avoid requiring console setup
  if(!loadOr('lux_services_v1', null)){
    saveOr('lux_services_v1', [
      { id:'corte_premium', name:'Corte Premium', duration:45, price:60 },
      { id:'barba_deluxe', name:'Barba Deluxe', duration:30, price:35 },
      { id:'combo', name:'Combo Corte + Barba', duration:75, price:90 }
    ]);
  }
  if(!loadOr('lux_barbers_v1', null)){
    saveOr('lux_barbers_v1', [
      { id:'rafael', name:'Rafael Santos', phone: WHATSAPP_DEFAULT }
    ]);
  }
  // copy into Firestore-like storage if Firestore is empty — (optional, prefer managing via admin)
  // Render UI
  const services = loadOr('lux_services_v1',[]);
  const barbers = loadOr('lux_barbers_v1',[]);
  const homeServices = document.getElementById('homeServices');
  const homeBarbers = document.getElementById('homeBarbers');
  if(homeServices) homeServices.innerHTML = services.map(s=>`<div class="service"><strong>${s.name}</strong><div class="muted">${s.duration} min — R$${s.price}</div></div>`).join('');
  if(homeBarbers) homeBarbers.innerHTML = barbers.map(b=>`<div class="barber"><strong>${b.name}</strong><div class="muted">${b.phone}</div></div>`).join('');
  const whatsHome = document.getElementById('whatsHome');
  if(whatsHome) whatsHome.href = `https://wa.me/${WHATSAPP_DEFAULT}?text=${encodeURIComponent('Olá, gostaria de informações sobre agendamentos')}`;
}

/* Booking UI */
function setupBookingUI(){
  const selBarber = document.getElementById('selectBarber');
  const selService = document.getElementById('selectService');
  const dateEl = document.getElementById('selectDate');

  const barbers = loadOr('lux_barbers_v1',[]);
  const services = loadOr('lux_services_v1',[]);
  if(selBarber) selBarber.innerHTML = barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  if(selService) selService.innerHTML = services.map(s=>`<option value="${s.id}">${s.name} — ${s.duration}m</option>`).join('');

  if(dateEl){
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+1);
    dateEl.value = tomorrow.toISOString().slice(0,10);
    dateEl.addEventListener('change', populateSlots);
  }
  if(selBarber) selBarber.addEventListener('change', populateSlots);

  populateSlots();
  document.getElementById('btnBook').addEventListener('click', handleBooking);
  document.getElementById('btnBookWhats').addEventListener('click', handleWhats);
  renderMyBookings();
}

/* compute available slots (from localStorage slots collection) */
function populateSlots(){
  const wrap = document.getElementById('slotsWrap');
  wrap.innerHTML = '';
  const selectedDate = document.getElementById('selectDate').value;
  const barberId = document.getElementById('selectBarber').value;
  const serviceId = document.getElementById('selectService').value;
  if(!selectedDate || !barberId || !serviceId){ wrap.textContent = 'Escolha barbeiro, serviço e data'; return; }

  // slots stored in Firestore? For simplicity we use localStorage slots 'lux_slots_v1'
  let slots = loadOr('lux_slots_v1',[]);
  if(!slots.length){
    // generate template next 7 days for the barber if empty
    const now = new Date();
    for(let d=1; d<=14; d++){
      const day = new Date(now); day.setDate(now.getDate()+d);
      const dateStr = day.toISOString().slice(0,10);
      ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'].forEach(t=>{
        loadOr('lux_barbers_v1',[]).forEach(b=>{
          slots.push({ id:`${dateStr}-${t}-${b.id}`, date:dateStr, time:t, barberId:b.id });
        })
      });
    }
    saveOr('lux_slots_v1', slots);
  }
  slots = loadOr('lux_slots_v1',[]).filter(s => s.date===selectedDate && s.barberId===barberId);
  if(slots.length===0){ wrap.textContent='Sem horários disponíveis.'; return; }
  slots.forEach(s=>{
    const btn = document.createElement('button');
    btn.className = 'slot';
    btn.textContent = s.time;
    btn.dataset.id = s.id;
    btn.addEventListener('click', ()=>{ document.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); });
    wrap.appendChild(btn);
  });
}

/* handle booking: save to Firestore collection 'bookings' and localStorage */
async function handleBooking(){
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

  // booking object
  const booking = { name, phone, barberId, serviceId, date, time, notes, status:'confirmado', created: new Date().toISOString() };

  try {
    // Save to Firestore (so admin listeners get update across devices)
    const docRef = await firestore.collection('bookings').add(booking);
    // Also remove slot from local storage slots
    let slots = loadOr('lux_slots_v1',[]);
    slots = slots.filter(s=>s.id !== slotId);
    saveOr('lux_slots_v1', slots);
    populateSlots();
    renderMyBookings();
    msgEl.textContent = 'Agendamento confirmado! Notificando o admin...';
    // notify via service worker (postMessage)
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({ type:'SHOW_NOTIFICATION', title:'Novo agendamento', body: `${name} às ${time}` });
    }
    // play local sound
    const sfx = document.getElementById('notifSound'); if(sfx) sfx.play().catch(()=>{});
  } catch(err){
    console.error(err);
    msgEl.textContent = 'Erro ao salvar agendamento. Tente novamente.';
  }
}

/* send WhatsApp prefilled */
function handleWhats(){
  const name = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  const barberId = document.getElementById('selectBarber').value;
  const slotBtn = document.querySelector('.slot.selected');
  if(!name || !slotBtn) return alert('Complete nome e selecione horário');
  const time = slotBtn.dataset.id.split('-')[1];
  const text = `Olá! Confirmando agendamento:%0ANome: ${name}%0AData: ${document.getElementById('selectDate').value}%0AHorário: ${time}`;
  const barber = loadOr('lux_barbers_v1',[]).find(b=>b.id===barberId) || { phone: WHATSAPP_DEFAULT };
  window.open(`https://wa.me/${barber.phone}?text=${encodeURIComponent(text)}`, '_blank');
}

/* render user's bookings by querying firestore for records with same phone or name (simple) */
async function renderMyBookings(){
  const ul = document.getElementById('myBookings'); if(!ul) return; ul.innerHTML='';
  try{
    const snapshot = await firestore.collection('bookings').orderBy('created','desc').limit(50).get();
    snapshot.forEach(doc=>{
      const b = doc.data();
      const li = document.createElement('li');
      const svc = loadOr('lux_services_v1',[]).find(s=>s.id===b.serviceId) || {};
      const barber = loadOr('lux_barbers_v1',[]).find(x=>x.id===b.barberId) || {};
      li.innerHTML = `<strong>${escapeHtml(b.name)}</strong> — ${escapeHtml(svc.name||b.serviceId)} • ${escapeHtml(b.date)} ${escapeHtml(b.time)} • ${escapeHtml(barber.name||'') }`;
      ul.appendChild(li);
    });
  }catch(e){ console.warn('renderMyBookings error', e); }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
