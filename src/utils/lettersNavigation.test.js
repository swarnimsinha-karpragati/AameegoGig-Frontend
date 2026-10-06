import {
  EMPLOYEE_PARAMS,
  ISSUE_PICK,
  applyLettersChanges,
  candidateEmployeePath,
  canonicalLettersParams,
  convertCandidatePath,
  employeeLetterActions,
  readEmployeesSearch,
  getIssueRecipientRule,
  CONSULTANCY_RECIPIENT_RULE,
  getLettersTabs,
  issuedLettersPath,
  legacyRedirect,
  lettersChanges,
  normalizeLettersParams,
  resolveLettersTab,
  resolveLettersView,
} from "./lettersNavigation";

const p = (query) => new URLSearchParams(query);
const FULL = { canView: true, canEdit: true, canIssue: true, canManageOffers: true, canIssueConsultancyAgreement: true };
const ids = (tabs) => tabs.map((t) => t.id);

describe("getLettersTabs", () => {
  it("shows every tab, issue first, to full access users", () => {
    expect(getLettersTabs(FULL)).toEqual([
      { id: "issue", label: "Issue a letter" },
      { id: "issued", label: "Issued letters" },
      { id: "offers", label: "Offer candidates" },
    ]);
  });

  it("shows issue and offers to people who only issue letters", () => {
    expect(ids(getLettersTabs({ canView: true, canIssue: true }))).toEqual(["issue", "issued", "offers"]);
  });

  it("shows the issue tab to consultancy-agreement-only issuers but not offers", () => {
    expect(ids(getLettersTabs({ canView: true, canIssueConsultancyAgreement: true }))).toEqual(["issue", "issued"]);
  });

  it("shows offers to offer managers who cannot issue", () => {
    expect(ids(getLettersTabs({ canView: true, canManageOffers: true }))).toEqual(["issued", "offers"]);
  });

  it("shows only issued letters to view-only users", () => {
    expect(ids(getLettersTabs({ canView: true }))).toEqual(["issued"]);
  });

  it("shows nothing without access", () => {
    expect(getLettersTabs({})).toEqual([]);
    expect(getLettersTabs()).toEqual([]);
  });
});

describe("resolveLettersTab", () => {
  const viewOnly = getLettersTabs({ canView: true });

  it("keeps an allowed tab and defaults to the first tab", () => {
    expect(resolveLettersTab("offers", getLettersTabs(FULL))).toBe("offers");
    expect(resolveLettersTab(null, getLettersTabs(FULL))).toBe("issue");
  });

  it("falls back for unknown or forbidden tabs", () => {
    expect(resolveLettersTab("issue", viewOnly)).toBe("issued");
    expect(resolveLettersTab("templates", viewOnly)).toBe("issued");
    expect(resolveLettersTab("x", [])).toBe("");
  });
});

describe("resolveLettersView", () => {
  const tabs = getLettersTabs(FULL);

  it("defaults to the issue tab with nothing open", () => {
    expect(resolveLettersView(p(""), tabs, FULL)).toEqual({
      tab: "issue",
      manage: false,
      templateId: "",
      issueOpen: false,
      issueTemplateId: "",
      issueTemplateKey: "",
      recipientId: "",
      recipientType: "",
      forRecipient: "",
      forType: "employee",
    });
  });

  it("reads a template key for the chooser so the panel can resolve it once templates load", () => {
    expect(resolveLettersView(p("issue=pick&issueKey=offer"), tabs, FULL)).toMatchObject({
      issueOpen: true,
      issueTemplateId: "",
      issueTemplateKey: "offer",
    });
    expect(resolveLettersView(p("issue=t1&issueKey=offer"), tabs, FULL).issueTemplateKey).toBe("");
  });

  it("reads the issue panel state", () => {
    const view = resolveLettersView(p("tab=offers&issue=t1&recipient=0000000000000000000000c1&recipientType=candidate"), tabs, FULL);
    expect(view).toMatchObject({ tab: "offers", issueOpen: true, issueTemplateId: "t1", recipientId: "0000000000000000000000c1", recipientType: "candidate" });
  });

  it("opens the chooser for issue=pick", () => {
    expect(resolveLettersView(p(`issue=${ISSUE_PICK}`), tabs, FULL)).toMatchObject({ issueOpen: true, issueTemplateId: "" });
  });

  it("ignores unknown recipient types", () => {
    expect(resolveLettersView(p("issue=pick&recipientType=vendor"), tabs, FULL).recipientType).toBe("");
  });

  it("ignores person ids that are not record ids", () => {
    expect(resolveLettersView(p("issue=pick&recipient=abc"), tabs, FULL).recipientId).toBe("");
    expect(resolveLettersView(p("tab=issued&forRecipient=xyz"), tabs, FULL).forRecipient).toBe("");
  });

  it("only reads the recipient filter on the issued tab", () => {
    expect(resolveLettersView(p("tab=offers&forRecipient=0000000000000000000000e1"), tabs, FULL).forRecipient).toBe("");
  });

  it("does not open the issue panel for users who cannot issue", () => {
    const viewOnly = { canView: true };
    expect(resolveLettersView(p("issue=t1"), getLettersTabs(viewOnly), viewOnly)).toMatchObject({ issueOpen: false, issueTemplateId: "" });
  });

  it("reads manage mode and the template being edited for editors only", () => {
    expect(resolveLettersView(p("manage=1&template=t9"), tabs, FULL)).toMatchObject({ manage: true, templateId: "t9" });
    const issuer = { canView: true, canIssue: true };
    expect(resolveLettersView(p("manage=1&template=t9"), getLettersTabs(issuer), issuer)).toMatchObject({ manage: false, templateId: "" });
  });

  it("ignores a template without manage mode", () => {
    expect(resolveLettersView(p("template=t9"), tabs, FULL).templateId).toBe("");
  });

  it("reads the issued-letters recipient filter", () => {
    expect(resolveLettersView(p("tab=issued&forRecipient=0000000000000000000000e1&forType=candidate"), tabs, FULL)).toMatchObject({
      tab: "issued",
      forRecipient: "0000000000000000000000e1",
      forType: "candidate",
    });
    expect(resolveLettersView(p("forRecipient=0000000000000000000000e1&forType=other"), tabs, FULL).forType).toBe("employee");
  });
});

