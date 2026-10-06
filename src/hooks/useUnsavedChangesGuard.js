import { useCallback, useEffect, useState } from "react";
import { registerNavigationGuard, syncNavigationIndex } from "../utils/navigationGuard";

/**
 * Asks before unsaved work is lost: in-app exits (`request(onExit)`), sidebar/logout navigation,
 * browser Back/Forward, and closing or reloading the tab.
 * Render one confirmation from `confirmOpen` / `confirm` / `cancel`.
 */
export default function useUnsavedChangesGuard(dirty) {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (!dirty) return undefined;
    return registerNavigationGuard((proceed) => setPending(() => proceed));
  }, [dirty]);

  // Keeps the guard's history position current after in-page URL changes (re-renders follow them).
  useEffect(() => {
    if (dirty) syncNavigationIndex();
  });

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const request = useCallback(
    (proceed) => {
      if (dirty) setPending(() => proceed);
      else proceed();
    },
    [dirty]
  );

  const confirm = useCallback(() => {
    setPending(null);
    pending?.();
  }, [pending]);

  const cancel = useCallback(() => setPending(null), []);

  return { confirmOpen: Boolean(pending), request, confirm, cancel };
}
