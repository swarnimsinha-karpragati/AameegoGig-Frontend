import fs from "fs";
import path from "path";
import { Editor } from "@tiptap/core";
import { createLetterEditorExtensions } from "./letterEditorExtensions";
import { optionalTarget } from "./conditionalExtensions";
import { getEditorMode, unwrapFromEditor, wrapForEditor } from "../../../utils/letterPlaceholders";

const DEFAULTS_DIR = path.resolve(__dirname, "../../../../../AameegoGig-Backend/templates/letters/defaults");

const collapse = (html) =>
  String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const placeholderKeys = (html) =>
  [...String(html).matchAll(/(\{\{\{?)\s*([A-Za-z_][\w.]*)\s*\}\}\}?/g)]
    .filter((m) => m[2] !== "else")
    .map((m) => (m[1].length === 3 ? `raw:${m[2]}` : m[2]))
    .sort();

const HB_RE = /\{\{\s*(#if\s+([\w.]+)|else|\/if)\s*\}\}/g;
const BLOCK_START_RE = /^\s*<(p|div|h[1-6]|table|ul|ol|blockquote)\b/i;

/**
 * Top-level {{#if}} sections in document order, one entry per non-empty branch, plus the text
 * that sits outside all of them.
 */
const describeConditionals = (html) => {
  const sections = [];
  let outside = "";
  let depth = 0;
  let cursor = 0;
  let open = null;
  for (const m of html.matchAll(HB_RE)) {
    if (m[1].startsWith("#if")) {
      if (depth === 0) {
        outside += html.slice(cursor, m.index);
        open = { field: m[2], start: m.index, end: m.index + m[0].length, elseAt: null, elseEnd: null };
      }
      depth += 1;
    } else if (m[1] === "else") {
      if (depth === 1 && open.elseAt == null) {
        open.elseAt = m.index;
        open.elseEnd = m.index + m[0].length;
      }
    } else if (m[1] === "/if") {
      depth -= 1;
      if (depth === 0) {
        const inner = html.slice(open.end, m.index);
        const fallback = inner.match(new RegExp(`^\\{\\{\\s*${open.field.replace(".", "\\.")}\\s*\\}\\}\\{\\{else\\}\\}([^<>{}]*)$`));
        if (fallback) {
          sections.push({ field: open.field, kind: "fallback", branch: null, innerText: collapse(fallback[1]) });
        } else {
          const thenPart = html.slice(open.end, open.elseAt ?? m.index);
          const elsePart = open.elseAt == null ? null : html.slice(open.elseEnd, m.index);
          const before = html.slice(0, open.start).trimEnd();
          const firstBranch = thenPart.trim() ? thenPart : elsePart || "";
          const afterTagOrSection = before === "" || before.endsWith(">") || before.endsWith("{{/if}}");
          const kind = afterTagOrSection && BLOCK_START_RE.test(firstBranch) ? "block" : "inline";
          if (thenPart.trim()) sections.push({ field: open.field, kind, branch: "then", innerText: collapse(thenPart) });
          if (elsePart?.trim()) sections.push({ field: open.field, kind, branch: "else", innerText: collapse(elsePart) });
        }
        cursor = m.index + m[0].length;
      }
    }
  }
  outside += html.slice(cursor);
  return { sections, outside: collapse(outside) };
};

const roundTrip = (html) => {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: createLetterEditorExtensions(),
    content: wrapForEditor(html),
  });
  try {
    // A real edit lets appendTransaction plugins (trailing paragraph, nesting guard) run as they do for users.
    let textPos = null;
    editor.state.doc.descendants((node, pos) => {
      if (textPos == null && node.isText) textPos = pos;
      return textPos == null;
    });
    editor.commands.insertContentAt(textPos, "x");
    editor.commands.deleteRange({ from: textPos, to: textPos + 1 });
    return unwrapFromEditor(editor.getHTML());
  } finally {
    editor.destroy();
  }
};

describe("editor guards", () => {
  const withEditor = (content, fn) => {
    const editor = new Editor({ element: document.createElement("div"), extensions: createLetterEditorExtensions(), content });
    try {
      return fn(editor);
    } finally {
      editor.destroy();
    }
  };

  it("flattens optional sections pasted inside another so the template stays editable", () => {
    const html = withEditor("<p>Start</p>", (editor) => {
      editor.commands.insertContentAt(
        editor.state.doc.content.size,
        '<div data-if-block="a"><p>One <span data-if="b">two</span></p><div data-if-block="c"><p>three</p></div></div>'
      );
      return unwrapFromEditor(editor.getHTML());
    });
    expect(html).toBe("<p>Start</p>{{#if a}}\n<p>One two</p><p>three</p>\n{{/if}}");
    expect(getEditorMode(html)).toBe("rich");
  });

  it("refuses Make optional inside an optional section and offers Always show there", () => {
    withEditor('<div data-if-block="a"><p>Inside</p></div><p>Outside</p>', (editor) => {
      editor.commands.setTextSelection({ from: 3, to: 6 });
      expect(editor.can().makeOptional("b")).toBe(false);
      expect(editor.commands.alwaysShow()).toBe(true);
      expect(unwrapFromEditor(editor.getHTML())).toBe("<p>Inside</p><p>Outside</p>");
    });
  });

  const pair = wrapForEditor("<p>A</p>{{#if x}}<p>Then</p>{{else}}<p>Else</p>{{/if}}");
  const textPosOf = (editor, text) => {
    let found = null;
    editor.state.doc.descendants((node, pos) => {
      if (found == null && node.isText && node.text.includes(text)) found = pos + node.text.indexOf(text);
    });
    return found;
  };

  it("Always show on an else block keeps the then block as a lone condition", () => {
    withEditor(pair, (editor) => {
      editor.commands.setTextSelection(textPosOf(editor, "Else") + 1);
      expect(editor.commands.alwaysShow()).toBe(true);
      expect(unwrapFromEditor(editor.getHTML())).toBe("<p>A</p>{{#if x}}\n<p>Then</p>\n{{/if}}<p>Else</p>");
    });
  });

  it("Always show on a then block leaves a lone else block", () => {
    withEditor(pair, (editor) => {
      editor.commands.setTextSelection(textPosOf(editor, "Then") + 1);
      expect(editor.commands.alwaysShow()).toBe(true);
      const html = unwrapFromEditor(editor.getHTML());
      expect(html).toBe("<p>A</p><p>Then</p>{{#if x}}{{else}}\n<p>Else</p>\n{{/if}}");
      expect(getEditorMode(html)).toBe("rich");
    });
  });

  it("Always show on an inline run removes only that branch", () => {
    withEditor(wrapForEditor("<p>{{#if a}}yes {{a}}{{else}}no value{{/if}} end</p>"), (editor) => {
      editor.commands.setTextSelection(textPosOf(editor, "no value") + 2);
      expect(editor.commands.alwaysShow()).toBe(true);
      expect(unwrapFromEditor(editor.getHTML())).toBe("<p>{{#if a}}yes {{a}}{{/if}}no value end</p>");
    });
  });

  it("keeps the notice-row spans and classes on paragraphs, cells and spans", () => {
    const source =
      '<div class="notice-row"><span>Last Working Day:</span> <span>{{terminationDate}}</span></div>' +
      '<p class="text-center">Hi <span class="letter-note">a</span><span class="letter-note">b</span></p>' +
      '<table class="salary-table"><tbody><tr class="total-row"><td class="text-right">1</td></tr></tbody></table>';
    const html = withEditor(wrapForEditor(source), (editor) => unwrapFromEditor(editor.getHTML()));
    expect(html).toContain('<div class="notice-row"><span>Last Working Day:</span> <span>{{terminationDate}}</span></div>');
    expect(html).toContain('<p class="text-center">Hi <span class="letter-note">a</span><span class="letter-note">b</span></p>');
    expect(html).toMatch(/<table class="salary-table"[^>]*>/);
    expect(html).toMatch(/<tr class="total-row"><td class="text-right"[^>]*>/);
  });

  it("keeps inline styles on spans", () => {
    const source =
      '<p>Pay <span style="color: red; margin-left: 4px">{{amount}}</span> and <span class="letter-note" style="color: blue">x</span></p>';
    const html = withEditor(wrapForEditor(source), (editor) => unwrapFromEditor(editor.getHTML()));
    expect(html).toMatch(/<span style="color: red; margin-left: 4px;?">\{\{amount\}\}<\/span>/);
    expect(html).toMatch(/<span class="letter-note" style="color: blue;?">x<\/span>/);
  });

  it("disables Make optional for selections it cannot wrap, such as across list items", () => {
    withEditor("<ul><li><p>One</p></li><li><p>Two</p></li></ul>", (editor) => {
      editor.commands.setTextSelection({ from: textPosOf(editor, "One"), to: textPosOf(editor, "Two") + 3 });
      expect(optionalTarget(editor.state)).toBeNull();
      expect(editor.can().makeOptional("a")).toBe(false);
    });
  });

  it("Make optional creates then branches only", () => {
    withEditor("<p>Hello world</p>", (editor) => {
      editor.commands.setTextSelection({ from: 7, to: 12 });
      expect(editor.commands.makeOptional("a")).toBe(true);
      expect(unwrapFromEditor(editor.getHTML())).toBe("<p>Hello {{#if a}}world{{/if}}</p>");
    });
  });
});

const files = fs.existsSync(DEFAULTS_DIR) ? fs.readdirSync(DEFAULTS_DIR).filter((f) => f.endsWith(".html")).sort() : [];

if (files.length === 0) {
  it.skip(`seeded letter templates not found at ${DEFAULTS_DIR}`, () => {});
} else {
  it("covers every seeded template", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it("exercises block and inline else branches", () => {
    const read = (file) => describeConditionals(fs.readFileSync(path.join(DEFAULTS_DIR, file), "utf8")).sections;
    expect(read("offer.html")).toContainEqual(expect.objectContaining({ field: "offerExpiryDate", kind: "block", branch: "else" }));
    expect(read("consultancy-agreement.html")).toContainEqual(
      expect.objectContaining({ field: "scopeOfWork", kind: "inline", branch: "else" })
    );
  });

  describe.each(files)("%s", (file) => {
    const html = fs.readFileSync(path.join(DEFAULTS_DIR, file), "utf8");

    it("opens in the visual editor", () => {
      expect(getEditorMode(html)).toBe("rich");
    });

    it("round-trips through the editor without losing meaning", () => {
      const output = roundTrip(html);
      expect(getEditorMode(output)).toBe("rich");
      expect(placeholderKeys(output)).toEqual(placeholderKeys(html));
      const before = describeConditionals(html);
      const after = describeConditionals(output);
      expect(after.sections).toEqual(before.sections);
      expect(after.outside).toEqual(before.outside);
    });

    it("keeps letter layout classes on the same tags, and inline spans", () => {
      const classed = (s) => [...s.matchAll(/<([a-z0-9]+)\b[^>]*\bclass="([^"]+)"/g)].map((m) => `${m[1]}.${m[2]}`).sort();
      const spans = (s) => (s.match(/<span\b/g) || []).length;
      const output = roundTrip(html);
      expect(classed(output)).toEqual(classed(html));
      expect(spans(output)).toBe(spans(html));
    });

    it("is stable when saved twice", () => {
      const once = roundTrip(html);
      expect(roundTrip(once)).toBe(once);
    });
  });
}
