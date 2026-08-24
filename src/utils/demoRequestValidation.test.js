import {
  validateDemoRequestPayload,
  normalizePhone,
  GOAL_MIN_LENGTH,
} from "./demoRequestValidation";

const validPayload = {
  fullName: "Priya Sharma",
  email: "priya@company.com",
  company: "Acme Pvt. Ltd.",
  phone: "+91 98765 43210",
  teamSize: "1–50",
  workforceType: "Hybrid",
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

  test("rejects a one-word name, personal-format phone, and short goal", () => {
    const result = validateDemoRequestPayload({
      ...validPayload,
      fullName: "Priya",
      phone: "1234567890",
      goal: "Payroll",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toMatch(/first and last/i);
    expect(result.errors.phone).toMatch(/indian mobile/i);
    expect(result.errors.goal).toMatch(new RegExp(String(GOAL_MIN_LENGTH)));
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
