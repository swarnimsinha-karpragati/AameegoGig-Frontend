const PLACEHOLDER_RE = /(\{\{\{?)\s*([A-Za-z_][\w.]*)\s*(\}\}\}?)/g;
const HELPER_TOKEN_RE = /(\{\{\s*(?:[#^/>!][^}]*|else\b[^}]*)\}\})/;
const HELPER_EXACT_RE = /^\{\{\s*(?:[#^/>!][^}]*|else\b[^}]*)\}\}$/;
const IF_OPEN_RE = /^\{\{\s*#if\s+([A-Za-z_][\w.]*)\s*\}\}$/;
const IF_CLOSE_RE = /^\{\{\s*\/if\s*\}\}$/;
const ELSE_RE = /^\{\{\s*else\s*\}\}$/;
const VOID_TAGS = new Set(["area", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "wbr"]);
const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "body", "div", "dl", "dd", "dt", "figure", "footer", "h1", "h2",
  "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "ol", "p", "pre", "section", "table", "tbody", "td",
  "tfoot", "th", "thead", "tr", "ul",
]);
// Elements whose children must be rows, cells or list items: no text or sections can sit directly inside.
const STRUCTURED_CONTAINERS = new Set(["colgroup", "dl", "ol", "table", "tbody", "tfoot", "thead", "tr", "ul"]);
const STRUCTURED_PARTS = new Set(["caption", "col", "colgroup", "dd", "dt", "li", "tbody", "td", "tfoot", "th", "thead", "tr"]);
// Containers where a block section (a wrapper around whole blocks) is valid editor content.
const BLOCK_SECTION_CONTAINERS = new Set([
  "#root", "address", "article", "aside", "blockquote", "body", "div", "figure", "footer", "header", "main", "section",
  "td", "th",
]);

const escapeAttr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const escapeHtmlText = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\u00a0/g, "&nbsp;");

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
const decodeEntities = (value) =>
  String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (full, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : full;
    }
    return ENTITIES[code.toLowerCase()] ?? full;
  });

const splitTags = (html) => String(html || "").split(/(<[^>]+>)/g);

/** Unique placeholder keys used in a template, ignoring block helpers like {{#if}}. */
export const extractPlaceholderKeys = (html) => {
  const keys = new Set();
  splitTags(html).forEach((part) => {
    if (part.startsWith("<")) return;
    for (const match of part.matchAll(PLACEHOLDER_RE)) {
      if (match[2] !== "else") keys.add(match[2]);
    }
  });
  return [...keys];
};

const wrapChipsInText = (text) =>
  text.replace(PLACEHOLDER_RE, (full, open, key, close) => {
    if (key === "else") return full;
    const raw = open.length === 3 && close.length === 3;
    return `<span data-placeholder="${escapeAttr(key)}"${raw ? ' data-raw="true"' : ""}>${full}</span>`;
  });

/** Turns {{key}} text into chip spans the editor renders as non-editable tokens. */
export const wrapPlaceholders = (html) =>
  splitTags(html)
    .map((part) => (part.startsWith("<") ? part : wrapChipsInText(part)))
    .join("");

const tagToken = (raw) => {
  const match = raw.match(/^<(\/?)([a-zA-Z][\w-]*)/);
  if (!match) return { type: "other", raw };
  const name = match[2].toLowerCase();
  if (match[1]) return { type: "close", name, raw };
  return { type: VOID_TAGS.has(name) || /\/>$/.test(raw) ? "void" : "open", name, raw };
};

const helperToken = (raw) => {
  const open = raw.match(IF_OPEN_RE);
  if (open) return { type: "if", field: open[1], raw };
  if (IF_CLOSE_RE.test(raw)) return { type: "endif", raw };
  if (ELSE_RE.test(raw)) return { type: "else", raw };
  return { type: "helper", raw };
};

const tokenize = (html) =>
  splitTags(html).flatMap((part) => {
    if (!part) return [];
    if (part.startsWith("<")) return [tagToken(part)];
    return part
      .split(HELPER_TOKEN_RE)
      .filter(Boolean)
      .map((piece) => (HELPER_EXACT_RE.test(piece) ? helperToken(piece) : { type: "text", raw: piece }));
  });

const isBlank = (token) => token.type === "text" && !token.raw.trim();

const fallbackChip = (tokens, i) => {
  const [open, value, otherwise, text, close] = tokens.slice(i, i + 5);
  if (open?.type !== "if" || value?.type !== "text" || otherwise?.type !== "else") return null;
  if (text?.type !== "text" || close?.type !== "endif" || /[{}]/.test(text.raw)) return null;
  const valueMatch = value.raw.match(/^\{\{\s*([A-Za-z_][\w.]*)\s*\}\}$/);
  if (!valueMatch || valueMatch[1] !== open.field) return null;
  return {
    type: "fallback",
    raw: `<span data-placeholder="${escapeAttr(open.field)}" data-fallback="${text.raw.replace(/"/g, "&quot;")}">{{${open.field}}}</span>`,
  };
};

const prevSolid = (tokens, i) => {
  let prev = i - 1;
  while (prev >= 0 && isBlank(tokens[prev])) prev -= 1;
  return tokens[prev];
};
const nextSolid = (tokens, i) => {
  let next = i + 1;
  while (next < tokens.length && isBlank(tokens[next])) next += 1;
  return { token: tokens[next], index: next };
};
const isBlockTag = (token) => (token?.type === "open" || token?.type === "close") && BLOCK_TAGS.has(token.name);
const opensBlock = (token) => token?.type === "open" && BLOCK_TAGS.has(token.name);

/**
 * True when the `{{#if}}` at `i` (and its `{{else}}` at `elseAt`, if any) stand alone between
 * block-level tags (or directly after the `{{/if}}` of a block section), so each branch can wrap
 * whole blocks.
 */
const isBlockSection = (tokens, i, elseAt, previousBlockEnd) => {
  const before = prevSolid(tokens, i);
  if (before && !isBlockTag(before) && before !== previousBlockEnd) return false;
  const after = nextSolid(tokens, i);
  if (elseAt == null) return opensBlock(after.token);
  if (after.index === elseAt) return opensBlock(nextSolid(tokens, elseAt).token);
  if (!opensBlock(after.token)) return false;
  const beforeElse = prevSolid(tokens, elseAt);
  const afterElse = nextSolid(tokens, elseAt).token;
  return isBlockTag(beforeElse) && (opensBlock(afterElse) || afterElse?.type === "endif");
};

/** Tags inside a section must open and close within it; inline sections may not contain blocks. */
const sectionIsBalanced = (inner, inline) => {
  let depth = 0;
  for (const token of inner) {
    if (inline && (token.type === "open" || token.type === "close" || token.type === "void") && BLOCK_TAGS.has(token.name)) {
      return false;
    }
    if (token.type === "open") depth += 1;
    if (token.type === "close") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
};

/** True when a branch puts rows, cells or list items at its top level, which no section can wrap. */
const startsStructuredPart = (inner) => {
  let depth = 0;
  return inner.some((token) => {
    const top = depth === 0;
    if (token.type === "open") depth += 1;
    if (token.type === "close") depth -= 1;
    return top && token.type === "open" && STRUCTURED_PARTS.has(token.name);
  });
};

const trimEdges = (tokens) => {
  let start = 0;
  let end = tokens.length;
  while (start < end && isBlank(tokens[start])) start += 1;
  while (end > start && isBlank(tokens[end - 1])) end -= 1;
  return tokens.slice(start, end);
};

const branchMarkup = (field, branch, block) => {
  const attr = escapeAttr(field);
  const branchAttr = branch === "else" ? ' data-branch="else"' : "";
  return block
    ? [`<div data-if-block="${attr}"${branchAttr}>`, "</div>"]
    : [`<span data-if="${attr}"${branchAttr}>`, "</span>"];
};

/**
 * Converts supported Handlebars into editor markup:
 * 1. `{{#if K}}{{K}}{{else}}TEXT{{/if}}` (plain TEXT) → fallback chip,
 * 3. `{{#if K}}` [`{{else}}`] `{{/if}}` standing between block tags → then/else `<div data-if-block>`,
 * 2. `{{#if K}}` [`{{else}}`] `{{/if}}` inside one block → then/else `<span data-if>`.
 * Returns null when anything else is present, so the whole template stays in HTML view.
 */
const convertForEditor = (html) => {
  if (/\{\{~|~\}\}/.test(html)) return null;
  const tokens = tokenize(html);
  const flat = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const chip = fallbackChip(tokens, i);
    if (chip) {
      flat.push(chip);
      i += 4;
    } else {
      flat.push(tokens[i]);
    }
  }
  if (flat.some((t) => t.type === "helper")) return null;

  const emit = (out, token) => out.push(token.type === "text" ? wrapChipsInText(token.raw) : token.raw);
  const out = [];
  const open = [];
  const container = () => open[open.length - 1] ?? "#root";
  let previousBlockEnd = null;
  // Inline content standing alone between blocks would be wrapped in a new paragraph by the editor.
  const isLooseBetweenBlocks = (start, end) => {
    const before = prevSolid(flat, start);
    const after = nextSolid(flat, end).token;
    return (before?.type === "close" && BLOCK_TAGS.has(before.name)) || (before && before === previousBlockEnd) || opensBlock(after);
  };
  for (let i = 0; i < flat.length; i += 1) {
    const token = flat[i];
    if (token.type === "endif" || token.type === "else") return null;
    // Content directly inside table/list structure would be hoisted out of it by the editor.
    if ((token.type === "text" && !isBlank(token)) || token.type === "fallback") {
      if (STRUCTURED_CONTAINERS.has(container())) return null;
    }
    if (token.type === "fallback" && isLooseBetweenBlocks(i, i)) return null;
    if (token.type !== "if") {
      if (token.type === "open") open.push(token.name);
      if (token.type === "close") {
        const at = open.lastIndexOf(token.name);
        if (at >= 0) open.length = at;
      }
      emit(out, token);
      continue;
    }
    if (STRUCTURED_CONTAINERS.has(container())) return null;
    let end = i + 1;
    let elseAt = null;
    while (end < flat.length && flat[end].type !== "endif") {
      if (flat[end].type === "if") return null;
      if (flat[end].type === "else") {
        if (elseAt != null) return null;
        elseAt = end;
      }
      end += 1;
    }
    if (end >= flat.length) return null;
    const block = isBlockSection(flat, i, elseAt, previousBlockEnd);
    if (block && !BLOCK_SECTION_CONTAINERS.has(container())) return null;
    if (!block && isLooseBetweenBlocks(i, end)) return null;
    previousBlockEnd = block ? flat[end] : null;
    const branches = [
      ["then", flat.slice(i + 1, elseAt ?? end)],
      ["else", elseAt == null ? [] : flat.slice(elseAt + 1, end)],
    ].map(([branch, inner]) => [branch, block ? trimEdges(inner) : inner]);
    if (branches.some(([, inner]) => !sectionIsBalanced(inner, !block) || startsStructuredPart(inner))) return null;
    branches.forEach(([branch, inner]) => {
      if (!inner.length) return;
      const [open, close] = branchMarkup(token.field, branch, block);
      out.push(open);
      inner.forEach((t) => emit(out, t));
      out.push(close);
    });
    i = end;
  }
  return out.join("");
};

/**
 * Templates whose Handlebars the visual editor cannot represent (loops, inverse sections,
 * `{{else if}}`, nested conditions, conditions that cut across tags) must be edited as HTML source.
 */
export const getEditorMode = (html) => (convertForEditor(String(html || "")) === null ? "source" : "rich");

/** Stored template HTML → editor HTML with chips and optional-section markup. */
export const wrapForEditor = (html) => {
  const source = String(html || "");
  return convertForEditor(source) ?? wrapPlaceholders(source);
};

const readAttr = (tag, name) => {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? decodeEntities(match[1]) : null;
};

/**
 * Emits the opening of a then/else section. `out` holds strings plus section objects that mark
 * a just-closed section (rendered as `{{/if}}`), so an adjacent then + else pair with the same
 * field becomes one `{{#if}}…{{else}}…{{/if}}`, adjacent inline runs of one branch merge, and a
 * lone else becomes `{{#if K}}{{else}}…{{/if}}`.
 */
const openSection = (out, { field, block, branch }) => {
  const last = out[out.length - 1];
  const follows = typeof last === "object" && last.field === field && last.block === block;
  const nl = block ? "\n" : "";
  if (follows && branch === "else" && last.branch === "then") {
    out.pop();
    out.push(`${nl}{{else}}${nl}`);
  } else if (follows && !block && branch === last.branch) {
    out.pop();
  } else {
    out.push(branch === "else" ? `{{#if ${field}}}{{else}}${nl}` : `{{#if ${field}}}${nl}`);
  }
};

/** Editor HTML → stored Handlebars HTML (inverse of `wrapForEditor`). */
export const unwrapFromEditor = (html) => {
  const tokens = splitTags(html).filter(Boolean);
  const out = [];
  const stack = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const part = tokens[i];
    if (!part.startsWith("<")) {
      out.push(part);
      continue;
    }
    const tag = tagToken(part);
    if (tag.type === "open" && tag.name === "span" && readAttr(part, "data-placeholder") != null) {
      const key = readAttr(part, "data-placeholder");
      const fallback = readAttr(part, "data-fallback");
      if (fallback != null) out.push(`{{#if ${key}}}{{${key}}}{{else}}${escapeHtmlText(fallback)}{{/if}}`);
      else out.push(placeholderToken(key, readAttr(part, "data-raw") === "true"));
      let depth = 1;
      while (depth > 0 && i + 1 < tokens.length) {
        i += 1;
        if (/^<span\b/i.test(tokens[i])) depth += 1;
        else if (/^<\/span>/i.test(tokens[i])) depth -= 1;
      }
      continue;
    }
    const inlineField = tag.type === "open" && tag.name === "span" ? readAttr(part, "data-if") : null;
    const blockField = tag.type === "open" && tag.name === "div" ? readAttr(part, "data-if-block") : null;
    if (inlineField != null || blockField != null) {
      const section = {
        field: inlineField ?? blockField,
        block: blockField != null,
        branch: readAttr(part, "data-branch") === "else" ? "else" : "then",
      };
      openSection(out, section);
      stack.push(section);
      continue;
    }
    if (tag.type === "open") stack.push(tag.name);
    if (tag.type === "close" && typeof stack[stack.length - 1] === "object") {
      out.push(stack.pop());
      continue;
    }
    if (tag.type === "close") stack.pop();
    out.push(part);
  }
  // The editor keeps an empty paragraph after a trailing table/div so the user can type below it.
  return out
    .map((item) => (typeof item === "string" ? item : item.block ? "\n{{/if}}" : "{{/if}}"))
    .join("")
    .replace(/(?:<p><\/p>)+$/, "");
};

export const placeholderToken = (key, raw = false) => (raw ? `{{{${key}}}}` : `{{${key}}}`);

/** "managerName" / "manager_name" → "Manager name", for keys that have no catalog label. */
export const humanizeDetailKey = (key) => {
  const words = String(key || "")
    .replace(/_+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Acronyms such as CTC or PAN stay in capitals.
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()));
  const text = words.join(" ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
};

/** What users see for a detail: its catalog label when known, otherwise the humanized key. */
export const detailDisplayName = (key, labels = {}) => labels?.[key] || humanizeDetailKey(key);

const MUSTACHE_SPLIT_RE = /(\{\{\{?[^{}]*\}?\}\})/;
// Mirrors the backend CONDITIONAL_HELPERS; Handlebars `with` is disabled there.
const CONDITION_FIELD_RE = /\{\{\s*#(?:if|unless)\s+([A-Za-z_][\w.]*)\s*\}\}/g;
// Marks where removed content was, so only paragraphs the removal emptied are dropped.
const REMOVED = "\u0000";
const EMPTIED_BLOCK_RE = new RegExp(`<(p|h[1-6]|li)\\b[^>]*>(?:\\s|&nbsp;|\u00a0|<br\\s*/?>)*${REMOVED}(?:\\s|&nbsp;|\u00a0|<br\\s*/?>|${REMOVED})*</\\1>`, "gi");

/** Keys the letter uses as chips or as `{{#if}}` / `{{#unless}}` conditions. */
export const usedFieldKeys = (html) => {
  const source = String(html || "");
  return new Set([...extractPlaceholderKeys(source), ...[...source.matchAll(CONDITION_FIELD_RE)].map((match) => match[1])]);
};

const BLOCK_OPEN_RE = /^\{\{\s*#/;
const BLOCK_CLOSE_RE = /^\{\{\s*\//;
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripField = (source, key) => {
  const name = escapeRegExp(key);
  const chipRe = new RegExp(`^\\{\\{\\{?\\s*${name}\\s*\\}?\\}\\}$`);
  const ownConditionRe = new RegExp(`^\\{\\{\\s*#(if|unless)\\s+${name}\\s*\\}\\}$`);
  const pieces = source.split(MUSTACHE_SPLIT_RE);
  const out = [];
  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (chipRe.test(piece)) {
      out.push(REMOVED);
      continue;
    }
    const condition = ownConditionRe.exec(piece);
    if (!condition) {
      out.push(piece);
      continue;
    }
    let depth = 1;
    let elseAt = -1;
    let end = i + 1;
    for (; end < pieces.length; end += 1) {
      if (BLOCK_OPEN_RE.test(pieces[end])) depth += 1;
      else if (BLOCK_CLOSE_RE.test(pieces[end])) depth -= 1;
      else if (depth === 1 && ELSE_RE.test(pieces[end])) elseAt = end;
      if (depth === 0) break;
    }
    if (end >= pieces.length) {
      out.push(piece);
      continue;
    }
    out.push(REMOVED);
    // With the question gone its value is always empty: `if` shows its else part, `unless` its main part.
    const mainPart = pieces.slice(i + 1, elseAt >= 0 ? elseAt : end);
    const elsePart = elseAt >= 0 ? pieces.slice(elseAt + 1, end) : [];
    const kept = condition[1] === "unless" ? mainPart : elsePart;
    if (kept.length) out.push(stripField(kept.join(""), key));
    i = end;
  }
  return out.join("");
};

/**
 * Removes every chip for `key` and every `{{#if key}}` / `{{#unless key}}` section (keeping the
 * part shown when the value is empty), so deleting a question never leaves references the server
 * would reject.
 */
export const removeFieldFromHtml = (html, key) => {
  const source = String(html || "");
  if (!key || !usedFieldKeys(source).has(key)) return source;
  return stripField(source, key).replace(EMPTIED_BLOCK_RE, "").split(REMOVED).join("");
};
