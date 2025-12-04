// admin.js - improved admin panel (barbers, services, slots, bookings)
const ADMIN_PWD = 'barber123@.';
const STORAGE = { SLOTS: 'bp_slots_v1', BOOKINGS: 'bp_bookings_v1', SERVICES: 'bp_services_v1', BARBERS: 'bp_barbers_v1', LAST_COUNT: 'bp_last_count_v1' };

function loadOr(key, def){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
function saveOr(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnLogin').addEventListener('click', adminLogin);
  document.getElementById('addBarber').addEventListener('click', addBarber);
  document.getElementById('addService').addEventListener('click', addService);
  document.getElementById('addSlot').addEventListener('click', addSlot);
  document.getElementById('logout').addEventListener('click', adminLogout);
  document.getElementById('exportAll').addEventListener('click', exportBookings);
  document.getElementById('clearAll').addEventListener('click', clearAll);

  renderAdminLists();
  setInterval(renderAdminLists, 2000);
  setInterval(checkLocalNewBookings, 2000); // polling to notify admin UI
});

function adminLogin(){
  const pwd = document.getElementById('pwd').value;
  if(pwd === ADMIN_PWD){
    document.getElementById('loginBox').style.display='none';
    document.getElementById('adminPanel').style.display='block';
    localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS,[]).length));
    renderAdminLists();
  } else alert('Senha incorreta');
}
function adminLogout(){ document.getElementById('pwd').value=''; document.getElementById('adminPanel').style.display='none'; document.getElementById('loginBox').style.display='block'; }

function renderAdminLists(){
  // barbers
  const bl = document.getElementById('barberList'); if(bl){ bl.innerHTML=''; loadOr(STORAGE.BARBERS,[]).forEach((b,i)=>{ const li = document.createElement('li'); li.innerHTML = `${escapeHtml(b.name)} — <span class="muted">${escapeHtml(b.phone)}</span> <div><button class="btn small ghost" onclick="removeBarber('${b.id}')">Remover</button></div>`; bl.appendChild(li); }) }
  // services
  const sl = document.getElementById('serviceList'); if(sl){ sl.innerHTML=''; loadOr(STORAGE.SERVICES,[]).forEach((s,i)=>{ const li=document.createElement('li'); li.innerHTML = `${escapeHtml(s)} <div><button class="btn small ghost" onclick="removeService(${i})">Remover</button></div>`; sl.appendChild(li); }) }
  // slotBarber select
  const slotBarber = document.getElementById('slotBarber'); if(slotBarber){ slotBarber.innerHTML=''; loadOr(STORAGE.BARBERS,[]).forEach(b=>{ const o=document.createElement('option'); o.value=b.id; o.textContent=b.name; slotBarber.appendChild(o); }); }
  // slots
  const slotList = document.getElementById('slotList'); if(slotList){ slotList.innerHTML=''; loadOr(STORAGE.SLOTS,[]).forEach(s=>{ const barber = (loadOr(STORAGE.BARBERS,[]).find(b=>b.id===s.barberId) || {}).name || ''; const li = document.createElement('li'); li.innerHTML = `${escapeHtml(s.date)} ⏱ ${escapeHtml(s.time)} • ${escapeHtml(barber)} <div><button class="btn small ghost" onclick="removeSlot('${s.id}')">Remover</button></div>`; slotList.appendChild(li); }) }
  // bookings
  const bk = document.getElementById('allBookings'); if(bk){ bk.innerHTML=''; loadOr(STORAGE.BOOKINGS,[]).forEach(b=>{ const barber = (loadOr(STORAGE.BARBERS,[]).find(x=>x.id===b.barberId)||{}).name || ''; const li=document.createElement('li'); li.innerHTML = `${escapeHtml(b.name)} — ${escapeHtml(b.service)} <span class="muted">${escapeHtml(b.date)} ${escapeHtml(b.time)} • ${escapeHtml(barber)}</span><div><button class="btn small ghost" onclick="forceCancel('${b.id}')">Cancelar</button></div>`; bk.appendChild(li); }) }
  // badge
  const badge = document.getElementById('notifBadge'); if(badge) badge.textContent = loadOr(STORAGE.BOOKINGS,[]).length;
}

