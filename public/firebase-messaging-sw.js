/* global importScripts, firebase */
// Background web push. A service worker can't read REACT_APP_* env vars, so the
// public Firebase web config is repeated here; keep it in sync with .env.
// Clicks open webpush.fcmOptions.link (set by the backend), so no click handler.
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyABsm4v4DkhJuU12kT9lwI2ce5p4Vyd-NM",
  authDomain: "workza-908cb.firebaseapp.com",
  projectId: "workza-908cb",
  messagingSenderId: "639902202501",
  appId: "1:639902202501:web:673ecb1f672e0ddffbc7ec",
});

// Messages with a `notification` payload are shown by the SDK automatically.
firebase.messaging();