describe("legacyRedirect", () => {
  const str = (params) => (params ? Object.fromEntries(params.entries()) : null);

  it("returns null for current links", () => {
    expect(legacyRedirect(p(""))).toBeNull();
    expect(legacyRedirect(p("tab=issued&forRecipient=0000000000000000000000e1&forType=employee"))).toBeNull();
    expect(legacyRedirect(p("manage=1&template=t1"))).toBeNull();
    expect(legacyRedirect(p("tab=offers&issue=pick&recipient=0000000000000000000000c1&recipientType=candidate"))).toBeNull();
  });

  it("maps the old templates tab to manage mode and keeps the template", () => {
    expect(str(legacyRedirect(p("tab=templates")))).toEqual({ manage: "1" });
    expect(str(legacyRedirect(p("tab=templates&template=t1")))).toEqual({ manage: "1", template: "t1" });
  });

  it("maps an old editor link without a tab (templates was the default tab)", () => {
    expect(str(legacyRedirect(p("template=new")))).toEqual({ template: "new", manage: "1" });
  });

  it("maps the old generate drawer to the issue panel", () => {
    expect(str(legacyRedirect(p("generate=1&gTemplate=t2&recipient=0000000000000000000000e1&recipientType=employee")))).toEqual({
      recipient: "0000000000000000000000e1",
      recipientType: "employee",
      tab: "issue",
      issue: "t2",
    });
  });

  it("opens the chooser when the old generate link had no template", () => {
    expect(str(legacyRedirect(p("generate=1")))).toEqual({ tab: "issue", issue: ISSUE_PICK });
  });

  it("keeps an explicit current tab when mapping generate", () => {
    expect(str(legacyRedirect(p("tab=offers&generate=1&recipient=0000000000000000000000c1&recipientType=candidate")))).toEqual({
      tab: "offers",
      recipient: "0000000000000000000000c1",
      recipientType: "candidate",
      issue: ISSUE_PICK,
    });
  });

  it("maps generate from the old templates tab into manage mode with the panel", () => {
    expect(str(legacyRedirect(p("tab=templates&template=t1&generate=1&gTemplate=t1")))).toEqual({
      template: "t1",
      manage: "1",
      issue: "t1",
    });
  });

  it("drops a closed generate flag", () => {
    expect(str(legacyRedirect(p("tab=issued&generate=0&gTemplate=t1")))).toEqual({ tab: "issued" });
  });

  it("does not mutate the input", () => {
    const input = p("tab=templates");
    legacyRedirect(input);
    expect(input.toString()).toBe("tab=templates");
  });
});

