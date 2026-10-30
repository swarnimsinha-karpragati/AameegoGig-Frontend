import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RichTextEditor from "../RichTextEditor";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const AI = LETTERS_COPY.ai;
const DETAIL_GROUPS = [{ group: "Employee", placeholders: [{ key: "employeeName", label: "Employee name", sample: "Asha" }] }];

const editorOf = () => screen.getByRole("textbox").editor;

/** Selects the whole first paragraph, chips included. */
const selectFirstParagraph = () => {
  const editor = editorOf();
  const first = editor.state.doc.firstChild;
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 1 + first.content.size });
  });
};

const renderEditor = (props = {}) => {
  const onChange = jest.fn();
  const onAiRewrite = jest.fn();
  const onAiApplied = jest.fn();
  render(
    <RichTextEditor
      value="<p>Hi {{employeeName}}, welcome aboard.</p><p>Second line.</p>"
      onChange={onChange}
      detailGroups={DETAIL_GROUPS}
      onAiRewrite={onAiRewrite}
      onAiApplied={onAiApplied}
      {...props}
    />
  );
  return { onChange, onAiRewrite, onAiApplied };
};

it("has no AI menu unless the parent provides a rewrite handler", () => {
  render(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);
  expect(screen.queryByRole("button", { name: AI.menu })).not.toBeInTheDocument();
});

it("with nothing selected, edits and replaces the whole letter", async () => {
  const { onChange, onAiRewrite } = renderEditor();
  onAiRewrite.mockResolvedValue("<p>Dear {{employeeName}}, welcome.</p>");
  await screen.findByText("Employee name");
  userEvent.click(screen.getByRole("button", { name: AI.menu }));
  expect(await screen.findByRole("menu", { name: AI.menuLabelWhole })).toBeInTheDocument();
  userEvent.click(screen.getByRole("menuitem", { name: AI.presets.clearer }));
  await waitFor(() =>
    expect(onAiRewrite).toHaveBeenCalledWith("<p>Hi {{employeeName}}, welcome aboard.</p><p>Second line.</p>", "clearer", "", "")
  );
  userEvent.click(await screen.findByRole("button", { name: AI.applyWhole }));
  await waitFor(() => expect(onChange.mock.calls.at(-1)[0]).toBe("<p>Dear {{employeeName}}, welcome.</p>"));
});

it("matches another template's format when templates are offered", async () => {
  const { onAiRewrite } = renderEditor({ aiFormatOptions: [{ value: "t9", label: "Genex Offer Letter" }] });
  onAiRewrite.mockResolvedValue("<p>Rewritten.</p>");
  await screen.findByText("Employee name");
  userEvent.click(screen.getByRole("button", { name: AI.menu }));
  userEvent.click(await screen.findByRole("menuitem", { name: AI.presets.match }));
  userEvent.selectOptions(screen.getByLabelText(AI.matchLabel), "t9");
  userEvent.click(screen.getByRole("button", { name: AI.rewrite }));
  await waitFor(() => expect(onAiRewrite).toHaveBeenCalledWith(expect.stringContaining("welcome aboard"), "match", "", "t9"));
});

it("sends the selection as stored HTML and replaces only it, keeping the detail chip", async () => {
  const { onChange, onAiRewrite, onAiApplied } = renderEditor();
  onAiRewrite.mockResolvedValue("Dear {{employeeName}}, we are delighted to welcome you.");
  await screen.findByText("Employee name");
  selectFirstParagraph();

  userEvent.click(screen.getByRole("button", { name: AI.menu }));
  userEvent.click(await screen.findByRole("menuitem", { name: AI.presets.formal }));

  await waitFor(() => expect(onAiRewrite).toHaveBeenCalledWith("Hi {{employeeName}}, welcome aboard.", "formal", "", ""));
  expect(await screen.findByText(/\[Employee name\], we are delighted/)).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: AI.apply }));
  await waitFor(() =>
    expect(onChange.mock.calls.at(-1)[0]).toBe("<p>Dear {{employeeName}}, we are delighted to welcome you.</p><p>Second line.</p>")
  );
  expect(onAiApplied).toHaveBeenCalled();
});

it("refuses to apply when the letter changed while AI was working", async () => {
  const { onChange, onAiRewrite } = renderEditor();
  onAiRewrite.mockResolvedValue("Rewritten.");
  await screen.findByText("Employee name");
  selectFirstParagraph();
  userEvent.click(screen.getByRole("button", { name: AI.menu }));
  userEvent.click(await screen.findByRole("menuitem", { name: AI.presets.shorter }));
  await screen.findByText("Rewritten.");

  act(() => {
    editorOf().commands.insertContentAt(1, "X");
  });
  const before = onChange.mock.calls.length;
  userEvent.click(screen.getByRole("button", { name: AI.apply }));
  expect(await screen.findByText(AI.selectionChanged)).toBeInTheDocument();
  expect(onChange.mock.calls.slice(before).some(([html]) => html.includes("Rewritten."))).toBe(false);
});

it("asks for a custom instruction and shows AI errors", async () => {
  const { onAiRewrite } = renderEditor();
  onAiRewrite.mockRejectedValue({ response: { status: 422, data: { message: "The AI changed a detail field in the text. Try again." } } });
  await screen.findByText("Employee name");
  selectFirstParagraph();
  userEvent.click(screen.getByRole("button", { name: AI.menu }));
  userEvent.click(await screen.findByRole("menuitem", { name: AI.presets.custom }));
  userEvent.type(screen.getByLabelText(AI.customLabel), "Make it warmer");
  userEvent.click(screen.getByRole("button", { name: AI.rewrite }));
  await waitFor(() => expect(onAiRewrite).toHaveBeenCalledWith("Hi {{employeeName}}, welcome aboard.", "custom", "Make it warmer", ""));
  expect(await screen.findByRole("alert")).toHaveTextContent("The AI changed a detail field in the text. Try again.");
});
