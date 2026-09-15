import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import "./Pagination.css";

/**
 * Compact page list with ellipses for large totals.
 * Examples (siblingCount=1, edgeWindow=5):
 *   6 pages @ 4   → 1 2 3 4 5 6
 *  50 pages @ 1   → 1 2 3 4 5 … 50
 *  50 pages @ 25  → 1 … 24 25 26 … 50
 *  50 pages @ 50  → 1 … 46 47 48 49 50
 */
function buildPageItems(currentPage, totalPages, siblingCount = 1, edgeWindow = 5) {
  if (totalPages <= 1) return [1];

  // Show all pages when the full list still fits in a compact strip
  if (totalPages <= edgeWindow + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const range = (from, to) => {
    const out = [];
    for (let p = from; p <= to; p += 1) out.push(p);
    return out;
  };

  const nearStart = currentPage <= edgeWindow - siblingCount;
  const nearEnd = currentPage >= totalPages - (edgeWindow - siblingCount) + 1;

  if (nearStart) {
    return [...range(1, edgeWindow), "…", totalPages];
  }

  if (nearEnd) {
    return [1, "…", ...range(totalPages - edgeWindow + 1, totalPages)];
  }

  return [
    1,
    "…",
    ...range(currentPage - siblingCount, currentPage + siblingCount),
    "…",
    totalPages,
  ];
}

function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  showPageSize = false,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  className = "",
}) {
  const safeTotalPages = Math.max(0, Number(totalPages) || 0);
  const safeCurrent = Math.min(Math.max(1, Number(currentPage) || 1), Math.max(1, safeTotalPages));
  const [jumpValue, setJumpValue] = useState(String(safeCurrent));

  useEffect(() => {
    setJumpValue(String(safeCurrent));
  }, [safeCurrent]);

  if (safeTotalPages <= 1 && !showPageSize) return null;

  const pageItems = buildPageItems(safeCurrent, safeTotalPages, 1);
  const startRecord = totalRecords === 0 ? 0 : (safeCurrent - 1) * limit + 1;
  const endRecord = Math.min(safeCurrent * limit, totalRecords);
  const showJump = safeTotalPages > 7;

  const goTo = (page) => {
    const next = Math.min(Math.max(1, Number(page) || 1), safeTotalPages);
    if (next !== safeCurrent) onPageChange(next);
  };

  const submitJump = (e) => {
    e.preventDefault();
    goTo(jumpValue);
  };

  return (
    <div className={`pagination ${className}`}>
      <div className="pagination-info">
        Showing <strong>{startRecord}</strong>–<strong>{endRecord}</strong> of{" "}
        <strong>{totalRecords}</strong>
      </div>

      {safeTotalPages > 1 && (
        <div className="pagination-controls" role="navigation" aria-label="Pagination">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => goTo(1)}
            disabled={safeCurrent === 1}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => goTo(safeCurrent - 1)}
            disabled={safeCurrent === 1}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="pagination-pages">
            {pageItems.map((item, idx) =>
              item === "…" ? (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`pagination-btn page-number ${safeCurrent === item ? "active" : ""}`}
                  onClick={() => goTo(item)}
                  aria-label={`Page ${item}`}
                  aria-current={safeCurrent === item ? "page" : undefined}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => goTo(safeCurrent + 1)}
            disabled={safeCurrent === safeTotalPages}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => goTo(safeTotalPages)}
            disabled={safeCurrent === safeTotalPages}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>

          {showJump && (
            <form className="pagination-jump" onSubmit={submitJump}>
              <label htmlFor="pagination-jump-input" className="pagination-jump-label">
                Go to
              </label>
              <input
                id="pagination-jump-input"
                type="number"
                min={1}
                max={safeTotalPages}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                onBlur={() => setJumpValue(String(safeCurrent))}
                className="pagination-jump-input"
                aria-label={`Go to page (1–${safeTotalPages})`}
              />
            </form>
          )}
        </div>
      )}

      {showPageSize && onPageSizeChange && (
        <div className="pagination-page-size">
          <label htmlFor="page-size">Rows</label>
          <select
            id="page-size"
            value={limit}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="pagination-select"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default Pagination;
