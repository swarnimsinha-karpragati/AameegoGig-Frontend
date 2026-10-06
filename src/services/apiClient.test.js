import API from "./apiClient";
import { onAuthCleared, setAuthData } from "../utils/authStorage";

const rejectWith401 = (config = {}) =>
  API.interceptors.response.handlers[0].rejected({ response: { status: 401 }, config });

describe("apiClient 401 handling", () => {
  const originalLocation = window.location;
  beforeEach(() => {
    delete window.location;
    window.location = { pathname: "/acme/letters", href: "/acme/letters" };
  });
  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
    sessionStorage.clear();
  });

  test("a 401 clears auth through the shared logout helper (both storages, listeners run)", async () => {
    setAuthData("token-b", { role: "HR" }, false);
    const cleared = jest.fn();
    const stop = onAuthCleared(cleared);
    await expect(rejectWith401()).rejects.toBeDefined();
    stop();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  test("login-form 401s keep auth state and do not redirect", async () => {
    setAuthData("token-b", { role: "HR" }, true);
    await expect(rejectWith401({ skipAuthRedirect: true })).rejects.toBeDefined();
    expect(localStorage.getItem("token")).toBe("token-b");
    expect(window.location.href).toBe("/acme/letters");
  });
});
