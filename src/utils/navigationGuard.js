/**
 * One place that decides whether the app may navigate away from the current page.
 *
 * The app uses a plain BrowserRouter, where react-router's `useBlocker` is unavailable, so a page
 * with unsaved work registers a guard here instead:
 * - in-app navigation (sidebar, logout) calls `requestNavigation(proceed)`;
 * - browser Back/Forward is caught on `popstate` before the router sees it: the URL is put back
 *   and the guard decides. Confirming replays the same history move for the router.
 *
 * The guard is `request(proceed)`: show the confirmation and call `proceed()` to leave.
 */

let activeGuard = null;
let currentIndex = null;
let restoring = false;
let afterRestore = null;
let passThrough = false;

const indexOf = (state) => (Number.isInteger(state?.idx) ? state.idx : null);

export function syncNavigationIndex() {
  // While the guarded URL is being put back, history.state is still the entry we left;
  // the restoring pop sets the position instead.
  if (restoring) return;
  currentIndex = indexOf(window.history.state);
}

export function registerNavigationGuard(request) {
  const guard = { request };
  activeGuard = guard;
  syncNavigationIndex();
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}

/** Runs `proceed` now when nothing guards the page; returns false when a guard took it over. */
export function requestNavigation(proceed) {
  if (!activeGuard) {
    proceed();
    return true;
  }
  activeGuard.request(proceed);
  return false;
}

function onPopState(event) {
  if (restoring) {
    // The move that put the guarded URL back: the router never saw the original pop.
    event.stopImmediatePropagation();
    restoring = false;
    currentIndex = indexOf(event.state);
    const next = afterRestore;
    afterRestore = null;
    next?.();
    return;
  }
  if (passThrough || !activeGuard) {
    passThrough = false;
    syncNavigationIndex();
    return;
  }

  const target = indexOf(event.state);
  // Entries the router did not create carry no index; treat the move as a single Back.
  const delta = currentIndex != null && target != null ? currentIndex - target : 1;
  event.stopImmediatePropagation();
  // A pop that lands on the guarded entry itself has nothing to restore or ask about.
  if (delta === 0) return;

  restoring = true;
  window.history.go(delta);

  activeGuard.request(() => {
    const leave = () => {
      passThrough = true;
      window.history.go(-delta);
    };
    if (restoring) afterRestore = leave;
    else leave();
  });
}

// Registered at import, before the router mounts, and in the capture phase, so it runs before
// the router's own popstate listener and can hide a cancelled Back from it.
if (typeof window !== "undefined") {
  window.addEventListener("popstate", onPopState, { capture: true });
}
