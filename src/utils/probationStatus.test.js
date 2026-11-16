import { effectiveEmploymentStatus, isOnProbation } from "./probationStatus";

describe("probationStatus", () => {
  it("keeps active probation when end date is in the future", () => {
    const emp = {
      employmentStatus: "probation",
      probationEndDate: "2099-12-31",
    };
    expect(isOnProbation(emp, new Date("2026-03-13T10:00:00+05:30"))).toBe(true);
    expect(effectiveEmploymentStatus(emp)).toBe("probation");
  });

  it("treats sticky probation with past end date as full-time", () => {
    const emp = {
      employmentStatus: "probation",
      probationEndDate: "2020-01-15",
    };
    expect(isOnProbation(emp, new Date("2026-03-13T10:00:00+05:30"))).toBe(false);
    expect(
      effectiveEmploymentStatus(emp, new Date("2026-03-13T10:00:00+05:30"))
    ).toBe("full-time");
  });

  it("respects explicit full-time status", () => {
    expect(
      isOnProbation({
        employmentStatus: "full-time",
        probationEndDate: "2099-12-31",
      })
    ).toBe(false);
  });
});
