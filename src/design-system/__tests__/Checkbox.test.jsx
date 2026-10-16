import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "../Checkbox";

describe("Checkbox", () => {
  it("renders a labelled checkbox reflecting checked state", () => {
    const { rerender } = render(<Checkbox label="Remember me" checked={false} onChange={() => {}} />);
    const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
    expect(checkbox).not.toBeChecked();
    rerender(<Checkbox label="Remember me" checked onChange={() => {}} />);
    expect(checkbox).toBeChecked();
  });

  it("calls onChange with the event when clicked or label clicked", () => {
    const seen = [];
    const onChange = jest.fn((event) => seen.push(event.target.checked));
    render(<Checkbox label="Agree" checked={false} onChange={onChange} />);
    userEvent.click(screen.getByText("Agree"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([true]);
  });

  it("does not fire when disabled and accepts a custom id", () => {
    const onChange = jest.fn();
    render(<Checkbox label="Locked" id="locked" checked={false} onChange={onChange} disabled />);
    const checkbox = screen.getByRole("checkbox", { name: "Locked" });
    expect(checkbox).toHaveAttribute("id", "locked");
    expect(checkbox).toBeDisabled();
    userEvent.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggles with the keyboard", () => {
    const onChange = jest.fn();
    render(<Checkbox label="Space" checked={false} onChange={onChange} />);
    userEvent.tab();
    expect(screen.getByRole("checkbox")).toHaveFocus();
    userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalled();
  });
});
