import { answerFieldRules, BUSINESS_TIME_ZONE, businessDayKey, JOINING_DATE_RULES, validateField, validateFields } from "./inputValidation";
import { GROUP_OPTIONS } from "./letterCatalog";
import { detailDisplayName, humanizeDetailKey, usedFieldKeys } from "./letterPlaceholders";
import { LETTERS_COPY, format } from "./lettersCopy";

/** Mirrors LETTER_CATEGORIES in the backend letterConstants; shown to users as Groups. */
export const TEMPLATE_CATEGORIES = GROUP_OPTIONS.map((option) => option.value);

/** Mirrors RECIPIENT_TYPES in the backend letterConstants. */
export const RECIPIENT_TYPE_VALUES = Object.freeze(["employee", "candidate"]);

export const RECIPIENT_TYPES = RECIPIENT_TYPE_VALUES.map((value) => ({ value, label: LETTERS_COPY.recipientTypes[value] }));

export const recipientTypeLabel = (type) =>
  RECIPIENT_TYPE_VALUES.includes(type) ? LETTERS_COPY.recipientTypes[type] : "";

/** Fallback download name for an issued letter; the server's Content-Disposition name wins when present. */
export const issuedLetterFileName = (letter) =>
  `${String(letter?.letterNumber || "letter").replace(/[^\w-]+/g, "_")}.pdf`;

const EDITOR_COPY = LETTERS_COPY.editor;

/** Mirrors TEMPLATE_INPUT_KINDS in the backend letterConstants. */
export const INPUT_FIELD_KINDS = [
  "text", "long_text", "date", "date_past", "number", "currency_annual", "currency_monthly",
  "email", "phone", "person_name", "display_name", "url",
].map((value) => ({ value, label: EDITOR_COPY.answerTypes[value] }));

/** Editor-only answer type: a short-text question with fixed choices. */
export const CHOICE_ANSWER_TYPE = "choice";

export const ANSWER_TYPES = [
  "text", "long_text", "date", "date_past", "currency_monthly", "currency_annual",
  "number", "email", "phone", "person_name", "display_name", "url", CHOICE_ANSWER_TYPE,
].map((value) => ({ value, label: EDITOR_COPY.answerTypes[value] }));

export const answerTypeOf = (field = {}) =>
  field.kind === "text" && (field.choices || field.options?.length) ? CHOICE_ANSWER_TYPE : field.kind || "text";

/** Returns the field switched to `type`; choices survive only while the question stays a dropdown. */
export const applyAnswerType = (field, type) => {
  if (type === CHOICE_ANSWER_TYPE) return { ...field, kind: "text", choices: true, multiline: false };
  const { choices, options, optionsText, ...rest } = field;
  return { ...rest, kind: type, multiline: type === "long_text" };
};

export const MAX_INPUT_FIELDS = 30;
export const MAX_FIELD_OPTIONS = 30;
const TEXT_VALUE_MAX = 255;

/** Only free-text fields without fixed choices can be multi-line. */
const canBeMultiline = (field) => (field.kind === "text" || field.kind === "long_text") && !field.options?.length;

export const isMultilineField = (field) => canBeMultiline(field) && (field.kind === "long_text" || Boolean(field.multiline));

/** "First, Second ,, Final" -> ["First", "Second", "Final"] (trimmed, unique) */
export const parseFieldOptions = (text) => [
  ...new Set(
    String(text || "")
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean)
  ),
];

export const DEFAULT_LAYOUT = {
  showLogo: true,
  showAddress: true,
  showSignature: true,
  showStamp: false,
  showFooter: true,
};

export const LAYOUT_OPTIONS = Object.keys(DEFAULT_LAYOUT).map((key) => ({ key, ...EDITOR_COPY.letterheadOptions[key] }));

/** Mirrors the backend question key rule in letterValidation. */
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;

