import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfferCandidates from "../OfferCandidates";
import renderWithProviders from "../testing/renderWithProviders";
import * as candidateService from "../../../services/offerCandidateService";
import * as departmentService from "../../../services/departmentService";

jest.mock("../../../services/offerCandidateService");
jest.mock("../../../services/departmentService");

const NEHA = { _id: "c1", name: "Neha Singh", email: "neha@example.com", designation: "Designer", annualCTC: 900000, joiningDate: "2026-11-01", status: "draft" };
const ARJUN = { _id: "c2", name: "Arjun Mehta", email: "arjun@example.com", designation: "Engineer", annualCTC: 1500000, joiningDate: "2026-11-15", status: "accepted" };
const KIRAN = { _id: "c3", name: "Kiran Das", email: "kiran@example.com", designation: "Analyst", annualCTC: 600000, joiningDate: "2026-10-01", status: "converted", employeeId: "e3", employeeCode: "EMP-3" };
const PRIYA = { _id: "c4", name: "Priya Nair", email: "priya@example.com", designation: "Writer", annualCTC: 700000, joiningDate: "2026-12-01", status: "offered" };
const RAVI = { _id: "c5", name: "Ravi Kumar", email: "ravi@example.com", designation: "Tester", annualCTC: 500000, joiningDate: "2026-12-01", status: "declined" };
const CANDIDATES = [NEHA, ARJUN, KIRAN, PRIYA, RAVI];

const setup = (props = {}) => {
  const handlers = { onSendOffer: jest.fn(), onConvert: jest.fn(), onViewLetters: jest.fn(), onViewEmployee: jest.fn() };
  renderWithProviders(<OfferCandidates canManage canIssue {...handlers} {...props} />);
  return handlers;
};

const row = (name) => screen.getByRole("row", { name: new RegExp(name) });

const openMenu = async (name) => {
  await userEvent.click(screen.getByRole("button", { name: `Actions for ${name}` }));
  return screen.getAllByRole("menuitem").map((el) => el.textContent);
};

const apiError = (code, message) => ({ response: { status: 400, data: { message, code } } });
const daysAhead = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const JOINING = daysAhead(60);
const VALID_AFTER_JOINING = daysAhead(75);
const VALID_BEFORE_JOINING = daysAhead(45);

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.setItem("user", JSON.stringify({ vendorId: "v1", role: "Admin" }));
  candidateService.getOfferCandidates.mockResolvedValue({ candidates: CANDIDATES, pagination: { page: 1, limit: 20, total: 5, totalPages: 1 } });
  candidateService.getOfferCandidate.mockImplementation(async (id) => ({ history: [], ...CANDIDATES.find((c) => c._id === id) }));
  departmentService.getDepartmentName.mockResolvedValue({ data: [{ _id: "d1", name: "Design" }] });
});

