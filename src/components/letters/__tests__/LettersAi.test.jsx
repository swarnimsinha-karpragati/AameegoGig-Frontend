import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManageTemplates from "../ManageTemplates";
import TemplateEditor from "../TemplateEditor";
import IssueLetterPanel from "../IssueLetterPanel";
import renderWithProviders from "../testing/renderWithProviders";
import * as templateService from "../../../services/letterTemplateService";
import * as letterService from "../../../services/letterService";
import * as aiService from "../../../services/aiService";
import * as letterAi from "../../../services/letterAiService";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

jest.mock("../../../services/letterTemplateService");
jest.mock("../../../services/letterService");
jest.mock("../../../services/offerCandidateService");
jest.mock("../../../services/departmentService");
jest.mock("../../../services/letterAiService");
jest.mock("../RichTextEditor", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef(function MockEditor({ value, onChange, label = "Letter content", onAiRewrite }, ref) {
    useImperativeHandle(ref, () => ({ insertPlaceholder: () => {}, focus: () => {} }));
    return (
      <>
        <textarea aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
        <output data-testid="editor-ai">{onAiRewrite ? "ai-on" : "ai-off"}</output>
      </>
    );
  });
});

const AI = LETTERS_COPY.ai;
const aiOn = (personalData = false) => aiService.getAiStatus.mockResolvedValue({ enabled: true, personalData });

const PLACEHOLDERS = [{ group: "Employee", placeholders: [{ key: "employeeName", label: "Employee name", type: "text", sample: "Asha" }] }];
const DRAFT = {
  template: {
    name: "Diwali Bonus Letter",
    category: "Employment changes",
    recipientType: "employee",
    bodyHtml: "<p>Dear {{employeeName}}, Acme Pvt Ltd awards you {{bonusAmount}}.</p>",
    inputFields: [{ key: "bonusAmount", label: "Bonus amount", kind: "currency_annual", required: true }],
    layout: {},
  },
  notes: ["Check the payout date"],
  replacements: [],
  fileName: "",
};

beforeEach(() => {
  jest.resetAllMocks();
  templateService.getLetterTemplates.mockResolvedValue([]);
  templateService.getLetterPlaceholders.mockResolvedValue(PLACEHOLDERS);
});

describe("Manage templates", () => {
  const setup = () => {
    const handlers = { onOpen: jest.fn(), onCreate: jest.fn(), onBack: jest.fn(), onAiDrafted: jest.fn() };
    renderWithProviders(<ManageTemplates {...handlers} />);
    return handlers;
  };

  it("hides AI buttons when AI is off for the organization", async () => {
    setup();
    await waitFor(() => expect(aiService.getAiStatus).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: AI.startWithAi })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: AI.importWord })).not.toBeInTheDocument();
  });

  it("offers Import from Word only when personal data is allowed", async () => {
    aiOn(false);
    setup();
    expect(await screen.findByRole("button", { name: AI.startWithAi })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: AI.importWord })).not.toBeInTheDocument();
  });

  it("drafts a template from a description and hands it to the editor", async () => {
    aiOn(true);
    letterAi.draftTemplateWithAi.mockResolvedValue({ template: DRAFT.template, notes: DRAFT.notes });
    const { onAiDrafted } = setup();
    userEvent.click(await screen.findByRole("button", { name: AI.startWithAi }));
    userEvent.type(screen.getByLabelText(new RegExp(AI.draftDescriptionLabel)), "Diwali bonus letter with amount");
    userEvent.click(screen.getByRole("button", { name: AI.draftCreate }));
    await waitFor(() =>
      expect(letterAi.draftTemplateWithAi).toHaveBeenCalledWith({ description: "Diwali bonus letter with amount", recipientType: "employee" })
    );
    await waitFor(() => expect(onAiDrafted).toHaveBeenCalledWith(expect.objectContaining({ template: DRAFT.template, fileName: "" })));
  });

  it("shows the AI error in the dialog and keeps it open", async () => {
    aiOn();
    letterAi.draftTemplateWithAi.mockRejectedValue({ response: { status: 429, data: { message: "Your organization has used this month's AI allowance.", code: "AI_BUDGET_EXCEEDED" } } });
    setup();
    userEvent.click(await screen.findByRole("button", { name: AI.startWithAi }));
    userEvent.type(screen.getByLabelText(new RegExp(AI.draftDescriptionLabel)), "Diwali bonus letter with amount");
    userEvent.click(screen.getByRole("button", { name: AI.draftCreate }));
    expect(await screen.findByText(/used this month's AI allowance/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Template editor with an AI draft", () => {
  const setup = (props = {}) =>
    renderWithProviders(
      <TemplateEditor templateId="new" initialDraft={DRAFT} canEdit canIssue onExit={jest.fn()} onSaved={jest.fn()} onIssue={jest.fn()} {...props} />
    );

  it("opens the draft unsaved with the review banner and notes", async () => {
    aiOn();
    setup();
    expect(await screen.findByDisplayValue("Diwali Bonus Letter")).toBeInTheDocument();
    expect(screen.getByText(AI.draftedBanner)).toBeInTheDocument();
    expect(screen.getByText("Check the payout date")).toBeInTheDocument();
    expect(screen.getByText(LETTERS_COPY.editor.unsaved)).toBeInTheDocument();
  });

  it("records the save as AI-assisted with a default note", async () => {
    aiOn();
    templateService.createLetterTemplate.mockResolvedValue({ ...DRAFT.template, _id: "t9", version: 1 });
    setup();
    await screen.findByDisplayValue("Diwali Bonus Letter");
    await waitFor(() => expect(screen.getByTestId("editor-ai")).toHaveTextContent("ai-on"));
    userEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.create }));
    await waitFor(() =>
      expect(templateService.createLetterTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Diwali Bonus Letter", aiAssisted: true, note: AI.saveNote })
      )
    );
  });

  it("Check tab applies a suggested fix to the letter and dismisses others", async () => {
    aiOn();
    letterAi.reviewTemplateWithAi.mockResolvedValue({
      suggestions: [
        { type: "hardcoded_value", message: "Use the company name detail.", find: "Acme Pvt Ltd", replace: "{{companyName}}" },
        { type: "missing_content", message: "Mention the payout date.", find: "", replace: "" },
      ],
    });
    setup();
    await screen.findByDisplayValue("Diwali Bonus Letter");
    userEvent.click(await screen.findByRole("tab", { name: AI.checkTab }));
    userEvent.click(screen.getByRole("button", { name: AI.checkRun }));
    expect(await screen.findByText("Use the company name detail.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: AI.applySuggestion })).toHaveLength(1);

    userEvent.click(screen.getByRole("button", { name: AI.applySuggestion }));
    expect(screen.getByLabelText("Letter content")).toHaveValue("<p>Dear {{employeeName}}, {{companyName}} awards you {{bonusAmount}}.</p>");
    userEvent.click(screen.getByRole("button", { name: AI.dismissSuggestion }));
    expect(screen.queryByText("Mention the payout date.")).not.toBeInTheDocument();
  });

  it("has no AI editing or Check tab when AI is off", async () => {
    setup({ initialDraft: null });
    await waitFor(() => expect(aiService.getAiStatus).toHaveBeenCalled());
    expect(screen.queryByRole("tab", { name: AI.checkTab })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("editor-ai")).toHaveTextContent("ai-off"));
  });
});

