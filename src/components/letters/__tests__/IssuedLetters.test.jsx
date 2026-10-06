import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssuedLetters from "../IssuedLetters";
import renderWithProviders from "../testing/renderWithProviders";
import * as letterService from "../../../services/letterService";
import * as templateService from "../../../services/letterTemplateService";

jest.mock("../../../services/letterService");
jest.mock("../../../services/letterTemplateService");

const LETTERS = [
  { _id: "L1", templateName: "Warning Letter", letterNumber: "WRN/2026/0001", recipientName: "Asha Rao", recipientType: "employee", recipientEmail: "asha@example.com", issuedAt: "2026-09-30", issuedByName: "HR Admin", status: "issued", isEdited: true },
  { _id: "L2", templateName: "Experience Letter", letterNumber: "EXP/2026/0004", recipientName: "Ravi Kumar", recipientType: "employee", recipientEmail: "", issuedAt: "2026-09-20", status: "issued" },
  { _id: "L3", templateName: "Offer Letter", letterNumber: "OFR/2026/0002", recipientName: "Neha Singh", recipientType: "candidate", recipientEmail: "neha@example.com", issuedAt: "2026-09-10", status: "void" },
];

const setup = (props = {}) =>
  renderWithProviders(
    <IssuedLetters canIssue onIssue={jest.fn()} onClearRecipientFilter={jest.fn()} {...props} />
  );

const openMenu = async (letterNumber) => {
  const { recipientName } = LETTERS.find((l) => l.letterNumber === letterNumber);
  await userEvent.click(screen.getByRole("button", { name: `Actions for ${letterNumber} · ${recipientName}` }));
  return within(screen.getByRole("menu", { name: `Actions for ${letterNumber} · ${recipientName}` })).getAllByRole("menuitem");
};

beforeEach(() => {
  jest.resetAllMocks();
  letterService.getIssuedLetters.mockResolvedValue({ letters: LETTERS, pagination: { page: 1, limit: 20, total: 3, totalPages: 1 } });
  templateService.getLetterTemplates.mockResolvedValue([]);
});

it("lists letters with status, edited and recipient details", async () => {
  setup();
  expect(await screen.findByText("WRN/2026/0001")).toBeInTheDocument();
  const row = screen.getByRole("row", { name: new RegExp("WRN/2026/0001") });
  expect(within(row).getByText("Edited")).toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: new RegExp("OFR/2026/0002") })).getByText("Void")).toBeInTheDocument();
  expect(letterService.getIssuedLetters).toHaveBeenCalledWith({ page: 1, limit: 20 });
});

it("passes the recipient filter to the API and lets the user clear it", async () => {
  const onClear = jest.fn();
  setup({ recipientFilter: { id: "c1", type: "candidate", name: "Neha Singh" }, onClearRecipientFilter: onClear });
  await screen.findByText("WRN/2026/0001");
  expect(letterService.getIssuedLetters).toHaveBeenCalledWith({ page: 1, limit: 20, candidateId: "c1" });
  await userEvent.click(screen.getByRole("button", { name: "Show all" }));
  expect(onClear).toHaveBeenCalled();
});

it("disables email when the recipient has no address and hides actions on void letters", async () => {
  setup();
  await screen.findByText("EXP/2026/0004");
  const items = await openMenu("EXP/2026/0004");
  const email = items.find((el) => /Email/.test(el.textContent));
  expect(email).toBeDisabled();
  await userEvent.keyboard("{Escape}");
  const voidItems = (await openMenu("OFR/2026/0002")).map((el) => el.textContent);
  expect(voidItems).toEqual(["View", "Download"]);
});