describe("applyLettersChanges and lettersChanges", () => {
  const apply = (query, changes) => applyLettersChanges(p(query), changes).toString();

  it("sets and removes params without mutating the input", () => {
    const input = p("tab=issued&forRecipient=0000000000000000000000e1");
    expect(applyLettersChanges(input, { forRecipient: null, x: "1", y: "" }).toString()).toBe("tab=issued&x=1");
    expect(input.toString()).toBe("tab=issued&forRecipient=0000000000000000000000e1");
  });

  it("switching tabs clears manage mode, editor and filters but keeps nothing stale", () => {
    expect(apply("tab=issued&forRecipient=0000000000000000000000e1&forType=employee", lettersChanges.tab("offers"))).toBe("tab=offers");
  });

  it("opens the issue panel with a template or the chooser", () => {
    expect(apply("tab=issue", lettersChanges.openIssue({ templateId: "t1" }))).toBe("tab=issue&issue=t1");
    expect(apply("tab=issued", lettersChanges.openIssue())).toBe("tab=issued&issue=pick");
    expect(apply("tab=offers", lettersChanges.openIssue({ templateId: "", recipientId: "0000000000000000000000c1", recipientType: "candidate" }))).toBe(
      "tab=offers&issue=pick&recipient=0000000000000000000000c1&recipientType=candidate"
    );
  });

  it("changing the template inside the panel keeps the panel open", () => {
    expect(apply("issue=t1&recipient=0000000000000000000000e1", lettersChanges.changeIssueTemplate("t2"))).toBe("issue=t2&recipient=0000000000000000000000e1");
    expect(apply("issue=t1&recipient=0000000000000000000000e1", lettersChanges.changeIssueTemplate(""))).toBe("issue=pick&recipient=0000000000000000000000e1");
    expect(apply("issue=pick&issueKey=offer&recipient=0000000000000000000000c1", lettersChanges.changeIssueTemplate(""))).toBe("issue=pick&recipient=0000000000000000000000c1");
  });

  it("opens the chooser with a template key to resolve", () => {
    expect(
      apply("tab=offers", lettersChanges.openIssue({ templateKey: "offer", recipientId: "0000000000000000000000c1", recipientType: "candidate" }))
    ).toBe("tab=offers&issue=pick&issueKey=offer&recipient=0000000000000000000000c1&recipientType=candidate");
    expect(apply("issue=pick&issueKey=offer", lettersChanges.closeIssue())).toBe("");
  });

  it("closes the issue panel", () => {
    expect(apply("tab=offers&issue=t1&recipient=0000000000000000000000c1&recipientType=candidate", lettersChanges.closeIssue())).toBe("tab=offers");
  });

  it("enters and leaves manage mode and the editor", () => {
    expect(apply("tab=issue", lettersChanges.openManage())).toBe("manage=1");
    expect(apply("manage=1", lettersChanges.openTemplate("t1"))).toBe("manage=1&template=t1");
    expect(apply("manage=1&template=t1", lettersChanges.closeTemplate())).toBe("manage=1");
    expect(apply("manage=1&template=t1", lettersChanges.closeManage())).toBe("");
  });

  it("goes to issued letters, optionally filtered, closing everything else", () => {
    expect(apply("manage=1&template=t1&issue=t1&recipient=0000000000000000000000e1&recipientType=employee", lettersChanges.viewIssued())).toBe("tab=issued");
    expect(apply("issue=t1", lettersChanges.viewIssued({ recipientId: "0000000000000000000000e1", recipientType: "employee" }))).toBe(
      "tab=issued&forRecipient=0000000000000000000000e1&forType=employee"
    );
    expect(apply("tab=issued&forRecipient=0000000000000000000000e1&forType=employee", lettersChanges.clearRecipientFilter())).toBe("tab=issued");
  });
});

describe("getIssueRecipientRule", () => {
  it("does not restrict full issuers", () => {
    expect(getIssueRecipientRule(FULL)).toBeNull();
  });

  it("limits consultancy-only issuers to templates under the consultancy rule", () => {
    expect(getIssueRecipientRule({ canIssueConsultancyAgreement: true })).toBe(CONSULTANCY_RECIPIENT_RULE);
    expect(CONSULTANCY_RECIPIENT_RULE).toBe("consultancy");
  });
});

describe("issuedLettersPath", () => {
  it("links to a person's issued letters", () => {
    expect(issuedLettersPath("acme", { recipientId: "0000000000000000000000e1" })).toBe("/acme/letters?tab=issued&forRecipient=0000000000000000000000e1&forType=employee");
    expect(issuedLettersPath("acme", { recipientId: "0000000000000000000000c1", recipientType: "candidate" })).toBe(
      "/acme/letters?tab=issued&forRecipient=0000000000000000000000c1&forType=candidate"
    );
  });

  it("links to all issued letters without a person", () => {
    expect(issuedLettersPath("acme", { recipientId: "" })).toBe("/acme/letters?tab=issued");
  });
});