/** "Response deadline (days)" -> "responseDeadlineDays" */
export const toInputFieldKey = (label) => {
  const words = String(label || "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  const key = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
  return /^[a-z]/.test(key) ? key.slice(0, 40) : `field${key}`.slice(0, 40);
};

/**
 * Template editor rules. Returns { valid, errors } where errors has
 * name / category / recipientType / bodyHtml strings and inputFields[index] strings.
 */
export const validateTemplateDraft = (draft, registryKeys = []) => {
  const errors = {};
  const nameErr = validateField({
    name: "name",
    label: "Template name",
    value: draft.name,
    kind: "display_name",
    required: true,
  });
  if (nameErr) errors.name = nameErr;
  if (!TEMPLATE_CATEGORIES.includes(draft.category)) errors.category = EDITOR_COPY.chooseGroup;
  if (!RECIPIENT_TYPES.some((r) => r.value === draft.recipientType)) {
    errors.recipientType = "Choose who receives this letter";
  }

  const registry = new Set(registryKeys);
  const seen = new Set();
  const fieldErrors = {};
  (draft.inputFields || []).forEach((field, index) => {
    const labelErr = validateField({
      name: "label",
      label: "Question",
      value: field.label,
      kind: "display_name",
      required: true,
    });
    const label = String(field.label || "").trim();
    if (labelErr) fieldErrors[index] = labelErr;
    else if (!KEY_RE.test(field.key || "")) fieldErrors[index] = EDITOR_COPY.questionStartsWithLetter;
    else if (registry.has(field.key)) fieldErrors[index] = format(EDITOR_COPY.questionClashes, { label });
    else if (seen.has(field.key)) fieldErrors[index] = format(EDITOR_COPY.questionTwice, { label });
    else if (!INPUT_FIELD_KINDS.some((k) => k.value === field.kind)) fieldErrors[index] = EDITOR_COPY.chooseAnswerType;
    else if (field.choices && !field.options?.length) fieldErrors[index] = format(EDITOR_COPY.choicesRequired, { label });
    else if (field.options?.length) {
      if (field.options.length > MAX_FIELD_OPTIONS) {
        fieldErrors[index] = format(EDITOR_COPY.tooManyChoices, { label, max: MAX_FIELD_OPTIONS });
      } else {
        const optionErr = field.options
          .map((option) =>
            validateField({ name: "option", label: `"${field.label}" choice`, value: option, kind: "long_text", maxLength: 80 })
          )
          .find(Boolean);
        if (optionErr) fieldErrors[index] = optionErr;
      }
    }
    seen.add(field.key);
  });
  if ((draft.inputFields || []).length > MAX_INPUT_FIELDS) {
    fieldErrors.limit = format(EDITOR_COPY.tooManyQuestions, { max: MAX_INPUT_FIELDS });
  }
  if (Object.keys(fieldErrors).length) errors.inputFields = fieldErrors;

  if (!hasLetterContent(draft.bodyHtml)) {
    errors.bodyHtml = EDITOR_COPY.contentRequired;
  } else {
    // Like the server, conditions on unknown details count too, not only chips.
    const unknown = [...usedFieldKeys(draft.bodyHtml)].filter((key) => !registry.has(key) && !seen.has(key));
    if (unknown.length) errors.bodyHtml = unknownDetailsMessage(unknown);
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

/**
 * Per question: true when its key must stop following the label, because the letter uses the key
 * and that use can only mean this question — not a built-in detail or another question's key.
 */
export const questionKeyLocks = (fields = [], usedKeys = [], registryKeys = []) => {
  const used = new Set(usedKeys);
  const registry = new Set(registryKeys);
  return (fields || []).map(
    (field, index) =>
      Boolean(field.key) &&
      used.has(field.key) &&
      !registry.has(field.key) &&
      fields.findIndex((other) => other.key === field.key) === index
  );
};

const unknownDetailsMessage = (keys, labels) =>
  format(EDITOR_COPY.unknownDetails, { list: keys.map((key) => detailDisplayName(key, labels)).join(", ") });

/** Insert-detail menu order: who the letter is for, company, salary, this letter's questions, then the rest. */
const DETAIL_GROUP_ORDER = ["Employee", "Candidate", "Company", "Salary", EDITOR_COPY.questionsGroup, "Letter", "Signatory"];
const detailGroupRank = (group) => {
  const index = DETAIL_GROUP_ORDER.indexOf(group);
  return index === -1 ? DETAIL_GROUP_ORDER.length : index;
};

/** Insert-detail menu groups (list details excluded), in DETAIL_GROUP_ORDER. */
export const buildDetailGroups = (detailGroups = [], questionFields = []) => {
  const questions = questionFields
    .filter((field) => field.key && String(field.label || "").trim())
    .map((field) => ({ key: field.key, label: field.label }));
  const details = detailGroups.map((group) => ({
    group: group.group,
    items: (group.placeholders || [])
      .filter((item) => item.type !== "list")
      .map(({ key, label }) => ({ key, label: label || humanizeDetailKey(key) })),
  }));
  return [...details, { group: EDITOR_COPY.questionsGroup, items: questions }]
    .filter((group) => group.items.length)
    .map((group, position) => ({ group, position }))
    .sort((a, b) => detailGroupRank(a.group.group) - detailGroupRank(b.group.group) || a.position - b.position)
    .map(({ group }) => group);
};

/**
 * Friendly chip label for every usable key. `strict` is false until registry details have loaded,
 * so chips are not flagged as unknown while the list is still on its way.
 */
export const detailLabels = (detailGroups = [], questionFields = []) => {
  const labels = {};
  detailGroups.forEach((group) => group.placeholders?.forEach((item) => (labels[item.key] = item.label || humanizeDetailKey(item.key))));
  questionFields.forEach((field) => field.key && (labels[field.key] = field.label || humanizeDetailKey(field.key)));
  return { labels, strict: detailGroups.some((group) => group.placeholders?.length) };
};

const ERROR_TARGETS = [
  { field: "name", tab: null },
  { field: "bodyHtml", tab: null },
  { field: "inputFields", tab: "questions" },
  { field: "layout", tab: "letterhead" },
  { field: "category", tab: "about" },
  { field: "recipientType", tab: "about" },
];

/** First errored place in screen order (top bar, canvas, then side-panel tabs) so focus can move there. */
export const editorErrorTarget = (errors = {}) => {
  const target = ERROR_TARGETS.find(({ field }) => errors[field]);
  if (!target) return null;
  let index = null;
  if (target.field === "inputFields") {
    const rows = Object.keys(errors.inputFields).filter((key) => /^\d+$/.test(key)).map(Number);
    index = rows.length ? Math.min(...rows) : null;
  }
  return { ...target, index };
};

const stripBraces = (message) => String(message || "").replace(/\{\{\s*|\s*\}\}/g, "");

/**
 * Maps a template save error from the API onto editor errors and the place to focus.
 * `labels` (from detailLabels) names unknown details the way the editor shows them.
 */
export const templateServerError = ({ field, code, message, index, keys } = {}, labels = {}) => {
  if (field === "note") return { errors: { note: message }, target: null };
  if (!ERROR_TARGETS.some((target) => target.field === field)) return { errors: {}, target: null };
  let errors;
  const unknownKeys =
    code === "UNKNOWN_PLACEHOLDER"
      ? keys?.length
        ? keys
        : [...String(message || "").matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((match) => match[1])
      : [];
  if (field === "inputFields") {
    errors = { inputFields: Number.isInteger(index) ? { [index]: message } : { limit: message } };
  } else if (unknownKeys.length) {
    errors = { [field]: unknownDetailsMessage(unknownKeys, labels) };
  } else {
    errors = { [field]: stripBraces(message) };
  }
  return { errors, target: editorErrorTarget(errors) };
};

export const EMPTY_TEMPLATE_DRAFT = {
  name: "",
  category: "Custom",
  recipientType: "employee",
  bodyHtml: "",
  layout: { ...DEFAULT_LAYOUT },
  inputFields: [],
};

export const templateToDraft = (template) => {
  if (!template) return { ...EMPTY_TEMPLATE_DRAFT, layout: { ...DEFAULT_LAYOUT }, inputFields: [] };
  return {
    name: template.name || "",
    category: template.category || "Custom",
    recipientType: template.recipientType || "employee",
    bodyHtml: template.bodyHtml || "",
    layout: { ...DEFAULT_LAYOUT, ...(template.layout || {}) },
    inputFields: (template.inputFields || []).map(toEditorField),
  };
};

const toFieldModel = (field) => {
  const options = Array.isArray(field.options) && field.options.length ? [...field.options] : undefined;
  const model = {
    key: field.key,
    label: String(field.label || ""),
    kind: field.kind || "text",
    required: Boolean(field.required),
    ...(options ? { options } : {}),
    ...(field.kind === "number" && field.integer === true ? { integer: true } : {}),
    ...(field.kind === "number" && field.min != null ? { min: field.min } : {}),
    ...(field.kind === "number" && field.max != null ? { max: field.max } : {}),
  };
  return { ...model, multiline: isMultilineField({ ...model, multiline: field.multiline }) };
};

/** Editor model for a loaded question: a question with choices stays a dropdown even while its choices are cleared. */
const toEditorField = (field) => {
  const model = toFieldModel(field);
  return model.options && model.kind === "text" ? { ...model, choices: true } : model;
};

/**
 * Shape sent to the API; drops editor-only flags and keeps field choices / multi-line so
 * saving never strips them from seeded templates. `note` and `version` are the API's names
 * for the change note and the optimistic-lock version.
 */
export const draftToPayload = (draft, { note = "", version } = {}) => ({
  name: String(draft.name || "").trim(),
  category: draft.category,
  recipientType: draft.recipientType,
  bodyHtml: draft.bodyHtml,
  layout: Object.fromEntries(LAYOUT_OPTIONS.map(({ key }) => [key, Boolean(draft.layout?.[key])])),
  inputFields: (draft.inputFields || []).map((field) => ({
    ...toFieldModel(field),
    label: String(field.label || "").trim(),
  })),
  ...(note.trim() ? { note: note.trim() } : {}),
  ...(version != null ? { version } : {}),
});

export const isDraftDirty = (draft, baseline) =>
  JSON.stringify(draftToPayload(draft)) !== JSON.stringify(draftToPayload(baseline));

/** Request body shared by letter preview and issue. */
export const buildLetterRequest = ({ template, recipient, values = {}, editedHtml = null, sendEmail = false }) => ({
  templateId: template?._id,
  recipientType: template?.recipientType,
  ...(template?.recipientType === "candidate" ? { candidateId: recipient?._id } : { employeeId: recipient?._id }),
  values: Object.fromEntries(
    (template?.inputFields || []).map((field) => [field.key, values[field.key] ?? ""])
  ),
  ...(editedHtml ? { editedHtml } : {}),
  ...(sendEmail ? { sendEmail: true } : {}),
});

export const buildInputFieldChecks = (inputFields = [], values = {}) =>
  inputFields.map((field) => ({
    name: field.key,
    label: field.label,
    value: values[field.key],
    kind: field.kind || "text",
    required: Boolean(field.required),
    ...(field.kind === "text" ? { maxLength: TEXT_VALUE_MAX } : {}),
    ...answerFieldRules(field),
  }));

const CURRENCY_KINDS = new Set(["currency_annual", "currency_monthly"]);

/** Browser hints for a numeric answer, from the same declared rules the checks use; null for other answers. */
export const numberInputAttributes = (field = {}) => {
  if (CURRENCY_KINDS.has(field.kind)) return { min: 0, step: "any", inputMode: "decimal" };
  if (field.kind !== "number") return null;
  const whole = field.integer === true;
  return {
    ...(field.min != null ? { min: field.min } : {}),
    ...(field.max != null ? { max: field.max } : {}),
    step: whole ? "1" : "any",
    inputMode: whole ? "numeric" : "decimal",
  };
};

/** Same rules as the backend's validateLetterValues, including fixed choices. */
export const validateLetterInput = (field, value) => {
  const [check] = buildInputFieldChecks([field], { [field.key]: value });
  const error = validateField(check);
  if (error) return error;
  const text = String(value ?? "").trim();
  if (text && field.options?.length && !field.options.includes(text)) {
    return `${field.label} must be one of: ${field.options.join(", ")}`;
  }
  return null;
};

export const validateLetterInputs = (inputFields = [], values = {}) => {
  const errors = {};
  inputFields.forEach((field) => {
    const error = validateLetterInput(field, values[field.key]);
    if (error) errors[field.key] = error;
  });
  return { valid: Object.keys(errors).length === 0, errors, firstError: Object.values(errors)[0] || null };
};

const isBlank = (value) => String(value ?? "").trim() === "";

const stillNeededFields = (inputFields = [], values = {}) =>
  (inputFields || []).filter((field) => field.required && isBlank(values?.[field.key]));

/** Labels of required questions that still have no answer, in template order. */
export const stillNeededLabels = (inputFields = [], values = {}) =>
  stillNeededFields(inputFields, values).map((field) => field.label);

/**
 * Live-preview request: the real answers plus `gapKeys`, which the server prints as highlighted
 * labels. Issue and draft-PDF requests use buildLetterRequest and never carry gap keys.
 */
export const buildPreviewRequest = ({ template, recipient, values = {}, editedHtml = null }) => {
  const request = buildLetterRequest({ template, recipient, values, editedHtml });
  const gapKeys = editedHtml ? [] : stillNeededFields(template?.inputFields, values).map((field) => field.key);
  return gapKeys.length ? { ...request, gapKeys } : request;
};

/** A preview the server refused (4xx) means issuing would fail too; network/server errors may be transient. */
export const isClientErrorStatus = (status) => Number.isInteger(status) && status >= 400 && status < 500;

/** Letter HTML counts as content when it has visible text or an image. */
export const hasLetterContent = (html) => {
  const source = String(html || "");
  if (/<img\b/i.test(source)) return true;
  return source.replace(/<[^>]*>/g, "").replace(/&nbsp;|\u00a0/gi, " ").trim() !== "";
};

const fileStem = (text) =>
  String(text || "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const draftLetterFileName = (templateName, recipientName) =>
  `${[fileStem(templateName), fileStem(recipientName)].filter(Boolean).join("_") || "letter"}_DRAFT.pdf`;

export const EMPTY_CANDIDATE = {
  name: "",
  email: "",
  phone: "",
  address: "",
  designation: "",
  departmentId: "",
  annualCTC: "",
  joiningDate: "",
  offerExpiryDate: "",
  notes: "",
};

export const CANDIDATE_FIELDS = [
  { name: "name", label: "Full name", kind: "person_name", required: true },
  { name: "email", label: "Email", kind: "email", required: true },
  { name: "phone", label: "Phone", kind: "phone", required: false },
  { name: "address", label: "Address", kind: "long_text", required: false, maxLength: 500 },
  { name: "designation", label: "Role", kind: "display_name", required: true },
  { name: "annualCTC", label: "Annual CTC (₹)", kind: "currency_annual", required: true },
  { name: "joiningDate", label: "Joining date", kind: "date", required: true, ...JOINING_DATE_RULES },
  { name: "offerExpiryDate", label: "Offer valid until", kind: "date", required: false, ...JOINING_DATE_RULES },
  { name: "notes", label: "Notes", kind: "long_text", required: false, maxLength: 1000 },
];

export const STATUS_NOTE_FIELD = Object.freeze({ name: "note", label: "Note", kind: "long_text", maxLength: 500 });

export const validateStatusNote = (value) => validateField({ ...STATUS_NOTE_FIELD, value: value ?? "" });

export const validateCandidate = (form, { today = new Date(), isNew = true } = {}) => {
  const { errors } = validateFields(CANDIDATE_FIELDS.map((f) => ({ ...f, value: form[f.name], now: today })));
  const joining = businessDayKey(form.joiningDate);
  const expiry = businessDayKey(form.offerExpiryDate);
  const now = businessDayKey(today);
  if (!errors.joiningDate && joining && isNew && joining < now) {
    errors.joiningDate = "Joining date cannot be in the past";
  }
  if (!errors.offerExpiryDate && expiry) {
    if (isNew && expiry < now) errors.offerExpiryDate = "Offer validity cannot be in the past";
    else if (joining && expiry > joining) errors.offerExpiryDate = "Offer validity must be on or before the joining date";
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

export const LETTER_STATUS_META = {
  issued: { label: "Issued", tone: "success" },
  void: { label: "Void", tone: "error" },
};

const isStringList = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string");

/** Reads the `{ message, field, code, index, keys, syntax }` body our APIs send for client errors. */
export const getApiError = (error, fallback = "Something went wrong. Please try again.") => {
  const data = error?.response?.data;
  const syntax = data?.syntax;
  return {
    message: (data && typeof data.message === "string" && data.message) || fallback,
    field: data?.field || null,
    status: error?.response?.status || null,
    code: (data && typeof data.code === "string" && data.code) || null,
    index: Number.isInteger(data?.index) ? data.index : null,
    keys: isStringList(data?.keys) ? [...data.keys] : null,
    syntax: syntax && typeof syntax === "object" && typeof syntax.reason === "string" ? { ...syntax } : null,
  };
};

export const formatLetterDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: BUSINESS_TIME_ZONE });
};
