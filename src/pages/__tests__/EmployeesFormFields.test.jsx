import { render, screen, fireEvent } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({
    useLocation: () => ({ pathname: "/employees", search: "" }),
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    Link: ({ children }) => children,
  }),
  { virtual: true }
);

jest.mock("../../layouts/MainLayout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

import {
  EMPLOYEE_FORM_SECTIONS,
  EmployeeFormFields,
} from "../Employees";

const baseProps = {
  sections: EMPLOYEE_FORM_SECTIONS,
  onFieldChange: jest.fn(),
  department: [],
  errors: {},
};

describe("EmployeeFormFields — employee code", () => {
  test("add form renders the Employee Code field first in Basic Information", () => {
    render(<EmployeeFormFields {...baseProps} values={{}} />);
    const input = screen.getByLabelText(
      /Employee Code \(leave blank to auto-generate\)/i
    );
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "employeeCode");
    expect(input).toHaveValue("");
  });

  test("typing a code flows through onFieldChange", () => {
    const onFieldChange = jest.fn();
    render(
      <EmployeeFormFields
        {...baseProps}
        values={{}}
        onFieldChange={onFieldChange}
      />
    );
    fireEvent.change(
      screen.getByLabelText(/Employee Code \(leave blank to auto-generate\)/i),
      { target: { name: "employeeCode", value: "AMG-999" } }
    );
    expect(onFieldChange).toHaveBeenCalled();
  });

  test("edit form prefills the existing code", () => {
    render(
      <EmployeeFormFields
        {...baseProps}
        values={{ employeeCode: "AMG-42", name: "Asha" }}
      />
    );
    expect(
      screen.getByLabelText(/Employee Code \(leave blank to auto-generate\)/i)
    ).toHaveValue("AMG-42");
  });
});
