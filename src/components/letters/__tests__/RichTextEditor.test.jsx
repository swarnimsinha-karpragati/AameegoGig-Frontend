import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RichTextEditor from "../RichTextEditor";
import { LETTERS_COPY } from "../../../utils/lettersCopy";

const DETAIL_GROUPS = [
  {
    group: "Employee",
    placeholders: [
      { key: "employeeName", label: "Employee name", sample: "Asha" },
      { key: "department", label: "Department", sample: "Sales" },
    ],
  },
  { group: "Company", placeholders: [{ key: "companyName", label: "Company name", sample: "Acme" }] },
];

const editorOf = () => screen.getByRole("textbox").editor;
const lastHtml = (onChange) => onChange.mock.calls.at(-1)[0];

const selectText = (text) => {
  const editor = editorOf();
  let from = null;
  editor.state.doc.descendants((node, pos) => {
    if (from == null && node.isText && node.text.includes(text)) from = pos + node.text.indexOf(text);
  });
  act(() => {
    editor.commands.setTextSelection({ from, to: from + text.length });
  });
};

it("renders placeholders as chips and emits plain handlebars tokens", async () => {
  const onChange = jest.fn();
  const ref = createRef();
  render(<RichTextEditor ref={ref} value="<p>Dear {{employeeName}},</p>" onChange={onChange} />);
  const chip = await screen.findByText("Employee name");
  expect(chip).toHaveClass("wz-letter-chip");
  expect(chip).toHaveAttribute("data-placeholder", "employeeName");
  expect(chip).not.toHaveClass("is-unknown");

  act(() => ref.current.insertPlaceholder("companyName"));
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  const html = lastHtml(onChange);
  expect(html).toContain("{{employeeName}}");
  expect(html).toContain("{{companyName}}");
  expect(html).not.toContain("data-placeholder");
});

it("shows friendly labels, fallback text and flags details that no longer exist", async () => {
  const value =
    "<p>Dear {{employeeName}}, probation {{#if probationMonths}}{{probationMonths}}{{else}}six (6){{/if}} {{oldDetail}}</p>";
  render(
    <RichTextEditor
      value={value}
      onChange={jest.fn()}
      detailGroups={DETAIL_GROUPS}
      questionFields={[{ key: "probationMonths", label: "Probation months" }]}
    />
  );
  expect(await screen.findByText("Employee name")).toHaveClass("wz-letter-chip");
  expect(screen.getByText("Probation months · or “six (6)”")).toHaveAttribute("data-placeholder", "probationMonths");
  const unknown = screen.getByText("Old detail");
  expect(unknown).toHaveClass("is-unknown");
  expect(unknown).toHaveAttribute("title", LETTERS_COPY.editor.unknownDetail);
  expect(screen.queryByText(/\{\{/)).not.toBeInTheDocument();
});

it("updates chip labels when details load after the editor", async () => {
  const { rerender } = render(<RichTextEditor value="<p>{{department}}</p>" onChange={jest.fn()} />);
  expect(await screen.findByText("Department")).not.toHaveClass("is-unknown");
  rerender(<RichTextEditor value="<p>{{department}}</p>" onChange={jest.fn()} detailGroups={DETAIL_GROUPS} />);
  expect(await screen.findByText("Department")).toHaveClass("wz-letter-chip");
});

it("inserts a detail chosen from the searchable Insert detail menu", async () => {
  const onChange = jest.fn();
  render(<RichTextEditor value="<p>Hello</p>" onChange={onChange} detailGroups={DETAIL_GROUPS} />);
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.insertDetail }));
  const menu = screen.getByRole("dialog", { name: LETTERS_COPY.editor.insertDetail });
  fireEvent.change(within(menu).getByLabelText(LETTERS_COPY.editor.searchDetails), { target: { value: "zzz" } });
  expect(within(menu).getByText("No details match “zzz”.")).toBeInTheDocument();
  fireEvent.change(within(menu).getByLabelText(LETTERS_COPY.editor.searchDetails), { target: { value: "comp" } });
  expect(within(menu).queryByRole("button", { name: /Employee name/ })).not.toBeInTheDocument();
  fireEvent.click(within(menu).getByRole("button", { name: /Company name/ }));
  await waitFor(() => expect(lastHtml(onChange)).toContain("{{companyName}}"));
  expect(screen.queryByRole("dialog", { name: LETTERS_COPY.editor.insertDetail })).not.toBeInTheDocument();
});

