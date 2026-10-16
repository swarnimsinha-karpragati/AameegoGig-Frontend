import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CandidateDrawer from "../CandidateDrawer";
import renderWithProviders from "../testing/renderWithProviders";
import * as departmentService from "../../../services/departmentService";
import * as candidateService from "../../../services/offerCandidateService";

jest.mock("../../../services/offerCandidateService");
jest.mock("../../../services/departmentService");

const BASE = {
  _id: "c4",
  name: "Priya Nair",
  email: "priya@example.com",
  designation: "Writer",
  annualCTC: 700000,
  joiningDate: "2099-12-01",
  status: "declined",
  notes: "Prefers remote",
};

const HISTORY = [
  { status: "offered", note: "", changedAt: "2026-10-01T05:00:00.000Z", changedBy: "u1", changedByName: "Ravi" },
  { status: "declined", note: "Took another offer", changedAt: "2026-10-05T05:00:00.000Z", changedBy: null, changedByName: "" },
];

const renderDrawer = (candidate, detail = candidate) => {
  candidateService.getOfferCandidate.mockResolvedValue(detail);
  return renderWithProviders(<CandidateDrawer open candidate={candidate} onClose={jest.fn()} />);
};

const history = () => screen.findByRole("region", { name: "History" });

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.setItem("user", JSON.stringify({ vendorId: "v1" }));
  departmentService.getDepartmentName.mockResolvedValue({ data: [] });
});

it("loads the status history from the candidate detail (the list row has none)", async () => {
  renderDrawer(BASE, { ...BASE, statusHistory: HISTORY });
  expect(within(await history()).getByText("Loading history…")).toBeInTheDocument();
  const items = await within(await history()).findAllByRole("listitem");
  expect(candidateService.getOfferCandidate).toHaveBeenCalledWith("c4");
  expect(items).toHaveLength(2);
});

it("shows the status history newest first with label, date, note and who", async () => {
  renderDrawer(BASE, { ...BASE, statusHistory: HISTORY });
  const region = await history();
  const items = await within(region).findAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Declined");
  expect(items[0]).toHaveTextContent("05 Oct 2026");
  expect(items[0]).toHaveTextContent("Took another offer");
  expect(items[0]).not.toHaveTextContent(/by /);
  expect(items[1]).toHaveTextContent("Offered");
  expect(items[1]).toHaveTextContent("by Ravi");
  expect(within(region).queryByRole("textbox")).not.toBeInTheDocument();
});

it("keeps the internal notes field separate from the history", async () => {
  renderDrawer(BASE, { ...BASE, statusHistory: HISTORY });
  await within(await history()).findAllByRole("listitem");
  expect(screen.getByLabelText(/^Notes/)).toHaveValue("Prefers remote");
});

it("says when there are no status changes recorded yet", async () => {
  renderDrawer({ ...BASE, status: "draft" });
  expect(await within(await history()).findByText("No status changes recorded yet.")).toBeInTheDocument();
});

it("shows Joined for converted entries", async () => {
  const joined = { ...BASE, status: "converted" };
  renderDrawer(joined, { ...joined, statusHistory: [{ status: "converted", changedAt: "2026-10-06T05:00:00.000Z", changedByName: "Asha" }] });
  expect(await within(await history()).findByRole("listitem")).toHaveTextContent("Joined");
});

it("explains when the history cannot be loaded and lets the user retry", async () => {
  candidateService.getOfferCandidate.mockRejectedValueOnce(new Error("Network Error"));
  renderWithProviders(<CandidateDrawer open candidate={BASE} onClose={jest.fn()} />);
  const region = await history();
  expect(await within(region).findByText("Could not load the history.")).toBeInTheDocument();
  candidateService.getOfferCandidate.mockResolvedValueOnce({ ...BASE, statusHistory: HISTORY });
  await userEvent.click(within(region).getByRole("button", { name: "Try again" }));
  expect(await within(region).findAllByRole("listitem")).toHaveLength(2);
});

it("has no history section and fetches nothing when adding a candidate", async () => {
  renderDrawer(null);
  expect(screen.queryByRole("region", { name: "History" })).not.toBeInTheDocument();
  await waitFor(() => expect(departmentService.getDepartmentName).toHaveBeenCalled());
  expect(candidateService.getOfferCandidate).not.toHaveBeenCalled();
});
