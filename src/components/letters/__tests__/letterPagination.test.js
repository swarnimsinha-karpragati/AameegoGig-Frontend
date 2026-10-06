import {
  PAGE_GAP_PX,
  cssLengthToPx,
  fitScale,
  groupLineBoxes,
  lineBreakIndex,
  pageTop,
  paginateLetterDocument,
  readPageGeometry,
  stackHeight,
} from "../letterPagination";
import { LETTER_PAGE_VARS, provideLetterPageVars } from "../testing/letterPageVars";

const A4_WIDTH = (210 * 96) / 25.4;
const A4_HEIGHT = (297 * 96) / 25.4;

const geometry = readPageGeometry((name) => LETTER_PAGE_VARS[name] || "");

describe("cssLengthToPx", () => {
  test.each([
    ["40px", 40],
    [" 12.5px ", 12.5],
    ["210mm", A4_WIDTH],
    ["2.54cm", 96],
    ["1in", 96],
    ["72pt", 96],
    ["0", 0],
  ])("%s", (value, px) => {
    expect(cssLengthToPx(value)).toBeCloseTo(px, 6);
  });

  test.each([[""], ["auto"], ["10%"], ["calc(1px + 2px)"], [undefined], ["-5px"]])("rejects %p", (value) => {
    expect(cssLengthToPx(value)).toBeNull();
  });
});

describe("readPageGeometry", () => {
  test("reads the A4 page and its margins from the letter custom properties", () => {
    expect(geometry.width).toBeCloseTo(A4_WIDTH, 6);
    expect(geometry.height).toBeCloseTo(A4_HEIGHT, 6);
    expect(geometry.margin).toEqual({ top: 40, right: 40, bottom: 60, left: 40 });
    expect(geometry.contentWidth).toBeCloseTo(A4_WIDTH - 80, 6);
    expect(geometry.contentHeight).toBeCloseTo(A4_HEIGHT - 100, 6);
  });

  test("returns null when the document does not declare a page size", () => {
    expect(readPageGeometry(() => "")).toBeNull();
    expect(readPageGeometry((name) => (name === "--letter-page-width" ? "210mm" : ""))).toBeNull();
  });

  test("missing margins count as zero", () => {
    const bare = readPageGeometry((name) => ({ "--letter-page-width": "500px", "--letter-page-height": "800px" })[name] || "");
    expect(bare.margin).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(bare.contentHeight).toBe(800);
  });
});

describe("fitScale", () => {
  test("shrinks the page to the available width but never enlarges it", () => {
    expect(fitScale(A4_WIDTH / 2, A4_WIDTH)).toBeCloseTo(0.5, 6);
    expect(fitScale(2000, A4_WIDTH)).toBe(1);
    expect(fitScale(A4_WIDTH, A4_WIDTH)).toBe(1);
  });

  test("falls back to 1 before the container has been measured", () => {
    expect(fitScale(0, A4_WIDTH)).toBe(1);
    expect(fitScale(Number.NaN, A4_WIDTH)).toBe(1);
    expect(fitScale(300, 0)).toBe(1);
  });
});

describe("page stacking", () => {
  test("pages are stacked with a fixed gap", () => {
    expect(pageTop(0, geometry, PAGE_GAP_PX)).toBe(0);
    expect(pageTop(2, geometry, PAGE_GAP_PX)).toBeCloseTo(2 * (A4_HEIGHT + PAGE_GAP_PX), 6);
    expect(stackHeight(1, geometry, PAGE_GAP_PX)).toBeCloseTo(A4_HEIGHT, 6);
    expect(stackHeight(3, geometry, PAGE_GAP_PX)).toBeCloseTo(3 * A4_HEIGHT + 2 * PAGE_GAP_PX, 6);
    expect(stackHeight(0, geometry, PAGE_GAP_PX)).toBeCloseTo(A4_HEIGHT, 6);
  });
});

describe("lineBreakIndex (Chromium's default orphans: 2 / widows: 2)", () => {
  test("breaks before the first overflowing line when both sides keep two lines", () => {
    expect(lineBreakIndex({ lineCount: 6, overflowIndex: 3 })).toBe(3);
  });

  test("pulls lines over to leave two widows on the next page", () => {
    expect(lineBreakIndex({ lineCount: 6, overflowIndex: 5 })).toBe(4);
  });

  test("moves the whole block when fewer than two lines would stay behind", () => {
    expect(lineBreakIndex({ lineCount: 6, overflowIndex: 1 })).toBe(0);
    expect(lineBreakIndex({ lineCount: 6, overflowIndex: 0 })).toBe(0);
    expect(lineBreakIndex({ lineCount: 3, overflowIndex: 2 })).toBe(0);
  });
});

describe("groupLineBoxes", () => {
  test("merges fragments that share a line and orders lines top to bottom", () => {
    const lines = groupLineBoxes([
      { top: 30, bottom: 46, height: 16, width: 50 },
      { top: 8, bottom: 24, height: 16, width: 80 },
      { top: 10, bottom: 22, height: 12, width: 20 },
      { top: 31, bottom: 45, height: 14, width: 10 },
    ]);
    expect(lines).toEqual([
      { top: 8, bottom: 24 },
      { top: 30, bottom: 46 },
    ]);
  });

  test("ignores empty fragments", () => {
    expect(groupLineBoxes([{ top: 0, bottom: 0, height: 0, width: 0 }])).toEqual([]);
  });
});

describe("paginateLetterDocument", () => {
  const makeDocument = (body, css = "") => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
    doc.close();
    provideLetterPageVars(frame.contentWindow);
    frame.contentWindow.Range.prototype.getClientRects = () => [];
    return doc;
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("a letter that fits one page stays one page and repeats fixed elements inside the page area", () => {
    const doc = makeDocument('<p>Hello</p><div class="letter-footer">Footer</div>', ".letter-footer{position:fixed;bottom:0}");
    const result = paginateLetterDocument(doc, { gap: PAGE_GAP_PX });
    expect(result.pages).toBe(1);
    expect(result.height).toBeCloseTo(A4_HEIGHT, 6);
    const areas = doc.querySelectorAll("[data-letter-page-area]");
    expect(areas).toHaveLength(1);
    expect(areas[0].textContent).toBe("Footer");
    expect(areas[0].style.top).toBe("40px");
    expect(areas[0].style.left).toBe("40px");
    expect(doc.body.style.background).toBe("transparent");
  });

  test("content that cannot be split still gets enough pages so nothing is clipped", () => {
    const doc = makeDocument('<div class="tall">x</div>');
    const tall = doc.querySelector(".tall");
    const pageStride = A4_HEIGHT + PAGE_GAP_PX;
    tall.getBoundingClientRect = () => ({ top: 40, bottom: 40 + 2.5 * pageStride, height: 2.5 * pageStride });
    const result = paginateLetterDocument(doc, { gap: PAGE_GAP_PX });
    expect(result.pages).toBe(3);
    expect(result.height).toBeCloseTo(stackHeight(3, geometry, PAGE_GAP_PX), 6);
    expect(doc.querySelectorAll("[data-letter-page-area]")).toHaveLength(3);
  });

  test("documents without page geometry are left untouched", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.body.innerHTML = "<p>Hello</p>";
    expect(paginateLetterDocument(doc, { gap: PAGE_GAP_PX })).toBeNull();
    expect(doc.body.innerHTML).toBe("<p>Hello</p>");
  });

  test("a document without a window is ignored", () => {
    const doc = document.implementation.createHTMLDocument("detached");
    expect(paginateLetterDocument(doc)).toBeNull();
  });
});
