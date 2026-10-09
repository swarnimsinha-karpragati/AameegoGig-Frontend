import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Plus,
  Redo2,
  Sparkles,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from "lucide-react";
import FloatingMenu from "../FloatingMenu";
import { Button, Input, Spinner } from "../../design-system";
import { useMenuNavigation } from "../../design-system/overlayHooks";
import DetailPicker, { useDismiss } from "./editor/DetailPicker";
import { createLetterEditorExtensions } from "./editor/letterEditorExtensions";
import { isInOptional, optionalTarget } from "./editor/conditionalExtensions";
import { setEditorLabels } from "./placeholderChipExtension";
import { buildDetailGroups, detailLabels, getApiError } from "../../utils/letterForms";
import { detailDisplayName, getEditorMode, placeholderToken, unwrapFromEditor, wrapForEditor } from "../../utils/letterPlaceholders";
import { rangeToStoredHtml, selectionToStoredHtml, templateTextPreview } from "./editor/selectionHtml";
import { LETTERS_COPY } from "../../utils/lettersCopy";
import "./editor/editor.css";

const ToolButton = ({ label, icon: Icon, active, disabled, onClick }) => (
  <button
    type="button"
    className={`wz-rte__tool${active ? " is-active" : ""}`}
    aria-label={label}
    title={label}
    aria-pressed={active === undefined ? undefined : Boolean(active)}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <Icon size={16} aria-hidden="true" />
  </button>
);

const TextToolButton = ({ label, icon: Icon, disabled, onClick, popup, expanded, buttonRef }) => (
  <button
    ref={buttonRef}
    type="button"
    className="wz-rte__tool wz-rte__tool--text"
    disabled={disabled}
    aria-haspopup={popup}
    aria-expanded={popup ? Boolean(expanded) : undefined}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <Icon size={16} aria-hidden="true" />
    {label}
    {popup && <ChevronDown size={14} aria-hidden="true" />}
  </button>
);

/**
 * Toolbar menu. Choosing an item, Escape or Tab closes it and puts focus back where it was when
 * the menu opened: the trigger when opened from the keyboard, the letter when clicked (the
 * toolbar buttons keep the editor focused on mouse press).
 */
function ToolMenu({ anchorEl, label, onClose, children }) {
  const menuRef = useRef(null);
  const [returnFocusTo] = useState(() => document.activeElement);
  const { focusInitial, onKeyDown } = useMenuNavigation(menuRef);
  const close = ({ restoreFocus }) => {
    onClose();
    if (restoreFocus) returnFocusTo?.focus?.();
  };
  useDismiss(Boolean(anchorEl), anchorEl, menuRef, close);

  const handleKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      close({ restoreFocus: true });
      return;
    }
    onKeyDown(event);
  };

  return (
    <FloatingMenu anchorEl={anchorEl} className="wz-rte__more-menu" onShown={focusInitial}>
      <div
        ref={menuRef}
        role="menu"
        aria-label={label}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          if (event.target.closest("[role^='menuitem']")) close({ restoreFocus: true });
        }}
      >
        {children}
      </div>
    </FloatingMenu>
  );
}

const MenuItem = ({ role = "menuitem", checked, icon: Icon, label, disabled, onClick }) => (
  <button
    type="button"
    role={role}
    aria-checked={role === "menuitem" ? undefined : Boolean(checked)}
    className="wz-rte__menu-item"
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    {Icon && <Icon size={16} aria-hidden="true" />}
    {label}
  </button>
);

const AI_PRESETS = ["formal", "shorter", "clearer", "grammar", "hindi"];

const ALIGNMENTS = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
  { value: "justify", icon: AlignJustify },
];

/**
 * Letter body editor. Stores plain Handlebars HTML; shows details as labelled chips and
 * `{{#if}}` sections as optional text/blocks. Templates with logic the visual editor cannot
 * represent open in HTML view so nothing is lost.
 */
