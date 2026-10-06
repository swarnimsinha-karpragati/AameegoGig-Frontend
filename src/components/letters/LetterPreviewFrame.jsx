import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "../../design-system";
import { PAGE_GAP_PX, cssLengthToPx, fitScale, pageTop, paginateLetterDocument } from "./letterPagination";
import "./LetterPreviewFrame.css";

// Sizing before the document has loaded; afterwards the letter's own page geometry is used.
const A4_PAGE = { width: cssLengthToPx("210mm"), height: cssLengthToPx("297mm") };

const layoutFor = (frame) => {
  try {
    const doc = frame.contentDocument;
    const paged = doc && paginateLetterDocument(doc, { gap: PAGE_GAP_PX });
    if (paged) return { pages: paged.pages, geometry: paged.geometry, height: paged.height };
    const height = Math.max(A4_PAGE.height, doc?.documentElement?.scrollHeight || 0);
    return { pages: 1, geometry: { ...A4_PAGE, height }, height };
  } catch {
    return { pages: 1, geometry: A4_PAGE, height: A4_PAGE.height };
  }
};

/**
 * Server-rendered letter HTML shown as the A4 pages the PDF will print, scaled to fit the column.
 * The sandbox allows same-origin (so the pages can be measured and laid out from here) but never
 * scripts: template content still cannot run, and allow-scripts must not be added alongside
 * allow-same-origin, which would let the document lift its own sandbox.
 */
export default function LetterPreviewFrame({ html, loading = false, error = "", title = "Letter preview", emptyText }) {
  const [availableWidth, setAvailableWidth] = useState(0);
  const [layout, setLayout] = useState(null);
  const observerRef = useRef(null);

  const viewportRef = useCallback((node) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof window.ResizeObserver !== "function") return;
    const observer = new window.ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleLoad = useCallback((event) => setLayout(layoutFor(event.currentTarget)), []);

  if (error) {
    return (
      <div className="wz-preview">
        <p className="wz-letters__notice wz-letters__notice--error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="wz-preview">
        <div className="wz-preview__state" aria-live="polite">
          {loading ? (
            <>
              <Spinner /> Rendering preview…
            </>
          ) : (
            emptyText || "Nothing to preview yet."
          )}
        </div>
      </div>
    );
  }

  // A refresh keeps the previous pages on screen until the new document is laid out; the frame is
  // hidden only before the very first layout, so debounced refreshes never flash blank sheets.
  const geometry = layout ? layout.geometry : A4_PAGE;
  const pages = layout ? layout.pages : 1;
  const height = layout ? layout.height : A4_PAGE.height;
  const scale = fitScale(availableWidth, geometry.width);

  return (
    <div className="wz-preview" aria-busy={loading || undefined}>
      {loading && (
        <span className="wz-preview__busy">
          <Spinner />
        </span>
      )}
      <div className="wz-preview__viewport" ref={viewportRef}>
        <div className="wz-preview__stage" style={{ width: geometry.width * scale, height: height * scale }}>
          {Array.from({ length: pages }, (_, index) => (
            <div
              key={index}
              className="wz-preview__sheet"
              aria-hidden="true"
              style={{
                top: pageTop(index, geometry, PAGE_GAP_PX) * scale,
                width: geometry.width * scale,
                height: geometry.height * scale,
              }}
            />
          ))}
          <iframe
            className="wz-preview__frame"
            title={title}
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={handleLoad}
            style={{
              width: geometry.width,
              height,
              transform: `scale(${scale})`,
              visibility: layout ? "visible" : "hidden",
            }}
          />
        </div>
      </div>
    </div>
  );
}