describe("normalizeLettersParams", () => {
  const VIEW_ONLY = { canView: true };
  const ISSUER = { canView: true, canIssue: true };
  const norm = (query, access = FULL) => normalizeLettersParams(p(query), getLettersTabs(access), access)?.toString() ?? null;

  it("returns null for canonical URLs", () => {
    expect(norm("")).toBeNull();
    expect(norm("tab=offers&issue=pick&issueKey=offer&recipient=0000000000000000000000c1&recipientType=candidate")).toBeNull();
    expect(norm("manage=1&template=t1&issue=t1")).toBeNull();
    expect(norm("tab=issued&forRecipient=0000000000000000000000e1&forType=candidate")).toBeNull();
    expect(norm("utm_source=mail")).toBeNull();
  });

  it("drops an unknown or forbidden tab", () => {
    expect(norm("tab=nope&issue=t1")).toBe("issue=t1");
    expect(norm("tab=issue", VIEW_ONLY)).toBe("");
    expect(norm("tab=offers", { canView: true, canIssueConsultancyAgreement: true })).toBe("");
  });

  it("drops manage mode and the template for people who cannot edit", () => {
    expect(norm("manage=1&template=t1", ISSUER)).toBe("");
    expect(norm("manage=2")).toBe("");
    expect(norm("template=t1&tab=issued")).toBe("tab=issued");
  });

  it("drops the issue panel for people who cannot issue", () => {
    expect(norm("tab=issued&issue=t1&recipient=0000000000000000000000e1&recipientType=employee", VIEW_ONLY)).toBe("tab=issued");
  });

  it("drops issue details without an open panel or with invalid values", () => {
    expect(norm("recipient=0000000000000000000000e1&recipientType=employee&issueKey=offer")).toBe("");
    expect(norm("issue=t1&issueKey=offer")).toBe("issue=t1");
    expect(norm("issue=pick&recipientType=vendor")).toBe("issue=pick");
  });

  it("drops the recipient filter outside issued letters", () => {
    expect(norm("tab=offers&forRecipient=0000000000000000000000e1&forType=employee")).toBe("tab=offers");
    expect(norm("forType=candidate&tab=issued")).toBe("tab=issued");
    expect(norm("tab=issued&forRecipient=0000000000000000000000e1&forType=vendor")).toBe("tab=issued&forRecipient=0000000000000000000000e1");
    expect(norm("forRecipient=0000000000000000000000e1", VIEW_ONLY)).toBeNull();
  });

  it("drops person ids that are not record ids, so no request is made with them", () => {
    expect(norm("tab=issued&forRecipient=xyz&forType=employee")).toBe("tab=issued");
    expect(norm("tab=issued&forRecipient=0000000000000000000000e1%3Cx&forType=employee")).toBe("tab=issued");
    expect(norm("issue=pick&recipient=abc&recipientType=employee")).toBe("issue=pick&recipientType=employee");
    expect(norm("issue=pick&recipient=0000000000000000000000E1")).toBeNull();
  });

  it("is idempotent", () => {
    const messy = "tab=nope&manage=1&template=t1&recipient=0000000000000000000000e1&forRecipient=x";
    const once = normalizeLettersParams(p(messy), getLettersTabs(ISSUER), ISSUER);
    expect(normalizeLettersParams(once, getLettersTabs(ISSUER), ISSUER)).toBeNull();
  });
});

describe("canonicalLettersParams", () => {
  const canon = (query, access = FULL) => canonicalLettersParams(p(query), getLettersTabs(access), access)?.toString() ?? null;

  it("returns null when the URL is already canonical", () => {
    expect(canon("tab=issued")).toBeNull();
  });

  it("applies legacy redirects", () => {
    expect(canon("tab=templates&template=t1")).toBe("template=t1&manage=1");
  });

  it("normalizes the redirected URL in the same step", () => {
    expect(canon("tab=templates&template=t1", { canView: true, canIssue: true })).toBe("");
    expect(canon("generate=1&gTemplate=t2", { canView: true })).toBe("");
  });

  it("cleans the stray issue and filter params for each access level", () => {
    const CONSULTANCY = { canView: true, canIssueConsultancyAgreement: true };
    expect(canon("issue=t1&issueKey=offer")).toBe("issue=t1");
    expect(canon("issue=pick&issueKey=offer&recipientType=bad")).toBe("issue=pick&issueKey=offer");
    expect(canon("tab=offers&forRecipient=0000000000000000000000e1&forType=bad")).toBe("tab=offers");
    expect(canon("issue=pick&issueKey=offer&recipientType=bad", CONSULTANCY)).toBe("issue=pick&issueKey=offer");
    expect(canon("tab=offers&forRecipient=0000000000000000000000e1&forType=bad", CONSULTANCY)).toBe("");
    expect(canon("issue=t1&issueKey=offer", { canView: true })).toBe("");
  });

  it("always reaches a fixed point", () => {
    [
      "tab=templates",
      "generate=1&recipient=0000000000000000000000e1",
      "tab=nope&manage=1",
      "template=new",
      "issue=t1&issueKey=offer",
      "issue=pick&issueKey=offer&recipientType=bad",
      "tab=offers&forRecipient=0000000000000000000000e1&forType=bad",
      "tab=bogus&recipient=abc&forRecipient=xyz&issueKey=offer",
    ].forEach((query) => {
      [FULL, { canView: true }, { canView: true, canIssue: true }, { canView: true, canIssueConsultancyAgreement: true }].forEach((access) => {
        const once = canonicalLettersParams(p(query), getLettersTabs(access), access) || p(query);
        expect(canonicalLettersParams(once, getLettersTabs(access), access)).toBeNull();
      });
    });
  });
});

