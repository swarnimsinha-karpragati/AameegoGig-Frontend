import { RECIPIENT_TYPE_VALUES } from "./letterForms";
import { LETTERS_COPY } from "./lettersCopy";

/**
 * Letters page state lives in the query string:
 *   tab=issue|issued|offers
 *   manage=1[&template=<id>|new]                         manage templates / template editor
 *   issue=<templateId>|pick&recipient=..&recipientType=employee|candidate   issue panel
 *   issueKey=<template key>                               with issue=pick: panel opens that template once loaded
 *   forRecipient=<id>&forType=employee|candidate          issued-letters filter
 */

export const ISSUE_PICK = "pick";
/** Mirrors the backend RECIPIENT_RULES key; every template the backend returns carries its `recipientRule`. */
export const CONSULTANCY_RECIPIENT_RULE = "consultancy";

const isRecipientType = (value) => RECIPIENT_TYPE_VALUES.includes(value);
/** Person ids in the URL must be record ids; anything else would only produce a failed request. */
const isRecordId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ""));

const TAB_RULES = [
  { id: "issue", allowed: (a) => a.canIssue || a.canIssueConsultancyAgreement },
  { id: "issued", allowed: (a) => a.canView },
  { id: "offers", allowed: (a) => a.canManageOffers || a.canIssue },
];

export const getLettersTabs = (access = {}) =>
  TAB_RULES.filter((rule) => rule.allowed(access || {})).map((rule) => ({ id: rule.id, label: LETTERS_COPY.tabs[rule.id] }));

export const resolveLettersTab = (requested, tabs) =>
  tabs.some((tab) => tab.id === requested) ? requested : tabs[0]?.id || "";

/** The recipient rule the issue screens are limited to; null means every template the backend returns. */
export const getIssueRecipientRule = (access = {}) =>
  !access.canIssue && access.canIssueConsultancyAgreement ? CONSULTANCY_RECIPIENT_RULE : null;

export function resolveLettersView(params, tabs, access = {}) {
  const manage = Boolean(access.canEdit) && params.get("manage") === "1";
  const issue = tabs.some((tab) => tab.id === "issue") ? params.get("issue") || "" : "";
  const recipientType = params.get("recipientType");
  const recipient = params.get("recipient");
  const tab = resolveLettersTab(params.get("tab"), tabs);
  const forRecipient = params.get("forRecipient");
  return {
    tab,
    manage,
    templateId: manage ? params.get("template") || "" : "",
    issueOpen: Boolean(issue),
    issueTemplateId: issue === ISSUE_PICK ? "" : issue,
    issueTemplateKey: issue === ISSUE_PICK ? params.get("issueKey") || "" : "",
    recipientId: issue && isRecordId(recipient) ? recipient : "",
    recipientType: issue && isRecipientType(recipientType) ? recipientType : "",
    forRecipient: !manage && tab === "issued" && isRecordId(forRecipient) ? forRecipient : "",
    forType: params.get("forType") === "candidate" ? "candidate" : "employee",
  };
}

/** Maps pre-redesign links (`tab=templates`, `generate=1&gTemplate=`) to current ones; null when nothing changes. */
export function legacyRedirect(params) {
  const next = new URLSearchParams(params);
  let changed = false;

  const tab = next.get("tab");
  if (tab === "templates" || (!tab && next.has("template") && next.get("manage") !== "1")) {
    next.delete("tab");
    next.set("manage", "1");
    changed = true;
  }

  if (next.has("generate") || next.has("gTemplate")) {
    const opening = next.get("generate") === "1";
    const templateId = next.get("gTemplate") || "";
    next.delete("generate");
    next.delete("gTemplate");
    if (opening) {
      if (!next.has("tab") && next.get("manage") !== "1") next.set("tab", "issue");
      next.set("issue", templateId || ISSUE_PICK);
    }
    changed = true;
  }

  return changed ? next : null;
}

/** Removes params the current user cannot use (forbidden tab, manage without edit, stray issue/filter keys); null when nothing changes. */
export function normalizeLettersParams(params, tabs, access = {}) {
  const next = new URLSearchParams(params);
  const drop = (...keys) => keys.forEach((key) => next.delete(key));

  if (next.has("tab") && !tabs.some((tab) => tab.id === next.get("tab"))) drop("tab");
  if (next.has("manage") && !(access.canEdit && next.get("manage") === "1")) drop("manage");
  const manage = next.get("manage") === "1";
  if (!manage) drop("template");

  if (!tabs.some((tab) => tab.id === "issue")) drop("issue");
  if (!next.get("issue")) drop("issue", "issueKey", "recipient", "recipientType");
  if (next.has("issueKey") && next.get("issue") !== ISSUE_PICK) drop("issueKey");
  if (next.has("recipient") && !isRecordId(next.get("recipient"))) drop("recipient");
  if (next.has("recipientType") && !isRecipientType(next.get("recipientType"))) drop("recipientType");

  const onIssued = !manage && resolveLettersTab(next.get("tab"), tabs) === "issued";
  if (!onIssued || !isRecordId(next.get("forRecipient"))) drop("forRecipient", "forType");
  if (next.has("forType") && !isRecipientType(next.get("forType"))) drop("forType");

  return next.toString() === new URLSearchParams(params).toString() ? null : next;
}

