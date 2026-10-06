import { recipientStatusBadge } from "./recipientStatus";
import { LETTERS_COPY } from "./lettersCopy";
import { STATUS_LABELS } from "./offerNextStep";

describe("recipientStatusBadge", () => {
  it.each([
    ["draft", "Draft"],
    ["offered", "Offered"],
    ["accepted", "Accepted"],
    ["declined", "Declined"],
    ["expired", "Expired"],
  ])("labels a %s candidate with the Offer candidates wording", (status, label) => {
    const badge = recipientStatusBadge(status, "candidate");
    expect(badge.label).toBe(label);
    expect(badge.label).toBe(STATUS_LABELS[status]);
    expect(badge.tone).toEqual(expect.any(String));
  });

  it("uses the same tone as the Offer candidates list", () => {
    expect(recipientStatusBadge("offered", "candidate").tone).toBe("info");
    expect(recipientStatusBadge("declined", "candidate").tone).toBe("error");
  });

  it("labels employees who are not active, and stays quiet for active ones", () => {
    expect(recipientStatusBadge("inactive", "employee")).toEqual({ label: "Inactive", tone: "neutral" });
    expect(recipientStatusBadge("exited", "employee")).toEqual({ label: "Exited", tone: "info" });
    expect(recipientStatusBadge("active", "employee")).toBeNull();
    expect(LETTERS_COPY.issue.personStatus).toEqual({ inactive: "Inactive", exited: "Exited" });
  });

  it("never shows a raw status it does not know", () => {
    expect(recipientStatusBadge("weird", "candidate")).toBeNull();
    expect(recipientStatusBadge("weird", "employee")).toBeNull();
    expect(recipientStatusBadge("", "candidate")).toBeNull();
    expect(recipientStatusBadge(undefined, "employee")).toBeNull();
  });
});
