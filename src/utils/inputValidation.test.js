import {
  inferFieldKind,
  validateField,
  validateFields,
  LIMITS,
  UNSAFE_PROSE_REGEX,
} from "./inputValidation";

describe("long_text / prose — identical cases in the backend tests/inputValidation.test.js", () => {
  const CASES = [
    ["", { required: true }, "Reason is required"],
    ["   ", { required: true }, "Reason is required"],
    ["", {}, null],
    ["ab", { min: 5 }, "Reason must be at least 5 characters"],
    ["  ab  ", { min: 3 }, "Reason must be at least 3 characters"],
    ["abcde", { min: 5 }, null],
    ["a".repeat(2000), {}, null],
    ["a".repeat(2001), {}, "Reason must be at most 2000 characters"],
    ["abcdef", { maxLength: 5 }, "Reason must be at most 5 characters"],
    ["a<", { min: 5 }, "Reason contains invalid or unsafe characters"],
    ["<b>x</b>", {}, "Reason contains invalid or unsafe characters"],
    ["Dear {{employeeName}}", {}, "Reason contains invalid or unsafe characters"],
    ["see javascript:alert(1)", {}, "Reason contains invalid or unsafe characters"],
    ["x onclick=run()", {}, "Reason contains invalid or unsafe characters"],
    ["Report online on Monday; the onboarding kit's \"ready\".\nThanks", {}, null],
  ];

  test.each(["long_text", "prose"])("%s gives the shared result for every case", (kind) => {
    for (const [value, extra, expected] of CASES) {
      expect([value, extra, validateField({ name: "reason", label: "Reason", kind, value, ...extra })]).toEqual([
        value,
        extra,
        expected,
      ]);
    }
  });

  test("uses the same unsafe-prose pattern as the backend", () => {
    expect(UNSAFE_PROSE_REGEX.source).toBe("[<>]|\\{\\{|\\}\\}|javascript\\s*:|\\bon[a-z]+\\s*=");
    expect(UNSAFE_PROSE_REGEX.flags).toBe("i");
  });
});

