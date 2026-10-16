import { computeFloatingMenuPosition } from "./floatingMenuPosition";

const viewport = { width: 1280, height: 800 };
const rect = (top, left, width = 36, height = 36) => ({
  top,
  left,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

describe("computeFloatingMenuPosition", () => {
  it("opens below the trigger, right-aligned to it, when there is room", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(100, 1000),
      menuSize: { width: 220, height: 300 },
      viewport,
    });
    expect(pos).toEqual({ top: 140, left: 816, maxHeight: 652, placement: "bottom" });
  });

  it("flips above the trigger when it does not fit below and more space is above", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(700, 1000),
      menuSize: { width: 220, height: 300 },
      viewport,
    });
    expect(pos.placement).toBe("top");
    expect(pos.top).toBe(700 - 4 - 300);
    expect(pos.maxHeight).toBe(688);
  });

  it("stays below when it does not fit either way but below has more room", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(300, 1000),
      menuSize: { width: 220, height: 900 },
      viewport,
    });
    expect(pos.placement).toBe("bottom");
    expect(pos.maxHeight).toBe(800 - 336 - 4 - 8);
  });

  it("caps an above-placed menu to the available space and keeps it on screen", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(600, 1000),
      menuSize: { width: 220, height: 900 },
      viewport,
    });
    expect(pos.placement).toBe("top");
    expect(pos.top).toBe(8);
    expect(pos.maxHeight).toBe(588);
  });

  it("clamps to the left margin when the trigger is near the left edge", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(100, 10),
      menuSize: { width: 220, height: 100 },
      viewport,
    });
    expect(pos.left).toBe(8);
  });

  it("clamps to the right margin when the trigger is past the right edge (scrolled table)", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(100, 1400),
      menuSize: { width: 220, height: 100 },
      viewport,
    });
    expect(pos.left).toBe(1280 - 220 - 8);
  });

  it("pins to the left margin when the menu is wider than the viewport", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(100, 300),
      menuSize: { width: 400 },
      viewport: { width: 360, height: 640 },
    });
    expect(pos.left).toBe(8);
  });

  it("treats a missing or zero menu size as an empty menu below the trigger", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(100, 1000),
      menuSize: undefined,
      viewport,
    });
    expect(pos).toEqual({ top: 140, left: 1036, maxHeight: 652, placement: "bottom" });
  });

  it("never reports negative space", () => {
    const pos = computeFloatingMenuPosition({
      anchorRect: rect(-50, 1000),
      menuSize: { width: 220, height: 100 },
      viewport: { width: 1280, height: 0 },
    });
    expect(pos.maxHeight).toBeGreaterThanOrEqual(0);
  });
});
