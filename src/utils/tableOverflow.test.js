import { tableOverflowState } from "./tableOverflow";

describe("tableOverflowState", () => {
  test("no extra columns when the table fits", () => {
    expect(tableOverflowState({ scrollWidth: 320, clientWidth: 320, scrollLeft: 0 })).toEqual({
      overflow: false,
      atStart: true,
      atEnd: true,
    });
  });

  test("marks more columns to the right at the start of a wide table", () => {
    expect(tableOverflowState({ scrollWidth: 800, clientWidth: 320, scrollLeft: 0 })).toEqual({
      overflow: true,
      atStart: true,
      atEnd: false,
    });
  });

  test("marks more columns to the left after scrolling", () => {
    expect(tableOverflowState({ scrollWidth: 800, clientWidth: 320, scrollLeft: 480 })).toEqual({
      overflow: true,
      atStart: false,
      atEnd: true,
    });
  });
});
