import {
  questionKeyLocks,
  ANSWER_TYPES,
  answerTypeOf,
  applyAnswerType,
  buildDetailGroups,
  detailLabels,
  editorErrorTarget,
  templateServerError,
  buildInputFieldChecks,
  numberInputAttributes,
  buildLetterRequest,
  draftToPayload,
  formatLetterDate,
  draftLetterFileName,
  getApiError,
  INPUT_FIELD_KINDS,
  isDraftDirty,
  isMultilineField,
  MAX_INPUT_FIELDS,
  parseFieldOptions,
  buildPreviewRequest,
  hasLetterContent,
  isClientErrorStatus,
  isTemplateVersionConflict,
  stillNeededLabels,
  templateToDraft,
  toInputFieldKey,
  validateCandidate,
  validateStatusNote,
  STATUS_NOTE_FIELD,
  validateLetterInput,
  validateLetterInputs,
  validateTemplateDraft,
  RECIPIENT_TYPES,
  RECIPIENT_TYPE_VALUES,
  recipientTypeLabel,
} from "./letterForms";
import { LETTERS_COPY } from "./lettersCopy";

describe("recipient types", () => {
  it("lists each recipient type once, labelled from the copy", () => {
    expect(RECIPIENT_TYPE_VALUES).toEqual(["employee", "candidate"]);
    expect(RECIPIENT_TYPES).toEqual([
      { value: "employee", label: LETTERS_COPY.recipientTypes.employee },
      { value: "candidate", label: LETTERS_COPY.recipientTypes.candidate },
    ]);
    expect(LETTERS_COPY.recipientTypes).toEqual({ employee: "Employee", candidate: "Offer candidate" });
  });

  it("labels a recipient type and never shows an unknown internal value", () => {
    expect(recipientTypeLabel("employee")).toBe("Employee");
    expect(recipientTypeLabel("candidate")).toBe("Offer candidate");
    expect(recipientTypeLabel("vendor")).toBe("");
    expect(recipientTypeLabel(undefined)).toBe("");
  });
});

const baseDraft = {
  name: "Warning letter",
  category: "Disciplinary",
  recipientType: "employee",
  bodyHtml: "<p>Dear {{employeeName}}, on {{incidentDate}}</p>",
  inputFields: [{ key: "incidentDate", label: "Incident date", kind: "date", required: true }],
};
const registry = ["employeeName", "companyName", "currentDate"];

describe("toInputFieldKey", () => {
  it("camel-cases labels and strips symbols", () => {
    expect(toInputFieldKey("Response deadline (days)")).toBe("responseDeadlineDays");
    expect(toInputFieldKey("  revised   CTC ")).toBe("revisedCtc");
  });

  it("prefixes keys that would start with a digit and handles empty", () => {
    expect(toInputFieldKey("2nd reviewer")).toBe("field2ndReviewer");
    expect(toInputFieldKey("***")).toBe("");
  });
});

describe("validateTemplateDraft", () => {
  it("accepts a valid draft using registry and input field placeholders", () => {
    expect(validateTemplateDraft(baseDraft, registry)).toEqual({ valid: true, errors: {} });
  });

  it("requires name, category, recipient and content", () => {
    const { errors } = validateTemplateDraft(
      { name: "", category: "Other", recipientType: "x", bodyHtml: "<p> </p>", inputFields: [] },
      registry
    );
    expect(errors.name).toMatch(/required/);
    expect(errors.category).toBeTruthy();
    expect(errors.recipientType).toBeTruthy();
    expect(errors.bodyHtml).toMatch(/required/);
  });

  it("accepts content that is only an image", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, bodyHtml: '<p><img src="https://x/logo.png"></p>' }, registry);
    expect(errors.bodyHtml).toBeUndefined();
  });

  it("hasLetterContent counts text and images, not empty markup or non-breaking spaces", () => {
    expect(hasLetterContent("<p>Hi</p>")).toBe(true);
    expect(hasLetterContent('<p><img src="data:image/png;base64,AAAA"></p>')).toBe(true);
    expect(hasLetterContent("<IMG SRC='x'>")).toBe(true);
    expect(hasLetterContent("<p> </p><br>")).toBe(false);
    expect(hasLetterContent("<p>&nbsp;</p>")).toBe(false);
    expect(hasLetterContent("")).toBe(false);
    expect(hasLetterContent(null)).toBe(false);
  });

  it("flags unknown details used only as a condition, like the server", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, bodyHtml: "<p>{{employeeName}}</p>{{#if typoField}}<p>x</p>{{/if}}" }, registry);
    expect(errors.bodyHtml).toMatch(/no longer exist \(Typo field\)/);
  });

  it("flags unknown details used in an unless condition, like the server", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, bodyHtml: "<p>{{employeeName}}</p>{{#unless typoField}}<p>x</p>{{/unless}}" }, registry);
    expect(errors.bodyHtml).toMatch(/no longer exist \(Typo field\)/);
  });

  it("flags unknown placeholders", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, bodyHtml: "<p>{{typo}}</p>" }, registry);
    expect(errors.bodyHtml).toMatch(/no longer exist \(Typo\)/);
  });

  it("flags duplicate, clashing and malformed input fields by index", () => {
    const { errors } = validateTemplateDraft(
      {
        ...baseDraft,
        inputFields: [
          { key: "incidentDate", label: "Incident date", kind: "date" },
          { key: "incidentDate", label: "Incident date", kind: "date" },
          { key: "employeeName", label: "Employee name", kind: "text" },
          { key: "", label: "", kind: "text" },
          { key: "notes", label: "Notes", kind: "weird" },
        ],
      },
      registry
    );
    expect(errors.inputFields[0]).toBeUndefined();
    expect(errors.inputFields[1]).toMatch(/twice/);
    expect(errors.inputFields[2]).toMatch(/built-in detail/);
    expect(errors.inputFields[3]).toMatch(/required/);
    expect(errors.inputFields[4]).toMatch(/answer type/);
  });
});

