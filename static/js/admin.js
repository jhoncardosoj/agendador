/* admin.js — Advanced admin panel */
const ADMIN_PASS = 'barber_admin_2025!'; // change if needed
const STORAGE = {
  BARBERS: 'lux_barbers_v1',
  SERVICES: 'lux_services_v1',
  SLOTS: 'lux_slots_v1',
  BOOKINGS: 'lux_bookings_v1',
  LAST_COUNT: 'lux_last_count_v1'
};

let sessionTimer = null;
let failCount = 0;
const MAX_FAIL = 3;
const SESSION_TIMEOUT = 1000 * 60 * 30; // 30 min

function loadOr(k,def){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch{return def} }
function saveOr(k,v){ localStorage.setItem(k, JSON.stringify(v)) }

document.addEventListener('DOMContentLoaded', ()=>{
  // login
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  document.getElementById('btnLockoutReset').addEventListener('click', ()=>{ failCount=0; alert('Tentativas resetadas');});
  // add barber/service/slots
  document.getElementById('btnAddBarber').addEventListener('click', addBarber);
  document.getElementById('btnAddService').addEventListener('click', addService);
  document.getElementById('btnAddSlot').addEventListener('click', addSlot);
  document.getElementById('btnGenerateDay').addEventListener('click', generateDaySlots);
  // export/clear
  document.getElementById('btnExport').addEventListener('click', exportBookings);
  document.getElementById('btnClearAll').addEventListener('click', clearAllData);

  // try to show admin if already authenticated
  if(sessionStorage.getItem('adminAuth') === '1') showAdmin();
  // poll for new bookings and update UI
  setInterval(()=> { renderAll(); detectNewBookings(); }, 1500);
  renderAll();
});

// LOGIN
function doLogin(){
  const pass = document.getElementById('adminPass').value;
  if(failCount >= MAX_FAIL) return alert('Conta temporariamente bloqueada. Use Reset.');
  if(pass === ADMIN_PASS){
    sessionStorage.setItem('adminAuth','1');
    failCount = 0;
    showAdmin();
    startSessionTimer();
  } else {
    failCount++;
    alert(`Senha incorreta (${failCount}/${MAX_FAIL})`);
    if(failCount >= MAX_FAIL) alert('Muitas tentativas. Reset necessário.');
  }
}
function showAdmin(){
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  renderAll();
}
function logoutAdmin(){
  sessionStorage.removeItem('adminAuth'); document.getElementById('adminPanel').classList.add('hidden'); document.getElementById('loginBox').classList.remove('hidden');
}
function startSessionTimer(){
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(()=>{ alert('Sessão expirada'); logoutAdmin(); }, SESSION_TIMEOUT);
}

// BARBERS
function renderBarbers(){
  const ul = document.getElementById('barberList'); ul.innerHTML = '';
  loadOr(STORAGE.BARBERS, []).forEach(b=> {
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(b.name)} <div class="muted">${escapeHtml(b.phone)}</div> <div><button class="btn small btn-ghost" onclick="removeBarber('${b.id}')">Remover</button></div>`;
    ul.appendChild(li);
  });
  // slotBarberSelect
  const sel = document.getElementById('slotBarberSelect'); sel.innerHTML = loadOr(STORAGE.BARBERS,[]).map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
}

function addBarber(){
  const name = document.getElementById('newBarberName').value.trim(); const phone = document.getElementById('newBarberPhone').value.trim();
  if(!name || !phone) return alert('Informe nome e telefone do barbeiro');
  const id = name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now().toString(36);
  const arr = loadOr(STORAGE.BARBERS,[]); arr.push({ id, name, phone }); saveOr(STORAGE.BARBERS, arr);
  document.getElementById('newBarberName').value=''; document.getElementById('newBarberPhone').value='';
  renderBarbers();
}
function removeBarber(id){
  if(!confirm('Remover barbeiro? Isso também removerá seus horários.')) return;
  let arr = loadOr(STORAGE.BARBERS,[]); arr = arr.filter(x=>x.id!==id); saveOr(STORAGE.BARBERS,arr);
  let slots = loadOr(STORAGE.SLOTS,[]); slots = slots.filter(s=>s.barberId!==id); saveOr(STORAGE.SLOTS, slots);
  renderAll();
}

// SERVICES
function renderServices(){
  const ul = document.getElementById('serviceList'); ul.innerHTML = '';
  loadOr(STORAGE.SERVICES,[]).forEach((s,i)=>{
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(s.name)} • ${s.duration}min • R$${s.price} <div><button class="btn small btn-ghost" onclick="removeService(${i})">Remover</button></div>`;
    ul.appendChild(li);
  });
}
function addService(){
  const name = document.getElementById('newServiceName').value.trim();
  const dur = parseInt(document.getElementById('newServiceDuration').value || '0', 10);
  if(!name || !dur) return alert('Preencha nome e duração');
  const arr = loadOr(STORAGE.SERVICES,[]); arr.push({ id: name.toLowerCase().replace(/\s+/g,'_')+'_'+Date.now().toString(36), name, duration:dur, price:0 }); saveOr(STORAGE.SERVICES, arr);
  document.getElementById('newServiceName').value=''; document.getElementById('newServiceDuration').value='';
  renderServices();
}
function removeService(i){ const arr = loadOr(STORAGE.SERVICES,[]); arr.splice(i,1); saveOr(STORAGE.SERVICES, arr); renderServices(); }

