import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Drawer from "../Drawer";

function renderDrawer(props = {}) {
  const onClose = jest.fn();
  const utils = render(
    <Drawer
      open
      title="Employee details"
      subtitle="EMP-0026"
      onClose={onClose}
      footer={<button type="button">Save</button>}
      {...props}
    >
      <input aria-label="First name" />
    </Drawer>
  );
  return { ...utils, onClose };
}

describe("Drawer", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing when closed", () => {
    render(<Drawer open={false} title="Hidden" onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a labelled modal dialog with body and footer", () => {
    renderDrawer();
    const dialog = screen.getByRole("dialog", { name: "Employee details" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("EMP-0026");
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(dialog.closest(".wz-ds")).not.toBeNull();
  });

  it("applies the width as a CSS variable", () => {
    renderDrawer({ width: 640 });
    expect(screen.getByRole("dialog").style.getPropertyValue("--wz-drawer-width")).toBe("640px");
  });

  it("closes via the close button, Escape and overlay", () => {
    const { onClose } = renderDrawer();
    userEvent.click(screen.getByRole("button", { name: "Close" }));
    userEvent.keyboard("{esc}");
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(document.querySelector(".wz-drawer-overlay"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("moves focus inside and traps Tab", () => {
    renderDrawer();
    const close = screen.getByRole("button", { name: "Close" });
    const input = screen.getByLabelText("First name");
    const save = screen.getByRole("button", { name: "Save" });
    expect(close).toHaveFocus();
    userEvent.tab();
    expect(input).toHaveFocus();
    userEvent.tab();
    expect(save).toHaveFocus();
    userEvent.tab();
    expect(close).toHaveFocus();
    userEvent.tab({ shift: true });
    expect(save).toHaveFocus();
  });

  it("locks body scroll while open", () => {
    const { unmount } = renderDrawer();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
