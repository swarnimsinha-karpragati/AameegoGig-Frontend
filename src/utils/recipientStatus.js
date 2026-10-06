import { LETTERS_COPY } from "./lettersCopy";
import { STATUS_LABELS, STATUS_TONES } from "./offerNextStep";

const has = (object, key) => Boolean(key) && Object.prototype.hasOwnProperty.call(object, key);

// Only statuses worth flagging have a label; active employees have none, so they get no badge.
const EMPLOYEE_LABELS = LETTERS_COPY.issue.personStatus;
const EMPLOYEE_TONES = { inactive: "neutral", exited: "info" };

/**
 * Badge for a person in the letter recipient list, or null when none should show.
 * Candidates use the Offer candidates wording; active employees get no badge; an unknown status is never shown raw.
 */
export function recipientStatusBadge(status, recipientType) {
  if (recipientType === "candidate") {
    return has(STATUS_LABELS, status) ? { label: STATUS_LABELS[status], tone: STATUS_TONES[status] || "neutral" } : null;
  }
  if (!has(EMPLOYEE_LABELS, status)) return null;
  return { label: EMPLOYEE_LABELS[status], tone: EMPLOYEE_TONES[status] || "neutral" };
}
