import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveTemplateDialog from "../editor/SaveTemplateDialog";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const E = LETTERS_COPY.editor;

const setup = (props = {}) => {
  const handlers = { onSave: jest.fn(), onCancel: jest.fn() };
  const utils = render(<SaveTemplateDialog open saving={false} {...handlers} {...props} />);
  return { ...handlers, ...utils };
};

const dialog = () => screen.getByRole("dialog", { name: E.saveTitle });

it("puts focus in the note when it opens", () => {
  setup();
  expect(within(dialog()).getByLabelText(E.saveNote)).toHaveFocus();
});

it("saves with an optional, trimmed note", async () => {
  const { onSave } = setup();
  await userEvent.type(within(dialog()).getByLabelText(E.saveNote), "  Softer tone  ");
  await userEvent.click(within(dialog()).getByRole("button", { name: E.saveConfirm }));
  expect(onSave).toHaveBeenCalledWith("Softer tone");
});

it("saves without a note", async () => {
  const { onSave } = setup();
  await userEvent.click(within(dialog()).getByRole("button", { name: E.saveConfirm }));
  expect(onSave).toHaveBeenCalledWith("");
});

it("rejects unsafe notes and keeps focus on the note", async () => {
  const { onSave } = setup();
  const note = within(dialog()).getByLabelText(E.saveNote);
  await userEvent.type(note, "<script>alert(1)</script>");
  await userEvent.click(within(dialog()).getByRole("button", { name: E.saveConfirm }));
  expect(onSave).not.toHaveBeenCalled();
  expect(note).toHaveAttribute("aria-invalid", "true");
  expect(note).toHaveFocus();
});

it("limits the note to 200 characters", async () => {
  setup();
  expect(within(dialog()).getByLabelText(E.saveNote)).toHaveAttribute("maxLength", "200");
});

it("shows a server error for the note", () => {
  setup({ error: "Version note contains invalid characters" });
  expect(within(dialog()).getByText("Version note contains invalid characters")).toBeInTheDocument();
  expect(within(dialog()).getByLabelText(E.saveNote)).toHaveAttribute("aria-invalid", "true");
});

it("cancels and clears the note when reopened", async () => {
  const { onCancel, rerender, onSave } = setup();
  await userEvent.type(within(dialog()).getByLabelText(E.saveNote), "Draft");
  await userEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalled();
  rerender(<SaveTemplateDialog open={false} saving={false} onSave={onSave} onCancel={onCancel} />);
  rerender(<SaveTemplateDialog open saving={false} onSave={onSave} onCancel={onCancel} />);
  expect(within(dialog()).getByLabelText(E.saveNote)).toHaveValue("");
});

it("renders nothing when closed", () => {
  setup({ open: false });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
