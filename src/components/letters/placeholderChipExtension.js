import { Node } from "@tiptap/core";
import { detailDisplayName } from "../../utils/letterPlaceholders";
import { LETTERS_COPY } from "../../utils/lettersCopy";

/** Friendly name for a detail key; unknown keys are humanized, never shown raw. */
export const detailLabel = (storage, key) => detailDisplayName(key, storage?.labels);

/** What a chip shows, and whether it points at a detail that no longer exists. */
export const chipDisplay = (storage, { key, fallback }) => {
  const label = detailLabel(storage, key);
  return {
    text: fallback != null ? `${label} · or “${fallback}”` : label,
    unknown: Boolean(storage?.strict) && !Object.prototype.hasOwnProperty.call(storage.labels || {}, key),
  };
};

const chipAttributes = (storage, attrs) => {
  const { unknown } = chipDisplay(storage, attrs);
  const out = { "data-placeholder": attrs.key, class: `wz-letter-chip${unknown ? " is-unknown" : ""}` };
  if (attrs.raw) out["data-raw"] = "true";
  if (attrs.fallback != null) out["data-fallback"] = attrs.fallback;
  if (unknown) out.title = LETTERS_COPY.editor.unknownDetail;
  return out;
};

/**
 * Updates the labels chips and optional-section tags display. `strict` flags keys missing
 * from `labels` as unknown; leave it off when the list of available details is not loaded.
 */
export const setEditorLabels = (editor, labels, strict) => {
  const storage = editor?.storage?.placeholderChip;
  if (!storage || editor.isDestroyed) return;
  storage.labels = labels || {};
  storage.strict = Boolean(strict);
  storage.views.forEach((repaint) => repaint());
  editor.view.dispatch(editor.state.tr.setMeta("wzLetterLabels", true));
};

/** Inline, non-editable token for a Handlebars placeholder such as {{employeeName}}. */
const PlaceholderChip = Node.create({
  name: "placeholderChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addStorage() {
    return { labels: {}, strict: false, views: new Set() };
  },

  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-placeholder"),
        renderHTML: () => ({}),
      },
      raw: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-raw") === "true",
        renderHTML: () => ({}),
      },
      fallback: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-fallback"),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-placeholder]" }];
  },

  renderHTML({ node }) {
    const storage = this.editor?.storage?.placeholderChip;
    return ["span", chipAttributes(storage, node.attrs), chipDisplay(storage, node.attrs).text];
  },

  renderText({ node }) {
    const { key, raw, fallback } = node.attrs;
    if (fallback != null) return `{{#if ${key}}}{{${key}}}{{else}}${fallback}{{/if}}`;
    return raw ? `{{{${key}}}}` : `{{${key}}}`;
  },

  addNodeView() {
    const storage = this.storage;
    return ({ node }) => {
      const dom = document.createElement("span");
      let current = node;
      const paint = () => {
        const attrs = chipAttributes(storage, current.attrs);
        ["title", "data-raw", "data-fallback"].forEach((name) => dom.removeAttribute(name));
        Object.entries(attrs).forEach(([name, value]) => dom.setAttribute(name, value));
        dom.textContent = chipDisplay(storage, current.attrs).text;
      };
      paint();
      storage.views.add(paint);
      return {
        dom,
        update: (next) => {
          if (next.type !== current.type) return false;
          current = next;
          paint();
          return true;
        },
        destroy: () => storage.views.delete(paint),
      };
    };
  },

  addCommands() {
    return {
      insertPlaceholder:
        (key, raw = false) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { key, raw } }).insertContent(" ").run(),
    };
  },
});

export default PlaceholderChip;
