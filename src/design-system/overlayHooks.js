import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Keeps keyboard focus inside `containerRef` while `active`, handles Escape,
 * moves focus to `initialFocusRef` (or the first focusable element) on open and
 * restores focus to the previously focused element on close.
 */
export function useFocusTrap(containerRef, active, { initialFocusRef, onEscape } = {}) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement;

    const target =
      initialFocusRef?.current || getFocusableElements(container)[0] || container;
    target?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const outside = !container.contains(current);
      if (event.shiftKey && (current === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

const MENU_ITEM_SELECTOR = "[role^='menuitem']:not(:disabled)";

/**
 * Keyboard model for a `role="menu"`: `focusInitial` focuses the checked radio item, else the
 * first enabled item; `onKeyDown` moves focus with ArrowUp/ArrowDown (wrapping), Home and End.
 */
export function useMenuNavigation(menuRef) {
  const items = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll(MENU_ITEM_SELECTOR) || []),
    [menuRef]
  );

  const focusInitial = useCallback(() => {
    const list = items();
    (list.find((item) => item.matches("[role='menuitemradio'][aria-checked='true']")) || list[0])?.focus();
  }, [items]);

  const onKeyDown = useCallback(
    (event) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const list = items();
      if (list.length === 0) return;
      const current = list.indexOf(document.activeElement);
      const next = {
        ArrowDown: (current + 1) % list.length,
        ArrowUp: (current <= 0 ? list.length : current) - 1,
        Home: 0,
        End: list.length - 1,
      }[event.key];
      list[next].focus();
    },
    [items]
  );

  return { focusInitial, onKeyDown };
}

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previous;
    };
  }, [active]);
}
