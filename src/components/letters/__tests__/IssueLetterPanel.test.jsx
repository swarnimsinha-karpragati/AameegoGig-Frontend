import { useState } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueLetterPanel from "../IssueLetterPanel";
import renderWithProviders from "../testing/renderWithProviders";
import * as templateService from "../../../services/letterTemplateService";
import * as letterService from "../../../services/letterService";

jest.mock("../../../services/letterTemplateService");
jest.mock("../../../services/letterService");
jest.mock("../RichTextEditor", () => {
  const { forwardRef } = require("react");
  return forwardRef(function MockEditor({ value, onChange, label, allowSource }, ref) {
    return (
      <textarea aria-label={label} data-allow-source={String(allowSource)} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  });
});

const WARNING = {
  _id: "t1",
  key: "warning",
  name: "Warning Letter",
  category: "Disciplinary",
  recipientType: "employee",
  inputFields: [
    { key: "incidentDate", label: "Incident date", kind: "date", required: true },
    { key: "reason", label: "Reason", kind: "long_text", required: true, multiline: true },
    { key: "severity", label: "Warning level", kind: "text", required: true, options: ["First", "Final"] },
    { key: "remarks", label: "Remarks", kind: "text", required: false },
  ],
};
const SIMPLE = { ...WARNING, _id: "t3", key: "noc", name: "NOC", category: "Employment changes", inputFields: [] };
const OFFER = { _id: "t2", key: "offer", name: "Offer Letter", category: "Onboarding", recipientType: "candidate", inputFields: [], isOffer: true };
const NDA = { _id: "t5", key: "candidate-nda", name: "Candidate NDA", category: "Custom", recipientType: "candidate", inputFields: [], isOffer: false };
const CONSULTANCY = {
  _id: "t4",
  key: "consultancy-agreement",
  name: "Consultancy Agreement",
  category: "Consultancy",
  recipientType: "employee",
  recipientRule: "consultancy",
  inputFields: [],
};
const EMPLOYEES = [
  { _id: "e1", name: "Asha Rao", code: "EMP001", email: "asha@example.com", designation: "Engineer", department: "Tech", status: "active" },
  { _id: "e2", name: "Ravi Kumar", code: "EMP002", email: "", status: "inactive" },
];
const CANDIDATES = [{ _id: "c1", name: "Neha Singh", email: "neha@example.com" }];
const PREVIEW = { html: "<html><body>Letter</body></html>", bodyHtml: "<p>Dear Asha</p>", missing: [] };

const open = (props = {}) =>
  renderWithProviders(<IssueLetterPanel open onClose={jest.fn()} onViewIssued={jest.fn()} {...props} />);

beforeEach(() => {
  jest.resetAllMocks();
  templateService.getLetterTemplates.mockResolvedValue([WARNING, SIMPLE, OFFER, CONSULTANCY]);
  letterService.getLetterRecipients.mockImplementation(async ({ recipientType, id }) => {
    const list = recipientType === "candidate" ? CANDIDATES : EMPLOYEES;
    return id ? list.filter((p) => p._id === id) : list;
  });
  letterService.previewLetter.mockResolvedValue(PREVIEW);
  letterService.downloadDraftLetter.mockResolvedValue(undefined);
  letterService.downloadIssuedLetter.mockResolvedValue(undefined);
});

const waitForPreview = async () => {
  await waitFor(() => expect(letterService.previewLetter).toHaveBeenCalled());
  await waitFor(() => letterService.previewLetter.mock.results.at(-1).value);
  await screen.findByTitle("Letter preview");
};

const pickRecipient = async (name, { previewSucceeds = true } = {}) => {
  userEvent.click(await screen.findByRole("radio", { name: new RegExp(name) }));
  if (previewSucceeds) await waitForPreview();
};

const fillWarning = async () => {
  userEvent.type(screen.getByLabelText(/Incident date/), "2026-09-30");
  userEvent.type(screen.getByLabelText(/^Reason/), "Repeated late arrival");
  userEvent.selectOptions(screen.getByLabelText(/Warning level/), "Final");
};

describe("choosing a letter", () => {
  it("shows a searchable, grouped list when no template is given", async () => {
    const onChangeTemplate = jest.fn();
    open({ onChangeTemplate });
    expect(await screen.findByText("Which letter do you want to issue?")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Disciplinary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Offer Letter/ })).toBeInTheDocument();

    userEvent.type(screen.getByLabelText("Search letters"), "warning");
    expect(screen.queryByRole("button", { name: /Offer Letter/ })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /Warning Letter/ }));

    expect(onChangeTemplate).toHaveBeenCalledWith("t1");
    expect(await screen.findByLabelText(/Incident date/)).toBeInTheDocument();
  });

  it("only offers templates for the deep-linked recipient type and keeps the preselected person", async () => {
    open({ initialRecipientId: "c1", initialRecipientType: "candidate" });
    await screen.findByRole("button", { name: /Offer Letter/ });
    expect(screen.queryByRole("button", { name: /Warning Letter/ })).not.toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: /Offer Letter/ }));
    const card = await screen.findByTestId("issue-recipient-card");
    expect(card).toHaveTextContent("Neha Singh");
  });

  it("explains an unavailable template and falls back to the chooser", async () => {
    const onChangeTemplate = jest.fn();
    open({ templateId: "archived-id", onChangeTemplate });
    expect(await screen.findByText("That letter is no longer available. Choose another letter below.")).toBeInTheDocument();
    expect(screen.getByText("Which letter do you want to issue?")).toBeInTheDocument();
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    expect(onChangeTemplate).toHaveBeenCalledWith("t1");
    expect(await screen.findByLabelText(/Incident date/)).toBeInTheDocument();
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Choose a different letter" }));
    expect(onChangeTemplate).toHaveBeenLastCalledWith("");
    expect(await screen.findByText("Which letter do you want to issue?")).toBeInTheDocument();
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  });

  it("treats a template outside the allowed recipient rule as unavailable", async () => {
    open({ templateId: "t1", recipientRule: "consultancy" });
    expect(await screen.findByText(/no longer available/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Warning Letter/ })).not.toBeInTheDocument();
  });

  it("does not call a template unavailable while the list is loading", async () => {
    let resolve;
    templateService.getLetterTemplates.mockReturnValue(new Promise((r) => { resolve = r; }));
    open({ templateId: "t1" });
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
    await act(async () => resolve([WARNING]));
    expect(await screen.findByLabelText(/Incident date/)).toBeInTheDocument();
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  });

  it("resolves a requested template key once the templates load, and can still change letter", async () => {
    let resolve;
    templateService.getLetterTemplates.mockReturnValue(new Promise((r) => { resolve = r; }));
    const onChangeTemplate = jest.fn();
    open({ templateKey: "offer", initialRecipientId: "c1", initialRecipientType: "candidate", onChangeTemplate });
    await act(async () => resolve([WARNING, OFFER, { ...OFFER, _id: "t5", key: "internship", name: "Internship Offer" }]));
    expect(await screen.findByRole("heading", { name: "Offer Letter" })).toBeInTheDocument();
    expect(await screen.findByTestId("issue-recipient-card")).toHaveTextContent("Neha Singh");

    userEvent.click(screen.getByRole("button", { name: "Choose a different letter" }));
    expect(onChangeTemplate).toHaveBeenLastCalledWith("");
    expect(await screen.findByRole("button", { name: /Internship Offer/ })).toBeInTheDocument();
  });

  it("falls back to the chooser with a notice when the requested template key does not exist", async () => {
    const onChangeTemplate = jest.fn();
    open({ templateKey: "offer", initialRecipientId: "e1", initialRecipientType: "employee", onChangeTemplate });
    expect(await screen.findByText("No offer letter template is available — choose a letter.")).toBeInTheDocument();
    expect(screen.getByText("Which letter do you want to issue?")).toBeInTheDocument();
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    expect(await screen.findByLabelText(/Incident date/)).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Choose a different letter" }));
    expect(await screen.findByText("Which letter do you want to issue?")).toBeInTheDocument();
    expect(screen.queryByText(/No offer letter template/)).not.toBeInTheDocument();
  });

  it("uses a generic notice for a template key without a friendly name", async () => {
    open({ templateKey: "custom-bank" });
    expect(await screen.findByText("That letter template is not available — choose a letter.")).toBeInTheDocument();
  });

  it("does not show the key notice while the templates are loading", async () => {
    let resolve;
    templateService.getLetterTemplates.mockReturnValue(new Promise((r) => { resolve = r; }));
    open({ templateKey: "offer", initialRecipientId: "c1", initialRecipientType: "candidate" });
    expect(screen.queryByText(/No offer letter template/)).not.toBeInTheDocument();
    await act(async () => resolve([OFFER]));
    expect(await screen.findByRole("heading", { name: "Offer Letter" })).toBeInTheDocument();
    expect(screen.queryByText(/No offer letter template/)).not.toBeInTheDocument();
  });

  it("opens the only allowed template directly for the consultancy flow", async () => {
    open({ initialRecipientId: "e1", initialRecipientType: "employee", recipientRule: "consultancy" });
    expect(await screen.findByRole("heading", { name: "Consultancy Agreement" })).toBeInTheDocument();
    expect(screen.queryByText("Which letter do you want to issue?")).not.toBeInTheDocument();
    expect(await screen.findByTestId("issue-recipient-card")).toHaveTextContent("Asha Rao");
  });

  it("offers a copy of the agreement under the same rule alongside the original", async () => {
    const copy = { ...CONSULTANCY, _id: "t6", key: "agreement-copy", name: "Agreement for contractors" };
    templateService.getLetterTemplates.mockResolvedValue([WARNING, CONSULTANCY, copy]);
    open({ initialRecipientId: "e1", initialRecipientType: "employee", recipientRule: "consultancy" });
    expect(await screen.findByText("Which letter do you want to issue?")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Agreement for contractors/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Consultancy Agreement/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Warning Letter/ })).not.toBeInTheDocument();
  });
});

