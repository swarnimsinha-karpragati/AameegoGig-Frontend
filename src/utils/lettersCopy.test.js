import { LETTERS_COPY, format } from "./lettersCopy";

/** Every string a user can see; object keys are internal codes and are skipped. */
const displayedText = (node) =>
  typeof node === "string" ? node : Object.values(node).map(displayedText).join("\n");

describe("LETTERS_COPY", () => {
  it("exposes the agreed strings", () => {
    expect(LETTERS_COPY.home.title).toBe("Issue a letter");
    expect(LETTERS_COPY.issue.who).toBe("Who is this for?");
    expect(LETTERS_COPY.editor.questions).toBe("Questions to ask when issuing");
    expect(LETTERS_COPY.editor.optionalTag).toBe("Only shown when {label} is filled");
    expect(LETTERS_COPY.editor.otherwiseTag).toBe("Shown instead when {label} is empty");
    expect(LETTERS_COPY.editor.sourceOnlyNotice).toBe("This template uses advanced logic, so it can only be edited as HTML.");
    expect(LETTERS_COPY.editor.editHtml).toBe("Edit HTML (advanced)");
    expect(LETTERS_COPY.editor.backToVisual).toBe("Back to visual editor");
    expect(LETTERS_COPY.editor.moreOptions).toBe("More options");
    expect(LETTERS_COPY.editor.searchDetails).toBe("Search details");
    expect(format(LETTERS_COPY.editor.noDetailsMatch, { query: "x" })).toBe("No details match “x”.");
  });

  it("has the offer candidate strings", () => {
    const o = LETTERS_COPY.offers;
    expect(o.title).toBe("Offer candidates");
    expect(o.description).toBe("Add candidates, send offer letters and turn accepted offers into employees.");
    expect(`${o.emptyTitle}. ${o.emptyHint}`).toBe("No candidates yet. Add a candidate to send an offer letter.");
    expect(o.emptyHintReadOnly).toBe("Candidates added by HR appear here.");
    expect(o.columns).toEqual({ candidate: "Candidate", role: "Role", ctc: "Annual CTC", joining: "Joining", status: "Status", nextStep: "Next step" });
    expect(format(o.progressText, { step: 2, total: 4, label: "Offered" })).toBe("Step 2 of 4: Offered");
    expect(format(o.nextStepFor, { action: "Send offer letter", name: "Neha" })).toBe("Send offer letter for Neha");
    expect(format(o.offerValidTill, { date: "01 Nov 2026" })).toBe("Offer valid until 01 Nov 2026");
    expect(o.noteLabel).toBe("Note (optional)");
    expect(o.noteHint).toBe("Saved in the candidate's history.");
    expect(o.employeeMissing).toBe("Employee record no longer exists");
    expect(format(o.candidateGone, { name: "Neha" })).toBe("Neha was removed by someone else. The list has been refreshed.");
    expect(o.history).toEqual({
      title: "History",
      empty: "No status changes recorded yet.",
      by: "by {name}",
      loading: "Loading history…",
      error: "Could not load the history.",
      retry: "Try again",
    });
    expect(format(o.confirm.accepted.title, { name: "Neha" })).toBe("Mark Neha as accepted?");
    expect(format(o.confirm.accepted.message, { name: "Neha" })).toBe("Do this once Neha has accepted the offer. Next, you can add them as an employee.");
    expect(o.confirm.accepted.confirm).toBe("Mark accepted");
    expect(format(o.confirm.accepted.done, { name: "Neha" })).toBe("Neha marked as accepted.");
    expect(format(o.confirm.declined.title, { name: "Neha" })).toBe("Mark Neha as declined?");
    expect(o.confirm.declined.confirm).toBe("Mark declined");
    expect(format(o.confirm.expired.title, { name: "Neha" })).toBe("Mark Neha's offer as expired?");
    expect(o.confirm.expired.confirm).toBe("Mark expired");
    expect(format(o.confirm.expired.done, { name: "Neha" })).toBe("Neha's offer marked as expired.");
    expect(format(o.deleteTitle, { name: "Neha" })).toBe("Delete Neha?");
    expect(o.deleteMessage).toBe("The candidate is removed from this list. This can't be undone.");
    expect(format(o.deleted, { name: "Neha" })).toBe("Neha deleted.");
    expect(format(o.deleteInUse, { name: "Neha" })).toBe(
      "Neha can't be deleted because letters have been issued to them. Void those letters in Issued letters first, or keep the record."
    );
    expect(format(o.statusChanged, { name: "Neha" })).toBe(
      "Neha's status was changed by someone else. The list has been refreshed — check it and try again."
    );
    expect(o.actionError).toBe("That didn't work. Check your connection and try again.");
    expect(o.drawer).toMatchObject({
      addTitle: "Add candidate",
      editTitle: "Edit candidate",
      subtitle: "These details fill in the offer letter.",
      joinedSubtitle: "This candidate has joined as an employee.",
      add: "Add candidate",
      save: "Save changes",
    });
    expect(o.statuses.converted).toBe("Joined");
    expect(displayedText(o)).not.toMatch(/\{\{|converted|Designation/);
  });

  it("has the issue screen strings", () => {
    expect(LETTERS_COPY.issue.chooseTitle).toBe("Which letter do you want to issue?");
    expect(format(LETTERS_COPY.issue.stillNeeded, { list: "Reason, Date" })).toBe("Still needed: Reason, Date");
    expect(format(LETTERS_COPY.issue.sendEmail, { email: "a@b.co" })).toBe("Email the PDF to a@b.co");
    expect(format(LETTERS_COPY.issue.successSummary, { letter: "Warning", name: "Asha", number: "W/1" })).toBe(
      "Warning for Asha · Letter no. W/1"
    );
    expect(LETTERS_COPY.issue.openSettings).toBe("Open Organization profile");
    expect(LETTERS_COPY.issue.issueAnother).toBe("Issue another");
    expect(
      format(LETTERS_COPY.issue.blankDetails, { name: "Asha", list: "Reporting manager", record: LETTERS_COPY.issue.recordEmployee })
    ).toBe("These details are blank for Asha: Reporting manager. They'll print as gaps — update the employee record or edit the wording.");
    expect(LETTERS_COPY.issue.recordCandidate).toBe("candidate");
    expect(LETTERS_COPY.issue.selectPlaceholder).toBe("Select…");
    expect(LETTERS_COPY.issue.noOfferCandidates).toBe(
      "No candidates waiting for an offer. Add a candidate in Offer candidates first."
    );
    expect(LETTERS_COPY.issue.goToOffers).toBe("Go to Offer candidates");
    expect(LETTERS_COPY.issue.retryPreview).toBe("Try again");
    expect(LETTERS_COPY.issue.checkCompanyAgain).toBe("Check again");
    expect(LETTERS_COPY.issue.issueBlockedCompany).toBe("Add your company details to issue letters.");
  });

  it("has the home, navigation and manage strings", () => {
    expect(LETTERS_COPY.tabs).toEqual({ issue: "Issue a letter", issued: "Issued letters", offers: "Offer candidates", ariaLabel: "Letters sections" });
    expect(LETTERS_COPY.home.searchLabel).toBe("Search letters");
    expect(LETTERS_COPY.home.clearSearch).toBe("Clear search");
    expect(LETTERS_COPY.home.recentEmpty).toBe("No letters issued yet. Letters you issue will appear here.");
    expect(LETTERS_COPY.home.recentError).toBe("Could not load recently issued letters.");
    expect(LETTERS_COPY.manage.title).toBe("Manage templates");
    expect(LETTERS_COPY.manage.back).toBe("Back to letters");
    expect(LETTERS_COPY.manage.create).toBe("Create template");
    expect(LETTERS_COPY.manage.columns).toEqual({ name: "Name", group: "Group", whoFor: "Who it's for", updated: "Last updated" });
    expect(format(LETTERS_COPY.manage.archiveTitle, { name: "NOC" })).toBe("Archive “NOC”?");
    expect(LETTERS_COPY.manage.archiveMessage).toMatch(/no longer offered when issuing letters/);
    expect(LETTERS_COPY.manage.templateNameLabel).toBe("Template name");
    expect(LETTERS_COPY.issued.issueButton).toBe("Issue a letter");
    expect(LETTERS_COPY.issued.emptyHint).toBe("Letters you issue appear here with their PDFs.");
    expect(format(LETTERS_COPY.issue.templateKeyUnavailable, { name: "offer letter" })).toBe(
      "No offer letter template is available — choose a letter."
    );
    expect(LETTERS_COPY.issue.templateKeyUnavailableGeneric).toBe("That letter template is not available — choose a letter.");
    expect(LETTERS_COPY.issue.templateUnavailable).toBe(
      "That letter is no longer available. Choose another letter below."
    );
  });

  it("has the template editor strings", () => {
    const E = LETTERS_COPY.editor;
    expect(E.questionsGroup).toBe("This letter's questions");
    expect(E.previewSample).toBe("Preview with sample data");
    expect(E.tryIssuing).toBe("Try issuing");
    expect(E.saveNote).toBe("What did you change? (optional)");
    expect(E.conflict).toBe("Someone else saved this template — reload to see their changes.");
    expect(E.reload).toBe("Reload");
    expect(E.whoForFixed).toBe("Fixed for built-in templates");
    expect(E.history).toBe("History");
    expect(E.resetToOriginal).toBe("Reset to original");
    expect(E.insertIntoLetter).toBe("Insert into letter");
    expect(E.answerType).toBe("Answer type");
    expect(format(E.questionLabel, { n: 2 })).toBe("Question 2");
    expect(format(E.choicesRequired, { label: "Level" })).toBe("Add at least one choice for Level");
    expect(format(E.unknownDetails, { list: "Manager name" })).toBe(
      "Some details in this letter no longer exist (Manager name) — remove the ones shown in red."
    );
    expect(E.saveAndTryIssuing).toBe("Save and try issuing");
    expect(E.removeUsedQuestionMessage).toBe("This question is used in the letter. Remove it and its spots in the letter?");
    expect(E.reloadConfirmTitle).toBe("Reload and lose your changes?");
    expect(E.chooseGroup).toBe("Choose a group");
    expect(E.contentRequired).toBe("Letter content is required");
    expect(E.resetMessageUnsaved).toMatch(/unsaved changes will be lost/);
    expect(E.tryIssuingNew).toBeTruthy();
    expect(Object.keys(E.letterheadOptions)).toEqual(["showLogo", "showAddress", "showSignature", "showStamp", "showFooter"]);
    Object.values(E.letterheadOptions).forEach((option) => {
      expect(option.label).toBeTruthy();
      expect(option.hint).toBeTruthy();
    });
    expect(E.letterheadOptions.showSignature.label).toBe("Signature block");
    expect(E.answerTypes.choice).toBe("Dropdown with choices");
    expect(E.answerTypes.person_name).toBe("Person's name");
    expect(format(E.restoreTitle, { version: 3 })).toBe("Restore version 3?");
  });

  const strings = (value) => (typeof value === "string" ? [value] : Object.values(value).flatMap(strings));

  it("is deeply frozen", () => {
    const check = (value) => {
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).filter((v) => typeof v === "object").forEach(check);
    };
    check(LETTERS_COPY);
  });

  it("never contains raw {{placeholders}}", () => {
    strings(LETTERS_COPY).forEach((str) => expect(str).not.toMatch(/\{\{/));
  });
});

describe("format", () => {
  it("replaces named tokens", () => {
    expect(format(LETTERS_COPY.home.empty, { query: "abc" })).toBe("No letters match “abc”.");
    expect(format("{a} and {b}", { a: 1, b: "two" })).toBe("1 and two");
  });

  it("replaces repeated tokens", () => {
    expect(format("{x}-{x}", { x: "y" })).toBe("y-y");
  });

  it("leaves unknown tokens untouched", () => {
    expect(format("Only shown when {label} is filled", {})).toBe("Only shown when {label} is filled");
    expect(format("{a} {b}", { a: "1" })).toBe("1 {b}");
  });

  it("handles missing vars and empty strings", () => {
    expect(format("hi {name}")).toBe("hi {name}");
    expect(format("", { a: 1 })).toBe("");
    expect(format("{a}", { a: "" })).toBe("");
  });
});