describe("letter inputs", () => {
  const fields = [
    { key: "incidentDate", label: "Incident date", kind: "date", required: true },
    { key: "reason", label: "Reason", kind: "long_text", required: true, multiline: true },
    { key: "remarks", label: "Remarks", kind: "long_text", required: false },
    { key: "severity", label: "Warning level", kind: "text", required: true, options: ["First", "Second", "Final"] },
  ];

  it("maps template fields to validation checks; short text is capped like the server", () => {
    const checks = buildInputFieldChecks(fields, { reason: "x" });
    expect(checks[1]).toEqual({ name: "reason", label: "Reason", value: "x", kind: "long_text", required: true });
    expect(checks[3]).toMatchObject({ kind: "text", maxLength: 255 });
  });

  it("reports missing required values and accepts punctuation in paragraphs", () => {
    expect(validateLetterInputs(fields, {}).errors).toEqual({
      incidentDate: "Incident date is required",
      reason: "Reason is required",
      severity: "Warning level is required",
    });
    expect(
      validateLetterInputs(fields, {
        incidentDate: "2026-10-01",
        reason: "Employee's repeated late arrival; noted.",
        severity: "Final",
      }).valid
    ).toBe(true);
  });

  it("only accepts one of the field's choices", () => {
    expect(validateLetterInput(fields[3], "Third")).toBe("Warning level must be one of: First, Second, Final");
    expect(validateLetterInput(fields[3], "Second")).toBeNull();
  });

  it("caps short text at 255 characters", () => {
    const field = { key: "ref", label: "Reference", kind: "text" };
    expect(validateLetterInput(field, "a".repeat(255))).toBeNull();
    expect(validateLetterInput(field, "a".repeat(256))).toMatch(/at most 255/);
  });
});

describe("field shape helpers", () => {
  it("treats paragraphs and multi-line short text as multi-line, never fields with choices", () => {
    expect(isMultilineField({ kind: "long_text" })).toBe(true);
    expect(isMultilineField({ kind: "text", multiline: true })).toBe(true);
    expect(isMultilineField({ kind: "text", multiline: true, options: ["A"] })).toBe(false);
    expect(isMultilineField({ kind: "date", multiline: true })).toBe(false);
  });

  it("parses comma-separated choices", () => {
    expect(parseFieldOptions(" First, Second ,, Final, First ")).toEqual(["First", "Second", "Final"]);
    expect(parseFieldOptions("")).toEqual([]);
  });

  it("offers every input kind the server accepts", () => {
    expect(INPUT_FIELD_KINDS.map((k) => k.value)).toEqual([
      "text", "long_text", "date", "date_past", "number", "currency_annual", "currency_monthly",
      "email", "phone", "person_name", "display_name", "url",
    ]);
  });
});

describe("validateCandidate", () => {
  const today = new Date("2026-10-05T10:00:00");
  const valid = {
    name: "Riya Verma",
    email: "riya@example.com",
    phone: "9876543210",
    designation: "Field Executive",
    annualCTC: "360000",
    joiningDate: "2026-11-01",
    offerExpiryDate: "2026-10-20",
  };

  it("accepts a complete candidate", () => {
    expect(validateCandidate(valid, { today })).toEqual({ valid: true, errors: {} });
  });

  it("requires core fields with label-based messages", () => {
    const { errors } = validateCandidate({}, { today });
    expect(errors.name).toBe("Full name is required");
    expect(errors.email).toBe("Email is required");
    expect(errors.annualCTC).toBe("Annual CTC (₹) is required");
    expect(errors.joiningDate).toBe("Joining date is required");
  });

  it("rejects past joining date only for new candidates", () => {
    expect(validateCandidate({ ...valid, joiningDate: "2026-10-01", offerExpiryDate: "" }, { today }).errors.joiningDate).toMatch(
      /past/
    );
    expect(validateCandidate({ ...valid, joiningDate: "2026-10-01", offerExpiryDate: "" }, { today, isNew: false }).valid).toBe(true);
  });

  it("keeps offer validity between today and the joining date", () => {
    expect(validateCandidate({ ...valid, offerExpiryDate: "2026-11-02" }, { today }).errors.offerExpiryDate).toMatch(/on or before/);
    expect(validateCandidate({ ...valid, offerExpiryDate: "2026-10-01" }, { today }).errors.offerExpiryDate).toMatch(/past/);
    expect(validateCandidate({ ...valid, offerExpiryDate: "2026-11-01" }, { today }).valid).toBe(true);
  });

  it("validates email and phone formats", () => {
    const { errors } = validateCandidate({ ...valid, email: "bad", phone: "123" }, { today });
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });
});