describe("who the letter is for", () => {
  it("preselects the recipient from props and lets the user change it", async () => {
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    const card = await screen.findByTestId("issue-recipient-card");
    expect(card).toHaveTextContent("Asha Rao");
    expect(card).toHaveTextContent("Engineer · Tech");
    userEvent.click(within(card).getByRole("button", { name: "Change" }));
    await pickRecipient("Ravi Kumar");
    expect(await screen.findByTestId("issue-recipient-card")).toHaveTextContent("Ravi Kumar");
  });

  it("looks up the preselected person for the chosen letter, so someone it cannot go to is not preselected", async () => {
    let resolveTemplates;
    templateService.getLetterTemplates.mockReturnValue(new Promise((r) => { resolveTemplates = r; }));
    letterService.getLetterRecipients.mockImplementation(async ({ id }) => (id ? [] : CANDIDATES));
    open({ templateKey: "offer", initialRecipientId: "c1", initialRecipientType: "candidate" });
    await act(async () => resolveTemplates([WARNING, OFFER]));
    expect(await screen.findByLabelText("Who is this for?")).toBeInTheDocument();

    const idLookups = letterService.getLetterRecipients.mock.calls.filter(([params]) => params.id === "c1");
    expect(idLookups.length).toBeGreaterThan(0);
    for (const [params] of idLookups) expect(params).toMatchObject({ recipientType: "candidate", templateId: "t2" });
    expect(screen.queryByTestId("issue-recipient-card")).not.toBeInTheDocument();
    expect(letterService.previewLetter).not.toHaveBeenCalled();
  });

  it("names the people list with a hidden legend and labels statuses in plain words", async () => {
    open({ templateId: "t3" });
    expect(await screen.findByRole("group", { name: "Choose a person" })).toBeInTheDocument();
    expect(screen.getByText("Choose a person", { selector: "legend" })).toHaveClass("wz-sr-only");
    expect(await screen.findByText("Inactive")).toBeInTheDocument();
  });

  it("shows no status badge for active employees", async () => {
    open({ templateId: "t3" });
    await screen.findByText("Inactive");
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("active")).not.toBeInTheDocument();
  });

  it("asks the server only for the people this letter can go to and labels candidate statuses in plain words", async () => {
    letterService.getLetterRecipients.mockResolvedValue([
      { _id: "c1", name: "Neha Singh", email: "neha@example.com", status: "draft" },
      { _id: "c2", name: "Kabir Das", email: "", status: "offered" },
      { _id: "c3", name: "Odd Status", email: "", status: "mystery" },
    ]);
    open({ templateId: "t2" });
    expect(await screen.findByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Offered")).toBeInTheDocument();
    for (const raw of ["draft", "offered", "mystery"]) expect(screen.queryByText(raw)).not.toBeInTheDocument();
    expect(letterService.getLetterRecipients).toHaveBeenCalled();
    for (const [params] of letterService.getLetterRecipients.mock.calls) {
      expect(params).toMatchObject({ recipientType: "candidate", templateId: "t2" });
    }
  });

  it("explains when no candidate is waiting for an offer and links to Offer candidates", async () => {
    letterService.getLetterRecipients.mockResolvedValue([]);
    const onAddCandidate = jest.fn();
    open({ templateId: "t2", onAddCandidate });
    expect(
      await screen.findByText("No candidates waiting for an offer. Add a candidate in Offer candidates first.")
    ).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Go to Offer candidates" }));
    expect(onAddCandidate).toHaveBeenCalledTimes(1);
  });

  it("explains the empty offer list without a link for people who cannot add candidates", async () => {
    letterService.getLetterRecipients.mockResolvedValue([]);
    open({ templateId: "t2" });
    expect(await screen.findByText(/No candidates waiting for an offer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to Offer candidates" })).not.toBeInTheDocument();
  });

  it("uses plain candidate wording when another candidate letter has nobody to go to", async () => {
    templateService.getLetterTemplates.mockResolvedValue([WARNING, OFFER, NDA]);
    letterService.getLetterRecipients.mockResolvedValue([]);
    open({ templateId: "t5", onAddCandidate: jest.fn() });
    expect(await screen.findByText("No candidates yet. Add a candidate in Offer candidates first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Offer candidates" })).toBeInTheDocument();
    expect(screen.queryByText(/waiting for an offer/)).not.toBeInTheDocument();
  });

  it("keeps the no-match message while searching", async () => {
    letterService.getLetterRecipients.mockResolvedValue([]);
    open({ templateId: "t2", onAddCandidate: jest.fn() });
    await screen.findByText(/No candidates waiting for an offer/);
    userEvent.type(screen.getByLabelText("Who is this for?"), "zed");
    expect(await screen.findByText("No one matches “zed”.")).toBeInTheDocument();
    expect(screen.queryByText(/No candidates waiting for an offer/)).not.toBeInTheDocument();
  });

  it("asks for a recipient before issuing and focuses the search", async () => {
    open({ templateId: "t3" });
    await screen.findByLabelText("Who is this for?");
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose who this letter is for");
    expect(screen.getByLabelText("Who is this for?")).toHaveFocus();
    expect(letterService.issueLetter).not.toHaveBeenCalled();
  });
});

describe("questions and live preview", () => {
  it("renders the right control per question and marks optional ones", async () => {
    open({ templateId: "t1" });
    expect((await screen.findByLabelText(/^Reason/)).tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText(/Warning level/).tagName).toBe("SELECT");
    expect(screen.getByLabelText(/Incident date/)).toHaveAttribute("type", "date");
    expect(screen.getByLabelText(/^Remarks/)).toHaveAccessibleDescription(/optional — leave blank to skip this line/);
  });

  it("asks the server to mark still-needed questions, sends only real answers and never issues markers", async () => {
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L1", letterNumber: "WRN/2026/0001", fileName: "w.pdf" }, emailed: true });
    open({ templateId: "t1" });
    await pickRecipient("Asha Rao");

    await waitFor(() =>
      expect(letterService.previewLetter).toHaveBeenCalledWith({
        templateId: "t1",
        recipientType: "employee",
        employeeId: "e1",
        values: { incidentDate: "", reason: "", severity: "", remarks: "" },
        gapKeys: ["incidentDate", "reason", "severity"],
      })
    );
    expect(await screen.findByTitle("Letter preview")).toBeInTheDocument();
    const stillNeeded = screen.getByTestId("issue-still-needed");
    expect(stillNeeded).toHaveAttribute("aria-live", "polite");
    expect(stillNeeded).toHaveTextContent("Still needed: Incident date, Reason, Warning level");

    await fillWarning();
    await waitFor(() =>
      expect(letterService.previewLetter).toHaveBeenLastCalledWith({
        templateId: "t1",
        recipientType: "employee",
        employeeId: "e1",
        values: { incidentDate: "2026-09-30", reason: "Repeated late arrival", severity: "Final", remarks: "" },
      })
    );
    expect(screen.queryByText(/Still needed/)).not.toBeInTheDocument();

    const email = screen.getByRole("checkbox", { name: /Email the PDF to asha@example.com/ });
    expect(email).toBeChecked();
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await waitFor(() =>
      expect(letterService.issueLetter).toHaveBeenCalledWith({
        templateId: "t1",
        recipientType: "employee",
        employeeId: "e1",
        values: { incidentDate: "2026-09-30", reason: "Repeated late arrival", severity: "Final", remarks: "" },
        sendEmail: true,
      })
    );
    expect(await screen.findByText("Letter issued")).toBeInTheDocument();
    expect(screen.getByText(/WRN\/2026\/0001/)).toBeInTheDocument();
    expect(screen.getByText("Emailed to asha@example.com")).toBeInTheDocument();
  });

  it("validates every question on issue and focuses the first error", async () => {
    open({ templateId: "t1" });
    await pickRecipient("Asha Rao");
    await screen.findByTitle("Letter preview");
    userEvent.type(screen.getByLabelText(/Incident date/), "2026-09-30");
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(await screen.findByText(/Reason is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Warning level is required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Reason/)).toHaveFocus();
    expect(letterService.issueLetter).not.toHaveBeenCalled();
  });

  it("validates a question when the user leaves it", async () => {
    open({ templateId: "t1" });
    const reason = await screen.findByLabelText(/^Reason/);
    reason.focus();
    userEvent.tab();
    expect(await screen.findByText(/Reason is required/i)).toBeInTheDocument();
  });

  it("keeps Issue disabled when the preview is refused (4xx)", async () => {
    letterService.previewLetter.mockRejectedValue({ response: { status: 400, data: { message: "Asha Rao does not have an active salary structure. Create a salary structure for this employee first.", code: "SALARY_STRUCTURE_REQUIRED" } } });
    open({ templateId: "t3" });
    await pickRecipient("Asha Rao", { previewSucceeds: false });
    expect(await screen.findByText("Asha Rao does not have an active salary structure. Create a salary structure for this employee first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue letter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download draft" })).toBeDisabled();
  });

  it("lets the user retry a failed preview, and a network/server failure does not block issuing", async () => {
    letterService.previewLetter.mockRejectedValueOnce({ response: { status: 503, data: {} } });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    expect(await screen.findByText("Could not show the letter. Try again in a moment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue letter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download draft" })).toBeDisabled();

    userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByTitle("Letter preview")).toBeInTheDocument();
    expect(letterService.previewLetter).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download draft" })).toBeEnabled());
  });

  it("ignores a preview response that arrives after a newer one", async () => {
    const pending = [];
    letterService.previewLetter.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        })
    );
    open({ templateId: "t1", initialRecipientId: "e1", initialRecipientType: "employee" });
    await waitFor(() => expect(pending).toHaveLength(1));
    userEvent.type(await screen.findByLabelText(/^Reason/), "Late");
    await waitFor(() => expect(pending).toHaveLength(2));

    const withBlank = (label) => ({ ...PREVIEW, blankDetails: [{ key: "x", label }] });
    await act(async () => pending[1](withBlank("Newer detail")));
    await act(async () => pending[0](withBlank("Older detail")));
    expect(await screen.findByText(/Newer detail/)).toBeInTheDocument();
    expect(screen.queryByText(/Older detail/)).not.toBeInTheDocument();
  });

  it("never sends the previous letter's answers after switching templates", async () => {
    const onChangeTemplate = jest.fn();
    open({ onChangeTemplate, initialRecipientId: "e1", initialRecipientType: "employee" });
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    await waitForPreview();
    userEvent.type(screen.getByLabelText(/^Reason/), "Late");
    await waitFor(() => expect(letterService.previewLetter.mock.calls.at(-1)[0].values.reason).toBe("Late"));

    userEvent.click(screen.getByRole("button", { name: "Choose a different letter" }));
    expect(onChangeTemplate).toHaveBeenLastCalledWith("");
    const before = letterService.previewLetter.mock.calls.length;
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    await waitFor(() => expect(letterService.previewLetter.mock.calls.length).toBeGreaterThan(before));
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    const after = letterService.previewLetter.mock.calls.slice(before).map(([request]) => request.values.reason);
    expect(after).toEqual([""]);
    expect(screen.getByLabelText(/^Reason/)).toHaveValue("");
  });

  it("typing right after a reset waits for the debounce instead of previewing every keystroke", async () => {
    open({ initialRecipientId: "e1", initialRecipientType: "employee" });
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    await waitForPreview();
    userEvent.click(screen.getByRole("button", { name: "Choose a different letter" }));
    const before = letterService.previewLetter.mock.calls.length;
    userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
    userEvent.type(screen.getByLabelText(/^Reason/), "Abc");
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    const after = letterService.previewLetter.mock.calls.slice(before).map(([request]) => request.values.reason);
    expect(after).toEqual(["", "Abc"]);
  });

  it("resets the answers when the templateId prop changes", async () => {
    function Harness() {
      const [templateId, setTemplateId] = useState("t1");
      return (
        <>
          <button type="button" onClick={() => setTemplateId((id) => (id === "t1" ? "t4" : "t1"))}>
            switch template
          </button>
          <IssueLetterPanel open onClose={jest.fn()} templateId={templateId} initialRecipientId="e1" initialRecipientType="employee" />
        </>
      );
    }
    renderWithProviders(<Harness />);
    await waitForPreview();
    userEvent.type(screen.getByLabelText(/^Reason/), "Late");
    userEvent.click(screen.getByRole("button", { name: "switch template" }));
    expect(await screen.findByRole("heading", { name: "Consultancy Agreement" })).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "switch template" }));
    expect(await screen.findByLabelText(/^Reason/)).toHaveValue("");
    await waitFor(() => expect(letterService.previewLetter.mock.calls.at(-1)[0].templateId).toBe("t1"));
    expect(letterService.previewLetter.mock.calls.at(-1)[0].values.reason).toBe("");
  });
});

