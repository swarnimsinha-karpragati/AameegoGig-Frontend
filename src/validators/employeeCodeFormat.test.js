import { employeeValidationSchema } from "./employeeValidation";
import { internValidationSchema } from "./internValidation";
import { maskEmployeeCode } from "../utils/employeeCodeFormat";

const schemas = {
  employee: employeeValidationSchema,
  intern: internValidationSchema,
};

const passes = async (schema, value) => {
  await expect(
    schema.validateAt("employeeCode", { employeeCode: value })
  ).resolves.toBeDefined();
};

const failsWith = async (schema, value, part) => {
  await expect(
    schema.validateAt("employeeCode", { employeeCode: value })
  ).rejects.toThrow(part);
};

describe.each(Object.entries(schemas))(
  "%s employeeCode format",
  (name, schema) => {
    test("accepts series codes, digits-only codes and blank (auto-generate)", async () => {
      await passes(schema, "NA-0026");
      await passes(schema, "AMG-1");
      await passes(schema, "AMG0007");
      await passes(schema, "123");
      await passes(schema, "");
    });

    test("lowercase is upper-cased, not rejected", async () => {
      await passes(schema, "na-0026");
    });

    test("rejects all-zero digits", async () => {
      await failsWith(schema, "NA-000", "non-zero");
      await failsWith(schema, "000", "non-zero");
      await failsWith(schema, "0000", "non-zero");
    });

    test("rejects spaces and special characters", async () => {
      await failsWith(schema, "NA 26", "NA-0026");
      await failsWith(schema, "NA_26", "NA-0026");
      await failsWith(schema, "N@-1", "NA-0026");
    });

    test("rejects over-length codes", async () => {
      await failsWith(schema, "A".repeat(21), "20 characters");
    });
  }
);

describe("maskEmployeeCode keystroke mask", () => {
  test("upper-cases and keeps valid sequences intact", () => {
    expect(maskEmployeeCode("na-0026")).toBe("NA-0026");
    expect(maskEmployeeCode("AMG-1")).toBe("AMG-1");
    expect(maskEmployeeCode("NA-")).toBe("NA-");
  });

  test("swallows spaces and special characters", () => {
    expect(maskEmployeeCode("NA 26")).toBe("NA26");
    expect(maskEmployeeCode("N@A-1!")).toBe("NA-1");
    expect(maskEmployeeCode("NA_26")).toBe("NA26");
  });

  test("allows a single hyphen only after letters", () => {
    expect(maskEmployeeCode("--NA")).toBe("NA");
    expect(maskEmployeeCode("NA--1")).toBe("NA-1");
    expect(maskEmployeeCode("NA-1-2")).toBe("NA-12");
  });

  test("locks the code shape once typing commits to it", () => {
    expect(maskEmployeeCode("123")).toBe("123");
    expect(maskEmployeeCode("12NA")).toBe("12");
    expect(maskEmployeeCode("NA12AB34")).toBe("NA1234");
  });

  test("caps letters at 10 and digits at 8", () => {
    expect(maskEmployeeCode("ABCDEFGHIJK-123456789")).toBe(
      "ABCDEFGHIJ-12345678"
    );
  });

  test("zeros stay typable mid-entry (submit rule still rejects all-zeros)", () => {
    expect(maskEmployeeCode("na-0")).toBe("NA-0");
    expect(maskEmployeeCode("na-000")).toBe("NA-000");
  });
});
