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

/** Open traps, oldest first; only the last (topmost overlay) handles keys. */
const activeTraps = [];

/**
 * Keeps keyboard focus inside `containerRef` while `active`, handles Escape,
 * moves focus to `initialFocusRef` (or the first focusable element) on open and
 * restores focus to the previously focused element on close. When overlays stack
 * (a dialog over a drawer), only the topmost one reacts to Tab and Escape.
 */
export function useFocusTrap(containerRef, active, { initialFocusRef, onEscape } = {}) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement;
    const trap = {};
    activeTraps.push(trap);

    const target =
      initialFocusRef?.current || getFocusableElements(container)[0] || container;
    target?.focus();

    const handleKeyDown = (event) => {
      if (activeTraps[activeTraps.length - 1] !== trap) return;
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
      activeTraps.splice(activeTraps.indexOf(trap), 1);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}

const MENU_ITEM_SELECTOR = "[role^='menuitem']:not(:disabled)";

/**
 * Index a list key moves to from `current` (-1 = nothing active) in a list of `length`:
 * ArrowUp/ArrowDown wrap, Home/End jump. Null for other keys or an empty list.
 */
export function listKeyTarget(key, current, length) {
  if (length <= 0) return null;
  switch (key) {
    case "ArrowDown":
      return (current + 1) % length;
    case "ArrowUp":
      return (current <= 0 ? length : current) - 1;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    default:
      return null;
  }
}

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
      const next = listKeyTarget(event.key, list.indexOf(document.activeElement), list.length);
      if (next !== null) list[next].focus();
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
