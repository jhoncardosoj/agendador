<!-- This file is plain JS (not module) and uses firebase compat libs for simplicity -->
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js"></script>

<script>
  // Your firebaseConfig (you provided this)
  const firebaseConfig = {
    apiKey: "AIzaSyA5IXiEiCmWClJYYnc7W5eovJsK7bCxsig",
    authDomain: "agendador-barbearia-d46f1.firebaseapp.com",
    projectId: "agendador-barbearia-d46f1",
    storageBucket: "agendador-barbearia-d46f1.firebasestorage.app",
    messagingSenderId: "615576151766",
    appId: "1:615576151766:web:b2c9ea95b7f3d928b88b77"
  };
  firebase.initializeApp(firebaseConfig);

  // Firestore & Messaging instances
  const firestore = firebase.firestore();
  const messaging = firebase.messaging && firebase.messaging();

  // VAPID key (you provided)
  const VAPID_PUBLIC = "BNybzYvTTOibuQXMEOAgP563qYbsiET-2oVrKj4vBkWBMX-sy1lTlaLzMGjZW0-m14KYIynXr4taaFYwikRiTr4";

  // Expose to global scope for other scripts
  window._fb = { firestore, messaging, VAPID_PUBLIC };
</script>
