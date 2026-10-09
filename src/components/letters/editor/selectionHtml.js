import { DOMSerializer } from "@tiptap/pm/model";
import { unwrapFromEditor } from "../../../utils/letterPlaceholders";

/** Stored template HTML (with {{details}}) for the document range from..to. */
export const rangeToStoredHtml = (editor, from, to) => {
  const slice = editor.state.doc.slice(from, to);
  const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content);
  const container = document.createElement("div");
  container.appendChild(fragment);
  return unwrapFromEditor(container.innerHTML);
};

/** Stored template HTML for the current selection, with its range; null when nothing is selected. */
export const selectionToStoredHtml = (editor) => {
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  return { from, to, html: rangeToStoredHtml(editor, from, to) };
};

const BLOCK_TOKEN = /\{\{\s*(?:[#/][^}]*|else)\s*\}\}/g;
const DETAIL_TOKEN = /\{\{\{?\s*([\w.]+)\s*\}?\}\}/g;

/** Plain-text preview of template HTML: details shown as [Label], conditions dropped. */
export const templateTextPreview = (html, labelFor) => {
  const withLabels = String(html || "")
    .replace(BLOCK_TOKEN, "")
    .replace(DETAIL_TOKEN, (_m, key) => `[${labelFor(key)}]`);
  const doc = new DOMParser().parseFromString(withLabels.replace(/<\/(p|div|li|h\d|tr)>/gi, "$&\n"), "text/html");
  return (doc.body.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
};
