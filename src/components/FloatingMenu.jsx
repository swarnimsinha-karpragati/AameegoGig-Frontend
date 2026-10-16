import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computeFloatingMenuPosition } from "../utils/floatingMenuPosition";
import { DS_SCOPE_CLASS, isInDesignSystemScope } from "../design-system/utils";

/**
 * Renders a menu in a body-level portal, fixed next to `anchorEl`, so parents
 * with `overflow: auto/hidden` (scrollable tables, cards) never clip it.
 * Repositions on scroll, resize and when the menu's own content changes size.
 * `onShown` runs once the menu is visible: a hidden element cannot take focus,
 * so overlays must move focus there rather than with `autoFocus`.
 * The portal leaves the design-token scope, so a menu anchored inside `.wz-ds`
 * is re-wrapped in it; legacy menus anchored outside stay unscoped.
 */
export default function FloatingMenu({ anchorEl, className = "", children, onShown, ...rest }) {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({ visibility: "hidden" });
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;
  const visible = style.visibility === "visible";

  useEffect(() => {
    if (visible) onShownRef.current?.();
  }, [visible]);

  const reposition = useCallback(() => {
    const menu = menuRef.current;
    if (!anchorEl || !menu) return;
    const { top, left, maxHeight } = computeFloatingMenuPosition({
      anchorRect: anchorEl.getBoundingClientRect(),
      menuSize: { width: menu.offsetWidth, height: menu.scrollHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    setStyle({ top, left, maxHeight, visibility: "visible" });
  }, [anchorEl]);

  useLayoutEffect(() => {
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    let observer;
    if (typeof ResizeObserver !== "undefined" && menuRef.current) {
      observer = new ResizeObserver(reposition);
      Array.from(menuRef.current.children).forEach((child) => observer.observe(child));
      observer.observe(menuRef.current);
    }
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      observer?.disconnect();
    };
  }, [reposition, children]);

  if (!anchorEl) return null;

  const menu = (
    <div
      ref={menuRef}
      className={`floating-menu ${className}`.trim()}
      style={{
        position: "fixed",
        right: "auto",
        bottom: "auto",
        margin: 0,
        zIndex: 1100,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );

  return createPortal(
    isInDesignSystemScope(anchorEl) ? <div className={`${DS_SCOPE_CLASS} wz-floating-scope`}>{menu}</div> : menu,
    document.body
  );
}
