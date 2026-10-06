import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TemplateEditor from "../TemplateEditor";
import { ToastProvider } from "../../Toast";
import renderWithProviders from "../testing/renderWithProviders";
import * as service from "../../../services/letterTemplateService";
import { LETTERS_COPY, format } from "../../../utils/lettersCopy";
import { requestNavigation } from "../../../utils/navigationGuard";

const E = LETTERS_COPY.editor;

jest.mock("../../../services/letterTemplateService");
const mockEditorGroupCounts = [];
jest.mock("../RichTextEditor", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  return forwardRef(function MockEditor(
    { value, onChange, label = "Letter content", error, disabled, detailGroups = [], questionFields = [] },
    ref
  ) {
    useImperativeHandle(ref, () => ({ insertPlaceholder: (key) => onChange(`${value}{{${key}}}`), focus: () => {} }));
    mockEditorGroupCounts.push(detailGroups.length);
    return (
      <>
        <textarea aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        <output data-testid="editor-details">
          {JSON.stringify({ groups: detailGroups.map((g) => g.group), questions: questionFields.map((f) => f.label) })}
        </output>
        {error && <p role="alert">{error}</p>}
      </>
    );
  });
});

const PLACEHOLDERS = [
  { group: "Employee", placeholders: [{ key: "employeeName", label: "Employee name", type: "text", sample: "Asha" }] },
  { group: "Company", placeholders: [{ key: "companyName", label: "Company name", type: "text", sample: "Acme" }] },
];

const TEMPLATE = {
  _id: "t1",
  key: "warning",
  name: "Warning Letter",
  category: "Disciplinary",
  recipientType: "employee",
  bodyHtml: "<p>Dear {{employeeName}}</p>",
  layout: {},
  inputFields: [{ key: "incidentDate", label: "Incident date", kind: "date", required: true }],
  isSystem: true,
  isCustomised: true,
  status: "active",
  version: 3,
};

const VERSIONS = [
  { version: 3, createdAt: "2026-10-01T10:00:00Z", editedByName: "Priya", note: "Softer tone" },
  { version: 2, createdAt: "2026-09-01T10:00:00Z", editedByName: "Ravi", note: "First edit" },
];

const setup = (props = {}) => {
  const handlers = { onExit: jest.fn(), onSaved: jest.fn(), onIssue: jest.fn() };
  const { queryClient } = renderWithProviders(<TemplateEditor templateId="t1" canEdit canIssue {...handlers} {...props} />);
  return { ...handlers, queryClient };
};

const loaded = async () => {
  await screen.findByDisplayValue("Warning Letter");
  await waitFor(() => expect(screen.getByTestId("editor-details")).toHaveTextContent("Employee"));
};

const body = () => screen.getByLabelText("Letter content");
const tab = (name) => screen.getByRole("tab", { name });
const saveDialog = () => screen.getByRole("dialog", { name: E.saveTitle });

beforeEach(() => {
  jest.resetAllMocks();
  mockEditorGroupCounts.length = 0;
  service.getLetterTemplate.mockResolvedValue(TEMPLATE);
  service.getLetterPlaceholders.mockResolvedValue(PLACEHOLDERS);
  service.getLetterTemplateVersions.mockResolvedValue(VERSIONS);
  service.previewLetterTemplate.mockResolvedValue({ html: "<p>Dear Asha</p>", missing: [] });
});

it("loads the template and enables Save only after a change", async () => {
  setup();
  await loaded();
  expect(screen.getByLabelText(E.nameLabel)).toHaveValue("Warning Letter");
  expect(screen.getByText(LETTERS_COPY.manage.badgeCustomised)).toBeInTheDocument();
  const save = screen.getByRole("button", { name: E.save });
  expect(save).toBeDisabled();
  await userEvent.type(body(), " ok");
  expect(save).toBeEnabled();
  expect(screen.getByText(E.unsaved)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: E.tryIssuing })).toBeEnabled();
});

it("tries issuing the saved template", async () => {
  const { onIssue } = setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: E.tryIssuing }));
  expect(onIssue).toHaveBeenCalledWith("t1");
});