describe("status note", () => {
  it("uses the same field rule as the backend", () => {
    expect(STATUS_NOTE_FIELD).toEqual({ name: "note", label: "Note", kind: "long_text", maxLength: 500 });
  });

  it("is optional, limited to 500 characters and blocks unsafe text", () => {
    expect(validateStatusNote("")).toBeNull();
    expect(validateStatusNote(undefined)).toBeNull();
    expect(validateStatusNote("Accepted on the phone.")).toBeNull();
    expect(validateStatusNote("a".repeat(500))).toBeNull();
    expect(validateStatusNote("a".repeat(501))).toBe("Note must be at most 500 characters");
    expect(validateStatusNote("<script>x</script>")).toMatch(/unsafe/);
  });
});

describe("getApiError", () => {
  it("reads message and field from API errors", () => {
    const err = { response: { status: 400, data: { message: "Joining date is required", field: "joiningDate" } } };
    expect(getApiError(err)).toEqual({
      message: "Joining date is required",
      field: "joiningDate",
      status: 400,
      code: null,
      index: null,
      keys: null,
      syntax: null,
    });
  });

  it("reads the machine-readable error code", () => {
    const err = { response: { status: 400, data: { message: "Add the company address", code: "COMPANY_PROFILE_INCOMPLETE" } } };
    expect(getApiError(err).code).toBe("COMPANY_PROFILE_INCOMPLETE");
    expect(getApiError({ response: { status: 400, data: { message: "x", code: 7 } } }).code).toBeNull();
  });

  it("falls back for network errors and odd bodies", () => {
    expect(getApiError(new Error("Network Error"), "Could not save").message).toBe("Could not save");
    expect(getApiError({ response: { status: 500, data: "<html>" } }).field).toBeNull();
  });
});

describe("isTemplateVersionConflict", () => {
  it("is true only for the 409 VERSION_CONFLICT a stale save, restore or reset gets", () => {
    const conflict = getApiError({ response: { status: 409, data: { message: "x", code: "VERSION_CONFLICT" } } });
    expect(isTemplateVersionConflict(conflict)).toBe(true);
    expect(isTemplateVersionConflict(getApiError({ response: { status: 409, data: { code: "TEMPLATE_KEY_CONFLICT" } } }))).toBe(false);
    expect(isTemplateVersionConflict(getApiError({ response: { status: 400, data: { code: "VERSION_CONFLICT" } } }))).toBe(false);
    expect(isTemplateVersionConflict(getApiError(new Error("Network Error")))).toBe(false);
    expect(isTemplateVersionConflict(null)).toBe(false);
  });
});

describe("formatLetterDate", () => {
  it("formats valid dates and dashes invalid ones", () => {
    expect(formatLetterDate("2026-10-05")).toMatch(/05 Oct 2026/);
    expect(formatLetterDate("")).toBe("—");
    expect(formatLetterDate("nope")).toBe("—");
  });
});

describe("template drafts", () => {
  const template = {
    _id: "t1",
    name: "Warning letter",
    category: "Disciplinary",
    recipientType: "employee",
    bodyHtml: "<p>Hi</p>",
    layout: { showStamp: true },
    inputFields: [
      { key: "reason", label: "Reason", kind: "long_text", required: true, multiline: true, _id: "f1" },
      { key: "severity", label: "Warning level", kind: "text", required: true, multiline: false, options: ["First", "Final"] },
    ],
    version: 3,
  };

  it("fills layout defaults and keeps only editable field props", () => {
    const draft = templateToDraft(template);
    expect(draft.layout).toEqual({ showLogo: true, showAddress: true, showSignature: true, showStamp: true, showFooter: true });
    expect(draft.inputFields).toEqual([
      { key: "reason", label: "Reason", kind: "long_text", required: true, multiline: true },
      { key: "severity", label: "Warning level", kind: "text", required: true, options: ["First", "Final"], multiline: false, choices: true },
    ]);
  });

  it("returns an empty draft for a new template", () => {
    expect(templateToDraft(null)).toMatchObject({ name: "", category: "Custom", recipientType: "employee", inputFields: [] });
  });

  it("strips editor-only flags and trims names in the payload", () => {
    const payload = draftToPayload(
      { ...templateToDraft(template), name: "  Warning  ", inputFields: [{ key: "a1", label: " A ", kind: "text", required: 0, isNew: true }] },
      { note: "  tweak ", version: 3 }
    );
    expect(payload.name).toBe("Warning");
    expect(payload.inputFields).toEqual([{ key: "a1", label: "A", kind: "text", required: false, multiline: false }]);
    expect(payload.note).toBe("tweak");
    expect(payload.version).toBe(3);
    const plain = draftToPayload(templateToDraft(template));
    expect(plain).not.toHaveProperty("note");
    expect(plain).not.toHaveProperty("version");
  });

  it("keeps choices and multi-line on save so seeded fields survive an edit", () => {
    const payload = draftToPayload(templateToDraft(template));
    expect(payload.inputFields[0]).toMatchObject({ kind: "long_text", multiline: true });
    expect(payload.inputFields[1]).toMatchObject({ options: ["First", "Final"], multiline: false });
    const edited = draftToPayload({
      ...templateToDraft(template),
      inputFields: [{ key: "x", label: "X", kind: "text", options: ["A"], optionsText: "A,", isNew: true }],
    });
    expect(edited.inputFields[0]).toEqual({ key: "x", label: "X", kind: "text", required: false, options: ["A"], multiline: false });
  });

  it("detects real changes only", () => {
    const base = templateToDraft(template);
    expect(isDraftDirty({ ...base }, base)).toBe(false);
    expect(isDraftDirty({ ...base, bodyHtml: "<p>Hello</p>" }, base)).toBe(true);
    expect(isDraftDirty({ ...base, layout: { ...base.layout, showLogo: false } }, base)).toBe(true);
  });
});

