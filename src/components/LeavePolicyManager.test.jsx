import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeavePolicyManager from "./LeavePolicyManager";
import { getLeavePolicy, updateLeavePolicy } from "../services/leaveService";

jest.mock("../services/leaveService", () => ({
  getLeavePolicy: jest.fn(),
  updateLeavePolicy: jest.fn(),
  runLeaveAccrual: jest.fn(),
}));

const policyFixture = () => ({
  templateKey: "custom",
  yearStartMonth: 1,
  yearStartDay: 1,
  types: [
    {
      code: "CL",
      name: "Casual Leave",
      enabled: true,
      hasBalance: true,
      accrual: { method: "fixed_monthly", monthlyCredit: 0.5, yearlyCap: 6 },
      yearEnd: { lapseUnused: true },
    },
  ],
});

describe("LeavePolicyManager save confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLeavePolicy.mockResolvedValue({ policy: policyFixture() });
    updateLeavePolicy.mockResolvedValue({
      policy: policyFixture(),
      sync: { employeeCount: 5 },
    });
  });

  test("shows a success message after applying the policy", async () => {
    render(<LeavePolicyManager />);

    // Wait for the policy to load, then save through the confirm modal.
    const saveButton = await screen.findByRole("button", { name: "Save policy" });
    userEvent.click(saveButton);
    const dialog = await screen.findByRole("dialog");
    userEvent.click(
      within(dialog).getByRole("button", { name: "Save policy" })
    );

    await waitFor(() => {
      expect(updateLeavePolicy).toHaveBeenCalledTimes(1);
    });
    // Modal stays open with a loading state until the save finishes.
    expect(
      within(dialog).getByRole("button", { name: "Processing..." })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Leave policy saved successfully\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Leave balances were updated for 5 employees\./)
    ).toBeInTheDocument();
    // Modal closes once saving is done.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
