/** Browser navigation type of the document load: "navigate" | "reload" | "back_forward" | "prerender". */
export function getNavigationType() {
  try {
    const perf = window.performance;
    const entry = perf?.getEntriesByType?.("navigation")?.[0];
    if (entry?.type) return entry.type;
    if (perf?.navigation) return perf.navigation.type === 1 ? "reload" : "navigate";
  } catch {
    // Navigation Timing can be blocked (privacy modes); treat as a normal visit.
  }
  return "navigate";
}

/** React Router's key for the history entry the document loaded on ("default" when there is no router state, e.g. a typed URL). */
export function readBootKey() {
  try {
    return window.history.state?.key ?? "default";
  } catch {
    return "default";
  }
}

// Captured at module load: BrowserRouter keeps the entry key in history.state, which survives a
// refresh, so only the entry the page booted on counts as "the reloaded page". src/index.js imports
// this module eagerly so the key is read before any in-app navigation, even if callers are lazy-loaded.
const BOOT_KEY = readBootKey();

/**
 * True only on the history entry the user refreshed. The browser keeps reporting "reload" for the
 * whole document lifetime, so later in-app navigations are told apart by their location key.
 */
export function isInitialReload(location, { navigationType = getNavigationType(), bootKey = BOOT_KEY } = {}) {
  return navigationType === "reload" && location?.key === bootKey;
}
