import { getOfferNextStep, offerActionError, OFFER_PROGRESS, STATUS_LABELS, STATUS_OPTIONS } from "./offerNextStep";

const ALL = { canManage: true, canIssue: true };
const cand = (status, overrides = {}) => ({ _id: "c1", name: "Asha", email: "a@x.com", status, ...overrides });
const menuIds = (r) => r.menu.map((m) => m.id);

describe("constants", () => {
  it("defines the progress steps and labels", () => {
    expect(OFFER_PROGRESS).toEqual(["draft", "offered", "accepted", "converted"]);
    expect(STATUS_LABELS.converted).toBe("Joined");
  });
});

describe("getOfferNextStep with full permissions", () => {
  it("draft", () => {
    const r = getOfferNextStep(cand("draft"), ALL);
    expect(r).toMatchObject({ label: "Draft", tone: "neutral", progressIndex: 0 });
    expect(r.nextStep).toEqual({ id: "send-offer", label: "Send offer letter" });
    expect(menuIds(r)).toEqual(["edit", "view-letters", "delete"]);
    expect(r.menu.find((m) => m.id === "delete").danger).toBe(true);
  });

  it("offered", () => {
    const r = getOfferNextStep(cand("offered"), ALL);
    expect(r).toMatchObject({ label: "Offered", tone: "info", progressIndex: 1 });
    expect(r.nextStep).toEqual({ id: "mark-accepted", label: "Mark accepted" });
    expect(menuIds(r)).toEqual(["edit", "view-letters", "mark-declined", "mark-expired"]);
  });

  it("accepted", () => {
    const r = getOfferNextStep(cand("accepted"), ALL);
    expect(r).toMatchObject({ label: "Accepted", tone: "success", progressIndex: 2 });
    expect(r.nextStep).toEqual({ id: "add-employee", label: "Add as employee" });
    expect(menuIds(r)).toEqual(["edit", "view-letters"]);
  });

  it.each([
    ["declined", "Declined", "error"],
    ["expired", "Expired", "warning"],
  ])("%s", (status, label, tone) => {
    const r = getOfferNextStep(cand(status), ALL);
    expect(r).toMatchObject({ label, tone, progressIndex: 1 });
    expect(r.nextStep).toEqual({ id: "send-offer", label: "Send offer again" });
    expect(menuIds(r)).toEqual(["edit", "view-letters", "delete"]);
  });

  it("converted with an employee", () => {
    const r = getOfferNextStep(cand("converted", { employeeId: "e1" }), ALL);
    expect(r).toMatchObject({ label: "Joined", tone: "brand", progressIndex: 3, notice: null });
    expect(r.nextStep).toEqual({ id: "view-employee", label: "View employee" });
    expect(menuIds(r)).toEqual(["view-letters"]);
  });

  it("converted without an employee has no next step and says the record is gone", () => {
    const r = getOfferNextStep(cand("converted"), ALL);
    expect(r.nextStep).toBeNull();
    expect(r.notice).toBe("Employee record no longer exists");
    expect(menuIds(r)).toEqual(["view-letters"]);
  });

  it("only a joined candidate without an employee gets a notice", () => {
    ["draft", "offered", "accepted", "declined", "expired"].forEach((status) => {
      expect(getOfferNextStep(cand(status), {}).notice).toBeNull();
    });
  });

  it("menu never repeats the next step", () => {
    ["draft", "offered", "accepted", "declined", "expired"].forEach((status) => {
      const r = getOfferNextStep(cand(status), ALL);
      expect(menuIds(r)).not.toContain(r.nextStep.id);
    });
  });
});

describe("getOfferNextStep permissions", () => {
  it("drops send-offer without canIssue but keeps manage actions", () => {
    const r = getOfferNextStep(cand("draft"), { canManage: true, canIssue: false });
    expect(r.nextStep).toBeNull();
    expect(menuIds(r)).toEqual(["edit", "view-letters", "delete"]);
  });

  it("issue-only users can send offers but not change status, edit or delete", () => {
    const perms = { canManage: false, canIssue: true };
    expect(getOfferNextStep(cand("draft"), perms).nextStep.id).toBe("send-offer");
    expect(menuIds(getOfferNextStep(cand("draft"), perms))).toEqual(["view-letters"]);
    expect(getOfferNextStep(cand("offered"), perms).nextStep).toBeNull();
    expect(menuIds(getOfferNextStep(cand("offered"), perms))).toEqual(["view-letters"]);
    expect(getOfferNextStep(cand("accepted"), perms).nextStep).toBeNull();
  });

  it("view-only users still see view actions", () => {
    const r = getOfferNextStep(cand("converted", { employeeId: "e1" }), {});
    expect(r.nextStep.id).toBe("view-employee");
    expect(menuIds(r)).toEqual(["view-letters"]);
    expect(menuIds(getOfferNextStep(cand("draft")))).toEqual(["view-letters"]);
  });
});

describe("getOfferNextStep unknown status", () => {
  it("falls back safely", () => {
    const r = getOfferNextStep(cand("weird"), ALL);
    expect(r).toMatchObject({ label: "weird", tone: "neutral", progressIndex: 0, nextStep: null });
    expect(menuIds(r)).toEqual(["view-letters"]);
    expect(r.progressText).toBe("Step 1 of 4: Draft");
  });
});

