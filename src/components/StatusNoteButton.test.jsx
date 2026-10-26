import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusNoteButton from "./StatusNoteButton";

describe("StatusNoteButton", () => {
  test("stays out of the row when there is no note", () => {
    const { container } = render(<StatusNoteButton title="Rejection reason" message="  " />);
    expect(container).toBeEmptyDOMElement();
  });

  test("opens the full note on click without changing row height", async () => {
    const onOpen = jest.fn();
    render(
      <StatusNoteButton
        title="Rejection reason"
        message="Amount exceeds policy for this grade and site."
        onOpen={onOpen}
      />
    );
    expect(screen.queryByText(/Amount exceeds/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Rejection reason" }));
    expect(onOpen).toHaveBeenCalledWith({
      title: "Rejection reason",
      message: "Amount exceeds policy for this grade and site.",
    });
  });
});
