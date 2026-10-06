export const ELLIPSIS_START = "ellipsis-start";
export const ELLIPSIS_END = "ellipsis-end";

/** Class that carries the design tokens (`tokens.css`); everything themed must render inside it. */
export const DS_SCOPE_CLASS = "wz-ds";

export function isInDesignSystemScope(element) {
  return Boolean(element?.closest?.(`.${DS_SCOPE_CLASS}`));
}

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function getInitials(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
}

/**
 * Page list for pagination controls. Always keeps the first and last page and
 * `siblings` pages either side of the current one; gaps become ellipsis markers.
 * The list length stays constant (siblings * 2 + 5) once ellipses appear, so the
 * control does not jump in width while paging.
 */
export function getPageRange(page, totalPages, siblings = 1) {
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  if (total === 0) return [];
  const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), total);
  const slots = siblings * 2 + 5;

  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  if (total <= slots) return range(1, total);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showStartEllipsis = left > 3;
  const showEndEllipsis = right < total - 2;
  const edgeCount = 3 + siblings * 2;

  if (!showStartEllipsis) {
    return [...range(1, edgeCount), ELLIPSIS_END, total];
  }
  if (!showEndEllipsis) {
    return [1, ELLIPSIS_START, ...range(total - edgeCount + 1, total)];
  }
  return [1, ELLIPSIS_START, ...range(left, right), ELLIPSIS_END, total];
}

export function getPageSummary({ page, limit, total }) {
  const count = Math.max(0, Number(total) || 0);
  const size = Math.max(1, Number(limit) || 1);
  if (count === 0) return { from: 0, to: 0, total: 0 };
  const lastPage = Math.ceil(count / size);
  const current = Math.min(Math.max(1, Number(page) || 1), lastPage);
  const from = (current - 1) * size + 1;
  return { from, to: Math.min(current * size, count), total: count };
}