describe("issue preview helpers", () => {
  const fields = [
    { key: "reason", label: "Reason", kind: "long_text", required: true },
    { key: "title", label: "New title", kind: "text", required: true },
    { key: "manager", label: "Reporting manager", kind: "person_name", required: true },
    { key: "team", label: "Team (new)", kind: "display_name", required: true },
    { key: "note", label: "Extra note", kind: "text", required: false },
    { key: "effectiveDate", label: "Effective date", kind: "date", required: true },
    { key: "amount", label: "Amount", kind: "currency_monthly", required: true },
    { key: "level", label: "Warning level", kind: "text", required: true, options: ["First", "Final"] },
    { key: "plain", label: "Plain", required: true },
  ];

  const template = { _id: "t1", recipientType: "employee", inputFields: fields };

  it("preview requests ask the server to mark every still-needed question, of any kind", () => {
    const req = buildPreviewRequest({ template, recipient: { _id: "e1" }, values: { reason: "Late", title: "  ", note: "" } });
    expect(req.gapKeys).toEqual(["title", "manager", "team", "effectiveDate", "amount", "level", "plain"]);
    expect(req.values.reason).toBe("Late");
    expect(req.values.title).toBe("  ");
    expect(req).toMatchObject({ templateId: "t1", employeeId: "e1" });
  });

  it("preview requests send real answers only and omit gapKeys when nothing is needed", () => {
    const answered = Object.fromEntries(fields.map((f) => [f.key, "x"]));
    const req = buildPreviewRequest({ template, recipient: { _id: "e1" }, values: answered });
    expect(req).not.toHaveProperty("gapKeys");
    expect(req.values).toEqual(answered);
  });

  it("preview requests with edited wording carry no gap keys", () => {
    const req = buildPreviewRequest({ template, recipient: { _id: "e1" }, values: {}, editedHtml: "<p>Custom</p>" });
    expect(req.editedHtml).toBe("<p>Custom</p>");
    expect(req).not.toHaveProperty("gapKeys");
  });

  it("issue requests never carry gap keys", () => {
    expect(buildLetterRequest({ template, recipient: { _id: "e1" }, values: {} })).not.toHaveProperty("gapKeys");
  });

  it("lists labels of required questions that are still empty, in order", () => {
    expect(stillNeededLabels(fields, { reason: "Late", amount: "0" })).toEqual([
      "New title",
      "Reporting manager",
      "Team (new)",
      "Effective date",
      "Warning level",
      "Plain",
    ]);
    expect(stillNeededLabels(fields.filter((f) => !f.required), {})).toEqual([]);
    expect(stillNeededLabels(undefined, {})).toEqual([]);
  });

  it("only client errors (4xx) from the preview block issuing", () => {
    expect(isClientErrorStatus(400)).toBe(true);
    expect(isClientErrorStatus(404)).toBe(true);
    expect(isClientErrorStatus(499)).toBe(true);
    expect(isClientErrorStatus(500)).toBe(false);
    expect(isClientErrorStatus(503)).toBe(false);
    expect(isClientErrorStatus(null)).toBe(false);
    expect(isClientErrorStatus(399)).toBe(false);
  });

  it("builds a safe draft file name", () => {
    expect(draftLetterFileName("Warning Letter", "Asha Rao")).toBe("Warning_Letter_Asha_Rao_DRAFT.pdf");
    expect(draftLetterFileName("Offer / Letter", "")).toBe("Offer_Letter_DRAFT.pdf");
    expect(draftLetterFileName("", null)).toBe("letter_DRAFT.pdf");
  });
});

describe("letter request helpers", () => {
  it("builds employee requests with only the template's fields", () => {
    const req = buildLetterRequest({
      template: { _id: "t1", recipientType: "employee", inputFields: [{ key: "reason" }, { key: "date" }] },
      recipient: { _id: "e1" },
      values: { reason: "Late", stray: "x" },
    });
    expect(req).toEqual({ templateId: "t1", recipientType: "employee", employeeId: "e1", values: { reason: "Late", date: "" } });
  });

  it("builds candidate requests with edits and email", () => {
    const req = buildLetterRequest({
      template: { _id: "t2", recipientType: "candidate", inputFields: [] },
      recipient: { _id: "c1" },
      editedHtml: "<p>Edited</p>",
      sendEmail: true,
    });
    expect(req).toEqual({
      templateId: "t2",
      recipientType: "candidate",
      candidateId: "c1",
      values: {},
      editedHtml: "<p>Edited</p>",
      sendEmail: true,
    });
  });
});

