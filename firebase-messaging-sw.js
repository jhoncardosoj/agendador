importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA5IXiEiCmWClJYYnc7W5eovJsK7bCxsig",
  authDomain: "agendador-barbearia-d46f1.firebaseapp.com",
  projectId: "agendador-barbearia-d46f1",
  storageBucket: "agendador-barbearia-d46f1.firebasestorage.app",
  messagingSenderId: "615576151766",
  appId: "1:615576151766:web:b2c9ea95b7f3d928b88b77"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
  const title = payload.notification?.title || 'Barbearia';
  const options = { body: payload.notification?.body || '', icon: '/static/icons/icon-192.png' };
  self.registration.showNotification(title, options);
});