describe("status tones are ones the Badge supports", () => {
  it.each(Object.keys(STATUS_LABELS))("%s", (status) => {
    expect(["success", "warning", "error", "info", "neutral", "brand"]).toContain(getOfferNextStep(cand(status)).tone);
  });
});

describe("status filter options", () => {
  it("lists every status with its plain label", () => {
    expect(STATUS_OPTIONS).toEqual([
      { value: "draft", label: "Draft" },
      { value: "offered", label: "Offered" },
      { value: "accepted", label: "Accepted" },
      { value: "declined", label: "Declined" },
      { value: "expired", label: "Expired" },
      { value: "converted", label: "Joined" },
    ]);
  });
});

describe("progress line", () => {
  const states = (r) => r.progressSteps.map((s) => `${s.label}:${s.state}`);

  it("marks earlier steps done and the current step current", () => {
    expect(states(getOfferNextStep(cand("draft")))).toEqual(["Draft:current", "Offered:todo", "Accepted:todo", "Joined:todo"]);
    expect(states(getOfferNextStep(cand("offered")))).toEqual(["Draft:done", "Offered:current", "Accepted:todo", "Joined:todo"]);
    expect(states(getOfferNextStep(cand("accepted")))).toEqual(["Draft:done", "Offered:done", "Accepted:current", "Joined:todo"]);
    expect(states(getOfferNextStep(cand("converted")))).toEqual(["Draft:done", "Offered:done", "Accepted:done", "Joined:current"]);
  });

  it.each([
    ["declined", "Declined", "error"],
    ["expired", "Expired", "warning"],
  ])("shows %s as a stopped marker on the Offered step", (status, label, tone) => {
    const r = getOfferNextStep(cand(status));
    expect(states(r)).toEqual(["Draft:done", `${label}:stopped`, "Accepted:todo", "Joined:todo"]);
    expect(r.progressSteps[1]).toMatchObject({ status, tone });
  });

  it("has a text alternative", () => {
    expect(getOfferNextStep(cand("draft")).progressText).toBe("Step 1 of 4: Draft");
    expect(getOfferNextStep(cand("offered")).progressText).toBe("Step 2 of 4: Offered");
    expect(getOfferNextStep(cand("declined")).progressText).toBe("Step 2 of 4: Declined");
    expect(getOfferNextStep(cand("converted")).progressText).toBe("Step 4 of 4: Joined");
  });
});

describe("offerActionError", () => {
  const apiError = (code, message = "internal draft, declined, expired") => ({ response: { status: 400, data: { message, code } } });

  it("explains that a candidate with issued letters cannot be deleted", () => {
    expect(offerActionError(apiError("CANDIDATE_IN_USE"), { name: "Neha" })).toEqual({
      code: "CANDIDATE_IN_USE",
      message: "Neha can't be deleted because letters have been issued to them. Void those letters in Issued letters first, or keep the record.",
      refresh: true,
      stale: false,
      field: null,
    });
  });

  it("explains a status that changed in the meantime without internal status keys", () => {
    expect(offerActionError(apiError("INVALID_TRANSITION", "A converted candidate cannot change status"), { name: "Neha" })).toEqual({
      code: "INVALID_TRANSITION",
      message: "Neha's status was changed by someone else. The list has been refreshed — check it and try again.",
      refresh: true,
      stale: true,
      field: null,
    });
  });

  it("treats a candidate removed elsewhere as a stale row", () => {
    expect(offerActionError({ response: { status: 404, data: { message: "Candidate not found", code: "CANDIDATE_NOT_FOUND" } } }, { name: "Neha" })).toEqual({
      code: "CANDIDATE_NOT_FOUND",
      message: "Neha was removed by someone else. The list has been refreshed.",
      refresh: true,
      stale: true,
      field: null,
    });
  });

  it("passes the server's field through so the screen can show it on that input", () => {
    const error = { response: { status: 400, data: { message: "Note must be at most 500 characters", field: "note", code: "VALIDATION" } } };
    expect(offerActionError(error, { name: "Neha" })).toMatchObject({ field: "note", message: "Note must be at most 500 characters" });
    expect(offerActionError(new Error("x"), { name: "Neha" }).field).toBeNull();
  });

  it("keeps other server messages and falls back when there is none", () => {
    expect(offerActionError(apiError("VALIDATION", "Joining date cannot be in the past"), { name: "Neha" }).message).toBe(
      "Joining date cannot be in the past"
    );
    expect(offerActionError(new Error("Network Error"), { name: "Neha" })).toEqual({
      code: null,
      message: "That didn't work. Check your connection and try again.",
      refresh: false,
      stale: false,
      field: null,
    });
  });
});

describe("offer wording lives in LETTERS_COPY", () => {
  it("labels every action and status from the copy", () => {
    const { LETTERS_COPY } = require("./lettersCopy");
    expect(STATUS_LABELS).toBe(LETTERS_COPY.offers.statuses);
    const all = { canIssue: true, canManage: true };
    const labels = new Set();
    Object.keys(STATUS_LABELS).forEach((status) => {
      const r = getOfferNextStep({ _id: "c1", status, employeeId: "e1" }, all);
      [r.nextStep, ...r.menu].filter(Boolean).forEach((action) => labels.add(action.label));
    });
    expect([...labels].sort()).toEqual(Object.values(LETTERS_COPY.offers.actions).sort());
  });
});