describe("warnings and email", () => {
  it("explains and disables email when the person has no email", async () => {
    open({ templateId: "t3" });
    await pickRecipient("Ravi Kumar");
    expect(await screen.findByText("This person has no email on file — you can still download the letter.")).toBeInTheDocument();
    const email = screen.getByRole("checkbox", { name: /no email on file/ });
    expect(email).toBeDisabled();
    expect(email).not.toBeChecked();
  });

  it("warns about record details that will print blank, by label", async () => {
    letterService.previewLetter.mockResolvedValue({
      ...PREVIEW,
      blankDetails: [
        { key: "employeeAddress", label: "Employee address (single line)" },
        { key: "managerName", label: "Reporting manager" },
      ],
    });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    const warning = await screen.findByText(/These details are blank for Asha Rao/);
    expect(warning).toHaveTextContent(
      "These details are blank for Asha Rao: Employee address (single line), Reporting manager. They'll print as gaps — update the employee record or edit the wording."
    );
    expect(warning).not.toHaveTextContent(/employeeAddress|managerName/);
  });

  it("names the candidate record for candidate letters", async () => {
    letterService.previewLetter.mockResolvedValue({ ...PREVIEW, blankDetails: [{ key: "candidateAddress", label: "Candidate address" }] });
    open({ templateId: "t2", initialRecipientId: "c1", initialRecipientType: "candidate" });
    expect(await screen.findByText(/These details are blank for Neha Singh/)).toHaveTextContent(
      "update the candidate record or edit the wording."
    );
  });

  it("shows no blank-details warning when nothing is blank", async () => {
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    expect(screen.queryByText(/These details are blank/)).not.toBeInTheDocument();
  });

  it("shows the company profile error with a link to Settings", async () => {
    letterService.issueLetter.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: "Complete your company details before issuing letters: add the company address in Settings → Organization.",
          code: "COMPANY_PROFILE_INCOMPLETE",
        },
      },
    });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(await screen.findByText(/add the company address/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Organization profile" })).toHaveAttribute(
      "href",
      "/settings?tab=organization"
    );
    expect(screen.queryByText("Letter issued")).not.toBeInTheDocument();
  });

  it("warns about missing company details before issuing and disables Issue with the reason", async () => {
    const message = "Complete your company details before issuing letters: add the company address in Settings → Organization.";
    letterService.previewLetter.mockResolvedValue({ ...PREVIEW, companyIncomplete: true, companyMessage: message });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Organization profile" })).toHaveAttribute("href", "/settings?tab=organization");
    const issueButton = screen.getByRole("button", { name: "Issue letter" });
    expect(issueButton).toBeDisabled();
    expect(issueButton).toHaveAccessibleDescription("Add your company details to issue letters.");
    expect(screen.getByRole("button", { name: "Download draft" })).toBeEnabled();
  });

  const INCOMPLETE = {
    ...PREVIEW,
    companyIncomplete: true,
    companyMessage: "Complete your company details before issuing letters: add the company address in Settings → Organization.",
  };

  it("re-enables Issue after HR fixes the company details and clicks Check again", async () => {
    letterService.previewLetter.mockResolvedValueOnce(INCOMPLETE).mockResolvedValue(PREVIEW);
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByText(INCOMPLETE.companyMessage);
    expect(screen.getByRole("button", { name: "Issue letter" })).toBeDisabled();

    userEvent.click(screen.getByRole("button", { name: "Check again" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Issue letter" })).toBeEnabled());
    expect(letterService.previewLetter).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(INCOMPLETE.companyMessage)).not.toBeInTheDocument();
  });

  it("checks the company details again when the user returns to this tab", async () => {
    letterService.previewLetter.mockResolvedValueOnce(INCOMPLETE).mockResolvedValue(PREVIEW);
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByText(INCOMPLETE.companyMessage);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Issue letter" })).toBeEnabled());
    expect(letterService.previewLetter).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(letterService.previewLetter).toHaveBeenCalledTimes(2);
  });

  it("announces the blank-details warning politely", async () => {
    letterService.previewLetter.mockResolvedValue({ ...PREVIEW, blankDetails: [{ key: "managerName", label: "Reporting manager" }] });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByText(/These details are blank/);
    expect(screen.getByTestId("issue-blank-details")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByTestId("issue-blank-details")).toHaveTextContent("Reporting manager");
  });

  it("puts a server field error on the matching question", async () => {
    letterService.issueLetter.mockRejectedValue({
      response: { status: 400, data: { message: "Reason contains invalid characters", field: "reason" } },
    });
    open({ templateId: "t1", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    await fillWarning();
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(await screen.findByText("Reason contains invalid characters")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Reason/)).toHaveFocus();
  });

  it("reports a failed email without hiding the issued letter", async () => {
    letterService.issueLetter.mockResolvedValue({
      letter: { _id: "L3", letterNumber: "WRN/2026/0003" },
      emailed: false,
      emailError: "Mail server unavailable",
    });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    expect(await screen.findByText("Mail server unavailable")).toBeInTheDocument();
    expect(screen.getByText("Letter issued")).toBeInTheDocument();
  });
});

describe("draft download", () => {
  it("downloads a draft with the real answers", async () => {
    open({ templateId: "t1", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    await fillWarning();
    await waitFor(() => expect(screen.getByRole("button", { name: "Download draft" })).toBeEnabled());
    userEvent.click(screen.getByRole("button", { name: "Download draft" }));
    await waitFor(() =>
      expect(letterService.downloadDraftLetter).toHaveBeenCalledWith(
        {
          templateId: "t1",
          recipientType: "employee",
          employeeId: "e1",
          values: { incidentDate: "2026-09-30", reason: "Repeated late arrival", severity: "Final", remarks: "" },
        },
        "Warning_Letter_Asha_Rao_DRAFT.pdf"
      )
    );
  });

  it("starts one download when clicked twice quickly", async () => {
    let finish;
    letterService.downloadDraftLetter.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    const button = await screen.findByRole("button", { name: "Download draft" });
    await waitFor(() => expect(button).toBeEnabled());
    act(() => {
      button.click();
      button.click();
    });
    expect(letterService.downloadDraftLetter).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it("stays disabled until the required answers are valid, and says why", async () => {
    open({ templateId: "t1", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    const button = screen.getByRole("button", { name: "Download draft" });
    await waitFor(() => expect(button).toHaveAccessibleDescription("Answer the required questions to download a draft."));
    expect(button).toBeDisabled();
    expect(screen.getByText("Answer the required questions to download a draft.")).toBeVisible();

    userEvent.type(screen.getByLabelText(/^Reason/), "Repeated late arrival");
    expect(button).toBeDisabled();
    await fillWarning();
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Answer the required questions to download a draft.")).not.toBeInTheDocument();
  });

  it("is disabled until there is a preview", async () => {
    open({ templateId: "t3" });
    await screen.findByLabelText("Who is this for?");
    expect(screen.getByRole("button", { name: "Download draft" })).toBeDisabled();
  });
});

describe("editing the wording", () => {
  it("needs the questions answered first", async () => {
    open({ templateId: "t1", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    expect(screen.getByRole("button", { name: "Edit wording for this letter" })).toBeDisabled();
    expect(screen.getByText("Answer the questions to edit the wording.")).toBeInTheDocument();
  });

  it("edits, applies, issues with editedHtml and can undo", async () => {
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L2", letterNumber: "WRN/2026/0002" }, emailed: false });
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));

    const editor = screen.getByLabelText("Edit wording for this letter");
    expect(editor).toHaveValue("<p>Dear Asha</p>");
    expect(editor).toHaveAttribute("data-allow-source", "false");
    expect(screen.getByText("Changes apply to this letter only — the template stays the same.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue letter" })).toBeDisabled();

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Edit wording for this letter")).not.toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));
    const again = screen.getByLabelText("Edit wording for this letter");
    userEvent.clear(again);
    userEvent.type(again, "<p>Dear Asha, edited</p>");
    userEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    await waitFor(() =>
      expect(letterService.previewLetter).toHaveBeenLastCalledWith(expect.objectContaining({ editedHtml: "<p>Dear Asha, edited</p>" }))
    );
    expect(await screen.findByText("Edited for this letter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeDisabled();

    userEvent.click(screen.getByRole("checkbox", { name: /Email the PDF/ }));
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await waitFor(() =>
      expect(letterService.issueLetter).toHaveBeenCalledWith(expect.objectContaining({ editedHtml: "<p>Dear Asha, edited</p>" }))
    );
    expect(letterService.issueLetter.mock.calls[0][0]).not.toHaveProperty("sendEmail");
  });

  it("undoes per-letter changes", async () => {
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));
    userEvent.type(screen.getByLabelText("Edit wording for this letter"), " more");
    userEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    userEvent.click(await screen.findByRole("button", { name: "Undo my changes" }));
    await waitFor(() => expect(letterService.previewLetter.mock.calls.at(-1)[0]).not.toHaveProperty("editedHtml"));
    expect(screen.queryByText("Edited for this letter")).not.toBeInTheDocument();
  });

  it("accepts edited wording that is only an image", async () => {
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));
    const editor = screen.getByLabelText("Edit wording for this letter");
    userEvent.clear(editor);
    userEvent.type(editor, '<p><img src="https://x/sign.png"></p>');
    userEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    expect(screen.queryByText("The letter cannot be empty.")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(letterService.previewLetter).toHaveBeenLastCalledWith(
        expect.objectContaining({ editedHtml: '<p><img src="https://x/sign.png"></p>' })
      )
    );
  });

  it("keeps the letter choice while wording is edited", async () => {
    open({ initialRecipientId: "e1", initialRecipientType: "employee" });
    userEvent.click(await screen.findByRole("button", { name: /NOC/ }));
    await waitForPreview();
    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));
    expect(screen.getByRole("button", { name: "Choose a different letter" })).toBeDisabled();
    userEvent.type(screen.getByLabelText("Edit wording for this letter"), " more");
    userEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    expect(await screen.findByText("Edited for this letter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a different letter" })).toBeDisabled();
    userEvent.click(screen.getByRole("button", { name: "Undo my changes" }));
    expect(screen.getByRole("button", { name: "Choose a different letter" })).toBeEnabled();
    await waitForPreview();
  });

  it("refuses to apply an empty letter", async () => {
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("button", { name: "Edit wording for this letter" }));
    userEvent.clear(screen.getByLabelText("Edit wording for this letter"));
    userEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    expect(await screen.findByText("The letter cannot be empty.")).toBeInTheDocument();
    expect(screen.getByLabelText("Edit wording for this letter")).toBeInTheDocument();
  });
});

