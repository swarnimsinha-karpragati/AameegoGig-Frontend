// Canonical manual employee-code shape, two forms:
//   1. 1–10 letters, one optional hyphen, 1–8 digits (e.g. NA-0026)
//   2. digits only, 1–8 digits (e.g. 123)
// Max 20 chars. Single source for validators (final check) and input
// masking (prevents invalid keystrokes).
export const EMPLOYEE_CODE_PATTERN = /^(?:[A-Z]{1,10}-?)?[0-9]{1,8}$/;
export const EMPLOYEE_CODE_MAX_LENGTH = 20;
export const EMPLOYEE_CODE_HINT =
  "Employee codes must be formatted as EMP-26 or EMP26 or 26.";

// Keystroke mask: swallows anything that cannot belong to a valid code, so
// the field never needs a character error — spaces, specials and misplaced
// characters simply can't be typed. A code is either digits-only or
// letters-led: leading digits lock digits-only mode (later letters drop),
// while letters lock letters-led mode (later misplaced characters drop).
// Zeros stay typable mid-entry ("NA-0" may become "NA-01"); only a finished
// all-zeros code ("NA-000", "000") still fails at submit.
export const maskEmployeeCode = (raw) => {
  const src = String(raw ?? "").toUpperCase();
  let letters = "";
  let hyphen = false;
  let digits = "";
  for (const ch of src) {
    if (ch >= "A" && ch <= "Z") {
      if (digits.length === 0 && letters.length < 10) letters += ch;
    } else if (ch === "-") {
      if (!hyphen && digits.length === 0 && letters.length > 0) hyphen = true;
    } else if (ch >= "0" && ch <= "9") {
      if (digits.length < 8) digits += ch;
    }
  }
  return `${letters}${hyphen ? "-" : ""}${digits}`;
};
