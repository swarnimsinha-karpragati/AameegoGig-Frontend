import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ManageTemplates from "../ManageTemplates";
import renderWithProviders from "../testing/renderWithProviders";
import * as service from "../../../services/letterTemplateService";

jest.mock("../../../services/letterTemplateService");

const TEMPLATES = [
  { _id: "t1", key: "warning", name: "Warning Letter", category: "Disciplinary", recipientType: "employee", isSystem: true, isCustomised: true, status: "active", version: 4, updatedAt: "2026-09-01", updatedByName: "Meera" },
  { _id: "t2", key: "offer", name: "Offer Letter", category: "Onboarding", recipientType: "candidate", isSystem: true, isCustomised: false, status: "active", version: 1, updatedAt: "2026-09-02" },
  { _id: "t3", key: "custom-noc", name: "Bank NOC", category: "Custom", recipientType: "employee", isSystem: false, status: "active", version: 2, updatedAt: "2026-09-03" },
];

const setup = (props = {}) => {
  const handlers = { onOpen: jest.fn(), onCreate: jest.fn(), onBack: jest.fn() };
  renderWithProviders(<ManageTemplates {...handlers} {...props} />);
  return handlers;
};

const openActions = async (name) => userEvent.click(screen.getByRole("button", { name: `Actions for ${name}` }));

beforeEach(() => {
  jest.resetAllMocks();
  service.getLetterTemplates.mockResolvedValue(TEMPLATES);
});

it("shows a page header with a way back to letters and a create button", async () => {
  const { onBack, onCreate } = setup();
  expect(screen.getByRole("heading", { name: "Manage templates", level: 2 })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Back to letters" }));
  expect(onBack).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Create template" }));
  expect(onCreate).toHaveBeenCalled();
});

it("moves focus to its heading only when asked", () => {
  const { unmount } = renderWithProviders(<ManageTemplates focusHeading onOpen={jest.fn()} onCreate={jest.fn()} onBack={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Manage templates" })).toHaveFocus();
  unmount();
  setup();
  expect(screen.getByRole("heading", { name: "Manage templates" })).not.toHaveFocus();
});

it("lists templates with plain-language columns", async () => {
  setup();
  await screen.findByText("Warning Letter");
  const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
  expect(headers).toEqual(expect.arrayContaining(["Name", "Group", "Who it's for", "Last updated"]));
  expect(headers).not.toEqual(expect.arrayContaining(["Version", "Source", "Issued to", "Category"]));

  const warningRow = screen.getByRole("row", { name: /Warning Letter/ });
  expect(within(warningRow).getByText("Disciplinary")).toBeInTheDocument();
  expect(within(warningRow).getByText("Employee")).toBeInTheDocument();
  expect(within(warningRow).getByText("Customised")).toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /Offer Letter/ })).getByText("Offer candidate")).toBeInTheDocument();
  expect(service.getLetterTemplates).toHaveBeenCalledWith({ status: "active" });
});

it("shows and searches the same Group labels as the home grid", async () => {
  service.getLetterTemplates.mockResolvedValue([
    ...TEMPLATES,
    { _id: "t4", key: "exit-chat", name: "Exit chat", category: "Exit", recipientType: "employee", isSystem: false, status: "active", version: 1 },
  ]);
  setup();
  await screen.findByText("Exit chat");
  expect(within(screen.getByRole("row", { name: /Exit chat/ })).getByText("Leaving")).toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /Offer Letter/ })).getByText("Joining")).toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /Bank NOC/ })).getByText("Your templates")).toBeInTheDocument();
  await userEvent.type(screen.getByRole("searchbox", { name: "Search templates" }), "leaving");
  expect(screen.getByText("Exit chat")).toBeInTheDocument();
  expect(screen.queryByText("Warning Letter")).not.toBeInTheDocument();
});