describe("Issue panel AI help", () => {
  const WARNING = {
    _id: "t1",
    key: "warning",
    name: "Warning Letter",
    category: "Disciplinary",
    recipientType: "employee",
    inputFields: [
      { key: "incidentDate", label: "Incident date", kind: "date", required: true },
      { key: "reason", label: "Reason", kind: "long_text", required: true, multiline: true },
    ],
  };
  const PREVIEW = { html: "<html><body>Letter</body></html>", bodyHtml: "<p>Dear Asha</p>", missing: [] };

  beforeEach(() => {
    templateService.getLetterTemplates.mockResolvedValue([WARNING]);
    letterService.getLetterRecipients.mockResolvedValue([{ _id: "e1", name: "Asha Rao", code: "EMP001", email: "asha@example.com" }]);
    letterService.previewLetter.mockResolvedValue(PREVIEW);
  });

  const openWithRecipient = async () => {
    renderWithProviders(<IssueLetterPanel open templateId="t1" onClose={jest.fn()} onViewIssued={jest.fn()} />);
    userEvent.click(await screen.findByRole("radio", { name: /Asha Rao/ }));
    await screen.findByTitle("Letter preview");
  };

  it("fills answers from a pasted note, marks them, and records AI help when issuing", async () => {
    aiOn(true);
    letterAi.fillAnswersWithAi.mockResolvedValue({ answers: { incidentDate: "2026-10-05", reason: "Late three times" } });
    letterService.issueLetter.mockResolvedValue({ letter: { _id: "L1", letterNumber: "WRN/1", fileName: "w.pdf" }, emailed: true });
    await openWithRecipient();

    userEvent.click(screen.getByText(AI.pasteTitle));
    userEvent.type(screen.getByLabelText(AI.pasteLabel), "Late on 5 Oct, three times");
    userEvent.click(screen.getByRole("button", { name: AI.pasteFill }));

    await waitFor(() => expect(screen.getByLabelText(/Incident date/)).toHaveValue("2026-10-05"));
    expect(letterAi.fillAnswersWithAi).toHaveBeenCalledWith({ templateId: "t1", text: "Late on 5 Oct, three times" });
    expect(screen.getAllByText(AI.filledByAi)).toHaveLength(2);

    userEvent.type(screen.getByLabelText(/^Reason/), ".");
    expect(screen.getAllByText(AI.filledByAi)).toHaveLength(1);

    userEvent.click(screen.getByRole("button", { name: "Issue letter" }));
    await waitFor(() => expect(letterService.issueLetter).toHaveBeenCalledWith(expect.objectContaining({ aiAssisted: true })));
  });

  it("hides Paste details without the personal-data switch", async () => {
    aiOn(false);
    await openWithRecipient();
    expect(screen.queryByText(AI.pasteTitle)).not.toBeInTheDocument();
  });
});
