import { registerPushDevice } from "../services/settingService";
import { getToken, onAuthCleared } from "./authStorage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

/** False inside the mobile app (it registers native FCM itself), in unsupported browsers and until Firebase env is set. */
export const webPushAvailable = () =>
  Boolean(firebaseConfig.apiKey && VAPID_KEY) &&
  !window.ReactNativeWebView &&
  "Notification" in window &&
  "serviceWorker" in navigator;

export const webPushPermission = () => (webPushAvailable() ? Notification.permission : "unsupported");

let messagingPromise = null;
let pendingDelete = Promise.resolve();

// Firebase loads lazily so users who never enable push don't download it.
const loadMessaging = () => {
  if (!messagingPromise) {
    messagingPromise = Promise.all([import("firebase/app"), import("firebase/messaging")]).then(
      async ([{ initializeApp }, fcm]) => {
        if (!(await fcm.isSupported())) return null;
        const messaging = fcm.getMessaging(initializeApp(firebaseConfig));
        fcm.onMessage(messaging, (payload) =>
          window.dispatchEvent(new CustomEvent("notifications-updated", { detail: payload }))
        );
        return { fcm, messaging };
      }
    );
  }
  return messagingPromise;
};

async function registerToken() {
  try {
    await pendingDelete;
    const loaded = await loadMessaging();
    if (!loaded) return false;
    const serviceWorkerRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await loaded.fcm.getToken(loaded.messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
    if (!token) return false;
    await registerPushDevice(token, "web");
    return true;
  } catch (err) {
    console.error("Web push setup failed:", err);
    return false;
  }
}

/** Asks for permission when needed, so call it straight from a click handler. */
export async function enableWebPush() {
  if (!webPushAvailable()) return false;
  const permission =
    Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return false;
  return registerToken();
}

/** Refreshes the token on app load when permission was already granted; never prompts. */
export const syncWebPush = () =>
  getToken() && webPushPermission() === "granted" ? registerToken() : Promise.resolve(false);

// Logout: drop this browser's FCM token. The server prunes it on its next failed send.
onAuthCleared(() => {
  if (!messagingPromise) return;
  pendingDelete = messagingPromise
    .then((loaded) => loaded && loaded.fcm.deleteToken(loaded.messaging))
    .catch(() => {});
});
