import { render, screen } from "@testing-library/react";
import Card from "../Card";

describe("Card", () => {
  it("renders a region named by its title with subtitle, actions and content", () => {
    render(
      <Card title="Card Title" subtitle="Details" actions={<button type="button">Edit</button>}>
        Body content
      </Card>
    );
    const region = screen.getByRole("region", { name: "Card Title" });
    expect(region).toHaveTextContent("Details");
    expect(screen.getByRole("heading", { name: "Card Title" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(region).toHaveTextContent("Body content");
  });

  it("is padded by default and can opt out", () => {
    const { rerender } = render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("wz-card", "wz-card--padded");
    rerender(
      <Card data-testid="card" padded={false} className="extra">
        Content
      </Card>
    );
    expect(screen.getByTestId("card")).not.toHaveClass("wz-card--padded");
    expect(screen.getByTestId("card")).toHaveClass("extra");
  });

  it("omits the header when no header props are given", () => {
    render(<Card data-testid="card">Only body</Card>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByTestId("card")).not.toHaveAttribute("aria-labelledby");
  });
});
