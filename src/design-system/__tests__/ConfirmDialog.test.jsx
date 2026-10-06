import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "../ConfirmDialog";

function renderDialog(props = {}) {
  const handlers = { onConfirm: jest.fn(), onCancel: jest.fn() };
  const utils = render(
    <>
      <button type="button">Opener</button>
      <ConfirmDialog
        open
        title="Deactivate Attendance Cycle"
        message="This will pause automated tracking."
        {...handlers}
        {...props}
      />
    </>
  );
  return { ...utils, ...handlers };
}

describe("ConfirmDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog open={false} title="Hidden" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an accessible modal dialog in a portal", () => {
    const { container } = renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Deactivate Attendance Cycle" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("This will pause automated tracking.");
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
    // eslint-disable-next-line testing-library/no-node-access
    expect(dialog.closest(".wz-ds")).not.toBeNull();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("focuses confirm initially for standard and success variants", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
  });

  it("focuses cancel initially for destructive and uses a danger confirm", () => {
    renderDialog({ variant: "destructive", confirmLabel: "Delete permanently" });
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toHaveClass("wz-btn--danger");
    expect(screen.getByRole("dialog")).toHaveClass("wz-dialog--destructive");
  });

  it("renders the success variant with custom labels", () => {
    renderDialog({ variant: "success", confirmLabel: "Go to list", cancelLabel: "Close" });
    expect(screen.getByRole("dialog")).toHaveClass("wz-dialog--success");
    expect(screen.getByRole("button", { name: "Go to list" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls onConfirm and onCancel from buttons", () => {
    const { onConfirm, onCancel } = renderDialog();
    userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape and overlay mousedown", () => {
    const { onCancel } = renderDialog();
    userEvent.keyboard("{esc}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(document.querySelector(".wz-dialog-overlay"));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("focuses initialFocusRef when given", () => {
    const ref = { current: null };
    renderDialog({ initialFocusRef: ref, children: <input aria-label="Note" ref={(el) => (ref.current = el)} /> });
    expect(screen.getByLabelText("Note")).toHaveFocus();
  });

  it("traps focus with Tab and Shift+Tab", () => {
    renderDialog();
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toHaveFocus();
    userEvent.tab();
    expect(cancel).toHaveFocus();
    userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("blocks cancel paths and shows busy confirm while loading", () => {
    const { onCancel } = renderDialog({ loading: true });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    userEvent.keyboard("{esc}");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("renders extra children and releases the scroll lock on close", () => {
    const { rerender, onCancel, onConfirm } = renderDialog({ children: <p>Extra detail</p> });
    expect(screen.getByText("Extra detail")).toBeInTheDocument();
    rerender(
      <>
        <button type="button">Opener</button>
        <ConfirmDialog open={false} title="x" onCancel={onCancel} onConfirm={onConfirm} />
      </>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("can disable only the confirm button while cancel stays usable", async () => {
    const { onConfirm, onCancel } = renderDialog({ confirmLabel: "Delete", confirmDisabled: true });
    const confirm = screen.getByRole("button", { name: "Delete" });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("enables confirm by default", () => {
    renderDialog({ confirmLabel: "Delete" });
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
