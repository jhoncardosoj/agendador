// Admin login
const PASSWORD='barber123@.';
const loginBox=document.getElementById('loginBox');
const adminPanel=document.getElementById('adminPanel');
const btnLogin=document.getElementById('btnLogin');
btnLogin.addEventListener('click',()=>{
  const pwd=document.getElementById('pwd').value;
  if(pwd===PASSWORD){loginBox.style.display='none'; adminPanel.style.display='block'; renderAdminLists();}
  else alert('Senha incorreta');
});
document.getElementById('logout').addEventListener('click',()=>{adminPanel.style.display='none'; loginBox.style.display='block'})

// Admin data
function renderAdminLists(){
  // Serviços
  const svcList=document.getElementById('serviceList'); svcList.innerHTML='';
  loadOr(STORAGE.SERVICES,[]).forEach((s,i)=>{const li=document.createElement('li'); li.innerHTML=`${s} <button class="btn small ghost" onclick="removeService(${i})">Remover</button>`; svcList.appendChild(li)});
  
  // Slots
  const slotList=document.getElementById('slotList'); slotList.innerHTML='';
  loadOr(STORAGE.SLOTS,[]).forEach((s,i)=>{const li=document.createElement('li'); li.innerHTML=`${s.date} ⏱ ${s.time} <button class="btn small ghost" onclick="removeSlot('${s.id}')">Remover</button>`; slotList.appendChild(li)});

  // Agendamentos
  const bkEl=document.getElementById('allBookings'); bkEl.innerHTML='';
  loadOr(STORAGE.BOOKINGS,[]).forEach(b=>{const li=document.createElement('li'); li.innerHTML=`${b.name} — ${b.service} <span class="muted">${b.date} ${b.time}</span>`; bkEl.appendChild(li)});
  
  // Badge
  const badge=document.getElementById('notifBadge'); if(badge) badge.textContent=loadOr(STORAGE.BOOKINGS,[]).length;
}

// Serviços add/remove
document.getElementById('addService').addEventListener('click',()=>{
  const val=document.getElementById('newService').value.trim();
  if(!val) return;
  const s=loadOr(STORAGE.SERVICES,[]); s.push(val); saveOr(STORAGE.SERVICES,s); renderAdminLists(); document.getElementById('newService').value='';
});
function removeService(i){const s=loadOr(STORAGE.SERVICES,[]); s.splice(i,1); saveOr(STORAGE.SERVICES,s); renderAdminLists();}

// Slots add/remove
document.getElementById('addSlot').addEventListener('click',()=>{
  const d=document.getElementById('slotDate').value;
  const t=document.getElementById('slotTime').value;
  if(!d||!t) return;
  const s=loadOr(STORAGE.SLOTS,[]); s.push({id:d+'-'+t,date:d,time:t}); saveOr(STORAGE.SLOTS,s); renderAdminLists();
});
function removeSlot(id){let s=loadOr(STORAGE.SLOTS,[]); s=s.filter(x=>x.id!==id); saveOr(STORAGE.SLOTS,s); renderAdminLists();}

// Notificações visuais admin
function adminNotify(msg){
  const n=document.createElement('div'); n.className='notification show'; n.textContent=msg;
  document.body.appendChild(n); setTimeout(()=>{n.classList.remove('show'); n.remove();},4000);
}

// Detectar novos agendamentos
let lastCount=parseInt(localStorage.getItem('bp_last_count')||0);
setInterval(()=>{
  const bookings=loadOr(STORAGE.BOOKINGS,[]);
  if(bookings.length>lastCount){
    bookings.slice(lastCount).forEach(b=>adminNotify(`Novo agendamento: ${b.name} - ${b.service}`));
    lastCount=bookings.length;
    localStorage.setItem('bp_last_count',lastCount);
  }
},2000);