it("focuses the Insert detail search box only once the picker is visible, so typing filters instead of editing the letter", async () => {
  const realFocus = HTMLElement.prototype.focus;
  const searchFocusVisibility = [];
  const focusSpy = jest.spyOn(HTMLElement.prototype, "focus").mockImplementation(function focus(...args) {
    if (this.matches?.(".wz-detail-picker input")) {
      // eslint-disable-next-line testing-library/no-node-access
      searchFocusVisibility.push(this.closest(".floating-menu").style.visibility);
    }
    return realFocus.apply(this, args);
  });
  render(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} detailGroups={DETAIL_GROUPS} />);
  await screen.findByText("Hello");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.insertDetail }));
  const menu = screen.getByRole("dialog", { name: LETTERS_COPY.editor.insertDetail });
  const search = within(menu).getByLabelText(LETTERS_COPY.editor.searchDetails);
  focusSpy.mockRestore();
  expect(search).toHaveFocus();
  expect(searchFocusVisibility).toEqual(["visible"]);
});

it("renders the Insert detail picker and More options menu inside the design-token scope", async () => {
  render(
    <div className="wz-ds">
      <RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} detailGroups={DETAIL_GROUPS} />
    </div>
  );
  await screen.findByText("Hello");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.insertDetail }));
  const picker = screen.getByRole("dialog", { name: LETTERS_COPY.editor.insertDetail });
  // eslint-disable-next-line testing-library/no-node-access
  expect(picker.closest(".wz-ds .wz-detail-picker")).not.toBeNull();
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  const moreMenu = screen.getByRole("menu", { name: LETTERS_COPY.editor.moreOptions });
  // eslint-disable-next-line testing-library/no-node-access
  expect(moreMenu.closest(".wz-ds .wz-rte__more-menu")).not.toBeNull();
});

it("lists this letter's questions after Salary and before Signatory in the Insert detail menu", () => {
  render(
    <RichTextEditor
      value="<p>Hello</p>"
      onChange={jest.fn()}
      detailGroups={DETAIL_GROUPS}
      questionFields={[{ key: "noticePeriod", label: "Notice period" }]}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.insertDetail }));
  const menu = screen.getByRole("dialog", { name: LETTERS_COPY.editor.insertDetail });
  const titles = within(menu).getAllByText(/^(This letter's questions|Employee|Company)$/).map((el) => el.textContent);
  expect(titles).toEqual(["Employee", "Company", LETTERS_COPY.editor.questionsGroup]);
});

it("makes selected words optional and Always show removes the condition", async () => {
  const onChange = jest.fn();
  render(<RichTextEditor value="<p>Hello big world</p>" onChange={onChange} detailGroups={DETAIL_GROUPS} />);
  await screen.findByText(/Hello big world/);
  expect(screen.getByRole("button", { name: LETTERS_COPY.editor.makeOptional })).toBeDisabled();

  selectText("big ");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.makeOptional }));
  const menu = screen.getByRole("dialog", { name: LETTERS_COPY.editor.makeOptional });
  fireEvent.click(within(menu).getByRole("button", { name: /Department/ }));
  await waitFor(() => expect(lastHtml(onChange)).toBe("<p>Hello {{#if department}}big {{/if}}world</p>"));
  expect(await screen.findByText("Only shown when Department is filled")).toBeInTheDocument();

  selectText("big");
  expect(screen.queryByRole("button", { name: LETTERS_COPY.editor.makeOptional })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.alwaysShow }));
  await waitFor(() => expect(lastHtml(onChange)).toBe("<p>Hello big world</p>"));
  selectText("world");
  expect(screen.getByRole("button", { name: LETTERS_COPY.editor.makeOptional })).toBeEnabled();
  expect(screen.queryByRole("button", { name: LETTERS_COPY.editor.alwaysShow })).not.toBeInTheDocument();
});

it("sets alignment from one Alignment menu that shows the current choice", async () => {
  const onChange = jest.fn();
  render(<RichTextEditor value="<p>Hello</p>" onChange={onChange} />);
  await screen.findByText("Hello");
  expect(screen.queryByRole("button", { name: LETTERS_COPY.editor.align.center })).not.toBeInTheDocument();
  selectText("Hello");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.align.label }));
  const menu = screen.getByRole("menu", { name: LETTERS_COPY.editor.align.label });
  expect(within(menu).getByRole("menuitemradio", { name: LETTERS_COPY.editor.align.left })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(within(menu).getByRole("menuitemradio", { name: LETTERS_COPY.editor.align.center }));
  await waitFor(() => expect(lastHtml(onChange)).toContain("text-align: center"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.align.label }));
  expect(screen.getByRole("menuitemradio", { name: LETTERS_COPY.editor.align.center })).toHaveAttribute("aria-checked", "true");
});

