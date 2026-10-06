import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "../Input";

function Controlled(props) {
  const [value, setValue] = useState("");
  return <Input label="Email" name="email" value={value} onChange={(e) => setValue(e.target.value)} {...props} />;
}

describe("Input", () => {
  it("associates the visible label with the input via an auto id", () => {
    render(<Controlled />);
    const input = screen.getByLabelText("Email");
    expect(input.id).toMatch(/^wz-field-/);
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("type", "text");
  });

  it("uses a provided id", () => {
    render(<Controlled id="custom-email" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "custom-email");
  });

  it("types and fires onBlur", () => {
    const onBlur = jest.fn();
    render(<Controlled onBlur={onBlur} />);
    const input = screen.getByLabelText("Email");
    userEvent.type(input, "a@b.co");
    expect(input).toHaveValue("a@b.co");
    userEvent.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it("marks required fields with * and aria-required", () => {
    render(<Controlled required />);
    const input = screen.getByRole("textbox", { name: /Email/ });
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("wires helper text through aria-describedby", () => {
    render(<Controlled helperText="Work email preferred" />);
    const input = screen.getByLabelText("Email");
    const helper = screen.getByText("Work email preferred");
    expect(input).toHaveAttribute("aria-describedby", helper.id);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("wires errors with aria-invalid, describedby and role=alert, replacing helper text", () => {
    render(<Controlled helperText="Helper" error="Email is required" />);
    const input = screen.getByLabelText("Email");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Email is required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.queryByText("Helper")).not.toBeInTheDocument();
  });

  it("renders a left icon and supports disabled and custom types", () => {
    render(<Controlled leftIcon={<svg data-testid="icon" />} disabled type="email" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    const input = screen.getByLabelText("Email");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveClass("wz-field__input--with-icon");
  });
});
