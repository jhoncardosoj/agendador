/* admin.js — listens to Firestore bookings and updates UI, shows Notification */
const ADMIN_PASS = 'barber_admin_2025!'; // change if you want
const firestore = window._fb.firestore;

let failCount = 0;
const MAX_FAIL = 3;
let unsubscribeBookings = null;

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  document.getElementById('btnLockoutReset').addEventListener('click', ()=>{ failCount=0; alert('Tentativas resetadas'); });
  document.getElementById('btnAddBarber').addEventListener('click', addBarber);
  document.getElementById('btnAddService').addEventListener('click', addService);
  document.getElementById('btnAddSlot').addEventListener('click', addSlot);
  document.getElementById('btnGenerateDay').addEventListener('click', generateDaySlots);
  document.getElementById('btnExport').addEventListener('click', exportBookings);
  document.getElementById('btnClearAll').addEventListener('click', clearAllData);
  renderAll();
});

/* AUTH */
function doLogin(){
  const pass = document.getElementById('adminPass').value;
  if(failCount >= MAX_FAIL) return alert('Conta temporariamente bloqueada. Use Reset.');
  if(pass === ADMIN_PASS){
    sessionStorage.setItem('adminAuth','1');
    showAdmin();
    subscribeBookingsRealtime();
  } else {
    failCount++;
    alert(`Senha incorreta (${failCount}/${MAX_FAIL})`);
  }
}
function showAdmin(){
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  renderAll();
}
function logoutAdmin(){
  sessionStorage.removeItem('adminAuth'); document.getElementById('adminPanel').classList.add('hidden'); document.getElementById('loginBox').classList.remove('hidden');
  if(unsubscribeBookings) unsubscribeBookings(); unsubscribeBookings = null;
}

/* Render all admin lists from localStorage defaults (editable via admin UI) */
function renderAll(){
  renderBarbers();
  renderServices();
  renderSlots();
  renderBookingsList();
}

