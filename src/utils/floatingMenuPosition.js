/**
 * Places a viewport-fixed menu next to its trigger so it can live outside
 * scroll containers (e.g. horizontally scrolling tables) without being clipped.
 *
 * The menu opens below the trigger, right-aligned to it, and flips above when
 * there is not enough room below and more room above. It is always clamped to
 * stay `margin` px inside the viewport, and `maxHeight` tells the caller how
 * tall it may grow before it must scroll internally.
 */
export function computeFloatingMenuPosition({
  anchorRect,
  menuSize,
  viewport,
  gap = 4,
  margin = 8,
}) {
  const menuWidth = Math.max(0, menuSize?.width || 0);
  const menuHeight = Math.max(0, menuSize?.height || 0);

  const maxLeft = viewport.width - menuWidth - margin;
  const preferredLeft = anchorRect.right - menuWidth;
  const left = maxLeft < margin ? margin : Math.min(Math.max(preferredLeft, margin), maxLeft);

  const spaceBelow = Math.max(0, viewport.height - anchorRect.bottom - gap - margin);
  const spaceAbove = Math.max(0, anchorRect.top - gap - margin);
  const fitsBelow = menuHeight <= spaceBelow;
  const placeAbove = !fitsBelow && spaceAbove > spaceBelow;

  if (placeAbove) {
    const height = Math.min(menuHeight, spaceAbove);
    return {
      top: anchorRect.top - gap - height,
      left,
      maxHeight: spaceAbove,
      placement: "top",
    };
  }

  return {
    top: anchorRect.bottom + gap,
    left,
    maxHeight: spaceBelow,
    placement: "bottom",
  };
}
