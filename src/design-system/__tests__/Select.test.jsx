import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Select from "../Select";

const OPTIONS = [
  { value: "it", label: "IT" },
  { value: "hr", label: "HR" },
  { value: "ops", label: "Operations", disabled: true },
];

function Controlled({ onValue, ...props }) {
  const [value, setValue] = useState("");
  return (
    <Select
      label="Department"
      name="department"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onValue?.(e.target.value);
      }}
      options={OPTIONS}
      {...props}
    />
  );
}

describe("Select", () => {
  it("renders a labelled native select with placeholder and options", () => {
    render(<Controlled placeholder="Select option" />);
    const select = screen.getByLabelText("Department");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "Select option" })).toHaveValue("");
    expect(screen.getByRole("option", { name: "Operations" })).toBeDisabled();
    expect(select).toHaveClass("wz-field__select--placeholder");
  });

  it("calls onChange with the selected value", () => {
    const onValue = jest.fn();
    render(<Controlled placeholder="Select option" onValue={onValue} />);
    const select = screen.getByLabelText("Department");
    userEvent.selectOptions(select, "hr");
    expect(onValue).toHaveBeenCalledWith("hr");
    expect(select).toHaveValue("hr");
    expect(select).not.toHaveClass("wz-field__select--placeholder");
  });

  it("wires required and error state", () => {
    render(<Controlled required error="Choose a valid option" />);
    const select = screen.getByRole("combobox", { name: /Department/ });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Choose a valid option");
    expect(select).toHaveAttribute("aria-required", "true");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", alert.id);
  });

  it("shows helper text and supports disabled", () => {
    render(<Controlled helperText="Pick one" disabled />);
    expect(screen.getByLabelText("Department")).toBeDisabled();
    expect(screen.getByText("Pick one")).toBeInTheDocument();
  });
});