it("requires a reason before voiding", async () => {
  letterService.voidIssuedLetter.mockResolvedValue({ ...LETTERS[0], status: "void" });
  setup();
  await screen.findByText("WRN/2026/0001");
  await openMenu("WRN/2026/0001");
  await userEvent.click(screen.getByRole("menuitem", { name: /Void/ }));
  await userEvent.click(screen.getByRole("button", { name: "Void letter" }));
  expect(await screen.findByText(/Reason is required/i)).toBeInTheDocument();
  expect(letterService.voidIssuedLetter).not.toHaveBeenCalled();

  await userEvent.type(screen.getByLabelText(/Reason/), "<script>");
  await userEvent.click(screen.getByRole("button", { name: "Void letter" }));
  expect(letterService.voidIssuedLetter).not.toHaveBeenCalled();

  await userEvent.clear(screen.getByLabelText(/Reason/));
  await userEvent.type(screen.getByLabelText(/Reason/), "Issued to the wrong employee");
  await userEvent.click(screen.getByRole("button", { name: "Void letter" }));
  await waitFor(() => expect(letterService.voidIssuedLetter).toHaveBeenCalledWith("L1", "Issued to the wrong employee"));
});

it("emails after confirmation", async () => {
  letterService.emailIssuedLetter.mockResolvedValue(LETTERS[0]);
  setup();
  await screen.findByText("WRN/2026/0001");
  await openMenu("WRN/2026/0001");
  await userEvent.click(screen.getByRole("menuitem", { name: /Email to recipient/ }));
  await userEvent.click(screen.getByRole("button", { name: "Send email" }));
  await waitFor(() => expect(letterService.emailIssuedLetter).toHaveBeenCalledWith("L1"));
  expect(await screen.findByText("Emailed to asha@example.com.")).toBeInTheDocument();
});

it("hides issuing actions for view-only users", async () => {
  setup({ canIssue: false });
  await screen.findByText("WRN/2026/0001");
  expect(screen.queryByRole("button", { name: "Issue a letter" })).not.toBeInTheDocument();
  const items = (await openMenu("WRN/2026/0001")).map((el) => el.textContent);
  expect(items).toEqual(["View", "Download"]);
});

it("reports download failures", async () => {
  letterService.downloadIssuedLetter.mockRejectedValue({ response: { status: 404, data: { message: "File not found" } } });
  setup();
  await screen.findByText("WRN/2026/0001");
  await openMenu("WRN/2026/0001");
  await userEvent.click(screen.getByRole("menuitem", { name: /Download/ }));
  expect(await screen.findByText("File not found")).toBeInTheDocument();
});

it("issues a letter from the header", async () => {
  const onIssue = jest.fn();
  setup({ onIssue });
  await userEvent.click(screen.getByRole("button", { name: "Issue a letter" }));
  expect(onIssue).toHaveBeenCalled();
});

it("names the person filter and column in plain words, with recipient types from one place", async () => {
  setup();
  await screen.findByText("WRN/2026/0001");
  const filter = screen.getByLabelText("Who it's for");
  expect(within(filter).getAllByRole("option").map((o) => o.textContent)).toEqual(["Everyone", "Employee", "Offer candidate"]);
  expect(screen.getByRole("columnheader", { name: "Person" })).toBeInTheDocument();
  expect(screen.queryByText("Issued to")).not.toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /OFR\/2026\/0002/ })).getByText(/Offer candidate/)).toBeInTheDocument();
});

it("downloads with the letter number as the fallback file name", async () => {
  letterService.downloadIssuedLetter.mockResolvedValue();
  setup();
  await screen.findByText("WRN/2026/0001");
  await openMenu("WRN/2026/0001");
  await userEvent.click(screen.getByRole("menuitem", { name: /Download/ }));
  expect(letterService.downloadIssuedLetter).toHaveBeenCalledWith("L1", "WRN_2026_0001.pdf");
});

it("explains the empty list in plain words", async () => {
  letterService.getIssuedLetters.mockResolvedValue({ letters: [], pagination: null });
  setup();
  expect(await screen.findByText("Letters you issue appear here with their PDFs.")).toBeInTheDocument();
});

it("moves focus to its heading only when asked", () => {
  const { unmount } = setup({ focusHeading: true });
  expect(screen.getByRole("heading", { name: "Issued letters", level: 2 })).toHaveFocus();
  unmount();
  setup();
  expect(screen.getByRole("heading", { name: "Issued letters", level: 2 })).not.toHaveFocus();
});
