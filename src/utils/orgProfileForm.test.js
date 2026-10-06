import {
  normalizeEmployeeCodePrefix,
  orgFormToPayload,
  profileToForm,
  validateOrgProfile,
} from "./orgProfileForm";

const valid = {
  name: "Aameego Tech",
  employeeCodePrefix: "AMG",
  companyAddress: "12 MG Road, Bengaluru 560001",
  contactEmail: "hr@aameego.com",
  signatoryName: "Priya Sharma",
  signatoryTitle: "Head - HR",
};

describe("profileToForm", () => {
  test("copies editable fields and defaults missing values to empty strings", () => {
    expect(profileToForm({ name: "Org", code: "X1", logoUrl: "a.png" })).toEqual({
      name: "Org",
      employeeCodePrefix: "",
      companyAddress: "",
      contactEmail: "",
      signatoryName: "",
      signatoryTitle: "",
    });
  });

  test("handles a missing profile", () => {
    expect(profileToForm(null).name).toBe("");
  });
});

describe("normalizeEmployeeCodePrefix", () => {
  test("uppercases, strips symbols and caps at 6 chars", () => {
    expect(normalizeEmployeeCodePrefix("am-g 12345")).toBe("AMG123");
    expect(normalizeEmployeeCodePrefix(null)).toBe("");
  });
});

describe("validateOrgProfile", () => {
  test("accepts a complete valid profile", () => {
    expect(validateOrgProfile(valid)).toEqual({ valid: true, errors: {} });
  });

  test("signatory, address and email are optional", () => {
    const result = validateOrgProfile({ ...valid, companyAddress: "", contactEmail: "", signatoryName: "", signatoryTitle: "" });
    expect(result.valid).toBe(true);
  });

  test("organization name is required", () => {
    expect(validateOrgProfile({ ...valid, name: "  " }).errors.name).toMatch(/Organization name/);
  });

  test.each(["A", "ABCDEFG", ""])("rejects prefix %p outside 2–6 chars", (prefix) => {
    expect(validateOrgProfile({ ...valid, employeeCodePrefix: prefix }).errors.employeeCodePrefix).toBeTruthy();
  });

  test.each(["AB", "123456"])("accepts prefix %p at the boundaries", (prefix) => {
    expect(validateOrgProfile({ ...valid, employeeCodePrefix: prefix }).valid).toBe(true);
  });

  test("rejects an invalid contact email", () => {
    expect(validateOrgProfile({ ...valid, contactEmail: "hr@" }).errors.contactEmail).toBeTruthy();
  });

  test("rejects digits and symbols in the signatory name", () => {
    expect(validateOrgProfile({ ...valid, signatoryName: "Priya 2" }).errors.signatoryName).toMatch(/signatory name/i);
  });

  test("rejects markup in the address and designation", () => {
    const result = validateOrgProfile({ ...valid, companyAddress: "<script>x</script>", signatoryTitle: "<b>HR</b>" });
    expect(result.errors.companyAddress).toBeTruthy();
    expect(result.errors.signatoryTitle).toBeTruthy();
  });

  test("rejects an address over 500 characters", () => {
    expect(validateOrgProfile({ ...valid, companyAddress: "a".repeat(501) }).errors.companyAddress).toMatch(/500/);
  });
});

describe("orgFormToPayload", () => {
  test("trims every field and sends blanks so fields can be cleared", () => {
    expect(orgFormToPayload({ ...valid, name: "  Org  ", signatoryName: "" })).toMatchObject({
      name: "Org",
      signatoryName: "",
    });
  });
});
