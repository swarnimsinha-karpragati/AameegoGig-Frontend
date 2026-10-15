import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

jest.mock("../../services/salaryComponentService", () => ({
  getEmployeeStructure: jest.fn(),
  saveEmployeeStructure: jest.fn(),
  getStructure: jest.fn(),
  calculateStructureSplit: jest.fn(),
  calculateCalendarDailySplit: jest.fn(),
  getSalaryComponents: jest.fn(),
}));

jest.mock("../../utils/roles", () => {
  const actual = jest.requireActual("../../utils/roles");
  return { ...actual, getStoredUser: () => ({ vendorId: "v1" }) };
});

jest.mock("../../utils/vendorIdhelper", () => ({
  isSiteVendor: () => false,
  canUseCalendarDailyPay: () => false,
}));

import EmployeeSalaryStructureEditor from "../EmployeeSalaryStructureEditor";
import {
  getEmployeeStructure,
  getStructure,
  getSalaryComponents,
} from "../../services/salaryComponentService";

const mockEmptyLoad = () => {
  getStructure.mockResolvedValue({ data: [] });
  getSalaryComponents.mockResolvedValue({ data: [] });
  getEmployeeStructure.mockResolvedValue({ data: { data: {} } });
};

describe("EmployeeSalaryStructureEditor — empty section never blocks save", () => {
  beforeEach(() => {
    mockEmptyLoad();
  });

  test("structure-less employee: validate passes and reports no unsaved changes", async () => {
    const ref = React.createRef();
    render(
      <EmployeeSalaryStructureEditor
        ref={ref}
        employeeId="emp-1"
        payType="MONTHLY"
      />
    );
    await waitFor(() => {
      expect(getEmployeeStructure).toHaveBeenCalled();
    });
    expect(ref.current.validateStructure()).toBe("");
    expect(ref.current.hasUnsavedChanges).toBe(false);
  });

  test("partial entry still validates (too-small CTC is rejected)", async () => {
    const ref = React.createRef();
    render(
      <EmployeeSalaryStructureEditor
        ref={ref}
        employeeId="emp-1"
        payType="MONTHLY"
      />
    );
    await waitFor(() => {
      expect(getEmployeeStructure).toHaveBeenCalled();
    });
    // Nothing entered: skips validation entirely.
    expect(ref.current.validateStructure()).toBe("");
    expect(ref.current.hasUnsavedChanges).toBe(false);
    // Enter setup manually, then type a below-minimum CTC.
    fireEvent.click(screen.getByText("Select Components Manually"));
    const ctcInput = screen.getByPlaceholderText(/e.g. 600000/i);
    fireEvent.change(ctcInput, { target: { value: "5" } });
    expect(ref.current.hasUnsavedChanges).toBe(true);
    expect(ref.current.validateStructure()).toMatch(/Annual CTC/i);
  });
});
