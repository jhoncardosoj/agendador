const STORAGE = { SLOTS: 'bp_slots_v1', BOOKINGS: 'bp_bookings_v1', SERVICES: 'bp_services_v1' };
function loadOr(key, def){try{const v=localStorage.getItem(key);return v?JSON.parse(v):def}catch(e){return def}}
function saveOr(key,val){localStorage.setItem(key,JSON.stringify(val))}
if(!loadOr(STORAGE.SERVICES,null)){saveOr(STORAGE.SERVICES,['Corte Premium','Corte Navalhado','Barba Deluxe','Combo Corte + Barba']);}
if(!loadOr(STORAGE.SLOTS,null)){
  const slots=[]; const now=new Date();
  for(let d=1;d<=7;d++){const day=new Date(now); day.setDate(now.getDate()+d);
  ['09:00','10:30','13:00','15:30','17:00'].forEach(t=>slots.push({id: day.toISOString().slice(0,10)+'-'+t,date:day.toISOString().slice(0,10),time:t}))}
  saveOr(STORAGE.SLOTS,slots);
}
document.addEventListener('DOMContentLoaded',()=>{
  const svc=document.getElementById('service'); 
  if(svc){ const services=loadOr(STORAGE.SERVICES,[]); services.forEach(s=>{const o=document.createElement('option'); o.value=s;o.textContent=s; svc.appendChild(o)}); populateSlots(); setupBookingForm(); loadMyBookings(); }
});
function populateSlots(){const slotsWrap=document.getElementById('slots'); if(!slotsWrap) return; slotsWrap.innerHTML=''; const slots=loadOr(STORAGE.SLOTS,[]); if(slots.length===0){slotsWrap.textContent='Sem horários disponíveis.'; return}
slots.forEach(s=>{const btn=document.createElement('button'); btn.type='button'; btn.className='slot'; btn.dataset.id=s.id; btn.textContent=s.date+' ⏱ '+s.time; btn.addEventListener('click',()=>{document.querySelectorAll('.slot').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); btn.dataset.selected='1'}); slotsWrap.appendChild(btn)})}
function setupBookingForm(){const form=document.getElementById('bookingForm'); if(!form) return;
form.addEventListener('submit',e=>{e.preventDefault(); const name=document.getElementById('name').value.trim(); const service=document.getElementById('service').value; const notes=document.getElementById('notes').value.trim();
const sel=document.querySelector('.slot.selected'); if(!sel){showMsg('Escolha um horário disponível.'); return}
const slotId=sel.dataset.id; const [date,time]=slotId.split('-').slice(0,2);
const bookings=loadOr(STORAGE.BOOKINGS,[]); const id=Date.now().toString(36); bookings.push({id,name,service,date,time,notes}); saveOr(STORAGE.BOOKINGS,bookings);
let slots=loadOr(STORAGE.SLOTS,[]); slots=slots.filter(s=>s.id!==slotId); saveOr(STORAGE.SLOTS,slots); populateSlots(); loadMyBookings(); showMsg('Agendamento confirmado!');
const waBtn=document.getElementById('waBtn'); if(waBtn){ const num='5599999999999'; const text=encodeURIComponent(`Olá! Quero confirmar meu agendamento.%0A%0ANome: ${name}%0AServiço: ${service}%0AData: ${date}%0AHora: ${time}%0AObservações: ${notes}`); waBtn.href=`https://wa.me/${num}?text=${text}`}
form.reset();})}
function loadMyBookings(){const list=document.getElementById('myBookings'); if(!list) return; list.innerHTML=''; const bookings=loadOr(STORAGE.BOOKINGS,[]); bookings.forEach(b=>{const li=document.createElement('li'); li.innerHTML=`<div><strong>${b.name}</strong> — ${b.service} <br><span class="muted">${b.date} ${b.time}</span></div><div><button class="btn ghost" onclick="cancelBooking('${b.id}')">Cancelar</button></div>`; list.appendChild(li)})}
function cancelBooking(id){if(!confirm('Cancelar este agendamento?')) return; let bookings=loadOr(STORAGE.BOOKINGS,[]); const bk=bookings.find(b=>b.id===id); bookings=bookings.filter(b=>b.id!==id); saveOr(STORAGE.BOOKINGS,bookings);
const slots=loadOr(STORAGE.SLOTS,[]); slots.push({id:bk.date+'-'+bk.time,date:bk.date,time:bk.time}); saveOr(STORAGE.SLOTS,slots); populateSlots(); loadMyBookings(); showMsg('Agendamento cancelado.')}
function showMsg(m){const el=document.getElementById('msg'); if(!el) return; el.textContent=m; setTimeout(()=>el.textContent='',3500)}