it("gives the editor the details and this letter's questions", async () => {
  setup();
  await loaded();
  expect(JSON.parse(screen.getByTestId("editor-details").textContent)).toEqual({
    groups: ["Employee", "Company"],
    questions: ["Incident date"],
  });
  const side = screen.getByRole("complementary", { name: E.sidePanelLabel });
  expect(within(side).queryByText(/\{\{|incidentDate/)).not.toBeInTheDocument();
});

it("switches side panel tabs with the keyboard", async () => {
  setup();
  await loaded();
  expect(screen.getByRole("tablist", { name: E.sidePanelLabel })).toBeInTheDocument();
  expect(tab(E.questionsTab)).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel", { name: E.questionsTab })).toBeInTheDocument();
  tab(E.questionsTab).focus();
  await userEvent.keyboard("{arrowright}");
  expect(tab(E.letterhead)).toHaveFocus();
  expect(screen.getByRole("tabpanel", { name: E.letterhead })).toBeInTheDocument();
  await userEvent.keyboard("{end}");
  expect(tab(E.about)).toHaveAttribute("aria-selected", "true");
  await userEvent.keyboard("{home}");
  expect(tab(E.questionsTab)).toHaveFocus();
});

it("inserts a question into the letter", async () => {
  setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: "Insert “Incident date” into letter" }));
  await waitFor(() => expect(body()).toHaveValue("<p>Dear {{employeeName}}</p>{{incidentDate}}"));
});

it("toggles letterhead items with hints and links to Settings", async () => {
  setup();
  await loaded();
  await userEvent.click(tab(E.letterhead));
  const switches = screen.getAllByRole("switch");
  expect(switches).toHaveLength(5);
  const stamp = screen.getByRole("switch", { name: E.letterheadOptions.showStamp.label });
  expect(stamp).toHaveAccessibleDescription(E.letterheadOptions.showStamp.hint);
  expect(stamp).toHaveAttribute("aria-checked", "false");
  await userEvent.click(stamp);
  expect(stamp).toHaveAttribute("aria-checked", "true");
  expect(screen.getByText(E.unsaved)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: E.openSettings })).toHaveAttribute("href", expect.stringContaining("/settings?tab=organization"));
});

it("blocks saving unknown details and shows the error on the canvas", async () => {
  setup();
  await loaded();
  await userEvent.clear(body());
  await userEvent.type(body(), "<p>Hi {{{{managerName}}</p>");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  expect(await screen.findByText("Some details in this letter no longer exist (Manager name) — remove the ones shown in red.")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(service.updateLetterTemplate).not.toHaveBeenCalled();
});

it("saves through the dialog with the note and the version being edited", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Dear {{employeeName}}</p> ok", version: 4 });
  setup();
  await loaded();
  await userEvent.type(body(), " ok");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.type(within(saveDialog()).getByLabelText(E.saveNote), "Softer tone");
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() =>
    expect(service.updateLetterTemplate).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ note: "Softer tone", version: 3, bodyHtml: "<p>Dear {{employeeName}}</p> ok" })
    )
  );
  expect(await screen.findByText("Saved as version 4.")).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: E.saveTitle })).not.toBeInTheDocument();
});

it("shows the conflict message and reloads the latest version", async () => {
  service.updateLetterTemplate.mockRejectedValue({ response: { status: 409, data: { message: "Version conflict", code: "VERSION_CONFLICT" } } });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  expect(await screen.findByText(E.conflict)).toBeInTheDocument();
  expect(screen.queryByRole("dialog", { name: E.saveTitle })).not.toBeInTheDocument();
  service.getLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Newer</p>", version: 4 });
  await userEvent.click(screen.getByRole("button", { name: E.reload }));
  const confirm = screen.getByRole("dialog", { name: E.reloadConfirmTitle });
  await userEvent.click(within(confirm).getByRole("button", { name: E.keepEditing }));
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p> x");
  await userEvent.click(screen.getByRole("button", { name: E.reload }));
  await userEvent.click(within(screen.getByRole("dialog", { name: E.reloadConfirmTitle })).getByRole("button", { name: E.reload }));
  await waitFor(() => expect(body()).toHaveValue("<p>Newer</p>"));
  expect(screen.queryByText(E.conflict)).not.toBeInTheDocument();
});

it("shows a name clash as an error, not as a version conflict", async () => {
  const clash = "Another template with this name was saved at the same moment. Please try again.";
  service.updateLetterTemplate.mockRejectedValue({ response: { status: 409, data: { message: clash } } });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  expect(await screen.findByText(clash)).toBeInTheDocument();
  expect(screen.queryByText(E.conflict)).not.toBeInTheDocument();
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p> x");
});

