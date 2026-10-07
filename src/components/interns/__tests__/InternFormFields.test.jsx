import { render, screen, fireEvent } from "@testing-library/react";
import {
  INTERN_FORM_SECTIONS,
  InternFormFields,
} from "../InternsTab";

const baseProps = {
  sections: INTERN_FORM_SECTIONS,
  onFieldChange: jest.fn(),
  departments: [],
  errors: {},
};

describe("InternFormFields — employee code", () => {
  test("add form renders the Employee Code field first in Basic Information", () => {
    render(
      <InternFormFields
        {...baseProps}
        values={{ employeeCode: "", name: "" }}
      />
    );
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
      <InternFormFields
        {...baseProps}
        values={{ employeeCode: "", name: "" }}
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
      <InternFormFields
        {...baseProps}
        values={{ employeeCode: "AMG-42", name: "Asha" }}
      />
    );
    expect(
      screen.getByLabelText(/Employee Code \(leave blank to auto-generate\)/i)
    ).toHaveValue("AMG-42");
  });
});
