import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LettersHome from "../LettersHome";
import renderWithProviders from "../testing/renderWithProviders";
import * as templateService from "../../../services/letterTemplateService";
import * as letterService from "../../../services/letterService";

jest.mock("../../../services/letterTemplateService");
jest.mock("../../../services/letterService");

const TEMPLATES = [
  { _id: "t-offer", key: "offer", name: "Offer Letter", category: "Onboarding", recipientType: "candidate", status: "active" },
  { _id: "t-exp", key: "experience", name: "Experience Certificate", category: "Exit", recipientType: "employee", status: "active" },
  { _id: "t-warn", key: "warning", name: "Warning Letter", category: "Disciplinary", recipientType: "employee", status: "active" },
  { _id: "t-custom", key: "custom-bank", name: "Bank Letter", category: "Custom", description: "Letter for the bank", recipientType: "employee", status: "active" },
];

const RECENT = [
  { _id: "l1", templateName: "Warning Letter", recipientName: "Asha Rao", issuedAt: "2026-09-10T10:00:00Z", status: "issued", letterNumber: "W/1" },
  { _id: "l2", templateName: "Offer Letter", recipientName: "Ravi Kumar", issuedAt: "2026-09-09T10:00:00Z", status: "void", letterNumber: "O/1" },
];

const setup = (props = {}) => {
  const handlers = { onIssue: jest.fn(), onManage: jest.fn(), onViewIssued: jest.fn() };
  renderWithProviders(<LettersHome canIssue canEdit {...handlers} {...props} />);
  return handlers;
};

beforeEach(() => {
  jest.resetAllMocks();
  templateService.getLetterTemplates.mockResolvedValue(TEMPLATES);
  letterService.getIssuedLetters.mockResolvedValue({ letters: RECENT, pagination: null });
});

