import { getRepaymentLabel, getTypeLabel, rejectionReasonOf } from "./advanceLoanLabels";

describe("advance loan table labels", () => {
  test("names the request type", () => {
    expect(getTypeLabel("ADVANCE")).toBe("Advance");
    expect(getTypeLabel("LOAN")).toBe("Loan");
  });

  test("keeps a short repayment cell so TYPE–PRIORITY can share a phone row", () => {
    expect(
      getRepaymentLabel(
        { repaymentOption: "MONTHLY_INSTALLMENTS", totalInstallments: 12 },
        { compact: true }
      )
    ).toBe("Monthly · 12 mo");
    expect(
      getRepaymentLabel({ repaymentOption: "ONE_TIME", tenure: 6 }, { compact: true })
    ).toBe("One-time · 6 mo");
  });

  test("reads a rejection reason without putting it in the table cell", () => {
    expect(
      rejectionReasonOf({
        rejectionReason: "Amount exceeds policy for this grade and site.",
      })
    ).toBe("Amount exceeds policy for this grade and site.");
    expect(rejectionReasonOf({ reasonForRejection: "  Duplicate  " })).toBe("Duplicate");
    expect(rejectionReasonOf({ status: "REJECTED" })).toBe("");
  });

  test("keeps the long wording on detail screens", () => {
    expect(
      getRepaymentLabel({ repaymentOption: "MONTHLY_INSTALLMENTS", totalInstallments: 12 })
    ).toBe("Monthly Installments (12 months)");
  });
});