const RichTextEditor = forwardRef(function RichTextEditor(
  {
    value,
    onChange,
    label = "Letter content",
    error,
    disabled = false,
    minHeight = 420,
    detailGroups = [],
    questionFields = [],
    allowSource = true,
    // async (storedHtml, preset, instruction) => rewritten stored HTML. Shows the AI menu when given.
    onAiRewrite,
    onAiApplied,
  },
  ref
) {
  const [mode, setMode] = useState(() => getEditorMode(value));
  const [popover, setPopover] = useState(null);
  const forcedSource = getEditorMode(value) === "source";
  const lastEmitted = useRef(value);
  const sourceRef = useRef(null);
  const insertRef = useRef(null);
  const optionalRef = useRef(null);
  const moreRef = useRef(null);
  const alignRef = useRef(null);
  const aiRef = useRef(null);
  // AI rewrite of the selection: { phase: custom | loading | ready | error, from, to, original, result?, error? }
  const [ai, setAi] = useState(null);
  const [aiInstruction, setAiInstruction] = useState("");

  const editor = useEditor({
    extensions: createLetterEditorExtensions(),
    content: mode === "rich" ? wrapForEditor(value) : "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "wz-rte__content wz-letter-body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        ...(error ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = unwrapFromEditor(ed.getHTML());
      if (html === lastEmitted.current) return;
      lastEmitted.current = html;
      onChange?.(html);
    },
  });

  const selectionState = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            canMakeOptional: Boolean(optionalTarget(ed.state)),
            inOptional: isInOptional(ed.state),
            hasSelection: !ed.state.selection.empty,
          }
        : null,
  });

  // Serialised so a new array with the same labels does not re-render every chip.
  // Layout effect: chips get their names before the first paint instead of flashing a fallback name.
  const labelsKey = JSON.stringify(detailLabels(detailGroups, questionFields));
  useLayoutEffect(() => {
    const { labels, strict } = JSON.parse(labelsKey);
    setEditorLabels(editor, labels, strict);
  }, [editor, labelsKey]);

  const pickerGroups = useMemo(() => buildDetailGroups(detailGroups, questionFields), [detailGroups, questionFields]);

  useEffect(() => {
    if (!editor || mode !== "rich") return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(wrapForEditor(value), { emitUpdate: false });
  }, [editor, value, mode]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (forcedSource && mode !== "source") setMode("source");
  }, [forcedSource, mode]);

  const switchMode = () => {
    setPopover(null);
    if (mode === "source") {
      setMode("rich");
      lastEmitted.current = value;
      editor?.commands.setContent(wrapForEditor(value), { emitUpdate: false });
    } else {
      setMode("source");
    }
  };

  const insertIntoSource = (token) => {
    const el = sourceRef.current;
    const current = value || "";
    if (!el) {
      onChange?.(current + token);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    onChange?.(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      insertPlaceholder: (key, raw = false) => {
        if (disabled) return;
        if (mode === "source" || !editor) insertIntoSource(placeholderToken(key, raw));
        else editor.chain().focus().insertPlaceholder(key, raw).run();
      },
      focus: () => (mode === "source" ? sourceRef.current?.focus() : editor?.commands.focus()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, mode, value, disabled]
  );

  const is = (name, attrs) => Boolean(editor?.isActive(name, attrs));
  const run = (fn) => () => editor && fn(editor.chain().focus()).run();
  // ToolMenu puts focus back itself; chain().focus() would re-focus the letter a frame later.
  const runFromMenu = (fn) => () => editor && fn(editor.chain()).run();
  const richDisabled = disabled || mode === "source" || !editor;
  const togglePopover = (name) => setPopover((current) => (current === name ? null : name));
  const showMore = allowSource && !forcedSource;
  const sourceEditable = allowSource && !disabled;
  const align = ALIGNMENTS.find(({ value: v }) => is({ textAlign: v })) || ALIGNMENTS[0];
  const AlignIcon = align.icon;
  const E = LETTERS_COPY.editor;
  const AI = LETTERS_COPY.ai;
  const showAi = Boolean(onAiRewrite) && mode === "rich" && !disabled;

  const requestRewrite = async (target, preset, instruction = "") => {
    setAi({ ...target, phase: "loading" });
    try {
      const result = await onAiRewrite(target.original, preset, instruction);
      setAi({ ...target, phase: "ready", result });
    } catch (err) {
      setAi({ ...target, phase: "error", error: getApiError(err, AI.error).message });
    }
  };

  const startAi = (preset) => {
    const selection = editor && selectionToStoredHtml(editor);
    if (!selection) return;
    const target = { from: selection.from, to: selection.to, original: selection.html };
    if (preset === "custom") {
      setAiInstruction("");
      setAi({ ...target, phase: "custom" });
    } else {
      requestRewrite(target, preset);
    }
  };

  const applyAi = () => {
    // The letter may have changed while AI was working; replace only the exact text that was sent.
    if (rangeToStoredHtml(editor, ai.from, ai.to) !== ai.original) {
      setAi({ ...ai, phase: "error", error: AI.selectionChanged });
      return;
    }
    editor.chain().focus().insertContentAt({ from: ai.from, to: ai.to }, wrapForEditor(ai.result)).run();
    setAi(null);
    onAiApplied?.();
  };

  const aiLabels = detailLabels(detailGroups, questionFields).labels;

  return (
    <div className={`wz-rte${error ? " has-error" : ""}${disabled ? " is-disabled" : ""}`}>
      <div className="wz-rte__toolbar" role="toolbar" aria-label="Formatting">
        <ToolButton label="Undo" icon={Undo2} disabled={richDisabled || !editor.can().undo()} onClick={run((c) => c.undo())} />
        <ToolButton label="Redo" icon={Redo2} disabled={richDisabled || !editor.can().redo()} onClick={run((c) => c.redo())} />
        <span className="wz-rte__sep" aria-hidden="true" />
        <ToolButton label="Heading" icon={Heading2} active={is("heading", { level: 2 })} disabled={richDisabled} onClick={run((c) => c.toggleHeading({ level: 2 }))} />
        <ToolButton label="Subheading" icon={Heading3} active={is("heading", { level: 3 })} disabled={richDisabled} onClick={run((c) => c.toggleHeading({ level: 3 }))} />
        <ToolButton label="Bold" icon={Bold} active={is("bold")} disabled={richDisabled} onClick={run((c) => c.toggleBold())} />
        <ToolButton label="Italic" icon={Italic} active={is("italic")} disabled={richDisabled} onClick={run((c) => c.toggleItalic())} />
        <ToolButton label="Underline" icon={Underline} active={is("underline")} disabled={richDisabled} onClick={run((c) => c.toggleUnderline())} />
        <span className="wz-rte__sep" aria-hidden="true" />
        <ToolButton label="Bulleted list" icon={List} active={is("bulletList")} disabled={richDisabled} onClick={run((c) => c.toggleBulletList())} />
        <ToolButton label="Numbered list" icon={ListOrdered} active={is("orderedList")} disabled={richDisabled} onClick={run((c) => c.toggleOrderedList())} />
        <button
          ref={alignRef}
          type="button"
          className="wz-rte__tool"
          aria-label={E.align.label}
          title={E.align.label}
          aria-haspopup="menu"
          aria-expanded={popover === "align"}
          disabled={richDisabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => togglePopover("align")}
        >
          <AlignIcon size={16} aria-hidden="true" />
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <span className="wz-rte__sep" aria-hidden="true" />
        <TextToolButton
          label={E.insertDetail}
          icon={Plus}
          popup="dialog"
          expanded={popover === "insert"}
          buttonRef={insertRef}
          disabled={richDisabled || pickerGroups.length === 0}
          onClick={() => togglePopover("insert")}
        />
        {/* One slot: the selection is either inside an optional section or can become one, never both. */}
        {selectionState?.inOptional ? (
          <TextToolButton label={E.alwaysShow} icon={Eye} disabled={richDisabled} onClick={run((c) => c.alwaysShow())} />
        ) : (
          <TextToolButton
            label={E.makeOptional}
            icon={EyeOff}
            popup="dialog"
            expanded={popover === "optional"}
            buttonRef={optionalRef}
            disabled={richDisabled || pickerGroups.length === 0 || !selectionState?.canMakeOptional}
            onClick={() => togglePopover("optional")}
          />
        )}
        {showAi && (
          <>
            <span className="wz-rte__sep" aria-hidden="true" />
            <TextToolButton
              label={AI.menu}
              icon={Sparkles}
              popup="menu"
              expanded={popover === "ai"}
              buttonRef={aiRef}
              disabled={richDisabled || !selectionState?.hasSelection || ai?.phase === "loading"}
              onClick={() => togglePopover("ai")}
            />
          </>
        )}
        <span className="wz-rte__spacer" />
        <button
          ref={moreRef}
          type="button"
          className={`wz-rte__tool${mode === "source" ? " is-active" : ""}`}
          aria-label={E.moreOptions}
          title={E.moreOptions}
          aria-haspopup="menu"
          aria-expanded={popover === "more"}
          disabled={disabled || (richDisabled && !showMore)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => togglePopover("more")}
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </div>

      {popover === "align" && (
        <ToolMenu anchorEl={alignRef.current} label={E.align.label} onClose={() => setPopover(null)}>
          {ALIGNMENTS.map(({ value: v, icon }) => (
            <MenuItem
              key={v}
              role="menuitemradio"
              checked={v === align.value}
              icon={icon}
              label={E.align[v]}
              onClick={runFromMenu((c) => c.setTextAlign(v))}
            />
          ))}
        </ToolMenu>
      )}

      {popover === "ai" && (
        <ToolMenu anchorEl={aiRef.current} label={AI.menuLabel} onClose={() => setPopover(null)}>
          {[...AI_PRESETS, "custom"].map((preset) => (
            <MenuItem key={preset} label={AI.presets[preset]} onClick={() => startAi(preset)} />
          ))}
        </ToolMenu>
      )}

      {ai && (
        <div className="wz-rte__ai" role="region" aria-label={AI.suggestionTitle} aria-live="polite">
          {ai.phase === "custom" && (
            <form
              className="wz-rte__ai-custom"
              onSubmit={(event) => {
                event.preventDefault();
                if (aiInstruction.trim().length >= 3) requestRewrite(ai, "custom", aiInstruction.trim());
              }}
            >
              <Input
                label={AI.customLabel}
                name="aiInstruction"
                value={aiInstruction}
                placeholder={AI.customPlaceholder}
                maxLength={500}
                autoFocus
                onChange={(event) => setAiInstruction(event.target.value)}
              />
              <div className="wz-rte__ai-actions">
                <Button type="submit" size="sm" disabled={aiInstruction.trim().length < 3}>
                  {AI.rewrite}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAi(null)}>
                  {AI.discard}
                </Button>
              </div>
            </form>
          )}
          {ai.phase === "loading" && (
            <p className="wz-rte__ai-status">
              <Spinner size="sm" label="" /> {AI.rewriting}
            </p>
          )}
          {ai.phase === "ready" && (
            <>
              <p className="wz-rte__ai-title">{AI.suggestionTitle}</p>
              <p className="wz-rte__ai-preview">{templateTextPreview(ai.result, (key) => detailDisplayName(key, aiLabels))}</p>
              <div className="wz-rte__ai-actions">
                <Button size="sm" onClick={applyAi}>
                  {AI.apply}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAi(null)}>
                  {AI.discard}
                </Button>
              </div>
            </>
          )}
          {ai.phase === "error" && (
            <div className="wz-rte__ai-actions">
              <p className="wz-rte__ai-error" role="alert">
                {ai.error}
              </p>
              <Button size="sm" variant="ghost" onClick={() => setAi(null)}>
                {AI.discard}
              </Button>
            </div>
          )}
        </div>
      )}

      {popover === "insert" && (
        <DetailPicker
          anchorEl={insertRef.current}
          title={LETTERS_COPY.editor.insertDetail}
          groups={pickerGroups}
          onPick={(key) => editor?.chain().focus().insertPlaceholder(key).run()}
          onClose={() => setPopover(null)}
        />
      )}
      {popover === "optional" && (
        <DetailPicker
          anchorEl={optionalRef.current}
          title={LETTERS_COPY.editor.makeOptional}
          groups={pickerGroups}
          onPick={(key) => editor?.chain().focus().makeOptional(key).run()}
          onClose={() => setPopover(null)}
        />
      )}
      {popover === "more" && (
        <ToolMenu anchorEl={moreRef.current} label={E.moreOptions} onClose={() => setPopover(null)}>
          <MenuItem
            role="menuitemcheckbox"
            checked={is("strike")}
            icon={Strikethrough}
            label={E.strikethrough}
            disabled={richDisabled}
            onClick={runFromMenu((c) => c.toggleStrike())}
          />
          <MenuItem
            icon={Table}
            label={E.insertTable}
            disabled={richDisabled}
            onClick={runFromMenu((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}
          />
          {showMore && (
            <MenuItem label={mode === "source" ? E.backToVisual : E.editHtml} onClick={switchMode} />
          )}
        </ToolMenu>
      )}

      {forcedSource && (
        <p className="wz-rte__notice" role="note">
          {LETTERS_COPY.editor.sourceOnlyNotice}
        </p>
      )}

      {mode === "source" ? (
        <textarea
          ref={sourceRef}
          className="wz-rte__source"
          aria-label={`${label} (HTML)`}
          aria-invalid={error ? "true" : undefined}
          value={value || ""}
          disabled={disabled}
          readOnly={!sourceEditable}
          spellCheck={false}
          style={{ minHeight }}
          onChange={(e) => {
            lastEmitted.current = e.target.value;
            onChange?.(e.target.value);
          }}
        />
      ) : (
        <div className="wz-rte__surface" style={{ minHeight }}>
          <EditorContent editor={editor} />
        </div>
      )}
      {error && (
        <p className="wz-rte__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default RichTextEditor;
