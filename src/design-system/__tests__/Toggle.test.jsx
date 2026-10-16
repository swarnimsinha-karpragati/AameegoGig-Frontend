import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Toggle from "../Toggle";

describe("Toggle", () => {
  it("renders a switch with aria-checked", () => {
    const { rerender } = render(<Toggle label="Email alerts" checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Email alerts" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    rerender(<Toggle label="Email alerts" checked onChange={() => {}} />);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveClass("wz-toggle--on");
  });

  it("calls onChange with the next boolean", () => {
    const onChange = jest.fn();
    const { rerender } = render(<Toggle label="Alerts" checked={false} onChange={onChange} />);
    userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<Toggle label="Alerts" checked onChange={onChange} />);
    userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("toggles via keyboard", () => {
    const onChange = jest.fn();
    render(<Toggle label="Alerts" checked={false} onChange={onChange} />);
    userEvent.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    userEvent.keyboard("{enter}");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("ignores clicks when disabled", () => {
    const onChange = jest.fn();
    render(<Toggle label="Alerts" checked={false} onChange={onChange} disabled />);
    userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
