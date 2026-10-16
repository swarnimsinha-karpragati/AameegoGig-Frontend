/**
 * Lays out server-rendered letter HTML as the same A4 pages the PDF prints. The page size and
 * margins come from the letter document itself (`--letter-page-*` custom properties next to its
 * @page rule in the backend's letter.css), so the preview cannot drift from the PDF.
 */

export const PAGE_GAP_PX = 24;

const PAGE_VARS = {
  width: "--letter-page-width",
  height: "--letter-page-height",
  top: "--letter-page-margin-top",
  right: "--letter-page-margin-right",
  bottom: "--letter-page-margin-bottom",
  left: "--letter-page-margin-left",
};

const PX_PER_UNIT = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72 };

// Chromium's initial `orphans` / `widows` when it paginates for print.
const ORPHANS = 2;
const WIDOWS = 2;

const MAX_PAGES = 100;
const EPSILON = 0.5;

export const cssLengthToPx = (value) => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)(px|mm|cm|in|pt)?$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!match[2]) return amount === 0 ? 0 : null;
  return amount * PX_PER_UNIT[match[2]];
};

export const readPageGeometry = (getProperty) => {
  const width = cssLengthToPx(getProperty(PAGE_VARS.width));
  const height = cssLengthToPx(getProperty(PAGE_VARS.height));
  if (!width || !height) return null;
  const side = (name) => cssLengthToPx(getProperty(PAGE_VARS[name])) || 0;
  const margin = { top: side("top"), right: side("right"), bottom: side("bottom"), left: side("left") };
  return {
    width,
    height,
    margin,
    contentWidth: width - margin.left - margin.right,
    contentHeight: height - margin.top - margin.bottom,
  };
};

export const fitScale = (availableWidth, pageWidth) => {
  if (!(availableWidth > 0) || !(pageWidth > 0)) return 1;
  return Math.min(1, availableWidth / pageWidth);
};

export const pageTop = (index, geometry, gap) => index * (geometry.height + gap);

export const stackHeight = (pages, geometry, gap) => {
  const count = Math.max(1, pages);
  return count * geometry.height + (count - 1) * gap;
};

/** First line (index) of a block that moves to the next page; 0 means the whole block moves. */
export const lineBreakIndex = ({ lineCount, overflowIndex, orphans = ORPHANS, widows = WIDOWS }) => {
  let index = overflowIndex;
  if (lineCount - index < widows) index = lineCount - widows;
  return index < orphans ? 0 : index;
};

/** Collapses the client rects of a block's inline content into its line boxes, top to bottom. */
export const groupLineBoxes = (rects) => {
  const lines = [];
  [...rects]
    .filter((rect) => rect.height > 0)
    .sort((a, b) => a.top - b.top)
    .forEach((rect) => {
      const middle = (rect.top + rect.bottom) / 2;
      const line = lines.find((l) => middle >= l.top && middle <= l.bottom);
      if (line) {
        line.top = Math.min(line.top, rect.top);
        line.bottom = Math.max(line.bottom, rect.bottom);
      } else {
        lines.push({ top: rect.top, bottom: rect.bottom });
      }
    });
  return lines;
};

const GENERATED = "data-letter-page";
const BLOCK_DISPLAYS = /^(block|flow-root|list-item|table|flex|grid|table-row-group|table-header-group|table-footer-group|table-row|table-caption)$/;
const ROW_GROUPS = new Set(["TABLE", "THEAD", "TBODY", "TFOOT"]);

const isGenerated = (node) => node.nodeType === 1 && node.hasAttribute(GENERATED);

/**
 * Splits the document into pages the way Chromium's print pagination does: a line box, table row,
 * image or `break-inside: avoid` block never straddles a page, paragraphs keep two orphans/widows,
 * forced `break-before: page` is honoured, and the top margin of the first block on a page is
 * dropped. Spacers are inserted at each break so every page starts at its content top, and each
 * `position: fixed` element (footer, watermark) is repeated inside every page's content area as it
 * is in print. Returns null when the document declares no page geometry.
 */
