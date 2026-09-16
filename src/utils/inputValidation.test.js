import {
  inferFieldKind,
  validateField,
  validateFields,
  LIMITS,
} from "./inputValidation";

describe("inputValidation (frontend)", () => {
  test("infers field kind from label text", () => {
    expect(inferFieldKind({ label: "Annual CTC (₹)" })).toBe("currency_annual");
    expect(inferFieldKind({ label: "Employee Email" })).toBe("email");
    expect(inferFieldKind({ label: "IFSC Code" })).toBe("ifsc");
  });

  test("validates required email", () => {
    expect(validateField({ label: "Email", value: "", required: true })).toMatch(/required/i);
    expect(validateField({ label: "Email", value: "a@b.com", required: true })).toBeNull();
  });

  test("validates currency from label without explicit kind", () => {
    expect(validateField({ label: "Monthly Amount", value: -1 })).toMatch(/cannot be less/i);
    expect(
      validateField({ label: "Monthly Amount", value: LIMITS.MONTHLY_AMOUNT_MAX + 1 })
    ).toMatch(/cannot exceed/i);
  });

  test("validateFields aggregates errors", () => {
    const { valid, errors } = validateFields([
      { name: "panNumber", label: "PAN", value: "BAD" },
      { name: "ifscCode", label: "IFSC", value: "BAD" },
    ]);
    expect(valid).toBe(false);
    expect(errors.panNumber).toBeTruthy();
    expect(errors.ifscCode).toBeTruthy();
  });

  test("accepts half working days such as 27.5", () => {
    expect(inferFieldKind({ label: "Total Working Days" })).toBe("attendance_days");
    expect(
      validateField({
        name: "totalWorkingDays",
        label: "Total Working Days",
        value: 27.5,
        required: true,
      })
    ).toBeNull();
    expect(
      validateField({ label: "Total Working Days", value: 27.25, required: true })
    ).toMatch(/half days/i);
  });
});
