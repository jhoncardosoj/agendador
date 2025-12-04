// LocalStorage keys
const STORAGE={SLOTS:'bp_slots_v1',BOOKINGS:'bp_bookings_v1',SERVICES:'bp_services_v1'};

// Helpers
function loadOr(key,def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def}catch(e){return def}}
function saveOr(key,val){localStorage.setItem(key,JSON.stringify(val))}

// Inicializar serviços
if(!loadOr(STORAGE.SERVICES,null)){saveOr(STORAGE.SERVICES,['Corte Premium','Corte Navalhado','Barba Deluxe','Combo Corte + Barba']);}

// Inicializar slots
if(!loadOr(STORAGE.SLOTS,null)){
  const slots=[]; const now=new Date();
  for(let d=1;d<=7;d++){
    const day=new Date(now); day.setDate(now.getDate()+d);
    ['09:00','10:30','13:00','15:30','17:00'].forEach(t=>{
      slots.push({id: day.toISOString().slice(0,10)+'-'+t,date:day.toISOString().slice(0,10),time:t})
    })
  }
  saveOr(STORAGE.SLOTS,slots);
}

document.addEventListener('DOMContentLoaded',()=>{
  // Serviços
  const svc=document.getElementById('service'); 
  if(svc){
    const services=loadOr(STORAGE.SERVICES,[]); 
    services.forEach(s=>{const o=document.createElement('option'); o.value=s;o.textContent=s; svc.appendChild(o)});
    populateSlots(); setupBookingForm(); loadMyBookings();
  }

  // Fade-in
  const fadeEls=document.querySelectorAll('.fade-in');
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');}})},{threshold:0.1});
  fadeEls.forEach(el=>observer.observe(el));

  // Notificações admin
  if(window.Notification && Notification.permission!=='granted' && Notification.permission!=='denied'){Notification.requestPermission();}
  setInterval(checkNewBookings,2000);
});

// Slots
function populateSlots(){
  const slotsWrap=document.getElementById('slots'); if(!slotsWrap) return; 
  slotsWrap.innerHTML=''; 
  const slots=loadOr(STORAGE.SLOTS,[]); 
  if(slots.length===0){slotsWrap.textContent='Sem horários disponíveis.'; return}
  slots.forEach(s=>{
    const btn=document.createElement('button'); btn.type='button'; btn.className='slot'; btn.dataset.id=s.id; btn.textContent=s.date+' ⏱ '+s.time;
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected');
    });
    slotsWrap.appendChild(btn)
  })
}

// Form
function setupBookingForm(){
  const form=document.getElementById('bookingForm'); if(!form) return;
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const name=document.getElementById('name').value.trim();
    const service=document.getElementById('service').value;
    const notes=document.getElementById('notes').value.trim();
    const sel=document.querySelector('.slot.selected'); if(!sel){showMsg('Escolha um horário disponível.'); return}
    const slotId=sel.dataset.id; const [date,time]=slotId.split('-').slice(0,2);
    const bookings=loadOr(STORAGE.BOOKINGS,[]); const id=Date.now().toString(36);
    bookings.push({id,name,service,date,time,notes}); saveOr(STORAGE.BOOKINGS,bookings);
    let slots=loadOr(STORAGE.SLOTS,[]); slots=slots.filter(s=>s.id!==slotId); saveOr(STORAGE.SLOTS,slots); populateSlots(); loadMyBookings(); showMsg('Agendamento confirmado!');

    // WhatsApp
    const waBtn=document.getElementById('waBtn'); if(waBtn){ const num='5599999999999'; const msg=`Olá, gostaria de agendar: ${name}, Serviço: ${service}, ${date} ${time}`; waBtn.href=`https://wa.me/${num}?text=${encodeURIComponent(msg)}`}
  })
}

// Mostrar agendamentos do usuário
function loadMyBookings(){
  const ul=document.getElementById('myBookings'); if(!ul) return; ul.innerHTML='';
  loadOr(STORAGE.BOOKINGS,[]).forEach(b=>{
    const li=document.createElement('li'); li.textContent=`${b.name} — ${b.service} ${b.date} ${b.time}`; ul.appendChild(li)
  })
}

// Mensagem
function showMsg(txt){const el=document.getElementById('msg'); if(el){el.textContent=txt; setTimeout(()=>{el.textContent=''},4000)}}

// Admin notifications
function notifyAdmin(msg){if(!window.Notification) return; if(Notification.permission==='granted'){new Notification("Novo agendamento",{body:msg})}}
function checkNewBookings(){
  const lastCount=parseInt(localStorage.getItem('bp_last_count')||0);
  const bookings=loadOr(STORAGE.BOOKINGS,[]);
  if(bookings.length>lastCount){bookings.slice(lastCount).forEach(b=>notifyAdmin(`Novo agendamento: ${b.name} - ${b.service} ${b.date} ${b.time}`)); localStorage.setItem('bp_last_count',bookings.length)}
}
