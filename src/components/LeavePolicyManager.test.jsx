import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LeavePolicyManager from "./LeavePolicyManager";
import { getLeavePolicy, updateLeavePolicy } from "../services/leaveService";

jest.mock("../services/leaveService", () => ({
  getLeavePolicy: jest.fn(),
  updateLeavePolicy: jest.fn(),
  runLeaveAccrual: jest.fn(),
}));

const renderPolicy = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LeavePolicyManager />
    </QueryClientProvider>
  );
};

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
    let resolveSave;
    updateLeavePolicy.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = () =>
            resolve({
              policy: policyFixture(),
              sync: { employeeCount: 5 },
            });
        })
    );

    renderPolicy();

    const saveButton = await screen.findByRole("button", { name: "Save policy" });
    userEvent.click(saveButton);
    const dialog = await screen.findByRole("dialog");
    userEvent.click(within(dialog).getByRole("button", { name: "Save policy" }));

    expect(
      await within(dialog).findByRole("button", { name: "Processing..." })
    ).toBeInTheDocument();
    resolveSave();
    expect(
      await screen.findByText(/Leave policy saved successfully\./)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Leave balances were updated for 5 employees\./)
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("saves an EL paid-day minimum and the probation check", async () => {
    getLeavePolicy.mockResolvedValue({
      policy: {
        ...policyFixture(),
        types: [
          ...policyFixture().types,
          {
            code: "EL",
            name: "Earned Leave",
            enabled: true,
            hasBalance: true,
            accrual: { method: "fixed_monthly", monthlyCredit: 1, yearlyCap: 12, minPresentDays: 0 },
            yearEnd: { lapseUnused: true, carryForwardMax: null },
          },
        ],
      },
    });

    renderPolicy();

    const probation = await screen.findByRole("switch", {
      name: "Accrue paid leave during probation",
    });
    userEvent.click(probation);

    userEvent.click(screen.getByRole("button", { name: /Earned Leave/i }));
    userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "How EL is earned" }),
      "full_if_min_present"
    );
    const minimum = screen.getByRole("spinbutton", { name: "Minimum paid days in the month" });
    userEvent.clear(minimum);
    userEvent.type(minimum, "20");

    userEvent.click(screen.getByRole("button", { name: "Save policy" }));
    const dialog = await screen.findByRole("dialog");
    userEvent.click(within(dialog).getByRole("button", { name: "Save policy" }));

    await waitFor(() => {
      expect(updateLeavePolicy).toHaveBeenCalledTimes(1);
    });
    const payload = updateLeavePolicy.mock.calls[0][0];
    expect(payload.accruePaidLeaveDuringProbation).toBe(true);
    const el = payload.types.find((t) => t.code === "EL");
    expect(el.accrual.method).toBe("full_if_min_present");
    expect(el.accrual.minPresentDays).toBe(20);
    expect(el.accrual.monthlyCredit).toBe(1);
    const cl = payload.types.find((t) => t.code === "CL");
    expect(cl.accrual.method).toBe("fixed_monthly");
  });

  test("saves the EL calendar proration method", async () => {
    getLeavePolicy.mockResolvedValue({
      policy: {
        ...policyFixture(),
        types: [
          ...policyFixture().types,
          {
            code: "EL",
            name: "Earned Leave",
            enabled: true,
            hasBalance: true,
            accrual: { method: "fixed_monthly", monthlyCredit: 1, yearlyCap: 12, minPresentDays: 0 },
            yearEnd: { lapseUnused: true, carryForwardMax: null },
          },
        ],
      },
    });

    renderPolicy();

    userEvent.click(await screen.findByRole("button", { name: /Earned Leave/i }));
    userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "How EL is earned" }),
      "prorate_calendar_paid_days"
    );
    const monthly = screen.getByRole("spinbutton", { name: /Days each month/ });
    userEvent.clear(monthly);
    userEvent.type(monthly, "2");

    userEvent.click(screen.getByRole("button", { name: "Save policy" }));
    const dialog = await screen.findByRole("dialog");
    userEvent.click(within(dialog).getByRole("button", { name: "Save policy" }));

    await waitFor(() => {
      expect(updateLeavePolicy).toHaveBeenCalledTimes(1);
    });
    const payload = updateLeavePolicy.mock.calls[0][0];
    const el = payload.types.find((t) => t.code === "EL");
    expect(el.accrual.method).toBe("prorate_calendar_paid_days");
    expect(el.accrual.monthlyCredit).toBe(2);
  });
});
