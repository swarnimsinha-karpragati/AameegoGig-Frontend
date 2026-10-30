export const WORKZA_MOBILE_KEY_STORAGE = "workzaMobileClientKey";
export const WORKZA_MOBILE_VERSION_STORAGE = "workzaMobileAppVersion";
export const MOBILE_APP_BLOCKED = "MOBILE_APP_BLOCKED";

export const mobileClientHeadersFromStorage = (storage) => {
  if (!storage || typeof storage.getItem !== "function") return {};
  const key = storage.getItem(WORKZA_MOBILE_KEY_STORAGE);
  if (!key) return {};
  return {
    "X-Workza-Client-Key": key,
    "X-Workza-App-Version": storage.getItem(WORKZA_MOBILE_VERSION_STORAGE) || "",
  };
};

export const isMobileAppBlockedError = (error) =>
  error?.response?.status === 403 && error?.response?.data?.code === MOBILE_APP_BLOCKED;

export const showMobileAppBlockedMessage = (message, doc = document) => {
  if (!doc?.body) return null;
  const existing = doc.getElementById("workza-mobile-blocked");
  if (existing) return existing;
  const el = doc.createElement("div");
  el.id = "workza-mobile-blocked";
  el.setAttribute("role", "alert");
  el.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:system-ui,sans-serif;font-size:16px;line-height:1.5";
  el.textContent =
    message ||
    "This Workza app version is no longer supported. Please open https://workza.ai in Chrome or Safari.";
  doc.body.appendChild(el);
  return el;
};
