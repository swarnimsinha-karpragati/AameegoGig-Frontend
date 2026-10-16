/* eslint-disable testing-library/no-node-access, testing-library/no-container --
   page geometry lives on aria-hidden boxes and inline styles that have no accessible query */
import { act, fireEvent, render, screen } from "@testing-library/react";
import LetterPreviewFrame from "../LetterPreviewFrame";
import { provideLetterPageVars } from "../testing/letterPageVars";

const A4_WIDTH = (210 * 96) / 25.4;
const A4_HEIGHT = (297 * 96) / 25.4;

const LETTER_HTML = `<!DOCTYPE html><html><head></head><body><p>Dear Aarav</p></body></html>`;

let observers;
beforeEach(() => {
  observers = [];
  window.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnect = jest.fn();
      observers.push(this);
    }
    observe(target) {
      this.target = target;
    }
  };
});
afterEach(() => {
  delete window.ResizeObserver;
});

const resizeTo = (width) =>
  act(() => {
    observers.forEach((o) => o.callback([{ target: o.target, contentRect: { width } }]));
  });

// jsdom fires its own load event for every inserted iframe on a later task.
const settleFrame = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const loadFrame = async (frame, html = LETTER_HTML, { paged = true } = {}) => {
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  await settleFrame();
  if (paged) provideLetterPageVars(frame.contentWindow);
  fireEvent.load(frame);
};

test("the iframe can be measured by the app but never runs template scripts", async () => {
  render(<LetterPreviewFrame html={LETTER_HTML} title="Letter preview" />);
  await settleFrame();
  const frame = screen.getByTitle("Letter preview");
  expect(frame.tagName).toBe("IFRAME");
  expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
  expect(frame.getAttribute("sandbox")).not.toMatch(/allow-scripts/);
  expect(frame).toHaveAttribute("srcdoc", LETTER_HTML);
});

test("the A4 page keeps its width and is scaled down to fit the preview column", async () => {
  render(<LetterPreviewFrame html={LETTER_HTML} />);
  await settleFrame();
  const frame = screen.getByTitle("Letter preview");
  expect(frame.style.width).toBe(`${A4_WIDTH}px`);
  expect(frame.style.transform).toBe("scale(1)");

  resizeTo(A4_WIDTH / 2);
  expect(frame.style.width).toBe(`${A4_WIDTH}px`);
  expect(frame.style.transform).toBe("scale(0.5)");
  const stage = frame.parentElement;
  expect(parseFloat(stage.style.width)).toBeCloseTo(A4_WIDTH / 2, 3);

  resizeTo(2000);
  expect(frame.style.transform).toBe("scale(1)");
});

test("after load the frame is sized to its pages, one sheet per page, and becomes visible", async () => {
  render(<LetterPreviewFrame html={LETTER_HTML} />);
  const frame = screen.getByTitle("Letter preview");
  expect(frame.style.visibility).toBe("hidden");
  await settleFrame();

  await loadFrame(frame);

  expect(frame.style.visibility).toBe("visible");
  expect(parseFloat(frame.style.height)).toBeCloseTo(A4_HEIGHT, 3);
  const sheets = document.querySelectorAll(".wz-preview__sheet");
  expect(sheets).toHaveLength(1);
  expect(sheets[0]).toHaveAttribute("aria-hidden", "true");
  expect(frame.contentDocument.documentElement.style.overflow).toBe("hidden");
});

test("a document without page geometry is still shown at its own height", async () => {
  render(<LetterPreviewFrame html="<p>Plain</p>" />);
  await settleFrame();
  const frame = screen.getByTitle("Letter preview");
  await loadFrame(frame, "<p>Plain</p>", { paged: false });
  expect(frame.style.visibility).toBe("visible");
  expect(document.querySelectorAll(".wz-preview__sheet")).toHaveLength(1);
});

test("stops observing the container on unmount", async () => {
  const { unmount } = render(<LetterPreviewFrame html={LETTER_HTML} />);
  await settleFrame();
  unmount();
  expect(observers[0].disconnect).toHaveBeenCalled();
});

test("works without ResizeObserver", async () => {
  delete window.ResizeObserver;
  render(<LetterPreviewFrame html={LETTER_HTML} />);
  await settleFrame();
  expect(screen.getByTitle("Letter preview").style.transform).toBe("scale(1)");
});

describe("states", () => {
  test("error", () => {
    render(<LetterPreviewFrame html={LETTER_HTML} error="Could not render" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not render");
    expect(screen.queryByTitle("Letter preview")).not.toBeInTheDocument();
  });

  test("loading before the first render", () => {
    render(<LetterPreviewFrame loading />);
    expect(screen.getByText(/Rendering preview/)).toBeInTheDocument();
  });

  test("empty", () => {
    render(<LetterPreviewFrame emptyText="Pick someone" />);
    expect(screen.getByText("Pick someone")).toBeInTheDocument();
  });

  test("new HTML never hides the frame: the previous pages stay until the new layout is ready", async () => {
    const { rerender } = render(<LetterPreviewFrame html={LETTER_HTML} />);
    await settleFrame();
    const frame = screen.getByTitle("Letter preview");
    await loadFrame(frame);
    expect(frame.style.visibility).toBe("visible");
    const laidOutHeight = frame.style.height;

    const NEXT_HTML = LETTER_HTML.replace("Aarav", "Diya");
    rerender(<LetterPreviewFrame html={NEXT_HTML} loading />);
    expect(screen.getByTitle("Letter preview").style.visibility).toBe("visible");
    expect(screen.getByTitle("Letter preview").style.height).toBe(laidOutHeight);
    expect(document.querySelectorAll(".wz-preview__sheet")).toHaveLength(1);

    await settleFrame();
    expect(screen.getByTitle("Letter preview").style.visibility).toBe("visible");
    await loadFrame(screen.getByTitle("Letter preview"), NEXT_HTML);
    expect(screen.getByTitle("Letter preview").style.visibility).toBe("visible");
  });

  test("refreshing keeps the current letter visible and marks the preview busy", async () => {
    const { container } = render(<LetterPreviewFrame html={LETTER_HTML} loading />);
    await settleFrame();
    expect(container.querySelector(".wz-preview")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".wz-preview__busy")).toBeInTheDocument();
    expect(screen.getByTitle("Letter preview")).toBeInTheDocument();
  });
});
