import { getApiError } from "./letterForms";
import { LETTERS_COPY, format } from "./lettersCopy";

export const OFFER_PROGRESS = ["draft", "offered", "accepted", "converted"];

export const STATUS_LABELS = LETTERS_COPY.offers.statuses;
const ACTION_LABELS = LETTERS_COPY.offers.actions;

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

const STOPPED = ["declined", "expired"];

export const STATUS_TONES = {
  draft: "neutral",
  offered: "info",
  accepted: "success",
  declined: "error",
  expired: "warning",
  converted: "brand",
};

const ACTIONS = {
  "send-offer": { label: ACTION_LABELS.sendOffer, needs: "canIssue" },
  "send-offer-again": { id: "send-offer", label: ACTION_LABELS.sendOfferAgain, needs: "canIssue" },
  "mark-accepted": { label: ACTION_LABELS.markAccepted, needs: "canManage" },
  "add-employee": { label: ACTION_LABELS.addEmployee, needs: "canManage" },
  "view-employee": { label: ACTION_LABELS.viewEmployee },
  edit: { label: ACTION_LABELS.edit, needs: "canManage" },
  "view-letters": { label: ACTION_LABELS.viewLetters },
  "mark-declined": { label: ACTION_LABELS.markDeclined, needs: "canManage" },
  "mark-expired": { label: ACTION_LABELS.markExpired, needs: "canManage" },
  delete: { label: ACTION_LABELS.delete, needs: "canManage", danger: true },
};

const NEXT_STEP = {
  draft: "send-offer",
  offered: "mark-accepted",
  accepted: "add-employee",
  declined: "send-offer-again",
  expired: "send-offer-again",
  converted: "view-employee",
};

const MENU = {
  draft: ["edit", "view-letters", "delete"],
  offered: ["edit", "view-letters", "mark-declined", "mark-expired"],
  accepted: ["edit", "view-letters"],
  declined: ["edit", "view-letters", "delete"],
  expired: ["edit", "view-letters", "delete"],
  converted: ["view-letters"],
};

function toAction(key, permissions) {
  const action = ACTIONS[key];
  if (action.needs && !permissions[action.needs]) return null;
  const result = { id: action.id || key, label: action.label };
  if (action.danger) result.danger = true;
  return result;
}

export function getOfferNextStep(candidate, permissions = {}) {
  const perms = permissions || {};
  const status = candidate?.status;
  const known = Object.prototype.hasOwnProperty.call(STATUS_LABELS, status);

  let nextKey = known ? NEXT_STEP[status] : null;
  if (nextKey === "view-employee" && !candidate.employeeId) nextKey = null;
  const nextStep = nextKey ? toAction(nextKey, perms) : null;

  const menu = (known ? MENU[status] : ["view-letters"])
    .map((key) => toAction(key, perms))
    .filter((a) => a && a.id !== nextStep?.id);

  const stopped = STOPPED.includes(status);
  let progressIndex = OFFER_PROGRESS.indexOf(status);
  if (stopped) progressIndex = OFFER_PROGRESS.indexOf("offered");
  if (progressIndex < 0) progressIndex = 0;

  const progressSteps = OFFER_PROGRESS.map((step, index) => {
    if (index < progressIndex) return { status: step, label: STATUS_LABELS[step], state: "done" };
    if (index > progressIndex) return { status: step, label: STATUS_LABELS[step], state: "todo" };
    if (stopped) return { status, label: STATUS_LABELS[status], state: "stopped", tone: STATUS_TONES[status] };
    return { status: step, label: STATUS_LABELS[step], state: "current" };
  });

  return {
    label: known ? STATUS_LABELS[status] : String(status || ""),
    tone: STATUS_TONES[status] || "neutral",
    progressIndex,
    progressSteps,
    progressText: format(LETTERS_COPY.offers.progressText, {
      step: progressIndex + 1,
      total: OFFER_PROGRESS.length,
      label: progressSteps[progressIndex].label,
    }),
    nextStep,
    notice: status === "converted" && !candidate.employeeId ? LETTERS_COPY.offers.employeeMissing : null,
    menu,
  };
}

const KNOWN_FAILURES = {
  CANDIDATE_IN_USE: { copy: "deleteInUse", refresh: true, stale: false },
  INVALID_TRANSITION: { copy: "statusChanged", refresh: true, stale: true },
  CANDIDATE_NOT_FOUND: { copy: "candidateGone", refresh: true, stale: true },
};

/**
 * Plain-language message for a failed candidate action.
 * `refresh`: the list no longer matches the server; `stale`: the row itself is out of date, so close the dialog.
 */
export function offerActionError(error, { name } = {}) {
  const apiError = getApiError(error, LETTERS_COPY.offers.actionError);
  const known = KNOWN_FAILURES[apiError.code];
  if (known) {
    return {
      code: apiError.code,
      message: format(LETTERS_COPY.offers[known.copy], { name }),
      refresh: known.refresh,
      stale: known.stale,
      field: apiError.field,
    };
  }
  return { code: apiError.code, message: apiError.message, refresh: false, stale: false, field: apiError.field };
}
