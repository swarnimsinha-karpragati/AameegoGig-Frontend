import { getNavigationType, isInitialReload, readBootKey } from "./initialReload";

describe("readBootKey", () => {
  afterEach(() => window.history.replaceState(null, ""));

  it("is the router key stored in history state, which survives a refresh", () => {
    window.history.replaceState({ usr: null, key: "abc", idx: 0 }, "");
    expect(readBootKey()).toBe("abc");
  });

  it("is 'default' for a typed URL with no history state", () => {
    window.history.replaceState(null, "");
    expect(readBootKey()).toBe("default");
  });
});

describe("boot key is captured once when the module loads", () => {
  afterEach(() => window.history.replaceState(null, ""));

  it("keeps the key from load time even after history state changes", () => {
    window.history.replaceState({ key: "abc" }, "");
    let mod;
    jest.isolateModules(() => {
      mod = require("./initialReload");
    });
    window.history.replaceState({ key: "later" }, "");
    expect(mod.isInitialReload({ key: "abc" }, { navigationType: "reload" })).toBe(true);
    expect(mod.isInitialReload({ key: "later" }, { navigationType: "reload" })).toBe(false);
  });
});

describe("isInitialReload", () => {
  it("refreshing a page reached by in-app navigation: true for the stored key, false for later keys", () => {
    expect(isInitialReload({ key: "abc" }, { navigationType: "reload", bootKey: "abc" })).toBe(true);
    expect(isInitialReload({ key: "x7k2p" }, { navigationType: "reload", bootKey: "abc" })).toBe(false);
    expect(isInitialReload({ key: "default" }, { navigationType: "reload", bootKey: "abc" })).toBe(false);
  });

  it("refreshing a typed URL uses the default key", () => {
    expect(isInitialReload({ key: "default" }, { navigationType: "reload", bootKey: "default" })).toBe(true);
    expect(isInitialReload({ key: "x7k2p" }, { navigationType: "reload", bootKey: "default" })).toBe(false);
  });

  it("is false for normal visits and back/forward", () => {
    expect(isInitialReload({ key: "abc" }, { navigationType: "navigate", bootKey: "abc" })).toBe(false);
    expect(isInitialReload({ key: "abc" }, { navigationType: "back_forward", bootKey: "abc" })).toBe(false);
    expect(isInitialReload(undefined, { navigationType: "reload", bootKey: "default" })).toBe(false);
  });
});

describe("getNavigationType", () => {
  const original = window.performance;
  const setPerformance = (value) => Object.defineProperty(window, "performance", { value, configurable: true, writable: true });
  afterEach(() => setPerformance(original));

  it("reads the Navigation Timing entry", () => {
    setPerformance({ getEntriesByType: () => [{ type: "reload" }] });
    expect(getNavigationType()).toBe("reload");
    setPerformance({ getEntriesByType: () => [{ type: "navigate" }] });
    expect(getNavigationType()).toBe("navigate");
  });

  it("falls back to the legacy navigation API", () => {
    setPerformance({ getEntriesByType: () => [], navigation: { type: 1 } });
    expect(getNavigationType()).toBe("reload");
    setPerformance({ getEntriesByType: () => [], navigation: { type: 0 } });
    expect(getNavigationType()).toBe("navigate");
  });

  it("never throws when the API is missing", () => {
    setPerformance(undefined);
    expect(getNavigationType()).toBe("navigate");
    setPerformance({ getEntriesByType: () => { throw new Error("blocked"); } });
    expect(getNavigationType()).toBe("navigate");
  });
});
