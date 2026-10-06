import { render, screen } from "@testing-library/react";
import Badge from "../Badge";

describe("Badge", () => {
  it("defaults to the neutral tone", () => {
    render(<Badge>Inactive</Badge>);
    expect(screen.getByText("Inactive")).toHaveClass("wz-badge", "wz-badge--neutral");
  });

  it.each(["success", "warning", "error", "info", "neutral", "brand"])("applies the %s tone", (tone) => {
    render(<Badge tone={tone}>Status</Badge>);
    expect(screen.getByText("Status")).toHaveClass(`wz-badge--${tone}`);
  });

  it("falls back to neutral for unknown tones", () => {
    render(<Badge tone="purple">Odd</Badge>);
    expect(screen.getByText("Odd")).toHaveClass("wz-badge--neutral");
  });
});