describe("template draft field rules", () => {
  it("rejects unsafe choices and more fields than the server allows", () => {
    const withChoice = {
      ...baseDraft,
      inputFields: [{ key: "severity", label: "Warning level", kind: "text", options: ["First", "<b>Final</b>"] }],
      bodyHtml: "<p>{{employeeName}} {{severity}}</p>",
    };
    expect(validateTemplateDraft(withChoice, registry).errors.inputFields[0]).toMatch(/choice contains invalid/);

    const tooMany = {
      ...baseDraft,
      bodyHtml: "<p>{{employeeName}}</p>",
      inputFields: Array.from({ length: MAX_INPUT_FIELDS + 1 }, (_, i) => ({ key: `field${i}a`, label: `Field ${i}`, kind: "text" })),
    };
    expect(validateTemplateDraft(tooMany, registry).errors.inputFields.limit).toMatch(/at most 30/);
  });

  it("accepts every server kind, including paragraph fields from seeded templates", () => {
    const draft = {
      ...baseDraft,
      bodyHtml: "<p>{{employeeName}} {{purpose}}</p>",
      inputFields: [{ key: "purpose", label: "Purpose", kind: "long_text", multiline: true }],
    };
    expect(validateTemplateDraft(draft, registry).valid).toBe(true);
  });

  it("requires at least one choice for a dropdown question", () => {
    const draft = {
      ...baseDraft,
      bodyHtml: "<p>{{employeeName}} {{severity}}</p>",
      inputFields: [{ key: "severity", label: "Warning level", kind: "text", choices: true }],
    };
    expect(validateTemplateDraft(draft, registry).errors.inputFields[0]).toBe("Add at least one choice for Warning level");
    const withOptions = { ...draft, inputFields: [{ ...draft.inputFields[0], options: ["First"] }] };
    expect(validateTemplateDraft(withOptions, registry).valid).toBe(true);
  });

  it("words question errors in plain language", () => {
    const { errors } = validateTemplateDraft(
      { ...baseDraft, inputFields: [{ key: "employeeName", label: "Employee name", kind: "text" }, { key: "", label: "", kind: "text" }] },
      registry
    );
    expect(errors.inputFields[0]).toBe("“Employee name” is already a built-in detail — use a different question");
    expect(errors.inputFields[1]).toBe("Question is required");
  });
});

describe("detail groups for the editor", () => {
  const groups = [
    {
      group: "Employee",
      placeholders: [
        { key: "employeeName", label: "Employee name" },
        { key: "salaryRows", label: "Salary rows", type: "list" },
        { key: "doj" },
      ],
    },
    { group: "Empty", placeholders: [] },
  ];

  it("skips blank questions, list details and empty groups and names unlabelled details", () => {
    expect(
      buildDetailGroups(groups, [
        { key: "reason", label: "Reason" },
        { key: "", label: "Unsaved" },
        { key: "blank", label: "  " },
      ])
    ).toEqual([
      { group: "Employee", items: [{ key: "employeeName", label: "Employee name" }, { key: "doj", label: "Doj" }] },
      { group: "This letter's questions", items: [{ key: "reason", label: "Reason" }] },
    ]);
  });

  it("orders groups Person, Company, Salary, this letter's questions, then Signatory", () => {
    const one = (group) => ({ group, placeholders: [{ key: `k${group.replace(/\W/g, "")}`, label: group }] });
    const order = buildDetailGroups(
      [one("Signatory"), one("Other"), one("Salary"), one("Company"), one("Letter"), one("Candidate"), one("Employee")],
      [{ key: "reason", label: "Reason" }]
    ).map((g) => g.group);
    expect(order).toEqual(["Employee", "Candidate", "Company", "Salary", "This letter's questions", "Letter", "Signatory", "Other"]);
  });

  it("omits the questions group when there are no questions", () => {
    expect(buildDetailGroups(groups, []).map((g) => g.group)).toEqual(["Employee"]);
    expect(buildDetailGroups()).toEqual([]);
  });

  it("maps every known key to its friendly label and is strict only once details have loaded", () => {
    expect(detailLabels(groups, [{ key: "reason", label: "Reason" }])).toEqual({
      labels: { employeeName: "Employee name", salaryRows: "Salary rows", doj: "Doj", reason: "Reason" },
      strict: true,
    });
    expect(detailLabels([], [{ key: "reason", label: "" }])).toEqual({ labels: { reason: "Reason" }, strict: false });
  });
});

describe("answer types", () => {
  it("lists the plain answer types in the agreed order", () => {
    expect(ANSWER_TYPES.map((t) => t.label)).toEqual([
      "Short text", "Paragraph", "Date", "Date in the past", "Amount (₹ per month)", "Amount (₹ per year)",
      "Number", "Email", "Phone", "Person's name", "Name", "Website", "Dropdown with choices",
    ]);
    expect(INPUT_FIELD_KINDS.find((k) => k.value === "date_past").label).toBe("Date in the past");
  });

  it("reads a field's answer type, treating short text with choices as a dropdown", () => {
    expect(answerTypeOf({ kind: "date" })).toBe("date");
    expect(answerTypeOf({ kind: "text" })).toBe("text");
    expect(answerTypeOf({})).toBe("text");
    expect(answerTypeOf({ kind: "text", options: ["A"] })).toBe("choice");
    expect(answerTypeOf({ kind: "text", choices: true })).toBe("choice");
  });

  it("switches answer type without leaking choices or multi-line into other types", () => {
    const dropdown = applyAnswerType({ key: "level", label: "Level", kind: "long_text", multiline: true }, "choice");
    expect(dropdown).toEqual({ key: "level", label: "Level", kind: "text", choices: true, multiline: false });
    const withOptions = { ...dropdown, options: ["A"], optionsText: "A" };
    expect(applyAnswerType(withOptions, "date")).toEqual({ key: "level", label: "Level", kind: "date", multiline: false });
    expect(applyAnswerType(withOptions, "long_text")).toMatchObject({ kind: "long_text", multiline: true });
    expect(applyAnswerType(withOptions, "choice")).toMatchObject({ options: ["A"], choices: true });
  });

  it("keeps the editor-only dropdown flag out of the saved payload", () => {
    const payload = draftToPayload({ ...baseDraft, inputFields: [{ key: "level", label: "Level", kind: "text", choices: true, options: ["A"] }] });
    expect(payload.inputFields[0]).not.toHaveProperty("choices");
    expect(payload.inputFields[0].options).toEqual(["A"]);
  });
});

