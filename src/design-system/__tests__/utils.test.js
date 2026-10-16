import {
  cx,
  ELLIPSIS_END,
  ELLIPSIS_START,
  getInitials,
  getPageRange,
  getPageSummary,
  isInDesignSystemScope,
} from "../utils";

describe("isInDesignSystemScope", () => {
  it("is true for elements inside (or carrying) the token class only", () => {
    const scope = document.createElement("div");
    scope.className = "wz-ds";
    const child = document.createElement("button");
    scope.appendChild(child);
    expect(isInDesignSystemScope(scope)).toBe(true);
    expect(isInDesignSystemScope(child)).toBe(true);
    expect(isInDesignSystemScope(document.createElement("div"))).toBe(false);
    expect(isInDesignSystemScope(null)).toBe(false);
  });
});

describe("cx", () => {
  it("joins truthy class names only", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
});

describe("getInitials", () => {
  it.each([
    ["Raghav Kaur", "RK"],
    ["shivam kumar tiwari", "SK"],
    ["Madonna", "M"],
    ["  Riya   Verma  ", "RV"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("%p → %p", (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe("getPageRange", () => {
  it("returns an empty list when there are no pages", () => {
    expect(getPageRange(1, 0)).toEqual([]);
  });

  it("lists every page when they fit", () => {
    expect(getPageRange(1, 1)).toEqual([1]);
    expect(getPageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("adds a trailing ellipsis near the start", () => {
    expect(getPageRange(1, 21)).toEqual([1, 2, 3, 4, 5, ELLIPSIS_END, 21]);
    expect(getPageRange(4, 21)).toEqual([1, 2, 3, 4, 5, ELLIPSIS_END, 21]);
  });

  it("adds both ellipses in the middle", () => {
    expect(getPageRange(10, 21)).toEqual([1, ELLIPSIS_START, 9, 10, 11, ELLIPSIS_END, 21]);
  });

  it("adds a leading ellipsis near the end", () => {
    expect(getPageRange(21, 21)).toEqual([1, ELLIPSIS_START, 17, 18, 19, 20, 21]);
    expect(getPageRange(18, 21)).toEqual([1, ELLIPSIS_START, 17, 18, 19, 20, 21]);
  });

  it("clamps out-of-range pages", () => {
    expect(getPageRange(99, 8)).toEqual([1, ELLIPSIS_START, 4, 5, 6, 7, 8]);
    expect(getPageRange(-3, 8)).toEqual([1, 2, 3, 4, 5, ELLIPSIS_END, 8]);
  });

  it("keeps a constant length once ellipses appear", () => {
    for (let page = 1; page <= 50; page += 1) {
      expect(getPageRange(page, 50)).toHaveLength(7);
    }
  });
});

describe("getPageSummary", () => {
  it("computes the visible range", () => {
    expect(getPageSummary({ page: 1, limit: 4, total: 84 })).toEqual({ from: 1, to: 4, total: 84 });
    expect(getPageSummary({ page: 21, limit: 4, total: 84 })).toEqual({ from: 81, to: 84, total: 84 });
    expect(getPageSummary({ page: 3, limit: 10, total: 25 })).toEqual({ from: 21, to: 25, total: 25 });
  });

  it("handles empty results and out-of-range pages", () => {
    expect(getPageSummary({ page: 1, limit: 10, total: 0 })).toEqual({ from: 0, to: 0, total: 0 });
    expect(getPageSummary({ page: 9, limit: 10, total: 25 })).toEqual({ from: 21, to: 25, total: 25 });
  });
});
