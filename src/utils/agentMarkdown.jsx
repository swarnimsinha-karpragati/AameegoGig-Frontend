import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

// Tiny markdown renderer for agent chat bubbles — tables, **bold**, _italic_,
// and bullet lists. Deliberately NOT react-markdown (no new dependency):
// the agent only ever emits these constructs.
// SAFE: builds React elements from strings (React escapes text by default),
// so chat content can never inject HTML.

const TABLE_LINE = /^\s*\|.*\|\s*$/;
const SEPARATOR_CELLS = /^\s*:?-{1,}:?\s*$/;
const BULLET_LINE = /^\s*[-*•]\s+/;
// Long tables collapse to this many body rows + a working "Show all" button.
const COLLAPSED_ROWS = 10;

// Copyable chip emitted by the payroll agent as [[copy:VALUE]] — used for
// employee codes and salary-structure names so users can paste them back.
function CopyChip({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      className="agent-md-copy"
      onClick={handleCopy}
      title={`Copy ${value}`}
    >
      <span>{value}</span>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// **bold** and _italic_ -> elements. Unmatched markers left as-is.
// Italic needs word boundaries so snake_case or a_b stays literal.
function inlineFormat(text, keyPrefix) {
  const tokens = String(text).split(
    /(\*\*[^*]+\*\*|_[^_\n]+_|\[\[copy:[^\]]+\]\])/g
  );
  if (tokens.length === 1) return text;
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-f${i}`;
    const copyMatch = tok.match(/^\[\[copy:(.+)\]\]$/);
    if (copyMatch) {
      return <CopyChip key={key} value={copyMatch[1].trim()} />;
    }
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return <strong key={key}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith("_") && tok.endsWith("_") && tok.length > 2) {
      return <em key={key}>{tok.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{tok}</React.Fragment>;
  });
}

function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
}

function isSeparator(line) {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => SEPARATOR_CELLS.test(c));
}

function renderTable(lines, key) {
  // Drop the |---|---| separator row; first remaining row is the header.
  const dataRows = lines.filter((l) => !isSeparator(l));
  if (dataRows.length === 0) return null;
  const [head, ...body] = dataRows.map(splitRow);
  return <AgentTable key={key} tableKey={key} head={head} body={body} />;
}

// Long tables start collapsed (first N rows + "Show all M" button) so a
// 60-person report doesn't flood the chat — every row stays one click away.
function AgentTable({ tableKey, head, body }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = body.length > COLLAPSED_ROWS;
  const visible = expanded || !collapsible ? body : body.slice(0, COLLAPSED_ROWS);
  return (
    <>
      <table className="agent-md-table">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th key={i}>{inlineFormat(cell, `${tableKey}-h${i}`)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i}>{inlineFormat(cell, `${tableKey}-r${r}c${i}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {collapsible && (
        <button
          type="button"
          className="agent-table-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show all ${body.length} rows`}
        </button>
      )}
    </>
  );
}

// Plain text -> React nodes: tables, bullet lists, paragraphs with **bold**.
export function renderAgentMessage(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (TABLE_LINE.test(line)) {
      // Consecutive |...| lines form one table block.
      const tableLines = [];
      while (i < lines.length && TABLE_LINE.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const table = renderTable(tableLines, `tbl${blocks.length}`);
      if (table) blocks.push(table);
    } else if (BULLET_LINE.test(line)) {
      const items = [];
      while (i < lines.length && BULLET_LINE.test(lines[i])) {
        items.push(lines[i].replace(BULLET_LINE, ""));
        i += 1;
      }
      blocks.push(
        <ul key={`ul${blocks.length}`} className="agent-md-list">
          {items.map((item, k) => (
            <li key={k}>{inlineFormat(item, `ul${blocks.length}i${k}`)}</li>
          ))}
        </ul>
      );
    } else if (line.trim() === "") {
      i += 1; // blank line = spacing, nothing to render
    } else {
      blocks.push(
        <p key={`p${blocks.length}`} className="agent-md-p">
          {inlineFormat(line, `p${blocks.length}`)}
        </p>
      );
      i += 1;
    }
  }
  return blocks;
}
