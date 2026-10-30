import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusNoteButton, { statusNoteDialog } from "./StatusNoteButton";

describe("StatusNoteButton", () => {
  test("stays out of the row when there is no note", () => {
    const { container } = render(<StatusNoteButton title="Rejection reason" message="  " />);
    expect(container).toBeEmptyDOMElement();
  });

  test("opens the full note on click and exposes it on hover", async () => {
    const onOpen = jest.fn();
    const message = "Amount exceeds policy for this grade and site.";
    render(
      <StatusNoteButton title="Rejection reason" message={message} onOpen={onOpen} />
    );
    expect(screen.queryByText(/Amount exceeds/)).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Rejection reason" });
    expect(button).toHaveAttribute("title", `Rejection reason: ${message}`);
    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith({ title: "Rejection reason", message });
  });

  test("opens a Close-only info dialog for the full note", () => {
    const onClose = jest.fn();
    expect(
      statusNoteDialog({
        title: "Rejection reason",
        message: "Duplicate request",
        onClose,
      })
    ).toEqual({
      title: "Rejection reason",
      message: "Duplicate request",
      variant: "info",
      confirmLabel: "Close",
      cancelLabel: null,
      onConfirm: onClose,
    });
  });
});
