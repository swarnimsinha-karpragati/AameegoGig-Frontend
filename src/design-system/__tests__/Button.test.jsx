import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

describe("Button", () => {
  it("renders a primary md button with type=button by default", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("wz-btn", "wz-btn--primary", "wz-btn--md");
  });

  it.each(["primary", "secondary", "outline", "ghost", "danger"])("applies the %s variant", (variant) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass(`wz-btn--${variant}`);
  });

  it("falls back to primary/md for unknown values and supports size + fullWidth", () => {
    const { rerender } = render(
      <Button variant="weird" size="xl">
        Go
      </Button>
    );
    expect(screen.getByRole("button")).toHaveClass("wz-btn--primary", "wz-btn--md");
    rerender(
      <Button size="lg" fullWidth>
        Go
      </Button>
    );
    expect(screen.getByRole("button")).toHaveClass("wz-btn--lg", "wz-btn--full");
  });

  it("renders icons and calls onClick", () => {
    const onClick = jest.fn();
    render(
      <Button icon={<svg data-testid="left" />} iconRight={<svg data-testid="right" />} onClick={onClick}>
        Add
      </Button>
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows a spinner, disables and sets aria-busy while loading", () => {
    const onClick = jest.fn();
    render(
      <Button loading icon={<svg data-testid="left" />} onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toContainHTML("wz-spinner");
    expect(screen.queryByTestId("left")).not.toBeInTheDocument();
    userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("passes through extra props such as type and aria-label", () => {
    render(<Button type="submit" aria-label="Close" icon={<svg />} />);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("wz-btn--icon-only");
  });
});