describe("template editor errors", () => {
  it("names unknown details without raw placeholder syntax", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, bodyHtml: "<p>{{managerName}} {{other_key}}</p>" }, registry);
    expect(errors.bodyHtml).toBe("Some details in this letter no longer exist (Manager name, Other key) — remove the ones shown in red.");
  });

  it("finds the first errored place in screen order", () => {
    expect(editorErrorTarget({})).toBeNull();
    expect(editorErrorTarget({ category: "x", name: "y" })).toEqual({ field: "name", tab: null, index: null });
    expect(editorErrorTarget({ inputFields: { 2: "x" }, recipientType: "y" })).toEqual({ field: "inputFields", tab: "questions", index: 2 });
    expect(editorErrorTarget({ inputFields: { limit: "x" } })).toEqual({ field: "inputFields", tab: "questions", index: null });
    expect(editorErrorTarget({ bodyHtml: "x", layout: "y" })).toEqual({ field: "bodyHtml", tab: null, index: null });
    expect(editorErrorTarget({ layout: "y" })).toEqual({ field: "layout", tab: "letterhead", index: null });
    expect(editorErrorTarget({ recipientType: "y" })).toEqual({ field: "recipientType", tab: "about", index: null });
  });

  it("maps server field errors onto the editor", () => {
    expect(templateServerError({ field: "name", message: "Template name is required" })).toEqual({
      errors: { name: "Template name is required" },
      target: { field: "name", tab: null, index: null },
    });
    expect(templateServerError({ field: "inputFields", index: 1, message: 'Question "Level" matches another question' })).toEqual({
      errors: { inputFields: { 1: 'Question "Level" matches another question' } },
      target: { field: "inputFields", tab: "questions", index: 1 },
    });
    expect(templateServerError({ field: "inputFields", index: 0, message: "Question 1 is required" }).target.index).toBe(0);
    expect(templateServerError({ field: "inputFields", message: "Question 4 is required" }).errors).toEqual({
      inputFields: { limit: "Question 4 is required" },
    });
    expect(templateServerError({ field: "note", message: "Change note is too long" })).toEqual({
      errors: { note: "Change note is too long" },
      target: null,
    });
    expect(templateServerError({ field: "values", message: "x" })).toEqual({ errors: {}, target: null });
    expect(templateServerError({ field: null, message: "x" })).toEqual({ errors: {}, target: null });
  });

  it("rewords server unknown-placeholder and syntax errors without braces", () => {
    expect(
      templateServerError(
        { field: "bodyHtml", code: "UNKNOWN_PLACEHOLDER", message: "Template body uses unknown placeholders: {{managerName}}, {{b}}" },
        { b: "Bonus" }
      ).errors.bodyHtml
    ).toBe("Some details in this letter no longer exist (Manager name, Bonus) — remove the ones shown in red.");
    expect(
      templateServerError({ field: "bodyHtml", code: "TEMPLATE_SYNTAX", message: "Template body: unclosed {{#if x}}" }).errors.bodyHtml
    ).toBe("Template body: unclosed #if x");
  });

  it("keeps the server's structured syntax details for the editor (M9)", () => {
    const response = (data) => ({ response: { status: 400, data } });
    const message = "Template body has a block that is never closed (line 2).";
    expect(getApiError(response({ message, field: "bodyHtml", code: "TEMPLATE_SYNTAX", syntax: { reason: "unclosed_block", line: 2 } })).syntax).toEqual({
      reason: "unclosed_block",
      line: 2,
    });
    expect(getApiError(response({ message, syntax: "nope" })).syntax).toBeNull();
    expect(getApiError(response({ message, syntax: { line: 2 } })).syntax).toBeNull();
    expect(templateServerError({ field: "bodyHtml", code: "TEMPLATE_SYNTAX", message }).errors.bodyHtml).toBe(message);
  });
});