it("filters by search and switches to archived templates", async () => {
  setup();
  await screen.findByText("Warning Letter");
  await userEvent.type(screen.getByRole("searchbox", { name: "Search templates" }), "noc");
  expect(screen.getByText("Bank NOC")).toBeInTheDocument();
  expect(screen.queryByText("Warning Letter")).not.toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Show"), "archived");
  await waitFor(() => expect(service.getLetterTemplates).toHaveBeenLastCalledWith({ status: "archived" }));
  expect(screen.queryByLabelText("Group")).not.toBeInTheDocument();
});

it("shows a clear-search empty state when nothing matches", async () => {
  setup();
  await screen.findByText("Warning Letter");
  await userEvent.type(screen.getByRole("searchbox", { name: "Search templates" }), "zzz");
  expect(screen.getByText("No templates match your search")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByText("Warning Letter")).toBeInTheDocument();
});

it("offers Edit, Duplicate and Archive — no issuing or reset from the list", async () => {
  const { onOpen } = setup();
  await screen.findByText("Warning Letter");
  await openActions("Warning Letter");
  const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
  expect(items).toEqual(["Edit", "Duplicate", "Archive"]);
  await userEvent.click(screen.getByRole("menuitem", { name: /Edit/ }));
  expect(onOpen).toHaveBeenCalledWith("t1");
});

it("offers Restore for archived templates", async () => {
  service.getLetterTemplates.mockResolvedValue([{ ...TEMPLATES[2], status: "archived" }]);
  service.archiveLetterTemplate.mockResolvedValue({});
  setup();
  await screen.findByText("Bank NOC");
  await openActions("Bank NOC");
  expect(screen.getAllByRole("menuitem").map((el) => el.textContent)).toEqual(["View", "Duplicate", "Restore"]);
  await userEvent.click(screen.getByRole("menuitem", { name: /Restore/ }));
  await waitFor(() => expect(service.archiveLetterTemplate).toHaveBeenCalledWith("t3", false));
  expect(await screen.findByText("Template restored.")).toBeInTheDocument();
});

it("opens a template when its row is clicked", async () => {
  const { onOpen } = setup();
  await userEvent.click(await screen.findByText("Offer Letter"));
  expect(onOpen).toHaveBeenCalledWith("t2");
});

it("validates the duplicate name and opens the copy", async () => {
  service.duplicateLetterTemplate.mockResolvedValue({ _id: "t9" });
  const { onOpen } = setup();
  await screen.findByText("Bank NOC");
  await openActions("Bank NOC");
  await userEvent.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
  const nameInput = screen.getByLabelText(/New template name/);
  expect(nameInput).toHaveValue("Bank NOC (copy)");
  await userEvent.clear(nameInput);
  await userEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  expect(await screen.findByText(/Template name is required/i)).toBeInTheDocument();
  expect(service.duplicateLetterTemplate).not.toHaveBeenCalled();

  await userEvent.type(nameInput, "Bank NOC v2");
  await userEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  await waitFor(() => expect(service.duplicateLetterTemplate).toHaveBeenCalledWith("t3", "Bank NOC v2"));
  expect(onOpen).toHaveBeenCalledWith("t9");
});

it("archives after a plain-language confirmation and surfaces API errors", async () => {
  service.archiveLetterTemplate.mockRejectedValue({ response: { status: 400, data: { message: "Template is in use" } } });
  setup();
  await screen.findByText("Bank NOC");
  await openActions("Bank NOC");
  await userEvent.click(screen.getByRole("menuitem", { name: /Archive/ }));
  expect(screen.getByText(/no longer offered when issuing letters/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Archive" }));
  await waitFor(() => expect(service.archiveLetterTemplate).toHaveBeenCalledWith("t3", true));
  expect(await screen.findByText("Template is in use")).toBeInTheDocument();
});

it("shows a retry state when loading fails", async () => {
  service.getLetterTemplates.mockRejectedValueOnce(new Error("network")).mockResolvedValue(TEMPLATES);
  setup();
  expect(await screen.findByText("Templates could not be loaded")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Warning Letter")).toBeInTheDocument();
});