describe("prose kind (letter wording)", () => {
  const prose = (value, extra = {}) =>
    validateField({ name: "reason", label: "Reason", value, kind: "prose", ...extra });

  test("allows apostrophes, quotes, semicolons and line breaks", () => {
    expect(prose(`The employee's conduct on 12/03; "repeated" absence.\nSecond line.`)).toBeNull();
  });

  test("blocks markup, template braces and javascript urls", () => {
    expect(prose("<b>bold</b>")).toMatch(/unsafe/);
    expect(prose("Hello {{companyName}}")).toMatch(/unsafe/);
    expect(prose("see javascript:alert(1)")).toMatch(/unsafe/);
  });

  test("required and max length boundaries", () => {
    expect(prose("   ", { required: true })).toMatch(/required/);
    expect(prose("", { required: false })).toBeNull();
    expect(prose("a".repeat(LIMITS.TEXT_LONG))).toBeNull();
    expect(prose("a".repeat(LIMITS.TEXT_LONG + 1))).toMatch(/at most/);
    expect(prose("abcdef", { maxLength: 5 })).toMatch(/at most 5/);
  });

  test("blocks inline event handlers but not ordinary words starting with 'on'", () => {
    expect(prose("click onclick=alert(1)")).toMatch(/unsafe/);
    expect(prose("Report online on Monday; the onboarding kit is ready")).toBeNull();
  });

  test("long_text is the same rule as prose (backend template field kind)", () => {
    const longText = (value) => validateField({ name: "reason", label: "Reason", value, kind: "long_text" });
    expect(longText(`It's "fine"; really.`)).toBeNull();
    expect(longText("<i>x</i>")).toMatch(/unsafe/);
  });
});

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

  test("uses the strict email format shared with the backend", () => {
    for (const bad of ["2@h", "a@b", "test@test", "test@test.c", "a@b..com", ".a@x.com", "a.@x.com", "a@-x.com", "a@x-.com", "a@x.c0m"]) {
      expect(validateField({ label: "Email", value: bad })).toBe("Email must be a valid email address");
    }
    for (const good of ["user@example.com", "first.last+hr@mail.co.in", "A_B%c@sub-domain.example.org"]) {
      expect(validateField({ label: "Email", value: good })).toBeNull();
    }
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

describe("impossible calendar dates", () => {
  const date = (value) => validateField({ name: "joiningDate", label: "Joining date", value, kind: "date" });

  test("rejects days that do not exist, matching the backend", () => {
    expect(date("2026-02-31")).toBe("Joining date must be a valid date");
    expect(date("2026-04-31")).toBe("Joining date must be a valid date");
    expect(date("2025-02-29")).toBe("Joining date must be a valid date");
  });

  test("accepts real days including leap days and ISO timestamps", () => {
    expect(date("2028-02-29")).toBeNull();
    expect(date("2026-12-31")).toBeNull();
    expect(date("2026-11-01T00:00:00.000Z")).toBeNull();
    expect(date(new Date(2026, 0, 31))).toBeNull();
  });
});

describe("offer status note (long_text, maxLength 500) — same rule as the backend", () => {
  const note = (value) => validateField({ name: "note", label: "Note", kind: "long_text", maxLength: 500, value });

  test("is optional and allows normal sentences and line breaks", () => {
    expect(note("")).toBeNull();
    expect(note("Accepted on the phone; joins Monday.\nSend the kit.")).toBeNull();
  });

  test("allows 500 characters and rejects 501", () => {
    expect(note("a".repeat(500))).toBeNull();
    expect(note("a".repeat(501))).toBe("Note must be at most 500 characters");
  });

  test("rejects HTML and script", () => {
    expect(note("<b>x</b>")).toMatch(/unsafe/);
    expect(note("x onerror=alert(1)")).toMatch(/unsafe/);
  });
});

/* ---------- Letters QA round (2026-10-06): identical cases in the backend tests/inputValidation.test.js ---------- */

const current = require("./inputValidation");
const baseline = require("./__fixtures__/inputValidation.baseline");

const elapsedMs = (fn) => {
  const start = performance.now();
  const result = fn();
  return { result, ms: performance.now() - start };
};

/** Deterministic pseudo-random generator so the comparison is repeatable. */
const seededRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("person name pattern: linear time, same accepted names", () => {
  const NEW = current.PATTERNS.PERSON_NAME;
  const OLD = baseline.PATTERNS.PERSON_NAME;
  const SAMPLES = [
    "Priya", "Priya Sharma", "Dr. A. P. J. Abdul Kalam", "J.R.R. Tolkien", "Anne-Marie", "O'Brien",
    " Priya", "Priya ", "Priya  Sharma", "Priya\tSharma", "Priya\nSharma", ".Priya", "1Priya", "Priya1",
    "P", "", " ", "Ångström", "Priya!", `${"Q".repeat(15)}!`, "a.b.c", "a..", "a. ", "a\u00a0b",
  ];

  it("accepts exactly the names the old pattern accepted", () => {
    for (const sample of SAMPLES) expect([sample, NEW.test(sample)]).toEqual([sample, OLD.test(sample)]);
  });

  it("agrees with the old pattern on 3000 random short strings", () => {
    const random = seededRandom(20261006);
    const alphabet = "aZq .\t\n1!-'é_";
    for (let i = 0; i < 3000; i += 1) {
      const length = Math.floor(random() * 13);
      let sample = "";
      for (let j = 0; j < length; j += 1) sample += alphabet[Math.floor(random() * alphabet.length)];
      expect([sample, NEW.test(sample)]).toEqual([sample, OLD.test(sample)]);
    }
  });

  it("rejects adversarial names in well under 50ms", () => {
    for (const length of [27, 10_000]) {
      const { result, ms } = elapsedMs(() => NEW.test(`${"Q".repeat(length)}!`));
      expect(result).toBe(false);
      expect(ms).toBeLessThan(50);
    }
    const { result, ms } = elapsedMs(() =>
      validateField({ name: "fullName", label: "Full name", value: `${"Q".repeat(119)}!` })
    );
    expect(result).toBe("Full name must contain only letters and spaces");
    expect(ms).toBeLessThan(50);
  });

  it("email stays fast on a long adversarial value (length is checked before the pattern)", () => {
    const { result, ms } = elapsedMs(() => validateField({ name: "email", label: "Email", value: `a@${".".repeat(10_000)}@` }));
    expect(result).toBe("Email must be at most 254 characters");
    expect(ms).toBeLessThan(50);
  });

  it("no shared pattern nests a quantifier inside a repeated group", () => {
    const NESTED_QUANTIFIER = /\([^()]*[*+][^()]*\)[*+{]/;
    const patterns = { ...current.PATTERNS, UNSAFE_TEXT_REGEX: current.UNSAFE_TEXT_REGEX, UNSAFE_PROSE_REGEX: current.UNSAFE_PROSE_REGEX };
    for (const [name, pattern] of Object.entries(patterns)) {
      expect([name, NESTED_QUANTIFIER.test(pattern.source)]).toEqual([name, false]);
    }
  });
});

describe("whole-number answers (opt-in integer with min / max)", () => {
  const days = (value, extra = {}) =>
    validateField({ name: "responsePeriod", label: "Response period (days)", kind: "number", value, integer: true, min: 1, max: 365, ...extra });
  const CASES = [
    ["5", null],
    [5, null],
    [" 12 ", null],
    ["1", null],
    ["365", null],
    ["", null],
    ["-5", "Response period (days) cannot be less than 1"],
    ["0", "Response period (days) cannot be less than 1"],
    ["99999999999", "Response period (days) cannot exceed 365"],
    ["1e3", "Response period (days) must be a whole number"],
    ["0x10", "Response period (days) must be a whole number"],
    ["7.5", "Response period (days) must be a whole number"],
    [7.5, "Response period (days) must be a whole number"],
    ["abc", "Response period (days) must be a whole number"],
  ];

  it.each(CASES)("%p gives the shared result", (value, expected) => {
    expect(days(value)).toBe(expected);
  });

  it("a required blank answer names the field", () => {
    expect(days(" ", { required: true })).toBe("Response period (days) is required");
  });
});

describe("plausible dates (opt-in isoDate, earliest, yearsAhead)", () => {
  const NOW = new Date("2026-10-06T06:30:00Z"); // noon on 6 Oct in India
  const date = (value, extra = {}) =>
    validateField({ name: "incidentDate", label: "Incident date", kind: "date", value, isoDate: true, earliest: "1950-01-01", yearsAhead: 10, now: NOW, ...extra });
  const CASES = [
    ["2026-09-30", null],
    ["2026-10-06T00:00:00.000Z", null],
    ["1950-01-01", null],
    ["2036-10-06", null],
    ["1", "Incident date must be a valid date"],
    ["2026", "Incident date must be a valid date"],
    ["30/09/2026", "Incident date must be a valid date"],
    ["2026-02-30", "Incident date must be a valid date"],
    ["0001-01-01", "Incident date cannot be before 1 January 1950"],
    ["1949-12-31", "Incident date cannot be before 1 January 1950"],
    ["2036-10-07", "Incident date cannot be more than 10 years from today"],
    ["9999-12-31", "Incident date cannot be more than 10 years from today"],
  ];

  it.each(CASES)("%p gives the shared result", (value, expected) => {
    expect(date(value)).toBe(expected);
  });

  it("Date objects skip the text format check but keep the window", () => {
    expect(date(new Date(2026, 0, 1))).toBeNull();
    expect(date(new Date(1900, 0, 1))).toBe("Incident date cannot be before 1 January 1950");
  });

  it("says 'year' for a one-year window", () => {
    expect(date("2027-10-07", { yearsAhead: 1 })).toBe("Incident date cannot be more than 1 year from today");
  });

  it("a date in the past accepts today and refuses tomorrow by calendar day", () => {
    const past = (value) => validateField({ label: "Incident date", kind: "date_past", value, now: NOW });
    expect(past("2026-10-06")).toBeNull();
    expect(past("2026-10-07")).toBe("Incident date cannot be in the future");
  });
});

describe("decimal answers (opt-in decimal)", () => {
  const amount = (value, extra = {}) =>
    validateField({ name: "increment", label: "Increment %", kind: "number", value, decimal: true, ...extra });
  const CASES = [
    ["7.5", null],
    [7.5, null],
    ["-2.25", null],
    [" 12.5 ", null],
    ["0", null],
    ["1000000000", null],
    ["", null],
    ["1e3", "Increment % must be a valid number"],
    ["0x10", "Increment % must be a valid number"],
    ["7.", "Increment % must be a valid number"],
    [".5", "Increment % must be a valid number"],
    ["Infinity", "Increment % must be a valid number"],
    ["abc", "Increment % must be a valid number"],
    ["1,000", "Increment % must be a valid number"],
  ];

  it.each(CASES)("%p gives the shared result", (value, expected) => {
    expect(amount(value)).toBe(expected);
  });

  it("whole-number questions still refuse decimals", () => {
    expect(amount("7.5", { integer: true })).toBe("Increment % must be a whole number");
    expect(amount("7", { integer: true })).toBeNull();
  });
});

describe("answer rules shared by letter questions and candidates", () => {
  const DEFAULT_RANGE = { min: -1_000_000_000, max: 1_000_000_000 };

  it("number questions accept decimals in a wide default range unless the question declares its own rules", () => {
    expect(current.DEFAULT_NUMBER_RULES).toEqual(DEFAULT_RANGE);
    expect(current.answerFieldRules({ kind: "number" })).toEqual({ decimal: true, ...DEFAULT_RANGE });
    expect(current.answerFieldRules({ kind: "number", integer: true, min: 1, max: 365 })).toEqual({
      decimal: true,
      integer: true,
      min: 1,
      max: 365,
    });
    expect(current.answerFieldRules({ kind: "number", min: 0, max: null })).toEqual({ decimal: true, min: 0, max: 1_000_000_000 });
    expect(current.answerFieldRules({ kind: "number", integer: false, max: 10 })).toEqual({ decimal: true, min: -1_000_000_000, max: 10 });
  });

  it("date questions must be real dates between 1950 and ten years ahead", () => {
    const rules = { isoDate: true, earliest: "1950-01-01", yearsAhead: 10 };
    expect(current.answerFieldRules({ kind: "date" })).toEqual(rules);
    expect(current.answerFieldRules({ kind: "date_past" })).toEqual(rules);
    expect(current.PLAUSIBLE_DATE_RULES).toEqual(rules);
  });

  it("joining dates may be at most two years ahead", () => {
    expect(current.JOINING_DATE_RULES).toEqual({ isoDate: true, earliest: "1950-01-01", yearsAhead: 2 });
  });

  it("other answer types add nothing", () => {
    for (const kind of ["text", "long_text", "email", "currency_annual", undefined]) {
      expect(current.answerFieldRules({ kind })).toEqual({});
    }
  });
});

describe("forms that do not opt in (payroll, salary, attendance, employees) get exactly the old results", () => {
  // date_past is excluded: only letter questions use it, and it now compares calendar days on purpose.
  const KINDS = [
    "email", "phone", "aadhaar", "pan", "ifsc", "uan", "esic", "bank_account", "currency_monthly", "currency_annual",
    "rate", "number", "attendance_days", "date", "date_dob", "password", "identifier_code", "employee_code",
    "person_name", "display_name", "url", "long_text", "prose", "text", "code",
  ];
  const VALUES = [
    "", " ", "0", "-5", "7.5", "1e3", "0x10", "99999999999", "27.5", "31", "32", "abc", "ABCDE1234F", "SBIN0001234",
    "9876543210", "123456789012", "2026", "1", "9999-12-31", "0001-01-01", "2026-02-30", "2026-10-06", "2000-01-01",
    "2030-01-01", "Priya Sharma", "Dr. A. Kalam", "Q!", "<b>", "a@b.co", "https://x.io", "Basic_PAY", null, undefined,
    42, 0.12, new Date(2000, 0, 1),
  ];
  const OPTIONS = [{}, { required: true }, { min: 1, max: 10 }, { min: 0 }, { maxLength: 5 }];

  it("validateByKind matches the frozen baseline for every kind, value and option set", () => {
    const mismatches = [];
    for (const kind of KINDS) {
      for (const value of VALUES) {
        for (const options of OPTIONS) {
          const now = current.validateByKind(kind, value, "Field", options);
          const before = baseline.validateByKind(kind, value, "Field", options);
          if (now !== before) mismatches.push({ kind, value, options, now, before });
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("label- and name-inferred payroll fields match the frozen baseline", () => {
    const FIELDS = [
      { label: "Annual CTC (₹)" }, { label: "Default monthly amount", name: "defaultValue" }, { label: "Rate", kind: "rate" },
      { label: "Working days", kind: "attendance_days" }, { label: "Component code", kind: "identifier_code" },
      { label: "Display name", kind: "display_name" }, { label: "Code", name: "code", kind: "code" },
      { label: "Date of joining", name: "dateOfJoining" }, { label: "Date of birth", name: "dob" }, { label: "Full name", name: "fullName" },
    ];
    const mismatches = [];
    for (const field of FIELDS) {
      for (const value of VALUES) {
        const now = current.validateField({ ...field, value });
        const before = baseline.validateField({ ...field, value });
        if (now !== before) mismatches.push({ label: field.label, value, now, before });
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("one India business day decides 'today' — identical cases in the backend tests/inputValidation.test.js (M8)", () => {
  // Run under TZ=UTC as well as the machine zone: these instants straddle the Indian midnight.
  const { BUSINESS_TIME_ZONE, businessDayKey, validateByKind, JOINING_DATE_RULES } = require("./inputValidation");
  const IST_0000 = new Date("2026-10-06T18:30:00Z");
  const IST_0030 = new Date("2026-10-06T19:00:00Z");
  const IST_0529 = new Date("2026-10-06T23:59:00Z");
  const IST_0530 = new Date("2026-10-07T00:00:00Z");
  const IST_2359 = new Date("2026-10-06T18:29:00Z");

  it("the business day is the Asia/Kolkata calendar day; a written day is taken as written", () => {
    expect(BUSINESS_TIME_ZONE).toBe("Asia/Kolkata");
    expect(businessDayKey(IST_2359)).toBe("2026-10-06");
    [IST_0000, IST_0030, IST_0529, IST_0530].forEach((instant) => expect(businessDayKey(instant)).toBe("2026-10-07"));
    expect(businessDayKey("2026-10-07")).toBe("2026-10-07");
    expect(businessDayKey("2026-10-07T23:00:00Z")).toBe("2026-10-07");
    expect(businessDayKey("nope")).toBeNull();
    expect(businessDayKey(null)).toBeNull();
    expect(businessDayKey("")).toBeNull();
  });

  it("between 00:00 and 05:30 in India, the new Indian day is already today for 'not in the future'", () => {
    [IST_0000, IST_0030, IST_0529, IST_0530].forEach((now) => {
      expect(validateByKind("date_past", "2026-10-07", "Incident date", { now })).toBeNull();
      expect(validateByKind("date_past", "2026-10-08", "Incident date", { now })).toBe("Incident date cannot be in the future");
    });
    expect(validateByKind("date_past", "2026-10-07", "Incident date", { now: IST_2359 })).toBe("Incident date cannot be in the future");
    expect(validateByKind("date_past", IST_0030, "Incident date", { now: IST_0030 })).toBeNull();
  });

  it("the years-ahead window counts from the Indian day", () => {
    const rules = { ...JOINING_DATE_RULES, now: IST_0030 };
    expect(validateByKind("date", "2028-10-07", "Joining date", rules)).toBeNull();
    expect(validateByKind("date", "2028-10-08", "Joining date", rules)).toBe("Joining date cannot be more than 2 years from today");
  });
});
