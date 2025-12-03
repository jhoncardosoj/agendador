const ADMIN_PWD='barber123@.';
document.addEventListener('DOMContentLoaded',()=>{
  const loginBtn=document.getElementById('btnLogin'); if(loginBtn) loginBtn.addEventListener('click',adminLogin);
  const addServiceBtn=document.getElementById('addService'); if(addServiceBtn) addServiceBtn.addEventListener('click',addService);
  const addSlotBtn=document.getElementById('addSlot'); if(addSlotBtn) addSlotBtn.addEventListener('click',addSlot);
  const logout=document.getElementById('logout'); if(logout) logout.addEventListener('click',adminLogout);
  renderAdminLists(); renderAllBookings();
});
function adminLogin(){const pwd=document.getElementById('pwd').value; if(pwd!==ADMIN_PWD){alert('Senha incorreta'); return} document.getElementById('loginBox').style.display='none'; document.getElementById('adminPanel').style.display='block'; renderAdminLists();}
function adminLogout(){document.getElementById('pwd').value=''; document.getElementById('adminPanel').style.display='none'; document.getElementById('loginBox').style.display='block';}
function addService(){const v=document.getElementById('newService').value.trim(); if(!v) return; const s=loadOr(STORAGE.SERVICES,[]); s.push(v); saveOr(STORAGE.SERVICES,s); document.getElementById('newService').value=''; renderAdminLists();}
function renderAdminLists(){const sl=document.getElementById('serviceList'); if(sl){sl.innerHTML=''; loadOr(STORAGE.SERVICES,[]).forEach((s,i)=>{const li=document.createElement('li'); li.innerHTML=`<div>${s}</div><div><button class="btn ghost" onclick="removeService(${i})">Remover</button></div>`; sl.appendChild(li)})}
const slotEl=document.getElementById('slotList'); if(slotEl){slotEl.innerHTML=''; loadOr(STORAGE.SLOTS,[]).forEach((s,i)=>{const li=document.createElement('li'); li.innerHTML=`<div>${s.date} ⏱ ${s.time}</div><div><button class="btn ghost" onclick="removeSlot('${s.id}')">Remover</button></div>`; slotEl.appendChild(li)})}
function removeService(i){const s=loadOr(STORAGE.SERVICES,[]); s.splice(i,1); saveOr(STORAGE.SERVICES,s); renderAdminLists();}
function addSlot(){const d=document.getElementById('slotDate').value; const t=document.getElementById('slotTime').value; if(!d||!t) return; const s=loadOr(STORAGE.SLOTS,[]); s.push({id:d+'-'+t,date:d,time:t}); saveOr(STORAGE.SLOTS,s); renderAdminLists();}
function removeSlot(id){let s=loadOr(STORAGE.SLOTS,[]); s=s.filter(x=>x.id!==id); saveOr(STORAGE.SLOTS,s); renderAdminLists();}
function renderAllBookings(){const bkEl=document.getElementById('allBookings'); if(!bkEl) return; bkEl.innerHTML=''; loadOr(STORAGE.BOOKINGS,[]).forEach(b=>{const li=document.createElement('li'); li.innerHTML=`${b.name} — ${b.service} <span class="muted">${b.date} ${b.time}</span>`; bkEl.appendChild(li)})}
function loadOr(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def}catch(e){return def}}
function saveOr(key,val){localStorage.setItem(key,JSON.stringify(val))}