export const paginateLetterDocument = (doc, { gap = PAGE_GAP_PX } = {}) => {
  const win = doc.defaultView;
  if (!win || !doc.body) return null;
  const geometry = readPageGeometry((name) => win.getComputedStyle(doc.documentElement).getPropertyValue(name));
  if (!geometry) return null;

  const { margin, contentHeight } = geometry;
  const style = (el) => win.getComputedStyle(el);
  const scrollY = () => win.scrollY || 0;
  const rectOf = (target) => {
    const rect = target.getBoundingClientRect();
    return { top: rect.top + scrollY(), bottom: rect.bottom + scrollY(), height: rect.height };
  };
  const contentTop = (page) => pageTop(page, geometry, gap) + margin.top;
  const contentBottom = (page) => contentTop(page) + contentHeight;

  doc.documentElement.style.overflow = "hidden";
  doc.body.style.background = "transparent";
  doc.body.style.backgroundColor = "transparent";

  const fixed = [...doc.body.querySelectorAll("*")]
    .filter((el) => style(el).position === "fixed")
    .filter((el, _, all) => !all.some((other) => other !== el && other.contains(el)));
  fixed.forEach((el) => el.remove());

  const isOutOfFlow = (el) => {
    const s = style(el);
    return s.display === "none" || s.position === "absolute" || s.position === "fixed";
  };
  const flowChildren = (el) =>
    [...el.childNodes].filter((n) => (n.nodeType === 1 ? !isGenerated(n) && !isOutOfFlow(n) : n.nodeType === 3 && n.data.trim()));
  const hasBlockChildren = (el) => flowChildren(el).some((n) => n.nodeType === 1 && BLOCK_DISPLAYS.test(style(n).display));
  const isAtomic = (el) => {
    const s = style(el);
    return (
      ["IMG", "SVG", "TR", "HR"].includes(el.tagName.toUpperCase()) ||
      /avoid/.test(s.breakInside || s.pageBreakInside || "") ||
      /^(flex|inline-flex|grid|inline-grid|inline-block)$/.test(s.display)
    );
  };

  const contentEnd = () =>
    flowChildren(doc.body)
      .filter((n) => n.nodeType === 1)
      .reduce((end, el) => Math.max(end, rectOf(el).bottom), 0);

  const halfLeading = (textNode, rect) => {
    const lineHeight = parseFloat(style(textNode.parentElement).lineHeight);
    return Number.isFinite(lineHeight) ? Math.max(0, (lineHeight - rect.height) / 2) : 0;
  };

  // First character (text node + offset) whose glyph box lies on the given line.
  const lineStart = (block, line) => {
    const walker = doc.createTreeWalker(block, 4);
    const range = doc.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement.closest(`[${GENERATED}]`)) continue;
      range.selectNodeContents(node);
      const last = [...range.getClientRects()].pop();
      if (!last || last.bottom + scrollY() <= line.top + EPSILON) continue;
      for (let offset = 0; offset < node.length; offset += 1) {
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        if (rect.height > 0 && rect.top + scrollY() >= line.top - EPSILON && /\S/.test(node.data[offset])) {
          return { node, offset };
        }
      }
    }
    return null;
  };

  const lineBreak = (block, limit) => {
    const range = doc.createRange();
    range.selectNodeContents(block);
    const lines = groupLineBoxes(
      [...range.getClientRects()].map((r) => ({ top: r.top + scrollY(), bottom: r.bottom + scrollY(), height: r.height }))
    );
    const overflow = lines.findIndex((line) => line.bottom > limit + EPSILON);
    if (overflow < 0) return null;
    const index = lineBreakIndex({ lineCount: lines.length, overflowIndex: overflow });
    if (index === 0) return { before: block };
    const start = lineStart(block, lines[index]);
    return start ? { text: start } : { before: block };
  };

  const findBreak = (container, limit) => {
    if (!hasBlockChildren(container)) return lineBreak(container, limit);
    const children = flowChildren(container).filter((n) => n.nodeType === 1);
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      const rect = rectOf(child);
      if (rect.height === 0 || rect.bottom <= limit + EPSILON) continue;
      if (rect.top >= limit - EPSILON || (isAtomic(child) && rect.height <= contentHeight)) {
        return { before: i === 0 && container !== doc.body ? container : child };
      }
      const inner = findBreak(child, limit) || { before: child };
      return inner.before === child && i === 0 && container !== doc.body ? { before: container } : inner;
    }
    return null;
  };

  const findForcedBreak = (page) => {
    const top = contentTop(page) + EPSILON;
    const bottom = contentBottom(page) + EPSILON;
    return [...doc.body.querySelectorAll("*")].find((el) => {
      if (isGenerated(el) || !/^(page|always|left|right)$/.test(style(el).breakBefore || style(el).pageBreakBefore || "")) return false;
      const rect = rectOf(el);
      return rect.top > top && rect.top < bottom;
    });
  };

  const makeSpacer = (reference) => {
    const parent = reference.parentNode;
    if (reference.nodeType === 1 && reference.tagName === "TR" && ROW_GROUPS.has(parent.tagName)) {
      const row = doc.createElement("tr");
      const cell = doc.createElement("td");
      cell.colSpan = [...reference.cells].reduce((sum, c) => sum + c.colSpan, 0) || 1;
      cell.style.cssText = "padding:0;border:0;background:transparent";
      row.appendChild(cell);
      row.setAttribute(GENERATED, "gap");
      return { node: row, sizer: cell };
    }
    const spacer = doc.createElement("span");
    spacer.setAttribute(GENERATED, "gap");
    // Inside a paragraph an inline-block keeps the preceding line soft-wrapped, so it stays justified.
    spacer.style.cssText =
      reference.nodeType === 3
        ? "display:inline-block;width:100%;vertical-align:top;margin:0;padding:0;border:0"
        : "display:block;margin:0;padding:0;border:0";
    return { node: spacer, sizer: spacer };
  };

  const applyBreak = (target, page, forced) => {
    let reference;
    let measure;
    if (target.text) {
      const { node, offset } = target.text;
      reference = offset > 0 ? node.splitText(offset) : node;
      measure = () => {
        const range = doc.createRange();
        range.setStart(reference, 0);
        range.setEnd(reference, Math.min(1, reference.length));
        const rect = range.getBoundingClientRect();
        return rect.top + scrollY() - halfLeading(reference, rect);
      };
    } else {
      reference = target.before;
      measure = () => rectOf(reference).top - (forced ? parseFloat(style(reference).marginTop) || 0 : 0);
    }
    if (measure() <= contentTop(page) + EPSILON) return false;
    const { node, sizer } = makeSpacer(reference);
    reference.parentNode.insertBefore(node, reference);
    const desired = contentTop(page + 1);
    let height = 0;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const delta = desired - measure();
      if (Math.abs(delta) < 0.05) break;
      height = Math.max(0, height + delta);
      sizer.style.height = `${height}px`;
    }
    return true;
  };

  // Content taller than a page that cannot be split (e.g. a huge image) ends pagination there.
  let page = 0;
  while (page < MAX_PAGES - 1) {
    const forced = findForcedBreak(page);
    const limit = contentBottom(page);
    let target = null;
    if (forced) target = { before: forced, forced: true };
    else if (contentEnd() > limit + EPSILON) target = findBreak(doc.body, limit);
    if (!target || !applyBreak(target, page, Boolean(target.forced))) break;
    page += 1;
  }
  // Never clip: unsplittable overflow gets extra sheets even though the PDF may break it differently.
  const end = contentEnd();
  while (page < MAX_PAGES - 1 && end > contentBottom(page) + EPSILON) page += 1;
  const pages = page + 1;

  for (let index = 0; index < pages; index += 1) {
    const area = doc.createElement("div");
    area.setAttribute(GENERATED, "area");
    area.setAttribute(`${GENERATED}-area`, "");
    // A transformed box is the containing block for position: fixed, like the print page area.
    area.style.cssText = `position:absolute;margin:0;padding:0;pointer-events:none;transform:translateZ(0);width:${geometry.contentWidth}px;height:${contentHeight}px`;
    area.style.top = `${contentTop(index)}px`;
    area.style.left = `${margin.left}px`;
    fixed.forEach((el) => area.appendChild(index === 0 ? el : el.cloneNode(true)));
    doc.body.appendChild(area);
  }

  return { pages, geometry, height: stackHeight(pages, geometry, gap) };
};
