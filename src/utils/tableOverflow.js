/** Whether a table scroller can move, and which edges still hide columns. */
export const tableOverflowState = ({ scrollWidth = 0, clientWidth = 0, scrollLeft = 0 } = {}) => {
  const overflow = scrollWidth > clientWidth + 1;
  if (!overflow) return { overflow: false, atStart: true, atEnd: true };
  return {
    overflow: true,
    atStart: scrollLeft <= 1,
    atEnd: scrollLeft + clientWidth >= scrollWidth - 1,
  };
};
