import { Mark, Node } from "@tiptap/core";
import { AllSelection, NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import { findWrapping } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { detailLabel } from "../placeholderChipExtension";
import { LETTERS_COPY, format } from "../../../utils/lettersCopy";

const chipStorage = (editor) => editor?.storage?.placeholderChip;
const optionalTagText = (editor, field, branch) =>
  format(branch === "else" ? LETTERS_COPY.editor.otherwiseTag : LETTERS_COPY.editor.optionalTag, {
    label: detailLabel(chipStorage(editor), field),
  });
const elseClass = (branch) => (branch === "else" ? " is-else" : "");

const branchAttribute = {
  default: "then",
  parseHTML: (el) => (el.getAttribute("data-branch") === "else" ? "else" : "then"),
  renderHTML: () => ({}),
};

const ancestorDepth = ($pos, type) => {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type === type) return depth;
  }
  return null;
};

const coversWholeBlocks = (selection) => {
  if (selection instanceof AllSelection) return true;
  if (selection instanceof NodeSelection) return selection.node.isBlock;
  const { $from, $to } = selection;
  if (!$from.sameParent($to)) return true;
  return $from.parent.isTextblock && $from.parentOffset === 0 && $to.parentOffset === $to.parent.content.size;
};

/**
 * Where "Make optional" would apply for the current selection, or null when it cannot:
 * empty selections and anything that would nest one optional section inside another
 * (nested conditions only survive in HTML view).
 */
export const optionalTarget = (state) => {
  const { selection, schema } = state;
  const blockType = schema.nodes.conditionalBlock;
  const markType = schema.marks.conditional;
  if (!blockType || !markType || selection.empty) return null;
  const { $from, $to } = selection;
  if (ancestorDepth($from, blockType) != null || ancestorDepth($to, blockType) != null) return null;

  const hasOptional = (from, to) => {
    let found = state.doc.rangeHasMark(from, to, markType);
    state.doc.nodesBetween(from, to, (node) => {
      if (node.type === blockType) found = true;
      return !found;
    });
    return found;
  };

  if (coversWholeBlocks(selection)) {
    const range = $from.blockRange($to);
    if (range && findWrapping(range, blockType, { field: "x", branch: "then" }) && !hasOptional(range.start, range.end)) {
      return { mode: "block" };
    }
    if (!$from.sameParent($to)) return null;
  }
  return hasOptional(selection.from, selection.to) ? null : { mode: "inline" };
};

/** True when the selection sits in (or touches) an optional section that "Always show" can remove. */
export const isInOptional = (state) => {
  const { selection, schema } = state;
  const blockType = schema.nodes.conditionalBlock;
  const markType = schema.marks.conditional;
  if (!blockType || !markType) return false;
  if (ancestorDepth(selection.$from, blockType) != null) return true;
  if (selection.empty) {
    const { $from } = selection;
    const around = [$from.nodeBefore, $from.nodeAfter];
    return around.some((node) => node && markType.isInSet(node.marks));
  }
  return state.doc.rangeHasMark(selection.from, selection.to, markType);
};

const tagElement = (text, className) => {
  const el = document.createElement("span");
  el.className = className;
  el.contentEditable = "false";
  el.textContent = text;
  return el;
};

const branchDomAttrs = ({ branch }) => (branch === "else" ? { "data-branch": "else" } : {});

/** `{{#if field}}…[{{else}}…]{{/if}}` around words inside one paragraph; one mark per branch. */
export const ConditionalMark = Mark.create({
  name: "conditional",
  priority: 150,
  inclusive: false,

  addAttributes() {
    return {
      field: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-if"),
        renderHTML: () => ({}),
      },
      branch: branchAttribute,
    };
  },

  parseHTML() {
    return [{ tag: "span[data-if]" }];
  },

  renderHTML({ mark }) {
    return [
      "span",
      { "data-if": mark.attrs.field, ...branchDomAttrs(mark.attrs), class: `wz-cond-inline${elseClass(mark.attrs.branch)}` },
      0,
    ];
  },

  addProseMirrorPlugins() {
    const { editor, type } = this;
    return [
      new Plugin({
        key: new PluginKey("conditionalTags"),
        props: {
          decorations(state) {
            const widgets = [];
            state.doc.descendants((node, pos) => {
              if (!node.isTextblock) return true;
              let previous = null;
              node.forEach((child, offset) => {
                const attrs = type.isInSet(child.marks)?.attrs;
                const run = attrs ? `${attrs.branch}:${attrs.field}` : null;
                if (run && run !== previous) {
                  const text = optionalTagText(editor, attrs.field, attrs.branch);
                  const className = `wz-cond-inline__tag${elseClass(attrs.branch)}`;
                  widgets.push(
                    Decoration.widget(pos + 1 + offset, () => tagElement(text, className), {
                      side: -1,
                      ignoreSelection: true,
                      key: `cond:${run}:${text}`,
                    })
                  );
                }
                previous = run;
              });
              return false;
            });
            return DecorationSet.create(state.doc, widgets);
          },
        },
      }),
    ];
  },
});