it("shows the title, description and a labelled search box", async () => {
  setup();
  expect(screen.getByRole("heading", { name: "Issue a letter", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("Choose the letter you want to issue. Details are filled in from the person's record.")).toBeInTheDocument();
  const search = screen.getByRole("searchbox", { name: "Search letters" });
  expect(search).toHaveAttribute("placeholder", "Search letters, e.g. experience");
  await screen.findByRole("button", { name: /Offer Letter/ });
  expect(templateService.getLetterTemplates).toHaveBeenCalledWith({ status: "active" });
});

it("groups active templates by purpose with descriptions", async () => {
  setup();
  await screen.findByRole("button", { name: /Offer Letter/ });
  const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(headings).toEqual(["Joining", "Disciplinary", "Leaving", "Your templates"]);

  const joining = screen.getByRole("region", { name: "Joining" });
  expect(within(joining).getByRole("button", { name: /Offer Letter/ })).toHaveTextContent("Offer a job to a selected candidate");
  const custom = screen.getByRole("region", { name: "Your templates" });
  expect(within(custom).getByRole("button", { name: /Bank Letter/ })).toHaveTextContent("Letter for the bank");
});

it("opens the issue screen when a card is clicked or activated by keyboard", async () => {
  const { onIssue } = setup();
  await userEvent.click(await screen.findByRole("button", { name: /Warning Letter/ }));
  expect(onIssue).toHaveBeenCalledWith("t-warn");

  const card = screen.getByRole("button", { name: /Experience Certificate/ });
  card.focus();
  await userEvent.keyboard("{Enter}");
  expect(onIssue).toHaveBeenLastCalledWith("t-exp");
});

it("filters cards by search and shows an empty state with a way back", async () => {
  setup();
  await screen.findByRole("button", { name: /Offer Letter/ });
  await userEvent.type(screen.getByRole("searchbox", { name: "Search letters" }), "experience");
  expect(screen.getByRole("button", { name: /Experience Certificate/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Offer Letter/ })).not.toBeInTheDocument();

  await userEvent.clear(screen.getByRole("searchbox", { name: "Search letters" }));
  await userEvent.type(screen.getByRole("searchbox", { name: "Search letters" }), "zzz");
  expect(screen.getByText("No letters match “zzz”.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByRole("button", { name: /Offer Letter/ })).toBeInTheDocument();
});

it("shows only the allowed letters to consultancy-only issuers", async () => {
  templateService.getLetterTemplates.mockResolvedValue([
    ...TEMPLATES,
    { _id: "t-cons", key: "consultancy-agreement", name: "Consultancy Agreement", category: "Consultancy", recipientType: "employee", status: "active", recipientRule: "consultancy" },
    { _id: "t-copy", key: "agreement-copy", name: "Contractor Agreement", category: "Consultancy", recipientType: "employee", status: "active", recipientRule: "consultancy" },
  ]);
  setup({ canEdit: false, recipientRule: "consultancy" });
  expect(await screen.findByRole("button", { name: /Consultancy Agreement/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Contractor Agreement/ })).toBeInTheDocument();
  ["Offer Letter", "Experience Certificate", "Warning Letter", "Bank Letter"].forEach((name) =>
    expect(screen.queryByRole("button", { name: new RegExp(name) })).not.toBeInTheDocument()
  );
});

it("moves focus to its heading only when asked", async () => {
  const { unmount } = renderWithProviders(<LettersHome focusHeading onIssue={jest.fn()} onManage={jest.fn()} onViewIssued={jest.fn()} />);
  expect(screen.getByRole("heading", { name: "Issue a letter", level: 2 })).toHaveFocus();
  unmount();
  setup();
  expect(screen.getByRole("heading", { name: "Issue a letter", level: 2 })).not.toHaveFocus();
});

it("shows Manage templates only to editors", async () => {
  const { onManage } = setup();
  await userEvent.click(screen.getByRole("button", { name: "Manage templates" }));
  expect(onManage).toHaveBeenCalled();
});

it("hides Manage templates from issue-only users", async () => {
  setup({ canEdit: false });
  await screen.findByRole("button", { name: /Offer Letter/ });
  expect(screen.queryByRole("button", { name: "Manage templates" })).not.toBeInTheDocument();
});

it("lists the five most recent letters with person, letter, date and status", async () => {
  const { onViewIssued } = setup();
  const recent = screen.getByRole("region", { name: "Recently issued" });
  expect(await within(recent).findByText("Asha Rao")).toBeInTheDocument();
  expect(letterService.getIssuedLetters).toHaveBeenCalledWith({ limit: 5, page: 1 });
  const items = within(recent).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Asha Rao");
  expect(items[0]).toHaveTextContent("Warning Letter");
  expect(items[0]).toHaveTextContent("10 Sept 2026");
  expect(items[0]).toHaveTextContent("Issued");
  expect(items[1]).toHaveTextContent("Void");

  await userEvent.click(within(recent).getByRole("button", { name: "View all issued letters" }));
  expect(onViewIssued).toHaveBeenCalled();
});

it("explains when nothing has been issued yet", async () => {
  letterService.getIssuedLetters.mockResolvedValue({ letters: [], pagination: null });
  setup();
  expect(await screen.findByText("No letters issued yet. Letters you issue will appear here.")).toBeInTheDocument();
});

it("explains when no letters are available", async () => {
  templateService.getLetterTemplates.mockResolvedValue([]);
  setup();
  expect(await screen.findByText("No letters are available to issue here.")).toBeInTheDocument();
});

it("offers a retry when templates fail to load", async () => {
  templateService.getLetterTemplates.mockRejectedValueOnce(new Error("network")).mockResolvedValue(TEMPLATES);
  setup();
  expect(await screen.findByText("Could not load letters. Try again in a moment.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: /Offer Letter/ })).toBeInTheDocument();
});

it("says so when recently issued letters fail to load, without hiding the cards", async () => {
  letterService.getIssuedLetters.mockRejectedValue(new Error("network"));
  setup();
  expect(await screen.findByText("Could not load recently issued letters.")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /Offer Letter/ })).toBeInTheDocument();
});

it("leaves out recently issued letters for people who cannot view issued letters", async () => {
  setup({ onViewIssued: undefined });
  await screen.findByRole("button", { name: /Offer Letter/ });
  expect(screen.queryByRole("heading", { name: "Recently issued" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "View all issued letters" })).not.toBeInTheDocument();
  expect(letterService.getIssuedLetters).not.toHaveBeenCalled();
});