it("says so when reloading after a conflict fails", async () => {
  service.updateLetterTemplate.mockRejectedValue({ response: { status: 409, data: { message: "Version conflict", code: "VERSION_CONFLICT" } } });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await screen.findByText(E.conflict);
  service.getLetterTemplate.mockRejectedValue({ response: { status: 500, data: { message: "Server down" } } });
  await userEvent.click(screen.getByRole("button", { name: E.reload }));
  await userEvent.click(within(screen.getByRole("dialog", { name: E.reloadConfirmTitle })).getByRole("button", { name: E.reload }));
  expect(await screen.findByText(E.reloadError)).toBeInTheDocument();
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p> x");
  expect(screen.getByText(E.conflict)).toBeInTheDocument();
});

it("sends the version the draft was loaded from even after a background refetch", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, version: 5 });
  const { queryClient } = setup();
  await loaded();
  await userEvent.type(body(), " ok");
  service.getLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Theirs</p>", version: 4 });
  await queryClient.invalidateQueries();
  await waitFor(() => expect(service.getLetterTemplate).toHaveBeenCalledTimes(2));
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p> ok");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(service.updateLetterTemplate).toHaveBeenCalledWith("t1", expect.objectContaining({ version: 3 })));
});

it("keeps the saved content after Save even if a stale copy is refetched", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Saved</p>", version: 4 });
  setup();
  await loaded();
  await userEvent.clear(body());
  await userEvent.type(body(), "<p>Saved</p>");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(service.getLetterTemplate).toHaveBeenCalledTimes(2));
  expect(body()).toHaveValue("<p>Saved</p>");
  expect(screen.queryByText(E.unsaved)).not.toBeInTheDocument();
});

it("picks up a newer version from the server when there are no local edits", async () => {
  const { queryClient } = setup();
  await loaded();
  service.getLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Theirs</p>", version: 4 });
  await queryClient.invalidateQueries();
  await waitFor(() => expect(body()).toHaveValue("<p>Theirs</p>"));
});

it("moves to the Questions tab and the errored question on a server error", async () => {
  service.updateLetterTemplate.mockRejectedValue({
    response: { status: 400, data: { message: 'Question "Incident date" contains invalid characters', field: "inputFields", index: 0 } },
  });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(tab(E.about));
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(tab(E.questionsTab)).toHaveAttribute("aria-selected", "true"));
  expect(screen.getByText('Question "Incident date" contains invalid characters')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText(/Question 1/)).toHaveFocus());
});

it("keeps the dialog open for a server note error", async () => {
  service.updateLetterTemplate.mockRejectedValue({
    response: { status: 400, data: { message: "Version note contains invalid characters", field: "note" } },
  });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  expect(await within(saveDialog()).findByText("Version note contains invalid characters")).toBeInTheDocument();
});

it("focuses the template name when the server rejects it", async () => {
  service.updateLetterTemplate.mockRejectedValue({ response: { status: 400, data: { message: "Template name is too long", field: "name" } } });
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(screen.getByLabelText(E.nameLabel)).toHaveFocus());
  expect(screen.getByText("Template name is too long")).toBeInTheDocument();
});