/**
 * `{{#if field}}` … `{{/if}}` around whole paragraphs, tables or layout blocks. An if/else is two
 * adjacent blocks with the same field: `branch: "then"` followed by `branch: "else"`.
 */
export const ConditionalBlock = Node.create({
  name: "conditionalBlock",
  group: "block",
  content: "(layoutLine | block)+",
  defining: true,

  addAttributes() {
    return {
      field: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-if-block"),
        renderHTML: () => ({}),
      },
      branch: branchAttribute,
    };
  },

  parseHTML() {
    return [{ tag: "div[data-if-block]", priority: 100 }];
  },

  renderHTML({ node }) {
    return [
      "div",
      { "data-if-block": node.attrs.field, ...branchDomAttrs(node.attrs), class: `wz-cond-block${elseClass(node.attrs.branch)}` },
      0,
    ];
  },

  addNodeView() {
    const { editor } = this;
    return ({ node }) => {
      const dom = document.createElement("div");
      const header = document.createElement("div");
      const content = document.createElement("div");
      header.className = "wz-cond-block__tag";
      header.contentEditable = "false";
      content.className = "wz-cond-block__body";
      dom.append(header, content);
      let current = node;
      const paint = () => {
        const { field, branch } = current.attrs;
        dom.className = `wz-cond-block${elseClass(branch)}`;
        dom.setAttribute("data-if-block", field);
        header.textContent = optionalTagText(editor, field, branch);
      };
      paint();
      const views = chipStorage(editor)?.views;
      views?.add(paint);
      return {
        dom,
        contentDOM: content,
        update: (next) => {
          if (next.type !== current.type) return false;
          current = next;
          paint();
          return true;
        },
        ignoreMutation: (mutation) => mutation.type !== "selection" && header.contains(mutation.target),
        destroy: () => views?.delete(paint),
      };
    };
  },

  addCommands() {
    return {
      makeOptional:
        (field) =>
        ({ state, commands }) => {
          const target = optionalTarget(state);
          if (!target || !field) return false;
          if (target.mode === "block" && commands.wrapIn(this.name, { field, branch: "then" })) return true;
          if (!state.selection.$from.sameParent(state.selection.$to)) return false;
          return commands.setMark("conditional", { field, branch: "then" });
        },
      alwaysShow:
        () =>
        ({ state, tr, dispatch, commands }) => {
          const { $from } = state.selection;
          const depth = ancestorDepth($from, this.type);
          if (depth != null) {
            const start = $from.before(depth);
            const block = $from.node(depth);
            if (dispatch) tr.replaceWith(start, start + block.nodeSize, block.content);
            return true;
          }
          if (!isInOptional(state)) return false;
          // Scope to this branch's run so the paired then/else run keeps its condition.
          const markType = state.schema.marks.conditional;
          const mark = [$from.nodeAfter, $from.nodeBefore].map((n) => n && markType.isInSet(n.marks)).find(Boolean);
          if (mark) commands.extendMarkRange("conditional", mark.attrs);
          return commands.unsetMark("conditional");
        },
    };
  },

  addProseMirrorPlugins() {
    const blockType = this.type;
    return [
      new Plugin({
        key: new PluginKey("conditionalNoNesting"),
        // Pasting can put one optional section inside another; nested conditions would force the
        // template into HTML view, so inner sections are flattened back to always-shown content.
        appendTransaction(transactions, _old, state) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const markType = state.schema.marks.conditional;
          const nested = [];
          const outer = [];
          state.doc.descendants((node, pos) => {
            if (node.type !== blockType) return true;
            outer.push({ from: pos, to: pos + node.nodeSize });
            node.descendants((child, offset) => {
              if (child.type === blockType) nested.push(pos + 1 + offset);
            });
            return false;
          });
          const tr = state.tr;
          outer.forEach(({ from, to }) => {
            if (markType && state.doc.rangeHasMark(from, to, markType)) tr.removeMark(from, to, markType);
          });
          nested
            .sort((a, b) => b - a)
            .forEach((pos) => {
              const node = tr.doc.nodeAt(pos);
              if (node?.type === blockType) tr.replaceWith(pos, pos + node.nodeSize, node.content);
            });
          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