describe("toolbar menus from the keyboard", () => {
  const openFromKeyboard = (name) => {
    const trigger = screen.getByRole("button", { name });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    return trigger;
  };
  const press = (key) => fireEvent.keyDown(screen.getByRole("menu"), { key });

  it("focuses the checked alignment, moves with arrows/Home/End and Escape returns to the trigger", async () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);
    await screen.findByText("Hello");
    const trigger = openFromKeyboard(LETTERS_COPY.editor.align.label);
    const item = (v) => screen.getByRole("menuitemradio", { name: LETTERS_COPY.editor.align[v] });
    expect(item("left")).toHaveFocus();
    press("ArrowDown");
    expect(item("center")).toHaveFocus();
    press("End");
    expect(item("justify")).toHaveFocus();
    press("ArrowDown");
    expect(item("left")).toHaveFocus();
    press("ArrowUp");
    expect(item("justify")).toHaveFocus();
    press("Home");
    expect(item("left")).toHaveFocus();
    press("Escape");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens on the checked alignment when it is not the first one", async () => {
    render(<RichTextEditor value='<p style="text-align: right">Hello</p>' onChange={jest.fn()} />);
    await screen.findByText("Hello");
    selectText("Hello");
    openFromKeyboard(LETTERS_COPY.editor.align.label);
    expect(screen.getByRole("menuitemradio", { name: LETTERS_COPY.editor.align.right })).toHaveFocus();
  });

  it("returns focus to the trigger after choosing an item", async () => {
    const onChange = jest.fn();
    render(<RichTextEditor value="<p>Hello</p>" onChange={onChange} />);
    await screen.findByText("Hello");
    selectText("Hello");
    const trigger = openFromKeyboard(LETTERS_COPY.editor.align.label);
    press("ArrowDown");
    const center = screen.getByRole("menuitemradio", { name: LETTERS_COPY.editor.align.center });
    expect(center).toHaveFocus();
    fireEvent.click(center);
    expect(lastHtml(onChange)).toContain("text-align: center");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    // Nothing may pull focus away a frame later (the editor's deferred focus used to).
    await act(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    expect(trigger).toHaveFocus();
  });

  it("More menu items also leave focus on the trigger after the next frame", async () => {
    const onChange = jest.fn();
    render(<RichTextEditor value="<p>Hello</p>" onChange={onChange} />);
    await screen.findByText("Hello");
    selectText("Hello");
    const trigger = openFromKeyboard(LETTERS_COPY.editor.moreOptions);
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: LETTERS_COPY.editor.strikethrough }));
    expect(lastHtml(onChange)).toMatch(/<s>|<del>|<strike>/);
    await act(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    expect(trigger).toHaveFocus();
  });

  it("focuses the first enabled More item and Tab closes back to the trigger", async () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);
    await screen.findByText("Hello");
    const trigger = openFromKeyboard(LETTERS_COPY.editor.moreOptions);
    expect(screen.getByRole("menuitemcheckbox", { name: LETTERS_COPY.editor.strikethrough })).toHaveFocus();
    press("End");
    expect(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.editHtml })).toHaveFocus();
    press("Tab");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("skips disabled items: in HTML view only Back to visual is reachable", async () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);
    await screen.findByText("Hello");
    fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
    fireEvent.click(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.editHtml }));
    openFromKeyboard(LETTERS_COPY.editor.moreOptions);
    const back = screen.getByRole("menuitem", { name: LETTERS_COPY.editor.backToVisual });
    expect(back).toHaveFocus();
    press("ArrowDown");
    expect(back).toHaveFocus();
  });
});

it("keeps Strikethrough and Insert table in the more menu", async () => {
  const onChange = jest.fn();
  render(<RichTextEditor value="<p>Hello world</p>" onChange={onChange} />);
  await screen.findByText("Hello world");
  expect(screen.queryByRole("button", { name: LETTERS_COPY.editor.strikethrough })).not.toBeInTheDocument();
  selectText("world");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name: LETTERS_COPY.editor.strikethrough }));
  await waitFor(() => expect(lastHtml(onChange)).toContain("<s>world</s>"));
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  expect(screen.getByRole("menuitemcheckbox", { name: LETTERS_COPY.editor.strikethrough })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.insertTable }));
  await waitFor(() => expect(lastHtml(onChange)).toContain("<table"));
});