it("shows group, fixed recipient and history in About, and restores a version after confirming", async () => {
  service.restoreLetterTemplateVersion.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Old</p>", version: 4 });
  setup();
  await loaded();
  await userEvent.click(tab(E.about));
  const group = screen.getByLabelText(new RegExp(E.group));
  expect(group).toHaveValue("Disciplinary");
  expect(within(group).getAllByRole("option").map((o) => o.textContent)).toEqual(
    expect.arrayContaining(["Joining", "During employment", "Disciplinary", "Leaving", "Consultants", "Your templates"])
  );
  expect(within(group).queryByRole("option", { name: "Exit" })).not.toBeInTheDocument();
  const whoFor = screen.getByLabelText(new RegExp(E.whoFor.replace("?", "\\?")));
  expect(whoFor).toBeDisabled();
  expect(screen.getByText(E.whoForFixed)).toBeInTheDocument();
  expect(await screen.findByText("Softer tone")).toBeInTheDocument();
  expect(screen.getByText(/Ravi/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Restore version 2" }));
  const confirm = screen.getByRole("dialog", { name: "Restore version 2?" });
  await userEvent.click(within(confirm).getByRole("button", { name: E.restore }));
  await waitFor(() => expect(service.restoreLetterTemplateVersion).toHaveBeenCalledWith("t1", 2));
  await waitFor(() => expect(body()).toHaveValue("<p>Old</p>"));
});

it("resets a customised built-in template after confirming", async () => {
  service.resetLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Original</p>", isCustomised: false, version: 4 });
  setup();
  await loaded();
  await userEvent.click(tab(E.about));
  await userEvent.click(screen.getByRole("button", { name: E.resetToOriginal }));
  const confirm = screen.getByRole("dialog", { name: E.resetTitle });
  await userEvent.click(within(confirm).getByRole("button", { name: E.reset }));
  await waitFor(() => expect(service.resetLetterTemplate).toHaveBeenCalledWith("t1"));
  await waitFor(() => expect(body()).toHaveValue("<p>Original</p>"));
});

it("warns that unsaved changes are lost when resetting a changed draft", async () => {
  setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(tab(E.about));
  await userEvent.click(screen.getByRole("button", { name: E.resetToOriginal }));
  expect(within(screen.getByRole("dialog", { name: E.resetTitle })).getByText(E.resetMessageUnsaved)).toBeInTheDocument();
});

it("shows a sample-data preview and goes back to editing", async () => {
  setup();
  await loaded();
  const toggle = screen.getByRole("button", { name: E.previewSample });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByTitle(E.previewTitle)).toBeInTheDocument();
  expect(body()).not.toBeVisible();
  await userEvent.click(toggle);
  expect(body()).toBeVisible();
  expect(screen.queryByTitle(E.previewTitle)).not.toBeInTheDocument();
});

it("asks before leaving with unsaved changes", async () => {
  const { onExit } = setup();
  await loaded();
  await userEvent.type(body(), " x");
  await userEvent.click(screen.getByRole("button", { name: E.back }));
  expect(screen.getByText(E.discardTitle)).toBeInTheDocument();
  expect(onExit).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: E.discard }));
  expect(onExit).toHaveBeenCalled();
});

it("leaves immediately when nothing changed", async () => {
  const { onExit } = setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: E.back }));
  expect(onExit).toHaveBeenCalled();
});

it("validates a new template and creates it without a note", async () => {
  service.createLetterTemplate.mockResolvedValue({ ...TEMPLATE, _id: "t7", isSystem: false, name: "Bank NOC", version: 1 });
  const { onSaved } = setup({ templateId: "new" });
  await waitFor(() => expect(screen.getByTestId("editor-details")).toHaveTextContent("Employee"));
  const tryIssuing = screen.getByRole("button", { name: E.tryIssuing });
  expect(tryIssuing).toBeDisabled();
  expect(tryIssuing).toHaveAccessibleDescription(E.tryIssuingNew);
  expect(screen.getByText(E.tryIssuingNew)).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: E.create }));
  expect(await screen.findByText(/Template name is required/i)).toBeInTheDocument();
  expect(screen.getByText("Letter content is required")).toBeInTheDocument();
  expect(screen.getByLabelText(E.nameLabel)).toHaveFocus();

  await userEvent.type(screen.getByLabelText(E.nameLabel), "Bank NOC");
  await userEvent.type(body(), "<p>To whom it may concern</p>");
  await userEvent.click(screen.getByRole("button", { name: E.create }));
  expect(screen.queryByRole("dialog", { name: E.saveTitle })).not.toBeInTheDocument();
  await waitFor(() => expect(service.createLetterTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: "Bank NOC", category: "Custom" })));
  expect(service.createLetterTemplate.mock.calls[0][0]).not.toHaveProperty("version");
  expect(onSaved).toHaveBeenCalledWith("t7");
  expect(screen.getByLabelText(E.nameLabel)).toHaveValue("Bank NOC");
});

it("is read-only without template edit access", async () => {
  setup({ canEdit: false });
  await loaded();
  expect(screen.getByLabelText(E.nameLabel)).toBeDisabled();
  expect(body()).toBeDisabled();
  expect(screen.queryByRole("button", { name: E.save })).not.toBeInTheDocument();
  await userEvent.click(tab(E.about));
  expect(screen.queryByRole("button", { name: E.resetToOriginal })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Restore version/ })).not.toBeInTheDocument();
});

