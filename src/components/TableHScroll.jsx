import { useCallback, useEffect, useRef, useState } from "react";
import { tableOverflowState } from "../utils/tableOverflow";
import "./TableHScroll.css";

const measure = (el) =>
  tableOverflowState({
    scrollWidth: el?.scrollWidth || 0,
    clientWidth: el?.clientWidth || 0,
    scrollLeft: el?.scrollLeft || 0,
  });

/**
 * Wide HRMS tables inside the Workza WebView. Mobile hides native scrollbars,
 * so when columns overflow we show a fade + "More columns" cue and a real
 * horizontal scrollbar.
 */
export default function TableHScroll({ children, label = "Request table", className = "" }) {
  const scrollerRef = useRef(null);
  const [{ overflow, atStart, atEnd }, setState] = useState({
    overflow: false,
    atStart: true,
    atEnd: true,
  });

  const update = useCallback(() => {
    setState(measure(scrollerRef.current));
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return undefined;
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const showMore = overflow && !atEnd;
  const showBack = overflow && !atStart;

  return (
    <div
      className={`table-hscroll${showMore ? " table-hscroll--more" : ""}${showBack ? " table-hscroll--back" : ""}${className ? ` ${className}` : ""}`}
    >
      <div
        ref={scrollerRef}
        className="table-hscroll__scroller"
        role="region"
        aria-label={overflow ? `${label}: swipe or scroll to see all columns` : label}
        tabIndex={overflow ? 0 : undefined}
      >
        {children}
      </div>
      {showMore ? (
        <div className="table-hscroll__hint" aria-hidden="true">
          More columns →
        </div>
      ) : null}
    </div>
  );
}
