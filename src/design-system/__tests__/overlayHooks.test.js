import { listKeyTarget } from "../overlayHooks";

describe("listKeyTarget", () => {
  it("moves through a list with wrapping arrows, Home and End", () => {
    expect(listKeyTarget("ArrowDown", 0, 3)).toBe(1);
    expect(listKeyTarget("ArrowDown", 2, 3)).toBe(0);
    expect(listKeyTarget("ArrowUp", 0, 3)).toBe(2);
    expect(listKeyTarget("ArrowUp", 2, 3)).toBe(1);
    expect(listKeyTarget("Home", 2, 3)).toBe(0);
    expect(listKeyTarget("End", 0, 3)).toBe(2);
  });

  it("starts from the edges when nothing is active yet", () => {
    expect(listKeyTarget("ArrowDown", -1, 3)).toBe(0);
    expect(listKeyTarget("ArrowUp", -1, 3)).toBe(2);
  });

  it("returns null for other keys or an empty list", () => {
    expect(listKeyTarget("Enter", 0, 3)).toBeNull();
    expect(listKeyTarget("a", 0, 3)).toBeNull();
    expect(listKeyTarget("ArrowDown", 0, 0)).toBeNull();
  });
});
