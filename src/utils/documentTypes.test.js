import {
  filterDocuments,
  docTypeLabel,
  acceptFor,
  isAllowedFile,
} from "./documentTypes";

const docs = [
  { fileName: "scan1.pdf", documentType: "AADHAAR", category: "Legal" },
  { fileName: "pay-jan.pdf", documentType: "SALARY_SLIP", category: "Salary Slip" },
  { fileName: "me.png", documentType: "PHOTO", category: "General" },
];

test("All tab returns everything", () => {
  expect(filterDocuments(docs, { category: "All" })).toHaveLength(3);
});

test("category tab shows only that category", () => {
  expect(
    filterDocuments(docs, { category: "Legal" }).map((d) => d.documentType)
  ).toEqual(["AADHAAR"]);
  expect(filterDocuments(docs, { category: "Salary Slip" })).toHaveLength(1);
  expect(filterDocuments(docs, { category: "Finance" })).toHaveLength(0);
});

test("search matches filename or human type label", () => {
  expect(filterDocuments(docs, { search: "aadhaar" })).toHaveLength(1);
  expect(filterDocuments(docs, { search: "pay-jan" })).toHaveLength(1);
});

test("search matches employee name (admin all-docs view)", () => {
  const withEmp = [{ ...docs[0], employeeName: "Ravi Kumar" }];
  expect(filterDocuments(withEmp, { search: "ravi" })).toHaveLength(1);
});

test("search and category combine", () => {
  expect(filterDocuments(docs, { category: "General", search: "aadhaar" })).toHaveLength(0);
});

test("docTypeLabel maps known types and falls back", () => {
  expect(docTypeLabel("PAN")).toBe("PAN Card");
  expect(docTypeLabel("UNKNOWN")).toBe("UNKNOWN");
  expect(docTypeLabel(undefined)).toBe("Document");
});

test("handles empty / missing input", () => {
  expect(filterDocuments(undefined, {})).toEqual([]);
  expect(filterDocuments([], {})).toEqual([]);
});

test("isAllowedFile enforces per-type extensions", () => {
  expect(isAllowedFile("AADHAAR", "id.pdf")).toBe(true);
  expect(isAllowedFile("AADHAAR", "photo.JPEG")).toBe(true);
  expect(isAllowedFile("AADHAAR", "data.xlsx")).toBe(false);
  expect(isAllowedFile("AADHAAR", "data.csv")).toBe(false);
  expect(isAllowedFile("PHOTO", "me.pdf")).toBe(false);
  expect(isAllowedFile("SALARY_SLIP", "slip.pdf")).toBe(true);
  expect(isAllowedFile("SALARY_SLIP", "slip.png")).toBe(false);
  expect(isAllowedFile("AADHAAR", "noextension")).toBe(false);
});

test("acceptFor builds the picker filter", () => {
  expect(acceptFor("SALARY_SLIP")).toBe(".pdf");
  expect(acceptFor("PHOTO")).toBe(".png,.jpg,.jpeg");
});