it("wraps whole selected paragraphs in an optional block", async () => {
  const onChange = jest.fn();
  render(
    <RichTextEditor
      value="<p>One</p><p>Two</p><p>Three</p>"
      onChange={onChange}
      detailGroups={DETAIL_GROUPS}
      questionFields={[{ key: "noticePeriod", label: "Notice period" }]}
    />
  );
  await screen.findByText("Two");
  const editor = editorOf();
  act(() => {
    editor.commands.setTextSelection({ from: 6, to: 16 });
  });
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.makeOptional }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Notice period/ }));
  await waitFor(() =>
    expect(lastHtml(onChange)).toBe("<p>One</p>{{#if noticePeriod}}\n<p>Two</p><p>Three</p>\n{{/if}}")
  );
  expect(screen.getByText("Only shown when Notice period is filled")).toBeInTheDocument();

  selectText("Two");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.alwaysShow }));
  await waitFor(() => expect(lastHtml(onChange)).toBe("<p>One</p><p>Two</p><p>Three</p>"));
});

it("shows then and else sections with their own tags", async () => {
  const value =
    "<p>A</p>\n{{#if department}}\n<p>In dept</p>\n{{else}}\n<p>No dept</p>\n{{/if}}\n<p>{{#if department}}x{{else}}y {{companyName}}{{/if}}</p>";
  render(<RichTextEditor value={value} onChange={jest.fn()} detailGroups={DETAIL_GROUPS} />);
  expect(await screen.findAllByText("Only shown when Department is filled")).toHaveLength(2);
  const otherwise = screen.getAllByText("Shown instead when Department is empty");
  expect(otherwise).toHaveLength(2);
  expect(otherwise[1]).toHaveClass("wz-cond-inline__tag", "is-else");
  expect(screen.getAllByText("Only shown when Department is filled")[1]).not.toHaveClass("is-else");
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

it("keeps Edit HTML in the more menu", async () => {
  const onChange = jest.fn();
  render(<RichTextEditor value="<p>Hi {{employeeName}}</p>" onChange={onChange} />);
  expect(screen.queryByRole("button", { name: /HTML/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  fireEvent.click(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.editHtml }));
  expect(screen.getByLabelText("Letter content (HTML)")).toHaveValue("<p>Hi {{employeeName}}</p>");
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  fireEvent.click(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.backToVisual }));
  expect(await screen.findByText("Employee name")).toHaveClass("wz-letter-chip");
});

it("hides Edit HTML when source editing is not allowed", () => {
  render(<RichTextEditor value="<p>Hi</p>" onChange={jest.fn()} allowSource={false} />);
  fireEvent.click(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions }));
  expect(screen.getByRole("menuitem", { name: LETTERS_COPY.editor.insertTable })).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: /HTML/ })).not.toBeInTheDocument();
});

it("forces HTML view for templates with logic the visual editor cannot keep", () => {
  const value = "<table><tbody>{{#each salaryItems}}<tr><td>{{componentName}}</td></tr>{{/each}}</tbody></table>";
  const onChange = jest.fn();
  render(<RichTextEditor value={value} onChange={onChange} />);
  expect(screen.getByRole("note")).toHaveTextContent(LETTERS_COPY.editor.sourceOnlyNotice);
  expect(LETTERS_COPY.editor.sourceOnlyNotice).not.toMatch(/Edit HTML|menu/);
  expect(screen.getByRole("button", { name: LETTERS_COPY.editor.moreOptions })).toBeDisabled();
  expect(screen.getByRole("button", { name: LETTERS_COPY.editor.align.label })).toBeDisabled();
  const source = screen.getByLabelText("Letter content (HTML)");
  expect(source).toHaveValue(value);
  expect(source).not.toHaveAttribute("readonly");
  fireEvent.change(source, { target: { value: `${value}<p>x</p>` } });
  expect(onChange).toHaveBeenLastCalledWith(`${value}<p>x</p>`);
  expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
  expect(screen.getByRole("button", { name: LETTERS_COPY.editor.insertDetail })).toBeDisabled();
});

it("does not emit changes when disabled", () => {
  const ref = createRef();
  const onChange = jest.fn();
  render(<RichTextEditor ref={ref} value="<p>Hi</p>" onChange={onChange} disabled />);
  act(() => ref.current.insertPlaceholder("companyName"));
  expect(onChange).not.toHaveBeenCalled();
});
