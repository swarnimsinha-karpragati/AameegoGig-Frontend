import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";

const BLOCK_CHILD_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
  "HEADER", "HR", "OL", "P", "PRE", "SECTION", "TABLE", "UL",
]);

const hasBlockChild = (el) => Array.from(el.children).some((child) => BLOCK_CHILD_TAGS.has(child.tagName));

const cssClassAttribute = {
  cssClass: {
    default: null,
    parseHTML: (el) => el.getAttribute("class"),
    renderHTML: (attrs) => (attrs.cssClass ? { class: attrs.cssClass } : {}),
  },
};

const plainDiv = (el) => !el.hasAttribute("data-if-block");

/**
 * Letter templates lay out titles, address blocks and signature rows with classed <div>s that
 * the letter stylesheet targets. These nodes keep those divs (and their classes) intact.
 * Loose text inside a block-level div is wrapped in a class-less line div, not a paragraph.
 */
export const LayoutBlock = Node.create({
  name: "layoutBlock",
  group: "block",
  content: "(layoutLine | block)+",
  defining: true,

  addAttributes() {
    return cssClassAttribute;
  },

  parseHTML() {
    return [{ tag: "div", getAttrs: (el) => (plainDiv(el) && hasBlockChild(el) ? null : false) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

export const LayoutLine = Node.create({
  name: "layoutLine",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return cssClassAttribute;
  },

  parseHTML() {
    return [{ tag: "div", getAttrs: (el) => (plainDiv(el) && !hasBlockChild(el) ? null : false) }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

let spanSequence = 0;

/**
 * Keeps template <span>s (e.g. the two flex items of `.notice-row`) with their class and style. Each parsed
 * span gets its own id so adjacent spans are not merged into one.
 */
export const LetterSpan = Mark.create({
  name: "letterSpan",
  priority: 120,
  excludes: "",

  addAttributes() {
    return {
      ...cssClassAttribute,
      style: {
        default: null,
        parseHTML: (el) => el.getAttribute("style"),
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
      },
      uid: {
        default: null,
        parseHTML: () => {
          spanSequence += 1;
          return spanSequence;
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (el) => (el.hasAttribute("data-placeholder") || el.hasAttribute("data-if") ? false : null),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

/** Keeps letter stylesheet classes (e.g. `text-center`, `total-row`) on standard elements. */
export const LetterClassAttribute = Extension.create({
  name: "letterClassAttribute",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph", "heading", "blockquote", "bulletList", "orderedList", "listItem", "table", "tableRow",
          "tableCell", "tableHeader", "image",
        ],
        attributes: cssClassAttribute,
      },
    ];
  },
});
