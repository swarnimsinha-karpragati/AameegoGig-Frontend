import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Textarea from "../Textarea";

function Controlled(props) {
  const [value, setValue] = useState("");
  return <Textarea label="Reason" name="reason" value={value} onChange={(e) => setValue(e.target.value)} {...props} />;
}

describe("Textarea", () => {
  it("renders a labelled textarea with default rows", () => {
    render(<Controlled />);
    const textarea = screen.getByLabelText("Reason");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "4");
  });

  it("accepts typing and custom rows", () => {
    render(<Controlled rows={6} />);
    const textarea = screen.getByLabelText("Reason");
    userEvent.type(textarea, "Family event");
    expect(textarea).toHaveValue("Family event");
    expect(textarea).toHaveAttribute("rows", "6");
  });

  it("wires required and error state", () => {
    render(<Controlled required error="Reason is required" />);
    const textarea = screen.getByRole("textbox", { name: /Reason/ });
    const alert = screen.getByRole("alert");
    expect(textarea).toHaveAttribute("aria-required", "true");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", alert.id);
  });

  it("supports disabled", () => {
    render(<Controlled disabled />);
    expect(screen.getByLabelText("Reason")).toBeDisabled();
  });
});
