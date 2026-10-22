import API from "./apiClient";

/**
 * AI help for letters. Every call returns a draft for HR to review; nothing is saved or issued.
 * Errors carry `code` (AI_DISABLED, AI_BUDGET_EXCEEDED, AI_INVALID_OUTPUT, …) and a plain `message`.
 */
const dataOf = (response) => response.data?.data;

/**
 * -> { template: { name, category, recipientType, bodyHtml, inputFields, layout }, notes }.
 * formatTemplateId: one of the company's templates whose format the draft follows.
 */
export const draftTemplateWithAi = async ({ description, recipientType, category, formatTemplateId }) =>
  dataOf(
    await API.post("/letter-templates/ai/draft", {
      description,
      recipientType,
      ...(category ? { category } : {}),
      ...(formatTemplateId ? { formatTemplateId } : {}),
    })
  );

/**
 * -> { template, notes, replacements: [{ original, becomes }], removed: [letterhead/footer lines], copies }.
 * A file of several filled copies is compared on the server, so only its fixed wording reaches the AI.
 */
export const importWordTemplate = async ({ file, recipientType }) => {
  const form = new FormData();
  form.append("file", file);
  form.append("recipientType", recipientType);
  return dataOf(await API.post("/letter-templates/ai/import", form));
};

/** Rewrites stored template HTML (with {{details}}) -> { html }. Preset "match" needs formatTemplateId. */
export const rewriteTemplateText = async ({ html, preset, instruction, formatTemplateId }) =>
  dataOf(
    await API.post("/letter-templates/ai/rewrite", {
      html,
      preset,
      ...(instruction ? { instruction } : {}),
      ...(formatTemplateId ? { formatTemplateId } : {}),
    })
  );

/** -> { suggestions: [{ type, message, find, replace }] }; find is "" when there is no automatic fix. */
export const reviewTemplateWithAi = async ({ name, category, recipientType, bodyHtml, inputFields }) =>
  dataOf(await API.post("/letter-templates/ai/review", { name, category, recipientType, bodyHtml, inputFields }));

/** -> { answers: { [questionKey]: value } } */
export const fillAnswersWithAi = async ({ templateId, text }) =>
  dataOf(await API.post("/letters/ai/answers", { templateId, text }));

/** -> { bodyHtml }: the letter body for this recipient, reworded; goes into "Edit wording". */
export const adjustLetterWithAi = async ({ templateId, employeeId, candidateId, values, instruction }) =>
  dataOf(await API.post("/letters/ai/adjust", { templateId, employeeId, candidateId, values, instruction }));
