import { currentUserToStore, clearAuthData, getOrganisations, replaceAuthSession } from "./authStorage";
import { organisationsForSwitcher } from "./organisationSwitch";

describe("organisationsForSwitcher", () => {
  const organisations = [
    { code: "amg6865", name: "Genex IT" },
    { code: "AMG6864", name: "Genex" },
  ];

  test("hides the switcher for a single organisation", () => {
    expect(organisationsForSwitcher([organisations[1]], "AMG6864")).toEqual([]);
    expect(organisationsForSwitcher([], "AMG6864")).toEqual([]);
  });

  test("puts the current organisation first", () => {
    expect(organisationsForSwitcher(organisations, "amg6864").map((org) => org.code)).toEqual([
      "AMG6864",
      "AMG6865",
    ]);
  });
});

describe("organisation session storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("a switch replaces the session and a logout removes the organisation list", () => {
    localStorage.setItem("token", "token-a");
    localStorage.setItem("user", JSON.stringify({ vendor_code: "AMG6864" }));
    replaceAuthSession("token-b", { vendor_code: "AMG6865" }, [
      { code: "AMG6864", name: "Genex" },
      { code: "AMG6865", name: "Genex IT" },
    ]);

    expect(localStorage.getItem("token")).toBe("token-b");
    expect(getOrganisations().map((org) => org.code)).toEqual(["AMG6864", "AMG6865"]);

    clearAuthData();
    expect(getOrganisations()).toEqual([]);
    expect(localStorage.getItem("token")).toBeNull();
  });

  test("a late profile response from the previous organisation is ignored", () => {
    const previous = { user: { vendor_code: "AMG6864", name: "Old" } };
    expect(currentUserToStore(previous, "token-a", "token-b")).toBeNull();
    expect(currentUserToStore(previous, "token-b", "token-b").vendor_code).toBe("AMG6864");
  });
});
