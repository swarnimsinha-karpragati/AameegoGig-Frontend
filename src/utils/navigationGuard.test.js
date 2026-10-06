import { registerNavigationGuard, requestNavigation, syncNavigationIndex } from "./navigationGuard";

const nextPop = () => new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

describe("requestNavigation", () => {
  it("runs the navigation at once when nothing guards it", () => {
    const proceed = jest.fn();
    expect(requestNavigation(proceed)).toBe(true);
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it("hands the navigation to the active guard instead of running it", () => {
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    const proceed = jest.fn();
    expect(requestNavigation(proceed)).toBe(false);
    expect(proceed).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(proceed);
    request.mock.calls[0][0]();
    expect(proceed).toHaveBeenCalledTimes(1);
    unregister();
    requestNavigation(proceed);
    expect(proceed).toHaveBeenCalledTimes(2);
  });

  it("an old guard unregistering never removes a newer one", () => {
    const first = registerNavigationGuard(jest.fn());
    const second = jest.fn();
    const unregisterSecond = registerNavigationGuard(second);
    first();
    requestNavigation(jest.fn());
    expect(second).toHaveBeenCalledTimes(1);
    unregisterSecond();
  });
});

describe("browser Back / Forward while guarded", () => {
  let routerPops;
  const routerListener = () => routerPops.push(window.location.pathname);

  beforeEach(async () => {
    routerPops = [];
    window.history.replaceState({ idx: 0 }, "", "/acme/dashboard");
    window.history.pushState({ idx: 1 }, "", "/acme/letters?manage=1&template=new");
    window.addEventListener("popstate", routerListener);
  });

  afterEach(() => {
    window.removeEventListener("popstate", routerListener);
  });

  it("keeps the router from seeing Back, restores the URL and asks the guard", async () => {
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    window.history.back();
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(routerPops).toEqual([]);
    expect(window.location.pathname + window.location.search).toBe("/acme/letters?manage=1&template=new");

    request.mock.calls[0][0]();
    await settle();
    expect(routerPops).toEqual(["/acme/dashboard"]);
    expect(window.location.pathname).toBe("/acme/dashboard");
    unregister();
  });

  it("staying on the page leaves the URL and router untouched", async () => {
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    window.history.back();
    await settle();
    expect(routerPops).toEqual([]);
    expect(window.location.search).toBe("?manage=1&template=new");
    unregister();
    window.history.back();
    await nextPop();
    expect(routerPops).toEqual(["/acme/dashboard"]);
  });

  it("uses the latest entry index after in-page navigation", async () => {
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    window.history.pushState({ idx: 2 }, "", "/acme/letters?manage=1&template=t9");
    syncNavigationIndex();
    window.history.go(-2);
    await settle();
    expect(window.location.search).toBe("?manage=1&template=t9");
    request.mock.calls[0][0]();
    await settle();
    expect(window.location.pathname).toBe("/acme/dashboard");
    unregister();
  });

  // The page re-renders (and re-syncs) as soon as the dialog opens, while the restoring
  // history move is still in flight: `request` syncing synchronously reproduces that.
  const requestThatResyncs = () => jest.fn(() => syncNavigationIndex());

  it("a second Back while the dialog is open asks again and the router sees nothing", async () => {
    const request = requestThatResyncs();
    const unregister = registerNavigationGuard(request);
    window.history.back();
    await settle();
    expect(window.location.search).toBe("?manage=1&template=new");

    window.history.back();
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(routerPops).toEqual([]);
    expect(window.location.search).toBe("?manage=1&template=new");

    request.mock.calls[1][0]();
    await settle();
    expect(routerPops).toEqual(["/acme/dashboard"]);
    unregister();
  });

  it("Confirm clicked before the restoring move lands still leaves exactly once", async () => {
    const request = jest.fn((proceed) => {
      syncNavigationIndex();
      proceed();
    });
    const unregister = registerNavigationGuard(request);
    window.history.back();
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(routerPops).toEqual(["/acme/dashboard"]);
    expect(window.location.pathname).toBe("/acme/dashboard");
    unregister();
  });

  it("browser Forward is guarded the same way", async () => {
    window.history.pushState({ idx: 2 }, "", "/acme/employees");
    window.history.back();
    await nextPop();
    routerPops = [];
    const request = requestThatResyncs();
    const unregister = registerNavigationGuard(request);

    window.history.forward();
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(routerPops).toEqual([]);
    expect(window.location.search).toBe("?manage=1&template=new");

    request.mock.calls[0][0]();
    await settle();
    expect(routerPops).toEqual(["/acme/employees"]);
    expect(window.location.pathname).toBe("/acme/employees");
    unregister();
  });

  it("Keep editing, then Back again, asks again", async () => {
    const request = requestThatResyncs();
    const unregister = registerNavigationGuard(request);
    window.history.back();
    await settle();
    syncNavigationIndex(); // "Keep editing" closes the dialog and re-renders

    window.history.back();
    await settle();
    expect(request).toHaveBeenCalledTimes(2);
    expect(routerPops).toEqual([]);
    expect(window.location.search).toBe("?manage=1&template=new");
    unregister();
  });

  it("a pop that does not move while guarded is hidden from the router", async () => {
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 1 } }));
    await settle();
    expect(request).not.toHaveBeenCalled();
    expect(routerPops).toEqual([]);
    unregister();
  });

  it("lets Back through untouched when no guard is active", async () => {
    window.history.back();
    await nextPop();
    expect(routerPops).toEqual(["/acme/dashboard"]);
  });
});
