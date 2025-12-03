/* app.js - agendamentos estático */
'use strict';

const STORAGE_KEY = 'maison_agenda_v1';

const form = document.getElementById('appointmentForm');
const nomeInput = document.getElementById('nome');
const servicoInput = document.getElementById('servico');
const dataInput = document.getElementById('data');
const horaInput = document.getElementById('hora');
const notasInput = document.getElementById('notas');
const appointmentsList = document.getElementById('appointments');
const noItems = document.getElementById('noItems');
const tpl = document.getElementById('tpl-appointment');
const formMsg = document.getElementById('formMsg');
const searchInput = document.getElementById('search');
const filterDate = document.getElementById('filterDate');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');
const yearSpan = document.getElementById('year');

let appointments = [];

/* utilidades */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const nowISODate = (d) => (d instanceof Date) ? d.toISOString() : new Date(d).toISOString();
const parseDateTime = (dateStr, timeStr) => {
  if(!dateStr || !timeStr) return null;
  const dt = new Date(dateStr + 'T' + timeStr);
  return isNaN(dt) ? null : dt;
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    appointments = raw ? JSON.parse(raw).map(a => ({...a, data: a.data})) : [];
  } catch (e) {
    console.error('Erro ao carregar storage', e);
    appointments = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
}

/* checa conflito: mesmo dia/hora exata */
function hasConflict(dt) {
  return appointments.some(a => {
    const aDt = new Date(a.data);
    return Math.abs(aDt.getTime() - dt.getTime()) < (30*60*1000); // conflito se menos de 30 min
  });
}

function render() {
  appointmentsList.innerHTML = '';
  const q = searchInput.value.trim().toLowerCase();
  const filter = filterDate.value;

  const now = new Date();

  const filtered = appointments
    .map(a => ({...a, dataObj: new Date(a.data)}))
    .filter(a => {
      if(q){
        if(!((a.nome||'').toLowerCase().includes(q) || (a.servico||'').toLowerCase().includes(q))) return false;
      }
      if(filter === 'upcoming') return a.dataObj >= now;
      if(filter === 'past') return a.dataObj < now;
      return true;
    })
    .sort((x,y) => x.dataObj - y.dataObj);

  if(filtered.length === 0){
    noItems.style.display = '';
    return;
  } else {
    noItems.style.display = 'none';
  }

  filtered.forEach(a => {
    const node = tpl.content.cloneNode(true);
    node.querySelector('.nome').textContent = a.nome;
    node.querySelector('.servico').textContent = ` — ${a.servico}`;
    const timeEl = node.querySelector('time.datetime');
    const dt = a.dataObj;
    const dtStr = dt.toLocaleString();
    timeEl.textContent = dtStr;
    timeEl.setAttribute('datetime', dt.toISOString());
    node.querySelector('.notas').textContent = a.notas || '';
    const delBtn = node.querySelector('.delete');
    delBtn.addEventListener('click', () => {
      if(confirm('Excluir este agendamento?')) {
        appointments = appointments.filter(x => x.id !== a.id);
        save();
        render();
      }
    });
    appointmentsList.appendChild(node);
  });
}

/* mensagens */
function showMessage(txt, ok=true) {
  formMsg.textContent = txt;
  formMsg.style.color = ok ? 'green' : '#b91c1c';
  setTimeout(()=> {
    formMsg.textContent = '';
  }, 4000);
}

/* eventos */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = nomeInput.value.trim();
  const servico = servicoInput.value;
  const data = dataInput.value;
  const hora = horaInput.value;
  const notas = notasInput.value.trim();

  if(!nome || !servico || !data || !hora){
    showMessage('Preencha todos os campos obrigatórios.', false);
    return;
  }

  const dt = parseDateTime(data, hora);
  if(!dt){
    showMessage('Data ou hora inválida.', false);
    return;
  }

  if(dt < new Date()){
    if(!confirm('Você está agendando para uma data/hora no passado. Confirmar?')) return;
  }

  if(hasConflict(dt)){
    if(!confirm('Já existe um agendamento próximo a esse horário (±30min). Deseja continuar?')) {
      return;
    }
  }

  const appointment = {
    id: uid(),
    nome,
    servico,
    data: dt.toISOString(),
    notas
  };

  appointments.push(appointment);
  save();
  render();
  form.reset();
  showMessage('Agendamento salvo com sucesso!');
});

/* limpar campos */
document.getElementById('clearBtn').addEventListener('click', () => form.reset());

/* pesquisa e filtros */
searchInput.addEventListener('input', () => render());
filterDate.addEventListener('change', () => render());

/* export / import */
exportBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const dataStr = JSON.stringify(appointments, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agendamentos.json';
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', (e) => {
  e.preventDefault();
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if(!Array.isArray(parsed)) throw new Error('Formato inválido');
      // simples merge: evita ids repetidos
      parsed.forEach(p => {
        if(!p.id) p.id = uid();
        appointments.push(p);
      });
      save();
      render();
      showMessage('Importação concluída.');
    } catch (err) {
      alert('Arquivo inválido: ' + err.message);
    }
  };
  reader.readAsText(f);
  fileInput.value = '';
});

/* inicialização */
function init(){
  yearSpan.textContent = new Date().getFullYear();
  load();
  // normalize stored dates: older versions may have strings
  appointments = appointments.map(a => ({...a, data: a.data}));
  render();
}

init();