it("shows a not-found state for a missing template", async () => {
  service.getLetterTemplate.mockRejectedValue({ response: { status: 404, data: { message: "Template not found" } } });
  const { onExit } = setup();
  expect(await screen.findByText("Template not found")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: E.back }));
  expect(onExit).toHaveBeenCalled();
});

it("saves a changed draft before trying to issue it", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, bodyHtml: "<p>Dear {{employeeName}}</p> ok", version: 4 });
  const { onIssue } = setup();
  await loaded();
  await userEvent.type(body(), " ok");
  await userEvent.click(screen.getByRole("button", { name: E.tryIssuing }));
  const confirm = screen.getByRole("dialog", { name: E.tryIssuingConfirmTitle });
  await userEvent.click(within(confirm).getByRole("button", { name: E.keepEditing }));
  expect(onIssue).not.toHaveBeenCalled();
  expect(service.updateLetterTemplate).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: E.tryIssuing }));
  await userEvent.click(within(screen.getByRole("dialog", { name: E.tryIssuingConfirmTitle })).getByRole("button", { name: E.saveAndTryIssuing }));
  await waitFor(() => expect(onIssue).toHaveBeenCalledWith("t1"));
  expect(service.updateLetterTemplate).toHaveBeenCalledWith("t1", expect.objectContaining({ version: 3, bodyHtml: "<p>Dear {{employeeName}}</p> ok" }));
});

it("does not try issuing when saving the changes fails", async () => {
  service.updateLetterTemplate.mockRejectedValue({ response: { status: 409, data: { message: "Version conflict", code: "VERSION_CONFLICT" } } });
  const { onIssue } = setup();
  await loaded();
  await userEvent.type(body(), " ok");
  await userEvent.click(screen.getByRole("button", { name: E.tryIssuing }));
  await userEvent.click(within(screen.getByRole("dialog", { name: E.tryIssuingConfirmTitle })).getByRole("button", { name: E.saveAndTryIssuing }));
  expect(await screen.findByText(E.conflict)).toBeInTheDocument();
  expect(onIssue).not.toHaveBeenCalled();
});

it("asks before removing a question the letter uses and removes its spots too", async () => {
  service.getLetterTemplate.mockResolvedValue({
    ...TEMPLATE,
    bodyHtml: "<p>Dear {{employeeName}}</p><p>On {{incidentDate}}</p>{{#if incidentDate}}<p>Noted</p>{{/if}}",
  });
  setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: "Remove “Incident date”" }));
  const confirm = screen.getByRole("dialog", { name: format(E.removeUsedQuestionTitle, { label: "Incident date" }) });
  expect(within(confirm).getByText(E.removeUsedQuestionMessage)).toBeInTheDocument();
  await userEvent.click(within(confirm).getByRole("button", { name: E.keepEditing }));
  expect(screen.getByLabelText(/Question 1/)).toHaveValue("Incident date");

  await userEvent.click(screen.getByRole("button", { name: "Remove “Incident date”" }));
  await userEvent.click(within(screen.getByRole("dialog", { name: /Incident date/ })).getByRole("button", { name: E.removeUsedQuestionConfirm }));
  expect(screen.queryByLabelText(/Question 1/)).not.toBeInTheDocument();
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p><p>On </p>");
});

it("removes an unused question without asking", async () => {
  setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: "Remove “Incident date”" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/Question 1/)).not.toBeInTheDocument();
});

it("keeps a new question's key once it is inserted, so renaming it leaves the letter working", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, version: 4 });
  setup();
  await loaded();
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 2/), "Reason");
  await userEvent.click(screen.getByRole("button", { name: "Insert “Reason” into letter" }));
  await waitFor(() => expect(body()).toHaveValue("<p>Dear {{employeeName}}</p>{{reason}}"));
  await userEvent.type(screen.getByLabelText(/Question 2/), " for warning");
  expect(body()).toHaveValue("<p>Dear {{employeeName}}</p>{{reason}}");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(service.updateLetterTemplate).toHaveBeenCalled());
  expect(service.updateLetterTemplate.mock.calls[0][1].inputFields[1]).toMatchObject({ key: "reason", label: "Reason for warning" });
});

