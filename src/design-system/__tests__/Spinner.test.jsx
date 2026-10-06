import { render, screen } from "@testing-library/react";
import Spinner from "../Spinner";

describe("Spinner", () => {
  it("renders a status with a default label and md size", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner).toHaveStyle({ width: "20px", height: "20px" });
  });

  it("supports named and numeric sizes", () => {
    const { rerender } = render(<Spinner size="lg" />);
    expect(screen.getByRole("status")).toHaveStyle({ width: "32px" });
    rerender(<Spinner size={18} />);
    expect(screen.getByRole("status")).toHaveStyle({ width: "18px" });
  });

  it("is decorative when label is empty", () => {
    const { container } = render(<Spinner label="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container).toContainHTML('aria-hidden="true"');
  });
});
