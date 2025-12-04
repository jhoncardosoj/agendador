/* admin.js
   - Login com senha barber123@.
   - Adicionar/Remover Serviços e Slots
   - Mostrar agendamentos e badge
   - Exportar / Limpar tudo
*/

const ADMIN_PWD = 'barber123@.';
const STORAGE = { SLOTS: 'bp_slots_v1', BOOKINGS: 'bp_bookings_v1', SERVICES: 'bp_services_v1', LAST_COUNT: 'bp_last_count_v1' };

function loadOr(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
function saveOr(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('btnLogin');
  if (loginBtn) loginBtn.addEventListener('click', adminLogin);
  document.getElementById('addService').addEventListener('click', addService);
  document.getElementById('addSlot').addEventListener('click', addSlot);
  document.getElementById('logout').addEventListener('click', adminLogout);
  document.getElementById('exportAll').addEventListener('click', exportBookings);
  document.getElementById('clearAll').addEventListener('click', clearAll);
  renderAdminLists();
  // polling to update lists in real time
  setInterval(renderAdminLists, 2000);
});

function adminLogin() {
  const pwd = document.getElementById('pwd').value;
  if (pwd === ADMIN_PWD) {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    // set initial last count
    localStorage.setItem(STORAGE.LAST_COUNT, String(loadOr(STORAGE.BOOKINGS, []).length));
    renderAdminLists();
  } else alert('Senha incorreta');
}

function adminLogout() {
  document.getElementById('pwd').value = '';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('loginBox').style.display = 'block';
}

function renderAdminLists() {
  // services
  const svcList = document.getElementById('serviceList'); if (svcList) {
    svcList.innerHTML = '';
    loadOr(STORAGE.SERVICES, []).forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `${escapeHtml(s)} <div><button class="btn small ghost" onclick="removeService(${i})">Remover</button></div>`;
      svcList.appendChild(li);
    });
  }
  // slots
  const slotList = document.getElementById('slotList'); if (slotList) {
    slotList.innerHTML = '';
    loadOr(STORAGE.SLOTS, []).forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `${escapeHtml(s.date)} ⏱ ${escapeHtml(s.time)} <div><button class="btn small ghost" onclick="removeSlot('${s.id}')">Remover</button></div>`;
      slotList.appendChild(li);
    });
  }
  // bookings
  const bk = document.getElementById('allBookings'); if (bk) {
    bk.innerHTML = '';
    loadOr(STORAGE.BOOKINGS, []).forEach(b => {
      const li = document.createElement('li');
      li.innerHTML = `${escapeHtml(b.name)} — ${escapeHtml(b.service)} <span class="muted">${escapeHtml(b.date)} ${escapeHtml(b.time)}</span>
      <div><button class="btn small ghost" onclick="forceCancel('${b.id}')">Cancelar</button></div>`;
      bk.appendChild(li);
    });
  }
  const badge = document.getElementById('notifBadge'); if (badge) badge.textContent = loadOr(STORAGE.BOOKINGS, []).length;
}

// services actions
function addService() {
  const v = document.getElementById('newService').value.trim();
  if (!v) return;
  const arr = loadOr(STORAGE.SERVICES, []); arr.push(v); saveOr(STORAGE.SERVICES, arr); document.getElementById('newService').value = ''; renderAdminLists();
}
function removeService(i) { const arr = loadOr(STORAGE.SERVICES, []); arr.splice(i, 1); saveOr(STORAGE.SERVICES, arr); renderAdminLists(); }

// slots actions
function addSlot() {
  const d = document.getElementById('slotDate').value; const t = document.getElementById('slotTime').value;
  if (!d || !t) return alert('Preencha data e hora');
  const arr = loadOr(STORAGE.SLOTS, []); const id = d + '-' + t;
  if (arr.some(x => x.id === id)) return alert('Horário já existe');
  arr.push({ id, date: d, time: t }); saveOr(STORAGE.SLOTS, arr); renderAdminLists();
}
function removeSlot(id) { let arr = loadOr(STORAGE.SLOTS, []); arr = arr.filter(x => x.id !== id); saveOr(STORAGE.SLOTS, arr); renderAdminLists(); }

// bookings admin
function forceCancel(id) {
  if (!confirm('Cancelar este agendamento?')) return;
  let bookings = loadOr(STORAGE.BOOKINGS, []); const bk = bookings.find(b => b.id === id);
  bookings = bookings.filter(b => b.id !== id); saveOr(STORAGE.BOOKINGS, bookings);
  // restore slot
  const slots = loadOr(STORAGE.SLOTS, []); slots.push({ id: bk.date + '-' + bk.time, date: bk.date, time: bk.time }); saveOr(STORAGE.SLOTS, slots);
  renderAdminLists();
}

// export / clear
function exportBookings() {
  const data = JSON.stringify(loadOr(STORAGE.BOOKINGS, []), null, 2);
  const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'agendamentos_all.json'; a.click(); URL.revokeObjectURL(url);
}
function clearAll() {
  if (!confirm('Tem certeza? Isso removerá TODOS os serviços, horários e agendamentos.')) return;
  localStorage.removeItem(STORAGE.SERVICES); localStorage.removeItem(STORAGE.SLOTS); localStorage.removeItem(STORAGE.BOOKINGS);
  renderAdminLists();
}

// force helper
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }
