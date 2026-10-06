import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx, getPageRange, getPageSummary } from "./utils";
import "./Pagination.css";

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  summaryLabel = "records",
  className,
}) {
  const lastPage = Math.max(1, Math.floor(Number(totalPages) || 0));
  const current = Math.min(Math.max(1, Number(page) || 1), lastPage);
  const { from, to, total: count } = getPageSummary({ page: current, limit, total });
  const items = getPageRange(current, lastPage);

  const goTo = (target) => {
    if (target < 1 || target > lastPage || target === current) return;
    onPageChange?.(target);
  };

  return (
    <div className={cx("wz-pagination", className)}>
      <p className="wz-pagination__summary" aria-live="polite">
        {count === 0
          ? `Showing 0 ${summaryLabel}`
          : `Showing ${from}–${to} of ${count} ${summaryLabel}`}
      </p>
      <nav className="wz-pagination__nav" aria-label="Pagination">
        <button
          type="button"
          className="wz-pagination__step"
          onClick={() => goTo(current - 1)}
          disabled={current <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" />
          <span>Previous</span>
        </button>
        <ul className="wz-pagination__pages">
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                <button
                  type="button"
                  className={cx("wz-pagination__page", item === current && "wz-pagination__page--active")}
                  onClick={() => goTo(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === current ? "page" : undefined}
                >
                  {item}
                </button>
              </li>
            ) : (
              <li key={item} className="wz-pagination__ellipsis" aria-hidden="true">
                …
              </li>
            )
          )}
        </ul>
        <button
          type="button"
          className="wz-pagination__step"
          onClick={() => goTo(current + 1)}
          disabled={current >= lastPage}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