describe("template editor round-1 rules", () => {
  it("marks loaded questions with choices as dropdowns so clearing the text keeps the type", () => {
    const [field] = templateToDraft({ inputFields: [{ key: "level", label: "Level", kind: "text", options: ["A"] }] }).inputFields;
    expect(field.choices).toBe(true);
    const { options, ...cleared } = field;
    expect(answerTypeOf({ ...cleared, optionsText: "" })).toBe("choice");
    const [plain] = templateToDraft({ inputFields: [{ key: "reason", label: "Reason", kind: "text" }] }).inputFields;
    expect(plain).not.toHaveProperty("choices");
  });

  it("accepts the same question keys as the server", () => {
    const withKey = (key) =>
      validateTemplateDraft({ ...baseDraft, bodyHtml: `<p>{{employeeName}} {{${key}}}</p>`, inputFields: [{ key, label: "Reason", kind: "text" }] }, registry);
    ["a", "Reason", "reason_code", "r2", `a${"b".repeat(39)}`].forEach((key) => expect(withKey(key).errors.inputFields).toBeUndefined());
    ["1a", "a-b", "_a", `a${"b".repeat(40)}`].forEach((key) => expect(withKey(key).errors.inputFields?.[0]).toBeTruthy());
  });

  it("uses Group wording and shared copy for required content", () => {
    const { errors } = validateTemplateDraft({ ...baseDraft, category: "Other", bodyHtml: "" }, registry);
    expect(errors.category).toBe("Choose a group");
    expect(errors.bodyHtml).toBe("Letter content is required");
  });

  it("reads the question index from API errors", () => {
    expect(getApiError({ response: { status: 400, data: { message: "x", field: "inputFields", index: 2 } } }).index).toBe(2);
    expect(getApiError({ response: { status: 400, data: { message: "x", index: "2" } } }).index).toBeNull();
  });

});

describe("questionKeyLocks", () => {
  const fields = [
    { key: "reason", label: "Reason", isNew: true },
    { key: "level", label: "Level", isNew: true },
    { key: "companyName", label: "Company name", isNew: true },
    { key: "reason", label: "Reason", isNew: true },
  ];

  it("fixes a used key for its first question only, never for built-in detail keys", () => {
    expect(questionKeyLocks(fields, ["reason", "level", "companyName"], ["companyName", "employeeName"])).toEqual([true, true, false, false]);
  });

  it("keeps the original question locked while a newer question briefly shares its wording", () => {
    const sharing = [
      { key: "reason", label: "Reason", isNew: true },
      { key: "reason", label: "Reason", isNew: true },
    ];
    expect(questionKeyLocks(sharing, ["reason"], [])).toEqual([true, false]);
    expect(questionKeyLocks([sharing[0], { key: "reasonFor", label: "Reason for" }], ["reason"], [])).toEqual([true, false]);
  });

  it("does not fix keys the letter does not use", () => {
    expect(questionKeyLocks([{ key: "level" }, { key: "" }], [], [])).toEqual([false, false]);
    expect(questionKeyLocks([{ key: "" }], [""], [])).toEqual([false]);
    expect(questionKeyLocks(undefined, ["a"], [])).toEqual([]);
  });

  it("accepts sets as well as arrays", () => {
    expect(questionKeyLocks([{ key: "level" }], new Set(["level"]), new Set())).toEqual([true]);
  });
});

/* ---------- Letters QA round (2026-10-06) ---------- */

describe("number answers are whole numbers within the question's range (BUG-05)", () => {
  const responsePeriod = { key: "responsePeriod", label: "Response period (days)", kind: "number", required: true, integer: true, min: 1, max: 365 };
  const count = { key: "count", label: "Count", kind: "number" };

  it("uses the shared answer rules for the checks", () => {
    const [days, plain] = buildInputFieldChecks([responsePeriod, count], {});
    expect(days).toMatchObject({ kind: "number", integer: true, min: 1, max: 365 });
    expect(plain).toMatchObject({ kind: "number", decimal: true, min: -1_000_000_000, max: 1_000_000_000 });
    expect(plain).not.toHaveProperty("integer");
  });

  it.each([
    ["3", null],
    ["365", null],
    ["-5", "Response period (days) cannot be less than 1"],
    ["0", "Response period (days) cannot be less than 1"],
    ["99999999999", "Response period (days) cannot exceed 365"],
    ["1e3", "Response period (days) must be a whole number"],
    ["7.5", "Response period (days) must be a whole number"],
  ])("response period %p", (value, expected) => {
    expect(validateLetterInput(responsePeriod, value)).toBe(expected);
  });

  it("a number question without declared rules accepts decimals and negatives, as before the QA round", () => {
    const increment = { key: "increment", label: "Increment %", kind: "number" };
    expect(validateLetterInput(increment, "7.5")).toBeNull();
    expect(validateLetterInput(increment, "-1")).toBeNull();
    expect(validateLetterInput(increment, "2500000")).toBeNull();
    expect(validateLetterInput(increment, "1000000001")).toBe("Increment % cannot exceed 1000000000");
    expect(validateLetterInput(increment, "1e3")).toBe("Increment % must be a valid number");
    expect(validateLetterInput(count, "")).toBeNull();
  });

  it("number inputs follow the question's declared rules (browser hints match the shared checks)", () => {
    expect(numberInputAttributes(responsePeriod)).toEqual({ min: 1, max: 365, step: "1", inputMode: "numeric" });
    expect(numberInputAttributes(count)).toEqual({ step: "any", inputMode: "decimal" });
    expect(numberInputAttributes({ kind: "number", min: 0, max: 12.5 })).toEqual({ min: 0, max: 12.5, step: "any", inputMode: "decimal" });
    expect(numberInputAttributes({ kind: "currency_monthly" })).toEqual({ min: 0, step: "any", inputMode: "decimal" });
    expect(numberInputAttributes({ kind: "text" })).toBeNull();
  });

  it("keeps a number question's range and whole-number flag through load and save, and only for number questions", () => {
    const draft = templateToDraft({
      inputFields: [responsePeriod, { key: "reason", label: "Reason", kind: "text", integer: true, min: 1, max: 3 }, count],
    });
    expect(draft.inputFields[0]).toMatchObject({ integer: true, min: 1, max: 365 });
    expect(draft.inputFields[1]).not.toHaveProperty("min");
    expect(draft.inputFields[1]).not.toHaveProperty("integer");
    expect(draft.inputFields[2]).not.toHaveProperty("integer");
    const [saved, text, open] = draftToPayload(draft).inputFields;
    expect(saved).toMatchObject({ integer: true, min: 1, max: 365 });
    expect(text).not.toHaveProperty("max");
    expect(text).not.toHaveProperty("integer");
    expect(open).not.toHaveProperty("integer");
  });
});

