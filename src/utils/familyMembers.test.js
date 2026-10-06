import {
  MAX_FAMILY_MEMBERS,
  coverageLabel,
  createEmptyFamilyMember,
  familyMemberErrorMap,
  familyMembersToForm,
  formatFamilyDob,
  localToday,
  mergeFamilyMemberErrors,
  validateFamilyMembers,
} from "./familyMembers";

const TODAY = "2026-10-05";
const member = (overrides = {}) => ({
  name: "Sita Devi",
  relation: "Wife",
  dob: "1990-04-12",
  coverage: "ESIC",
  ...overrides,
});
const validate = (list) => validateFamilyMembers(list, { today: TODAY });
const fieldsOf = (list) => validate(list).errors.map((e) => e.field);

describe("validateFamilyMembers", () => {
  it("treats missing or empty input as a valid empty list", () => {
    [undefined, null, "", []].forEach((input) => {
      expect(validate(input)).toEqual({ members: [], errors: [] });
    });
  });

  it("normalizes a valid list", () => {
    const { members, errors } = validate([
      member({ name: "  Sita   Devi ", coverage: "medical" }),
      member({ name: "Ravi", relation: "Son", dob: "2018-01-01T00:00:00.000Z", coverage: "BOTH" }),
    ]);
    expect(errors).toEqual([]);
    expect(members).toEqual([
      { name: "Sita Devi", relation: "Wife", dob: "1990-04-12", coverage: "MEDICAL" },
      { name: "Ravi", relation: "Son", dob: "2018-01-01", coverage: "BOTH" },
    ]);
  });

  it("ignores a freshly added blank row", () => {
    expect(validate([member(), createEmptyFamilyMember()])).toEqual({
      members: [{ name: "Sita Devi", relation: "Wife", dob: "1990-04-12", coverage: "ESIC" }],
      errors: [],
    });
  });

  it("reports every missing field of a partial row at its original position", () => {
    const { errors } = validate([createEmptyFamilyMember(), { name: "Ravi" }]);
    expect(errors.map((e) => e.field)).toEqual([
      "familyMembers.1.relation",
      "familyMembers.1.dob",
      "familyMembers.1.coverage",
    ]);
    expect(errors[2].message).toMatch(/choose ESIC, Medical Insurance or Both/);
  });

  it("rejects names with digits or unsafe characters", () => {
    expect(fieldsOf([member({ name: "Ravi2" })])).toEqual(["familyMembers.0.name"]);
    expect(fieldsOf([member({ name: "<b>Ravi</b>" })])).toEqual(["familyMembers.0.name"]);
  });

  it("rejects unknown relation and coverage values", () => {
    expect(fieldsOf([member({ relation: "Friend", coverage: "PF" })])).toEqual([
      "familyMembers.0.relation",
      "familyMembers.0.coverage",
    ]);
  });

  it("validates dob boundaries (today allowed, future / invalid / pre-1900 rejected)", () => {
    expect(validate([member({ relation: "Son", dob: TODAY })]).errors).toEqual([]);
    expect(validate([member({ dob: "2026-10-06" })]).errors[0].message).toMatch(/future/);
    expect(validate([member({ dob: "garbage" })]).errors[0].message).toMatch(/valid date/);
    expect(validate([member({ dob: "1899-12-31" })]).errors[0].message).toMatch(/after 1900/);
  });

  it("allows only one spouse, one father and one mother", () => {
    expect(
      fieldsOf([
        member({ name: "A", relation: "Husband" }),
        member({ name: "B", relation: "Wife" }),
        member({ name: "C", relation: "Mother", dob: "1960-01-01" }),
        member({ name: "D", relation: "Mother", dob: "1962-01-01" }),
        member({ name: "E", relation: "Daughter", dob: "2015-01-01" }),
        member({ name: "F", relation: "Daughter", dob: "2016-01-01" }),
      ])
    ).toEqual(["familyMembers.1.relation", "familyMembers.3.relation"]);
  });

  it("rejects the same person (name + dob) twice", () => {
    expect(
      fieldsOf([
        member({ name: "Ravi", relation: "Son", dob: "2015-01-01" }),
        member({ name: "RAVI", relation: "Son", dob: "2015-01-01" }),
      ])
    ).toEqual(["familyMembers.1.name"]);
  });

  it("tags cross-row errors with the row fields that trigger them", () => {
    const { errors } = validate([
      member({ name: "Ravi", relation: "Father", dob: "1960-01-01" }),
      member({ name: "ravi", relation: "Father", dob: "1960-01-01" }),
    ]);
    expect(errors).toEqual([
      {
        field: "familyMembers.1.relation",
        message: "Family member 2: Father is already added",
        inputs: ["familyMembers.1.relation"],
      },
      {
        field: "familyMembers.1.name",
        message: "Family member 2 is a duplicate of an earlier entry",
        inputs: ["familyMembers.1.name", "familyMembers.1.dob"],
      },
    ]);
  });

  it(`caps the list at ${MAX_FAMILY_MEMBERS} members`, () => {
    const rows = Array.from({ length: MAX_FAMILY_MEMBERS + 1 }, (_, i) =>
      member({ name: `Child ${"abcdefghijk"[i]}`, relation: "Son", dob: `20${10 + i}-01-01` })
    );
    expect(fieldsOf(rows)).toEqual(["familyMembers"]);
    expect(validate(rows.slice(0, MAX_FAMILY_MEMBERS)).errors).toEqual([]);
  });
});