function addBarber(){
  const name = document.getElementById('newBarberName').value.trim(); const phone = document.getElementById('newBarberPhone').value.trim();
  if(!name || !phone) return alert('Informe nome e WhatsApp do barbeiro');
  // generate id (safe)
  const id = name.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now().toString(36);
  const arr = loadOr(STORAGE.BARBERS, []); arr.push({ id, name, phone }); saveOr(STORAGE.BARBERS, arr);
  document.getElementById('newBarberName').value = ''; document.getElementById('newBarberPhone').value = ''; renderAdminLists();
}
function removeBarber(id){
  if(!confirm('Remover barbeiro? Todos os slots associados serão removidos.')) return;
  let arr = loadOr(STORAGE.BARBERS, []); arr = arr.filter(x => x.id !== id); saveOr(STORAGE.BARBERS, arr);
  let slots = loadOr(STORAGE.SLOTS, []); slots = slots.filter(s => s.barberId !== id); saveOr(STORAGE.SLOTS, slots);
  renderAdminLists();
}

function addService(){ const v = document.getElementById('newService').value.trim(); if(!v) return; const s = loadOr(STORAGE.SERVICES, []); s.push(v); saveOr(STORAGE.SERVICES, s); document.getElementById('newService').value = ''; renderAdminLists(); }
function removeService(i){ const s = loadOr(STORAGE.SERVICES, []); s.splice(i,1); saveOr(STORAGE.SERVICES, s); renderAdminLists(); }

function addSlot(){
  const barberId = document.getElementById('slotBarber').value; const d = document.getElementById('slotDate').value; const t = document.getElementById('slotTime').value;
  if(!barberId || !d || !t) return alert('Escolha barbeiro, data e hora');
  const id = `${d}-${t}-${barberId}`;
  const arr = loadOr(STORAGE.SLOTS, []); if(arr.some(x => x.id === id)) return alert('Horário já existe');
  arr.push({ id, date: d, time: t, barberId }); saveOr(STORAGE.SLOTS, arr); renderAdminLists();
}
function removeSlot(id){ let s = loadOr(STORAGE.SLOTS, []); s = s.filter(x => x.id !== id); saveOr(STORAGE.SLOTS, s); renderAdminLists(); }

function forceCancel(id){
  if(!confirm('Cancelar este agendamento?')) return;
  let bookings = loadOr(STORAGE.BOOKINGS, []); const bk = bookings.find(b => b.id === id);
  bookings = bookings.filter(b => b.id !== id); saveOr(STORAGE.BOOKINGS, bookings);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS, []); slots.push({ id: `${bk.date}-${bk.time}-${bk.barberId}`, date: bk.date, time: bk.time, barberId: bk.barberId }); saveOr(STORAGE.SLOTS, slots);
  renderAdminLists();
}

function exportBookings(){ const data = JSON.stringify(loadOr(STORAGE.BOOKINGS, []), null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'agendamentos_all.json'; a.click(); URL.revokeObjectURL(url); }
function clearAll(){
  if(!confirm('Tem certeza? Isso removerá TODOS os dados.')) return;
  localStorage.removeItem(STORAGE.BARBERS); localStorage.removeItem(STORAGE.SERVICES); localStorage.removeItem(STORAGE.SLOTS); localStorage.removeItem(STORAGE.BOOKINGS);
  renderAdminLists();
}

// polling for local detection of new bookings (visual + sound)
function checkLocalNewBookings(){
  const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
  const bookings = loadOr(STORAGE.BOOKINGS, []);
  if(bookings.length > last){
    bookings.slice(last).forEach(b => {
      // visual floating
      const floating = document.getElementById('floatingNotif'); if(floating){ floating.textContent = `Novo agendamento: ${b.name} — ${b.service}`; floating.classList.add('show'); floating.style.display='block'; setTimeout(()=>{ floating.classList.remove('show'); floating.style.display='none'; }, 4000); }
      // browser notification
      if(window.Notification && Notification.permission === 'granted') new Notification('Novo agendamento', { body: `${b.name} — ${b.service} ${b.date} ${b.time}` });
      // sound
      const snd = document.getElementById('adminSound'); if(snd) snd.play().catch(()=>{});
    });
    localStorage.setItem(STORAGE.LAST_COUNT, String(bookings.length));
    renderAdminLists();
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
