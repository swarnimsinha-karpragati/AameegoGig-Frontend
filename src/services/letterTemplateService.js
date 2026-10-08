import API from "./apiClient";

/** Letter APIs use the standard `{ success, data }` envelope. */
const dataOf = (response) => response.data?.data;

/** GET /letter-templates -> data: [template summary] */
export const getLetterTemplates = async (params = {}) =>
  dataOf(await API.get("/letter-templates", { params })) || [];

/** GET /letter-templates/placeholders -> data: { groups: [{ group, placeholders: [...] }] } */
export const getLetterPlaceholders = async (recipientType) =>
  dataOf(await API.get("/letter-templates/placeholders", { params: { recipientType } }))?.groups || [];

/** Template endpoints that return a single template respond with data: template. */
export const getLetterTemplate = async (id) => dataOf(await API.get(`/letter-templates/${id}`));

export const createLetterTemplate = async (payload) => dataOf(await API.post("/letter-templates", payload));

/** payload.version is the version being edited; a stale one gets a 409. */
export const updateLetterTemplate = async (id, payload) => dataOf(await API.put(`/letter-templates/${id}`, payload));

export const duplicateLetterTemplate = async (id, name) =>
  dataOf(await API.post(`/letter-templates/${id}/duplicate`, name ? { name } : {}));

export const archiveLetterTemplate = async (id, archived) =>
  dataOf(await API.post(`/letter-templates/${id}/archive`, { archived }));

/** `version` is the template version being edited; a stale one gets 409 VERSION_CONFLICT. */
export const resetLetterTemplate = async (id, version) =>
  dataOf(await API.post(`/letter-templates/${id}/reset-default`, { version }));

/** -> [{ version, note, editedByName, createdAt }] newest first */
export const getLetterTemplateVersions = async (id) =>
  dataOf(await API.get(`/letter-templates/${id}/versions`)) || [];

/** Restores history entry `version`; `currentVersion` is the version being edited (409 when stale). */
export const restoreLetterTemplateVersion = async (id, version, currentVersion) =>
  dataOf(await API.post(`/letter-templates/${id}/versions/${version}/restore`, { version: currentVersion }));

/**
 * Renders a draft (saved or not) with sample data -> { html, bodyHtml, missing, invalid }.
 * Unsaved templates use the id-less route.
 */
export const previewLetterTemplate = async (id, payload) =>
  dataOf(await API.post(id ? `/letter-templates/${id}/preview` : "/letter-templates/preview", payload));