describe("date answers must be plausible (BUG-06)", () => {
  const effective = { key: "effectiveDate", label: "Effective date", kind: "date", required: true };
  const incident = { key: "incidentDate", label: "Incident date", kind: "date_past", required: true };
  const isoDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  it.each([
    ["2026", "Effective date must be a valid date"],
    ["0001-01-01", "Effective date cannot be before 1 January 1950"],
    ["9999-12-31", "Effective date cannot be more than 10 years from today"],
  ])("effective date %p", (value, expected) => {
    expect(validateLetterInput(effective, value)).toBe(expected);
  });

  it("an incident date cannot be in the future", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(validateLetterInput(incident, isoDay(tomorrow))).toBe("Incident date cannot be in the future");
    expect(validateLetterInput(incident, isoDay(new Date()))).toBeNull();
  });
});

describe("candidate dates stay within two years (BUG-06)", () => {
  const today = new Date("2026-10-05T10:00:00");
  const valid = {
    name: "Riya Verma",
    email: "riya@example.com",
    designation: "Field Executive",
    annualCTC: "360000",
    joiningDate: "2026-11-01",
  };

  it("refuses a joining date far in the future or not a full date", () => {
    expect(validateCandidate({ ...valid, joiningDate: "9999-12-31" }, { today }).errors.joiningDate).toBe(
      "Joining date cannot be more than 2 years from today"
    );
    expect(validateCandidate({ ...valid, joiningDate: "2026" }, { today }).errors.joiningDate).toBe("Joining date must be a valid date");
    expect(validateCandidate({ ...valid, joiningDate: "2028-10-05" }, { today }).valid).toBe(true);
  });

  it("refuses an offer validity far in the future", () => {
    expect(validateCandidate({ ...valid, offerExpiryDate: "9999-12-31" }, { today }).errors.offerExpiryDate).toBe(
      "Offer valid until cannot be more than 2 years from today"
    );
  });
});

describe("unknown details from the server (BUG-15)", () => {
  it("reads the keys list the server sends", () => {
    const err = { response: { status: 400, data: { message: "x", field: "bodyHtml", code: "UNKNOWN_PLACEHOLDER", keys: ["a", "b"] } } };
    expect(getApiError(err).keys).toEqual(["a", "b"]);
    expect(getApiError({ response: { status: 400, data: { message: "x", keys: "a" } } }).keys).toBeNull();
    expect(getApiError({ response: { status: 400, data: { message: "x", keys: [1] } } }).keys).toBeNull();
  });

  it("names the details from the keys, never showing raw placeholder syntax", () => {
    expect(
      templateServerError(
        {
          field: "bodyHtml",
          code: "UNKNOWN_PLACEHOLDER",
          message: "Template body uses 2 unknown details that this letter cannot fill. Remove them or choose a detail from Insert detail.",
          keys: ["managerName", "b"],
        },
        { b: "Bonus" }
      ).errors.bodyHtml
    ).toBe("Some details in this letter no longer exist (Manager name, Bonus) — remove the ones shown in red.");
  });

  it("without keys it shows the server's plain message", () => {
    const message = "Template body uses an unknown detail that this letter cannot fill. Remove it or choose a detail from Insert detail.";
    expect(templateServerError({ field: "bodyHtml", code: "UNKNOWN_PLACEHOLDER", message }).errors.bodyHtml).toBe(message);
  });
});

describe("candidate dates use the India business day, like the backend assertCandidateDates (M8)", () => {
  const today = new Date("2026-10-06T19:00:00Z");
  const base = { name: "Neha Singh", email: "neha@example.com", designation: "Engineer", annualCTC: "600000" };

  it("after Indian midnight, yesterday's date is in the past and today's is fine", () => {
    expect(validateCandidate({ ...base, joiningDate: "2026-10-06" }, { today }).errors.joiningDate).toBe("Joining date cannot be in the past");
    expect(validateCandidate({ ...base, joiningDate: "2026-10-07" }, { today }).errors.joiningDate).toBeUndefined();
    expect(validateCandidate({ ...base, joiningDate: "2026-10-08", offerExpiryDate: "2026-10-06" }, { today }).errors.offerExpiryDate).toBe(
      "Offer validity cannot be in the past"
    );
    expect(validateCandidate({ ...base, joiningDate: "2026-10-08", offerExpiryDate: "2026-10-07" }, { today }).valid).toBe(true);
  });
});
