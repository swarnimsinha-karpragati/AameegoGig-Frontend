import {
  validateDemoRequestPayload,
  normalizePhone,
  PHONE_MIN_DIGITS,
  PHONE_MAX_DIGITS,
} from "./demoRequestValidation";

const validPayload = {
  fullName: "Priya Sharma",
  email: "priya@company.com",
  company: "Acme Pvt. Ltd.",
  phone: "+91 98765 43210",
  teamSize: "1–20 employees",
  workforceType: "Both",
  goal: "Manual payroll and attendance for field teams",
};

describe("demoRequestValidation (frontend)", () => {
  test("accepts a complete demo request including +91 phone", () => {
    const result = validateDemoRequestPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.values.phone).toBe("9876543210");
  });

  test("rejects missing required fields", () => {
    const result = validateDemoRequestPayload({});
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toMatch(/required/i);
    expect(result.errors.email).toMatch(/required/i);
    expect(result.errors.company).toMatch(/required/i);
    expect(result.errors.phone).toMatch(/required/i);
    expect(result.errors.goal).toMatch(/required/i);
  });

  test("accepts single-word names, international phones and short goals", () => {
    const result = validateDemoRequestPayload({
      ...validPayload,
      fullName: "Priya",
      phone: "+1 415 555 2671",
      goal: "Payroll",
    });
    expect(result.valid).toBe(true);
    expect(result.values.phone).toBe("14155552671");
  });

  test("rejects digits in the name and letters in the phone", () => {
    const result = validateDemoRequestPayload({
      ...validPayload,
      fullName: "Priya123",
      phone: "98abc76543",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toMatch(/only letters/i);
    expect(result.errors.phone).toMatch(/only numbers/i);
  });

  test("rejects a too-short phone and an invalid team size", () => {
    const result = validateDemoRequestPayload({
      ...validPayload,
      teamSize: "thousands",
      phone: "12345",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.teamSize).toMatch(/valid option/i);
    expect(result.errors.phone).toMatch(
      new RegExp(`${PHONE_MIN_DIGITS}.*${PHONE_MAX_DIGITS}`)
    );
  });

  test("rejects unsafe characters and invalid email", () => {
    const result = validateDemoRequestPayload({
      ...validPayload,
      email: "not-an-email",
      company: "<Acme>",
      goal: "Need <script> payroll help now please",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toMatch(/valid email/i);
    expect(result.errors.company).toMatch(/invalid or unsafe/i);
    expect(result.errors.goal).toMatch(/invalid or unsafe/i);
  });

  test("normalizes leading 0 and 91 country code", () => {
    expect(normalizePhone("09876543210")).toBe("9876543210");
    expect(normalizePhone("919876543210")).toBe("9876543210");
  });
});