describe("links into Employees", () => {
  it("names the Employees query params once", () => {
    expect(EMPLOYEE_PARAMS).toEqual({ search: "search", prefillCandidate: "prefillCandidate" });
  });

  it("opens Add employee prefilled from a candidate", () => {
    expect(convertCandidatePath("acme", { _id: "c2" })).toBe("/acme/employees?prefillCandidate=c2");
  });

  it("finds a joined candidate's employee by code, then by the employee's own name — never the candidate name", () => {
    expect(candidateEmployeePath("acme", { name: "K Das", employeeName: "Kiran Das", employeeCode: "EMP-7" })).toBe("/acme/employees?search=EMP-7");
    expect(candidateEmployeePath("acme", { name: "K Das", employeeName: " Kiran Das " })).toBe("/acme/employees?search=Kiran+Das");
    expect(candidateEmployeePath("acme", { name: "K Das" })).toBe("/acme/employees");
    expect(candidateEmployeePath("acme", {})).toBe("/acme/employees");
  });

  it("reads the Employees search param safely", () => {
    expect(readEmployeesSearch(p("search=EMP-7"))).toBe("EMP-7");
    expect(readEmployeesSearch(p("search=%20Kiran%20Das%20"))).toBe("Kiran Das");
    expect(readEmployeesSearch(p(`search=${"x".repeat(150)}`))).toHaveLength(100);
    expect(readEmployeesSearch(p("status=active"))).toBe("");
  });

  it("round-trips: the search a link writes is the search Employees reads", () => {
    const link = candidateEmployeePath("acme", { employeeName: "Kiran & Das" });
    expect(readEmployeesSearch(new URLSearchParams(link.split("?")[1]))).toBe("Kiran & Das");
  });
});

describe("lettersChanges.openOffers", () => {
  it("closes the issue panel and lands on Offer candidates", () => {
    const next = applyLettersChanges(p("tab=issue&issue=t1&recipient=abc&recipientType=candidate&issueKey=offer"), lettersChanges.openOffers());
    expect(next.toString()).toBe("tab=offers");
  });
});

describe("employeeLetterActions (Employees row menu)", () => {
  const VIEW_ONLY = { canView: true };
  const CONSULTANCY_ONLY = { canIssueConsultancyAgreement: true };

  it("lets anyone who can see Letters view the person's issued letters, even without issuing rights", () => {
    expect(employeeLetterActions(VIEW_ONLY, {})).toMatchObject({ issue: false, viewIssued: true, any: true });
  });

  it("offers issuing only to people who can issue", () => {
    expect(employeeLetterActions(FULL, {})).toMatchObject({ issue: true, viewIssued: true, consultancyAgreement: false });
  });

  it("gives consultancy managers only the agreement, and only for consultancy employees", () => {
    expect(employeeLetterActions(CONSULTANCY_ONLY, { isConsultancy: true })).toMatchObject({
      issue: false,
      viewIssued: false,
      consultancyAgreement: true,
      any: true,
    });
    expect(employeeLetterActions(CONSULTANCY_ONLY, { isConsultancy: false })).toMatchObject({ consultancyAgreement: false, any: false });
  });

  it("keeps the termination letter on its own employees permission", () => {
    expect(employeeLetterActions({}, {}, { canTerminate: true })).toMatchObject({ termination: true, any: true });
    expect(employeeLetterActions({}, {})).toEqual({
      issue: false,
      viewIssued: false,
      consultancyAgreement: false,
      termination: false,
      any: false,
    });
  });
});
