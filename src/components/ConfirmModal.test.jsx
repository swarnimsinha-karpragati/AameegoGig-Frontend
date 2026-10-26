import { render, screen } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal";

describe("ConfirmModal", () => {
  test("hides Cancel when cancelLabel is null so a note can close with one button", () => {
    render(
      <ConfirmModal
        open
        title="Rejection reason"
        message="Amount exceeds policy for this grade and site."
        confirmLabel="Close"
        cancelLabel={null}
        variant="info"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole("dialog", { name: "Rejection reason" })).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Amount exceeds policy for this grade and site.")
    ).toBeInTheDocument();
  });

  test("keeps Cancel on confirm dialogs", () => {
    render(
      <ConfirmModal
        open
        title="Cancel Request"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