/* BARBERS (we store locally for admin control) */
function renderBarbers(){
  const ul = document.getElementById('barberList'); ul.innerHTML='';
  const barbers = JSON.parse(localStorage.getItem('lux_barbers_v1') || '[]');
  barbers.forEach(b=>{
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(b.name)} <div class="muted">${escapeHtml(b.phone)}</div> <div><button class="btn small btn-ghost" onclick="removeBarber('${b.id}')">Remover</button></div>`;
    ul.appendChild(li);
  });
  const sel = document.getElementById('slotBarberSelect'); if(sel) sel.innerHTML = barbers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
}
function addBarber(){
  const name = document.getElementById('newBarberName').value.trim(); const phone = document.getElementById('newBarberPhone').value.trim();
  if(!name || !phone) return alert('Preencha nome e WhatsApp');
  const id = name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now().toString(36);
  const arr = JSON.parse(localStorage.getItem('lux_barbers_v1') || '[]'); arr.push({ id, name, phone }); localStorage.setItem('lux_barbers_v1', JSON.stringify(arr));
  document.getElementById('newBarberName').value=''; document.getElementById('newBarberPhone').value='';
  renderBarbers();
}
function removeBarber(id){
  if(!confirm('Remover barbeiro?')) return;
  let arr = JSON.parse(localStorage.getItem('lux_barbers_v1') || '[]'); arr = arr.filter(x=>x.id!==id); localStorage.setItem('lux_barbers_v1', JSON.stringify(arr));
  // remove slots linked
  let slots = JSON.parse(localStorage.getItem('lux_slots_v1') || '[]'); slots = slots.filter(x=>x.barberId !== id); localStorage.setItem('lux_slots_v1', JSON.stringify(slots));
  renderAll();
}

/* SERVICES */
function renderServices(){
  const ul = document.getElementById('serviceList'); ul.innerHTML='';
  const arr = JSON.parse(localStorage.getItem('lux_services_v1') || '[]');
  arr.forEach((s,i)=>{ const li = document.createElement('li'); li.innerHTML = `${escapeHtml(s.name)} • ${s.duration}min <div><button class="btn small btn-ghost" onclick="removeService(${i})">Remover</button></div>`; ul.appendChild(li); })
}
function addService(){ const name = document.getElementById('newServiceName').value.trim(); const dur = parseInt(document.getElementById('newServiceDuration').value || '0',10); if(!name||!dur) return alert('Preencha nome e duração'); const arr = JSON.parse(localStorage.getItem('lux_services_v1') || '[]'); arr.push({ id: name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now().toString(36), name, duration:dur, price:0 }); localStorage.setItem('lux_services_v1', JSON.stringify(arr)); document.getElementById('newServiceName').value=''; document.getElementById('newServiceDuration').value=''; renderServices(); }
function removeService(i){ const arr = JSON.parse(localStorage.getItem('lux_services_v1') || '[]'); arr.splice(i,1); localStorage.setItem('lux_services_v1', JSON.stringify(arr)); renderServices(); }

/* SLOTS */
function renderSlots(){ const ul = document.getElementById('slotList'); ul.innerHTML=''; const arr = JSON.parse(localStorage.getItem('lux_slots_v1') || '[]'); arr.forEach(s=>{ const barber = (JSON.parse(localStorage.getItem('lux_barbers_v1')||'[]').find(b=>b.id===s.barberId)||{}).name||''; const li = document.createElement('li'); li.innerHTML = `${escapeHtml(s.date)} ${escapeHtml(s.time)} • ${escapeHtml(barber)} <div><button class="btn small btn-ghost" onclick="removeSlot('${s.id}')">Remover</button></div>`; ul.appendChild(li); }) }
function addSlot(){ const barberId = document.getElementById('slotBarberSelect').value; const date = document.getElementById('slotDate').value; const time = document.getElementById('slotTime').value; if(!barberId||!date||!time) return alert('Escolha barber, data e hora'); const id = `${date}-${time}-${barberId}`; const arr = JSON.parse(localStorage.getItem('lux_slots_v1')||'[]'); if(arr.some(x=>x.id===id)) return alert('Slot já existe'); arr.push({ id, date, time, barberId }); localStorage.setItem('lux_slots_v1', JSON.stringify(arr)); renderSlots(); }
function removeSlot(id){ if(!confirm('Remover horário?')) return; let arr = JSON.parse(localStorage.getItem('lux_slots_v1')||'[]'); arr = arr.filter(x=>x.id !== id); localStorage.setItem('lux_slots_v1', JSON.stringify(arr)); renderSlots(); }
function generateDaySlots(){ const barberId = document.getElementById('slotBarberSelect').value; const date = document.getElementById('slotDate').value; if(!barberId||!date) return alert('Selecione barbeiro e data'); const times = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']; let arr = JSON.parse(localStorage.getItem('lux_slots_v1')||'[]'); times.forEach(t=>{ const id = `${date}-${t}-${barberId}`; if(!arr.some(x=>x.id===id)) arr.push({ id, date, time:t, barberId }); }); localStorage.setItem('lux_slots_v1', JSON.stringify(arr)); renderSlots(); }

/* BOOKINGS (admin read from Firestore realtime) */
function renderBookingsList(){ firestore.collection('bookings').orderBy('created','desc').limit(100).get().then(snapshot=>{ const ul = document.getElementById('allBookings'); ul.innerHTML=''; snapshot.forEach(doc=>{ const b = doc.data(); const svc = (JSON.parse(localStorage.getItem('lux_services_v1')||'[]').find(s=>s.id===b.serviceId)||{}).name||b.serviceId; const barber = (JSON.parse(localStorage.getItem('lux_barbers_v1')||'[]').find(x=>x.id===b.barberId)||{}).name||''; const li = document.createElement('li'); li.innerHTML = `${escapeHtml(b.name)} — ${escapeHtml(svc)} • ${escapeHtml(b.date)} ${escapeHtml(b.time)} • ${escapeHtml(barber)} <div><button class="btn small btn-ghost" onclick="forceCancel('${doc.id}')">Cancelar</button></div>`; ul.appendChild(li); }) document.getElementById('badgeBookings').textContent = (snapshot.size||0); }).catch(e=>console.warn('renderBookingsList', e)); }

function forceCancel(docId){
  if(!confirm('Cancelar esse agendamento?')) return;
  firestore.collection('bookings').doc(docId).get().then(d=>{ const data = d.data(); d.ref.delete().then(()=>{
    // restore slot locally
    const slots = JSON.parse(localStorage.getItem('lux_slots_v1')||'[]'); slots.push({ id:`${data.date}-${data.time}-${data.barberId}`, date:data.date, time:data.time, barberId:data.barberId }); localStorage.setItem('lux_slots_v1', JSON.stringify(slots));
    renderAll();
  })});
}

/* Realtime subscription: whenever new documents appear, show notification */
function subscribeBookingsRealtime(){
  if(unsubscribeBookings) unsubscribeBookings();
  unsubscribeBookings = firestore.collection('bookings').orderBy('created','desc').limit(20).onSnapshot(snapshot=>{
    snapshot.docChanges().forEach(change=>{
      if(change.type === 'added'){
        const b = change.doc.data();
        // show notification
        const text = `${b.name} — ${b.date} ${b.time}`;
        if(Notification.permission === 'granted') new Notification('Novo agendamento', { body: text });
        const fl = document.getElementById('floatingNotif'); if(fl){ fl.textContent = `Novo agendamento: ${text}`; fl.style.display='block'; setTimeout(()=>fl.style.display='none', 3500); }
        const snd = document.getElementById('adminSound'); if(snd) snd.play().catch(()=>{});
      }
    });
    renderBookingsList();
  }, err=>console.error('onSnapshot error', err));
}

/* Export/clear */
function exportBookings(){ firestore.collection('bookings').get().then(snap=>{ const arr = []; snap.forEach(d=>{ arr.push({ id:d.id, ...d.data() }) }); const blob = new Blob([JSON.stringify(arr, null, 2)], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'bookings.json'; a.click(); URL.revokeObjectURL(url); }) }
function clearAllData(){ if(!confirm('Remove todos os dados?')) return; // remove local only
  localStorage.removeItem('lux_barbers_v1'); localStorage.removeItem('lux_services_v1'); localStorage.removeItem('lux_slots_v1');
  // WARNING: Firestore removal must be done carefully; here we avoid mass deletion from client for safety.
  renderAll();
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