it("keeps a new question's key when the letter already uses it in a condition", async () => {
  setup();
  await loaded();
  fireEvent.change(body(), { target: { value: "<p>Dear {{employeeName}}</p>{{#if level}}<p>Noted</p>{{/if}}" } });
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 2/), "Level of warning");
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, version: 4 });
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(service.updateLetterTemplate).toHaveBeenCalled());
  expect(service.updateLetterTemplate.mock.calls[0][1].inputFields[1]).toMatchObject({ key: "level", label: "Level of warning" });
});

it("keeps following the label through a built-in detail or another question's key the letter uses", async () => {
  service.updateLetterTemplate.mockResolvedValue({ ...TEMPLATE, version: 4 });
  setup();
  await loaded();
  fireEvent.change(body(), { target: { value: "<p>Dear {{employeeName}} on {{incidentDate}}</p>" } });
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 2/), "Employee name note");
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 3/), "Incident date note");
  await userEvent.click(screen.getByRole("button", { name: E.save }));
  await userEvent.click(within(saveDialog()).getByRole("button", { name: E.saveConfirm }));
  await waitFor(() => expect(service.updateLetterTemplate).toHaveBeenCalled());
  const keys = service.updateLetterTemplate.mock.calls[0][1].inputFields.map((f) => f.key);
  expect(keys).toEqual(["incidentDate", "employeeNameNote", "incidentDateNote"]);
});

it("shows the letter only once the details list has loaded, so detail names never change after they appear", async () => {
  let finish;
  service.getLetterPlaceholders.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  setup();
  await screen.findByDisplayValue("Warning Letter");
  expect(screen.queryByLabelText("Letter content")).not.toBeInTheDocument();
  expect(screen.getByText(E.loadingDetails)).toBeInTheDocument();

  finish(PLACEHOLDERS);
  expect(await screen.findByLabelText("Letter content")).toBeInTheDocument();
  expect(mockEditorGroupCounts.length).toBeGreaterThan(0);
  expect(mockEditorGroupCounts.every((count) => count === PLACEHOLDERS.length)).toBe(true);
});

it("still opens the letter when the details list cannot be loaded", async () => {
  service.getLetterPlaceholders.mockRejectedValue(new Error("offline"));
  setup();
  await screen.findByDisplayValue("Warning Letter");
  expect(await screen.findByLabelText("Letter content")).toBeInTheDocument();
});

it("retries a failing details list only once, so the letter opens quickly", async () => {
  service.getLetterPlaceholders.mockRejectedValue(new Error("offline"));
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TemplateEditor templateId="t1" canEdit canIssue onExit={jest.fn()} onSaved={jest.fn()} onIssue={jest.fn()} />
      </ToastProvider>
    </QueryClientProvider>
  );
  await screen.findByDisplayValue("Warning Letter");
  expect(await screen.findByLabelText("Letter content", {}, { timeout: 2500 })).toBeInTheDocument();
  expect(service.getLetterPlaceholders).toHaveBeenCalledTimes(2);
});

describe("leaving with unsaved changes", () => {
  it("asks before app navigation (sidebar, logout) leaves unsaved changes", async () => {
    const proceed = jest.fn();
    renderWithProviders(
      <>
        <button type="button" onClick={() => requestNavigation(proceed)}>
          Dashboard
        </button>
        <TemplateEditor templateId="t1" canEdit canIssue onExit={jest.fn()} />
      </>
    );
    await loaded();
    const sidebarLink = screen.getByRole("button", { name: "Dashboard" });
    await userEvent.click(sidebarLink);
    expect(proceed).toHaveBeenCalledTimes(1);

    await userEvent.type(body(), " x");
    await userEvent.click(sidebarLink);
    expect(screen.getByText(E.discardTitle)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: E.keepEditing }));
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(body()).toHaveValue("<p>Dear {{employeeName}}</p> x");

    await userEvent.click(sidebarLink);
    await userEvent.click(screen.getByRole("button", { name: E.discard }));
    expect(proceed).toHaveBeenCalledTimes(2);
  });

  it("blocks closing or reloading the tab only while there are unsaved changes", async () => {
    setup();
    await loaded();
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await userEvent.type(body(), " x");
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("stops guarding once the editor is closed", async () => {
    const { unmount } = renderWithProviders(<TemplateEditor templateId="t1" canEdit canIssue onExit={jest.fn()} />);
    await loaded();
    await userEvent.type(body(), " x");
    unmount();
    const proceed = jest.fn();
    expect(requestNavigation(proceed)).toBe(true);
    expect(proceed).toHaveBeenCalled();
  });
});
