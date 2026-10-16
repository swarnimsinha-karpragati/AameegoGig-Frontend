import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

describe("EmptyState", () => {
  it("renders icon, title, description and action", () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="No employees yet"
        description="Add your first employee to get started."
        action={<button type="button">Add Employee</button>}
      />
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first employee to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Employee" })).toBeInTheDocument();
  });

  it("renders only what is provided", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