/** Legacy redirect followed by normalization, as one replace; null when the URL is already canonical. */
export function canonicalLettersParams(params, tabs, access = {}) {
  const legacy = legacyRedirect(params);
  return normalizeLettersParams(legacy || params, tabs, access) || legacy;
}

export function applyLettersChanges(params, changes) {
  const next = new URLSearchParams(params);
  Object.entries(changes).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, value);
  });
  return next;
}

const CLOSED_ISSUE = { issue: null, issueKey: null, recipient: null, recipientType: null };

export const lettersChanges = {
  tab: (id) => ({ tab: id, manage: null, template: null, forRecipient: null, forType: null }),
  openIssue: ({ templateId = "", templateKey = "", recipientId = "", recipientType = "" } = {}) => ({
    issue: templateId || ISSUE_PICK,
    issueKey: templateId ? null : templateKey || null,
    recipient: recipientId || null,
    recipientType: recipientType || null,
  }),
  changeIssueTemplate: (templateId) => ({ issue: templateId || ISSUE_PICK, issueKey: null }),
  closeIssue: () => ({ ...CLOSED_ISSUE }),
  openManage: () => ({ tab: null, manage: "1", template: null, forRecipient: null, forType: null, ...CLOSED_ISSUE }),
  closeManage: () => ({ manage: null, template: null }),
  openTemplate: (id) => ({ template: id }),
  closeTemplate: () => ({ template: null }),
  viewIssued: ({ recipientId = "", recipientType = "" } = {}) => ({
    tab: "issued",
    manage: null,
    template: null,
    ...CLOSED_ISSUE,
    forRecipient: recipientId || null,
    forType: recipientId ? recipientType || null : null,
  }),
  clearRecipientFilter: () => ({ forRecipient: null, forType: null }),
  openOffers: () => ({ tab: "offers", manage: null, template: null, forRecipient: null, forType: null, ...CLOSED_ISSUE }),
};

/**
 * Letters actions in an Employees row menu: issuing needs issue rights, viewing issued letters needs
 * view rights, consultancy managers get only the agreement for consultancy employees.
 */
export const employeeLetterActions = (access = {}, employee = {}, { canTerminate = false } = {}) => {
  const issue = Boolean(access?.canIssue);
  const viewIssued = Boolean(access?.canView);
  const consultancyAgreement = !issue && Boolean(access?.canIssueConsultancyAgreement) && Boolean(employee?.isConsultancy);
  const termination = Boolean(canTerminate);
  return { issue, viewIssued, consultancyAgreement, termination, any: issue || viewIssued || consultancyAgreement || termination };
};

/** Link into Letters → Issued letters filtered to one person, for use from other modules. */
export const issuedLettersPath = (vendor, { recipientId, recipientType = "employee" }) =>
  `/${vendor}/letters?${applyLettersChanges(new URLSearchParams(), lettersChanges.viewIssued({ recipientId, recipientType }))}`;

/** Employees page query params that Letters links into; Employees reads them with the same names. */
export const EMPLOYEE_PARAMS = Object.freeze({ search: "search", prefillCandidate: "prefillCandidate" });

const EMPLOYEE_SEARCH_MAX = 100;

const employeesPath = (vendor, changes) => {
  const query = applyLettersChanges(new URLSearchParams(), changes).toString();
  return `/${vendor}/employees${query ? `?${query}` : ""}`;
};

/** Opens Add employee prefilled from an accepted candidate. */
export const convertCandidatePath = (vendor, candidate) =>
  employeesPath(vendor, { [EMPLOYEE_PARAMS.prefillCandidate]: candidate?._id });

/** Employee list searched for a joined candidate's linked employee (code, else the employee's name). */
export const candidateEmployeePath = (vendor, candidate = {}) => {
  const term = [candidate.employeeCode, candidate.employeeName]
    .map((value) => String(value ?? "").trim())
    .find(Boolean);
  return employeesPath(vendor, { [EMPLOYEE_PARAMS.search]: term?.slice(0, EMPLOYEE_SEARCH_MAX) });
};

export const readEmployeesSearch = (params) =>
  String(params.get(EMPLOYEE_PARAMS.search) || "").trim().slice(0, EMPLOYEE_SEARCH_MAX);