describe("after issuing", () => {
  const issueSimple = async (props = {}) => {
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L9", letterNumber: "NOC/1", fileName: "n.pdf" }, emailed: false });
    const onClose = jest.fn();
    const onViewIssued = jest.fn();
    open({ templateId: "t3", onClose, onViewIssued, ...props });
    await pickRecipient("Asha Rao");
    await screen.findByTitle("Letter preview");
    userEvent.click(screen.getByRole("checkbox", { name: /Email the PDF/ }));
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await screen.findByText("Letter issued");
    return { onClose, onViewIssued };
  };

  it("downloads the PDF, views issued letters and closes", async () => {
    const { onClose, onViewIssued } = await issueSimple();
    userEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(letterService.downloadIssuedLetter).toHaveBeenCalledWith("L9", "NOC_1.pdf");
    userEvent.click(screen.getByRole("button", { name: "View issued letters" }));
    expect(onViewIssued).toHaveBeenCalledWith(expect.objectContaining({ _id: "e1" }), "employee");
    userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("starts again for another person with Issue another", async () => {
    await issueSimple();
    userEvent.click(screen.getByRole("button", { name: "Issue another" }));
    expect(await screen.findByLabelText("Who is this for?")).toBeInTheDocument();
    expect(screen.queryByText("Letter issued")).not.toBeInTheDocument();
  });

  it("issues once when Issue is clicked twice quickly", async () => {
    let finish;
    letterService.issueLetter.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    open({ templateId: "t3", initialRecipientId: "e1", initialRecipientType: "employee" });
    await screen.findByTitle("Letter preview");
    const button = screen.getByRole("button", { name: "Issue letter" });
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(letterService.issueLetter).toHaveBeenCalledTimes(1));
    await act(async () => finish({ letter: { _id: "L1", letterNumber: "NOC/1" }, emailed: true }));
    expect(await screen.findByText("Letter issued")).toBeInTheDocument();
    expect(letterService.issueLetter).toHaveBeenCalledTimes(1);
  });

  it("Issue another never previews the previous answers", async () => {
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L1", letterNumber: "WRN/1" }, emailed: false });
    open({ templateId: "t1" });
    await pickRecipient("Asha Rao");
    await fillWarning();
    await waitFor(() => expect(letterService.previewLetter.mock.calls.at(-1)[0].values.reason).toBe("Repeated late arrival"));
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await screen.findByText("Letter issued");

    userEvent.click(screen.getByRole("button", { name: "Issue another" }));
    const before = letterService.previewLetter.mock.calls.length;
    userEvent.click(await screen.findByRole("radio", { name: /Asha Rao/ }));
    await waitFor(() => expect(letterService.previewLetter.mock.calls.length).toBeGreaterThan(before));
    expect(letterService.previewLetter.mock.calls[before][0].values).toEqual({ incidentDate: "", reason: "", severity: "", remarks: "" });
  });

  it("Issue another goes back to the letter list and clears the chosen letter", async () => {
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L1", letterNumber: "NOC/1" }, emailed: false });
    const onChangeTemplate = jest.fn();
    open({ onChangeTemplate, initialRecipientId: "e1", initialRecipientType: "employee" });
    userEvent.click(await screen.findByRole("button", { name: /NOC/ }));
    await waitForPreview();
    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await screen.findByText("Letter issued");
    userEvent.click(screen.getByRole("button", { name: "Issue another" }));
    expect(onChangeTemplate).toHaveBeenLastCalledWith("");
    expect(await screen.findByText("Which letter do you want to issue?")).toBeInTheDocument();
  });
});
