// registra service worker (se disponível)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(reg=>{
    console.log('SW registrado', reg.scope);
  }).catch(err=> console.warn('SW falhou', err));
}