// SLOTS
function renderSlots(){
  const ul = document.getElementById('slotList'); ul.innerHTML = '';
  loadOr(STORAGE.SLOTS,[]).forEach(s=>{
    const barber = (loadOr(STORAGE.BARBERS,[]).find(b=>b.id===s.barberId)||{}).name||'';
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(s.date)} ${escapeHtml(s.time)} • ${escapeHtml(barber)} <div><button class="btn small btn-ghost" onclick="removeSlot('${s.id}')">Remover</button></div>`;
    ul.appendChild(li);
  });
}
function addSlot(){
  const barberId = document.getElementById('slotBarberSelect').value;
  const date = document.getElementById('slotDate').value;
  const time = document.getElementById('slotTime').value;
  if(!barberId || !date || !time) return alert('Escolha barbeiro, data e hora');
  const id = `${date}-${time}-${barberId}`;
  const arr = loadOr(STORAGE.SLOTS,[]); if(arr.some(x=>x.id===id)) return alert('Slot já existe');
  arr.push({ id, date, time, barberId }); saveOr(STORAGE.SLOTS, arr);
  renderSlots();
}
function removeSlot(id){ if(!confirm('Remover horário?')) return; let arr = loadOr(STORAGE.SLOTS,[]); arr = arr.filter(x=>x.id!==id); saveOr(STORAGE.SLOTS, arr); renderSlots(); }

// generate day slots
function generateDaySlots(){
  const barberId = document.getElementById('slotBarberSelect').value;
  const date = document.getElementById('slotDate').value;
  if(!barberId || !date) return alert('Selecione barber e data');
  const times = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  const arr = loadOr(STORAGE.SLOTS,[]); times.forEach(t=>{
    const id = `${date}-${t}-${barberId}`; if(!arr.some(x=>x.id===id)) arr.push({ id, date, time:t, barberId });
  }); saveOr(STORAGE.SLOTS, arr); renderSlots();
}

// BOOKINGS
function renderBookings(){
  const ul = document.getElementById('allBookings'); ul.innerHTML = '';
  const bks = loadOr(STORAGE.BOOKINGS,[]);
  bks.forEach(b=>{
    const svc = (loadOr(STORAGE.SERVICES,[]).find(s=>s.id===b.serviceId)||{}).name||b.serviceId;
    const barber = (loadOr(STORAGE.BARBERS,[]).find(x=>x.id===b.barberId)||{}).name || '';
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(b.name)} — ${escapeHtml(svc)} • ${escapeHtml(b.date)} ${escapeHtml(b.time)} • ${escapeHtml(barber)} <div><button class="btn small btn-ghost" onclick="forceCancel('${b.id}')">Cancelar</button></div>`;
    ul.appendChild(li);
  });
  document.getElementById('badgeBookings').textContent = bks.length;
}
function forceCancel(id){
  if(!confirm('Cancelar agendamento?')) return;
  let bks = loadOr(STORAGE.BOOKINGS,[]); const bk = bks.find(x=>x.id===id);
  bks = bks.filter(x=>x.id!==id); saveOr(STORAGE.BOOKINGS, bks);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS,[]); slots.push({ id:`${bk.date}-${bk.time}-${bk.barberId}`, date:bk.date, time:bk.time, barberId:bk.barberId }); saveOr(STORAGE.SLOTS, slots);
  renderAll();
}

// UTIL: export / clear
function exportBookings(){
  const data = JSON.stringify(loadOr(STORAGE.BOOKINGS,[]), null, 2);
  const blob = new Blob([data], { type:'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `agendamentos_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
}
function clearAllData(){
  if(!confirm('Remove TODOS os dados (barbers/services/slots/bookings)?')) return;
  localStorage.removeItem(STORAGE.BARBERS); localStorage.removeItem(STORAGE.SERVICES); localStorage.removeItem(STORAGE.SLOTS); localStorage.removeItem(STORAGE.BOOKINGS);
  // re-init defaults
  location.reload();
}

// render all sections
function renderAll(){
  renderBarbers();
  renderServices();
  renderSlots();
  renderBookings();
}

// detect new bookings and notify admin UI & SW
function detectNewBookings(){
  const last = parseInt(localStorage.getItem(STORAGE.LAST_COUNT) || '0', 10);
  const bks = loadOr(STORAGE.BOOKINGS,[]);
  if(bks.length > last){
    const newOnes = bks.slice(last);
    newOnes.forEach(b=>{
      const text = `${b.name} — ${b.date} ${b.time}`;
      // floating UI
      const fl = document.getElementById('floatingNotif'); if(fl){ fl.textContent = `Novo: ${text}`; fl.style.display = 'block'; setTimeout(()=> fl.style.display='none', 4000); }
      // sound
      const snd = document.getElementById('adminSound'); if(snd) snd.play().catch(()=>{});
      // service worker notification
      if(navigator.serviceWorker && navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({ type:'SHOW_NOTIFICATION', title:'Novo agendamento', body: text });
      }
    });
    localStorage.setItem(STORAGE.LAST_COUNT, String(bks.length));
    renderAll();
  }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