describe("form helpers", () => {
  it("familyMemberErrorMap keys first error per field", () => {
    expect(familyMemberErrorMap([{ name: "Ravi", relation: "Son", dob: "2015-01-01" }], { today: TODAY })).toEqual({
      "familyMembers.0.coverage": "Family member 1: choose ESIC, Medical Insurance or Both",
    });
  });

  it("familyMembersToForm maps API rows to editable rows", () => {
    expect(
      familyMembersToForm([{ name: "Sita", relation: "Wife", dob: "1990-04-12T00:00:00.000Z", coverage: "ESIC" }])
    ).toEqual([{ name: "Sita", relation: "Wife", dob: "1990-04-12", coverage: "ESIC" }]);
    expect(familyMembersToForm(undefined)).toEqual([]);
  });

  it("formats dob and coverage for display", () => {
    expect(formatFamilyDob("1990-04-12T00:00:00.000Z")).toBe("12-04-1990");
    expect(formatFamilyDob("")).toBe("-");
    expect(coverageLabel("MEDICAL")).toBe("Medical Insurance");
    expect(coverageLabel("BOTH")).toBe("Both (ESIC & Medical)");
  });

  describe("mergeFamilyMemberErrors", () => {
    const opts = { today: TODAY };
    const partial = [{ name: "Ravi2", relation: "", dob: "", coverage: "" }];

    it("shows only the touched field's error, keeping unrelated form errors", () => {
      expect(
        mergeFamilyMemberErrors({ email: "Invalid email" }, partial, { touched: "familyMembers.0.name" }, opts)
      ).toEqual({
        email: "Invalid email",
        "familyMembers.0.name": "Family member 1 name must contain only letters and spaces",
      });
    });

    it("keeps a shown error while it still fails and drops it once fixed", () => {
      const prev = { "familyMembers.0.relation": "Family member 1 relation is required" };
      expect(mergeFamilyMemberErrors(prev, partial, { touched: "familyMembers.0.name" }, opts)).toHaveProperty(
        ["familyMembers.0.relation"]
      );
      const fixed = [{ ...partial[0], relation: "Son" }];
      expect(mergeFamilyMemberErrors(prev, fixed, { touched: "familyMembers.0.relation" }, opts)).not.toHaveProperty(
        ["familyMembers.0.relation"]
      );
    });

    describe("cross-row duplicate rule", () => {
      const ravi = { name: "Ravi Kumar", relation: "Son", dob: "2018-01-01", coverage: "ESIC" };
      const DUP = "Family member 2 is a duplicate of an earlier entry";

      it("surfaces the duplicate error on name when dob is the field that creates it", () => {
        const rows = [ravi, { name: "ravi kumar", relation: "Son", dob: "2018-01-01", coverage: "" }];
        expect(mergeFamilyMemberErrors({}, rows, { touched: "familyMembers.1.dob" }, opts)).toEqual({
          "familyMembers.1.name": DUP,
        });
      });

      it("touching dob on a non-duplicate half-filled row does not show unrelated required errors", () => {
        const rows = [ravi, { name: "", relation: "", dob: "2018-01-01", coverage: "" }];
        expect(mergeFamilyMemberErrors({}, rows, { touched: "familyMembers.1.dob" }, opts)).toEqual({});
        const named = [ravi, { name: "Ravi Kumar", relation: "", dob: "2019-05-05", coverage: "" }];
        expect(mergeFamilyMemberErrors({}, named, { touched: "familyMembers.1.dob" }, opts)).toEqual({});
      });

      it("clears the duplicate error once dob is changed to a different date", () => {
        const prev = { "familyMembers.1.name": DUP };
        const fixed = [ravi, { name: "ravi kumar", relation: "Son", dob: "2019-05-05", coverage: "" }];
        expect(mergeFamilyMemberErrors(prev, fixed, { touched: "familyMembers.1.dob" }, opts)).toEqual({});
      });

      it("does not surface a different name error through the duplicate rule", () => {
        const rows = [ravi, { name: "", relation: "Son", dob: "2018-01-01", coverage: "" }];
        expect(mergeFamilyMemberErrors({}, rows, { touched: "familyMembers.1.dob" }, opts)).toEqual({});
      });
    });

    it("clears row errors when a row is removed (indexes shift)", () => {
      const prev = { phone: "Bad", "familyMembers.1.dob": "Family member 2 date of birth is required" };
      expect(mergeFamilyMemberErrors(prev, partial, { removedIndex: 0 }, opts)).toEqual({ phone: "Bad" });
    });
  });

  it("localToday uses the local calendar date", () => {
    expect(localToday(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09");
  });
});
