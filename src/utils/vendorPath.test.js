import { replaceVendorSegment, toVendorSlug, vendorDashboardPath, vendorScopedPath } from "./vendorPath";

describe("vendorScopedPath", () => {
  it("prefixes the path with the current vendor segment", () => {
    expect(vendorScopedPath({ pathname: "/acme/letters" }, "/settings?tab=organization")).toBe(
      "/acme/settings?tab=organization"
    );
  });

  it("returns the bare path without a vendor segment", () => {
    expect(vendorScopedPath({ pathname: "/" }, "/settings")).toBe("/settings");
    expect(vendorScopedPath(null, "/settings")).toBe("/settings");
  });
});

describe("toVendorSlug", () => {
  it("lowercases, hyphenates whitespace and strips slashes", () => {
    expect(toVendorSlug("  Repro Payroll / 274652 ")).toBe("repro-payroll-274652");
  });

  it("returns empty string for missing names", () => {
    expect(toVendorSlug(undefined)).toBe("");
    expect(toVendorSlug("   ")).toBe("");
  });
});

describe("vendorDashboardPath", () => {
  it("builds the vendor dashboard path", () => {
    expect(vendorDashboardPath({ vendorName: "Acme Corp" })).toBe("/acme-corp/dashboard");
  });

  it("falls back to /dashboard without a vendor", () => {
    expect(vendorDashboardPath(null)).toBe("/dashboard");
  });
});

describe("replaceVendorSegment", () => {
  const vendor = "repro-payroll-274652";

  it("swaps the vendor segment without search or hash", () => {
    expect(replaceVendorSegment({ pathname: "/AMG4288/letters" }, vendor)).toBe(
      "/repro-payroll-274652/letters"
    );
  });

  it("preserves the query string", () => {
    expect(
      replaceVendorSegment({ pathname: "/AMG4288/letters", search: "?tab=issued" }, vendor)
    ).toBe("/repro-payroll-274652/letters?tab=issued");
  });

  it("preserves query string and hash together", () => {
    expect(
      replaceVendorSegment(
        { pathname: "/AMG4288/settings", search: "?tab=organization", hash: "#branding" },
        vendor
      )
    ).toBe("/repro-payroll-274652/settings?tab=organization#branding");
  });

  it("preserves a hash without search", () => {
    expect(replaceVendorSegment({ pathname: "/AMG4288/employees", search: "", hash: "#top" }, vendor)).toBe(
      "/repro-payroll-274652/employees#top"
    );
  });

  it("keeps nested paths intact", () => {
    expect(
      replaceVendorSegment({ pathname: "/AMG4288/leave/policy/", search: "?x=1" }, vendor)
    ).toBe("/repro-payroll-274652/leave/policy?x=1");
  });

  it("handles an empty remaining path", () => {
    expect(replaceVendorSegment({ pathname: "/AMG4288", search: "?a=b" }, vendor)).toBe(
      "/repro-payroll-274652/?a=b"
    );
  });

  it("returns null when the vendor already matches", () => {
    expect(
      replaceVendorSegment({ pathname: `/${vendor}/letters`, search: "?tab=issued" }, vendor)
    ).toBeNull();
  });

  it("returns null for root path or missing vendor code", () => {
    expect(replaceVendorSegment({ pathname: "/" }, vendor)).toBeNull();
    expect(replaceVendorSegment({ pathname: "/AMG4288/letters" }, "")).toBeNull();
  });
});