describe("rows", () => {
  it("lists candidates with formatted CTC, a plain status and a progress line with a text alternative", async () => {
    setup();
    expect(await screen.findByText("Neha Singh")).toBeInTheDocument();
    expect(screen.getByText("₹9,00,000")).toBeInTheDocument();
    expect(within(row("Kiran Das")).getByText("Joined", { selector: ".wz-badge" })).toBeInTheDocument();
    expect(within(row("Neha Singh")).getByText("Step 1 of 4: Draft")).toBeInTheDocument();
    expect(within(row("Priya Nair")).getByText("Step 2 of 4: Offered")).toBeInTheDocument();
    expect(within(row("Ravi Kumar")).getByText("Step 2 of 4: Declined")).toBeInTheDocument();
    expect(within(row("Kiran Das")).getByText("Step 4 of 4: Joined")).toBeInTheDocument();
  });

  it("draws the progress line as decoration with the stopped step marked", async () => {
    setup();
    await screen.findByText("Ravi Kumar");
    expect(within(row("Ravi Kumar")).queryByRole("list")).not.toBeInTheDocument();
    const line = within(row("Ravi Kumar")).getByRole("list", { hidden: true });
    expect(line).toHaveAttribute("aria-hidden", "true");
    const steps = within(line).getAllByRole("listitem", { hidden: true });
    expect(steps.map((s) => s.textContent)).toEqual(["Draft", "Declined", "Accepted", "Joined"]);
    expect(steps[1]).toHaveClass("is-stopped", "wz-offer-progress__step--error");
    expect(steps[0]).toHaveClass("is-done");
  });

  it("shows one labelled next-step button per status", async () => {
    setup();
    await screen.findByText("Neha Singh");
    expect(within(row("Neha Singh")).getByRole("button", { name: "Send offer letter for Neha Singh" })).toHaveTextContent("Send offer letter");
    expect(within(row("Priya Nair")).getByRole("button", { name: "Mark accepted for Priya Nair" })).toBeInTheDocument();
    expect(within(row("Arjun Mehta")).getByRole("button", { name: "Add as employee for Arjun Mehta" })).toBeInTheDocument();
    expect(within(row("Ravi Kumar")).getByRole("button", { name: "Send offer again for Ravi Kumar" })).toBeInTheDocument();
    expect(within(row("Kiran Das")).getByRole("button", { name: "View employee for Kiran Das" })).toBeInTheDocument();
  });

  it("says so when a joined candidate's employee record no longer exists", async () => {
    candidateService.getOfferCandidates.mockResolvedValue({
      candidates: [{ ...KIRAN, employeeId: null, employeeCode: undefined }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    setup();
    await screen.findByText("Kiran Das");
    expect(within(row("Kiran Das")).queryByRole("button", { name: /View employee/ })).not.toBeInTheDocument();
    expect(within(row("Kiran Das")).getByText("Employee record no longer exists")).toBeInTheDocument();
  });

  it("routes next steps to the page without opening the candidate drawer", async () => {
    const { onSendOffer, onConvert, onViewEmployee } = setup();
    await screen.findByText("Neha Singh");
    await userEvent.click(screen.getByRole("button", { name: "Send offer letter for Neha Singh" }));
    expect(onSendOffer).toHaveBeenLastCalledWith(expect.objectContaining({ _id: "c1" }));
    await userEvent.click(screen.getByRole("button", { name: "Send offer again for Ravi Kumar" }));
    expect(onSendOffer).toHaveBeenLastCalledWith(expect.objectContaining({ _id: "c5" }));
    await userEvent.click(screen.getByRole("button", { name: "Add as employee for Arjun Mehta" }));
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ _id: "c2" }));
    await userEvent.click(screen.getByRole("button", { name: "View employee for Kiran Das" }));
    expect(onViewEmployee).toHaveBeenCalledWith(expect.objectContaining({ _id: "c3", employeeCode: "EMP-3" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts the other actions for each status in the row menu", async () => {
    setup();
    await screen.findByText("Neha Singh");
    expect(await openMenu("Neha Singh")).toEqual(["Edit details", "View letters", "Delete"]);
    await userEvent.keyboard("{Escape}");
    expect(await openMenu("Priya Nair")).toEqual(["Edit details", "View letters", "Mark declined", "Mark expired"]);
    await userEvent.keyboard("{Escape}");
    expect(await openMenu("Arjun Mehta")).toEqual(["Edit details", "View letters"]);
    await userEvent.keyboard("{Escape}");
    expect(await openMenu("Kiran Das")).toEqual(["View letters"]);
  });

  it("opens the candidate's letters and the edit drawer from the menu", async () => {
    const { onViewLetters } = setup();
    await screen.findByText("Neha Singh");
    await openMenu("Neha Singh");
    await userEvent.click(screen.getByRole("menuitem", { name: "View letters" }));
    expect(onViewLetters).toHaveBeenCalledWith(expect.objectContaining({ _id: "c1" }));
    await openMenu("Neha Singh");
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit details" }));
    expect(screen.getByRole("dialog", { name: "Edit candidate" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Neha Singh")).toBeInTheDocument();
    expect(candidateService.getOfferCandidate).toHaveBeenCalledWith("c1");
  });
});

describe("status changes", () => {
  it("asks before marking accepted and calls the API with the new status", async () => {
    candidateService.setOfferCandidateStatus.mockResolvedValue({ ...PRIYA, status: "accepted" });
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    const dialog = screen.getByRole("dialog", { name: "Mark Priya Nair as accepted?" });
    expect(dialog).toHaveAccessibleDescription("Do this once Priya Nair has accepted the offer. Next, you can add them as an employee.");
    expect(candidateService.setOfferCandidateStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark accepted" }));
    await waitFor(() => expect(candidateService.setOfferCandidateStatus).toHaveBeenCalledWith("c4", "accepted", ""));
    expect(await screen.findByText("Priya Nair marked as accepted.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("saves an optional note with the status change", async () => {
    candidateService.setOfferCandidateStatus.mockResolvedValue({ ...PRIYA, status: "accepted" });
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    const dialog = screen.getByRole("dialog");
    const note = within(dialog).getByLabelText("Note (optional)");
    expect(note).toHaveAccessibleDescription("Saved in the candidate's history.");
    await userEvent.type(note, "  Accepted on the phone  ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark accepted" }));
    await waitFor(() => expect(candidateService.setOfferCandidateStatus).toHaveBeenCalledWith("c4", "accepted", "Accepted on the phone"));
  });

  it("checks the note before saving and keeps the dialog open", async () => {
    setup();
    await screen.findByText("Priya Nair");
    await openMenu("Priya Nair");
    await userEvent.click(screen.getByRole("menuitem", { name: "Mark declined" }));
    const dialog = screen.getByRole("dialog");
    const note = within(dialog).getByLabelText("Note (optional)");
    await userEvent.type(note, "<b>no</b>");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark declined" }));
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByText("Note contains invalid or unsafe characters")).toBeInTheDocument();
    expect(candidateService.setOfferCandidateStatus).not.toHaveBeenCalled();
    await userEvent.clear(note);
    expect(note).not.toHaveAttribute("aria-invalid", "true");
  });

  it("shows a server note error on the note field and keeps the dialog open", async () => {
    candidateService.setOfferCandidateStatus.mockRejectedValue({
      response: { status: 400, data: { message: "Note contains invalid or unsafe characters", field: "note", code: "VALIDATION" } },
    });
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Note (optional)"), "fine on my side");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark accepted" }));
    await waitFor(() => expect(within(dialog).getByLabelText("Note (optional)")).toHaveAttribute("aria-invalid", "true"));
    expect(within(dialog).getByText("Note contains invalid or unsafe characters")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Note contains invalid or unsafe characters")).toHaveLength(1);
  });

  it("starts each status dialog with an empty note", async () => {
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    await userEvent.type(within(screen.getByRole("dialog")).getByLabelText("Note (optional)"), "draft");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Note (optional)")).toHaveValue("");
  });

  it("does not ask for a note when deleting", async () => {
    setup();
    await screen.findByText("Neha Singh");
    await openMenu("Neha Singh");
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(within(screen.getByRole("dialog")).queryByLabelText("Note (optional)")).not.toBeInTheDocument();
  });

  it("closes and refreshes when the candidate was removed elsewhere", async () => {
    candidateService.setOfferCandidateStatus.mockRejectedValue({ response: { status: 404, data: { message: "Candidate not found", code: "CANDIDATE_NOT_FOUND" } } });
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark accepted" }));
    expect(await screen.findByText("Priya Nair was removed by someone else. The list has been refreshed.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(candidateService.getOfferCandidates).toHaveBeenCalledTimes(2));
  });

  it("does nothing when the confirmation is cancelled", async () => {
    setup();
    await screen.findByText("Priya Nair");
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(candidateService.setOfferCandidateStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["Mark declined", "Mark Priya Nair as declined?", "declined", "Priya Nair marked as declined."],
    ["Mark expired", "Mark Priya Nair's offer as expired?", "expired", "Priya Nair's offer marked as expired."],
  ])("%s from the menu asks first, then saves", async (item, title, status, toast) => {
    candidateService.setOfferCandidateStatus.mockResolvedValue({ ...PRIYA, status });
    setup();
    await screen.findByText("Priya Nair");
    await openMenu("Priya Nair");
    await userEvent.click(screen.getByRole("menuitem", { name: item }));
    const dialog = screen.getByRole("dialog", { name: title });
    await userEvent.click(within(dialog).getByRole("button", { name: item }));
    await waitFor(() => expect(candidateService.setOfferCandidateStatus).toHaveBeenCalledWith("c4", status, ""));
    expect(await screen.findByText(toast)).toBeInTheDocument();
  });

  it("explains a status that changed elsewhere in plain words and refreshes the list", async () => {
    candidateService.setOfferCandidateStatus.mockRejectedValue(apiError("INVALID_TRANSITION", "A converted candidate cannot change status"));
    setup();
    await screen.findByText("Priya Nair");
    expect(candidateService.getOfferCandidates).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Mark accepted for Priya Nair" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark accepted" }));
    expect(
      await screen.findByText("Priya Nair's status was changed by someone else. The list has been refreshed — check it and try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/converted/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(candidateService.getOfferCandidates).toHaveBeenCalledTimes(2));
  });
});

describe("delete", () => {
  it("asks before deleting and deletes", async () => {
    candidateService.deleteOfferCandidate.mockResolvedValue({});
    setup();
    await screen.findByText("Neha Singh");
    await openMenu("Neha Singh");
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Neha Singh?" });
    expect(dialog).toHaveAccessibleDescription("The candidate is removed from this list. This can't be undone.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(candidateService.deleteOfferCandidate).toHaveBeenCalledWith("c1"));
    expect(await screen.findByText("Neha Singh deleted.")).toBeInTheDocument();
  });

  it("explains in the dialog when issued letters block deletion and links to them", async () => {
    candidateService.deleteOfferCandidate.mockRejectedValue(apiError("CANDIDATE_IN_USE", "This candidate has issued letters; void them before deleting"));
    const { onViewLetters } = setup();
    await screen.findByText("Ravi Kumar");
    await openMenu("Ravi Kumar");
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Ravi Kumar?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Ravi Kumar can't be deleted because letters have been issued to them. Void those letters in Issued letters first, or keep the record."
    );
    expect(within(dialog).getByRole("button", { name: "Delete" })).toBeDisabled();
    await waitFor(() => expect(candidateService.getOfferCandidates).toHaveBeenCalledTimes(2));
    await userEvent.click(within(dialog).getByRole("button", { name: "View letters" }));
    expect(onViewLetters).toHaveBeenCalledWith(expect.objectContaining({ _id: "c5" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("permissions", () => {
  it("issue-only users can send offers but not change status, edit, delete or add", async () => {
    setup({ canManage: false, canIssue: true });
    await screen.findByText("Neha Singh");
    expect(screen.queryByRole("button", { name: "Add candidate" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send offer letter for Neha Singh" })).toBeInTheDocument();
    expect(within(row("Priya Nair")).queryByRole("button", { name: /Mark accepted/ })).not.toBeInTheDocument();
    expect(within(row("Arjun Mehta")).queryByRole("button", { name: /Add as employee/ })).not.toBeInTheDocument();
    expect(await openMenu("Priya Nair")).toEqual(["View letters"]);
  });

  it("managers who cannot issue keep manage actions but cannot send offers", async () => {
    setup({ canManage: true, canIssue: false });
    await screen.findByText("Neha Singh");
    expect(screen.queryByRole("button", { name: /Send offer/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark accepted for Priya Nair" })).toBeInTheDocument();
    expect(await openMenu("Neha Singh")).toEqual(["Edit details", "View letters", "Delete"]);
  });
});

describe("empty state", () => {
  beforeEach(() => {
    candidateService.getOfferCandidates.mockResolvedValue({ candidates: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  });

  it("tells managers what to do next and offers Add candidate", async () => {
    setup();
    expect(await screen.findByText("No candidates yet")).toBeInTheDocument();
    expect(screen.getByText("Add a candidate to send an offer letter.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add candidate" })).toHaveLength(2);
  });

  it("does not suggest adding to people who cannot", async () => {
    setup({ canManage: false });
    expect(await screen.findByText("No candidates yet")).toBeInTheDocument();
    expect(screen.getByText("Candidates added by HR appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add candidate" })).not.toBeInTheDocument();
  });
});

describe("add candidate drawer", () => {
  it("validates the form before saving", async () => {
    candidateService.createOfferCandidate.mockResolvedValue({ _id: "c9" });
    setup();
    await screen.findByText("Neha Singh");
    await userEvent.click(screen.getAllByRole("button", { name: "Add candidate" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Add candidate" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Add candidate" }));
    expect(within(dialog).getByText(/Full name is required/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Role is required/i)).toBeInTheDocument();
    expect(candidateService.createOfferCandidate).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Full name/), "Meera Iyer");
    await userEvent.type(within(dialog).getByLabelText(/^Email/), "meera@example.com");
    await userEvent.type(within(dialog).getByLabelText(/^Role/), "Product Manager");
    await userEvent.type(within(dialog).getByLabelText(/Annual CTC/), "1800000");
    await userEvent.type(within(dialog).getByLabelText(/Joining date/), JOINING);
    await userEvent.type(within(dialog).getByLabelText(/Offer valid until/), VALID_AFTER_JOINING);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add candidate" }));
    expect(within(dialog).getByText(/on or before the joining date/i)).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText(/Offer valid until/));
    await userEvent.type(within(dialog).getByLabelText(/Offer valid until/), VALID_BEFORE_JOINING);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add candidate" }));
    await waitFor(() =>
      expect(candidateService.createOfferCandidate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Meera Iyer", designation: "Product Manager", annualCTC: 1800000, departmentId: null, offerExpiryDate: VALID_BEFORE_JOINING })
      )
    );
  });

  it("shows a server field error on the right input", async () => {
    candidateService.createOfferCandidate.mockRejectedValue({
      response: { status: 409, data: { message: "A candidate with this email already exists", field: "email" } },
    });
    setup();
    await screen.findByText("Neha Singh");
    await userEvent.click(screen.getAllByRole("button", { name: "Add candidate" })[0]);
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Full name/), "Neha Singh");
    await userEvent.type(within(dialog).getByLabelText(/^Email/), "neha@example.com");
    await userEvent.type(within(dialog).getByLabelText(/^Role/), "Designer");
    await userEvent.type(within(dialog).getByLabelText(/Annual CTC/), "900000");
    await userEvent.type(within(dialog).getByLabelText(/Joining date/), JOINING);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add candidate" }));
    await waitFor(() => expect(within(dialog).getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true"));
  });
});

it("moves focus to its heading only when asked", () => {
  renderWithProviders(
    <OfferCandidates canManage canIssue focusHeading onSendOffer={jest.fn()} onConvert={jest.fn()} onViewLetters={jest.fn()} onViewEmployee={jest.fn()} />
  );
  expect(screen.getByRole("heading", { name: "Offer candidates", level: 2 })).toHaveFocus();
});
