import API from "./apiClient";

/**
 * AI help for letters. Every call returns a draft for HR to review; nothing is saved or issued.
 * Errors carry `code` (AI_DISABLED, AI_BUDGET_EXCEEDED, AI_INVALID_OUTPUT, …) and a plain `message`.
 */
const dataOf = (response) => response.data?.data;

/** -> { template: { name, category, recipientType, bodyHtml, inputFields, layout }, notes } */
export const draftTemplateWithAi = async ({ description, recipientType, category }) =>
  dataOf(await API.post("/letter-templates/ai/draft", { description, recipientType, ...(category ? { category } : {}) }));

/** -> { template, notes, replacements: [{ original, becomes }] } */
export const importWordTemplate = async ({ file, recipientType }) => {
  const form = new FormData();
  form.append("file", file);
  form.append("recipientType", recipientType);
  return dataOf(await API.post("/letter-templates/ai/import", form));
};

/** Rewrites stored template HTML (with {{details}}) -> { html } */
export const rewriteTemplateText = async ({ html, preset, instruction }) =>
  dataOf(await API.post("/letter-templates/ai/rewrite", { html, preset, ...(instruction ? { instruction } : {}) }));

/** -> { suggestions: [{ type, message, find, replace }] }; find is "" when there is no automatic fix. */
export const reviewTemplateWithAi = async ({ name, category, recipientType, bodyHtml, inputFields }) =>
  dataOf(await API.post("/letter-templates/ai/review", { name, category, recipientType, bodyHtml, inputFields }));

/** -> { answers: { [questionKey]: value } } */
export const fillAnswersWithAi = async ({ templateId, text }) =>
  dataOf(await API.post("/letters/ai/answers", { templateId, text }));

/** -> { bodyHtml }: the letter body for this recipient, reworded; goes into "Edit wording". */
export const adjustLetterWithAi = async ({ templateId, employeeId, candidateId, values, instruction }) =>
  dataOf(await API.post("/letters/ai/adjust", { templateId, employeeId, candidateId, values, instruction }));
