import {
  detailDisplayName,
  humanizeDetailKey,
  removeFieldFromHtml,
  usedFieldKeys,
  extractPlaceholderKeys,
  getEditorMode,
  placeholderToken,
  unwrapFromEditor,
  wrapForEditor,
  wrapPlaceholders,
} from "./letterPlaceholders";

describe("extractPlaceholderKeys", () => {
  it("returns unique keys from text, ignoring block helpers and tag attributes", () => {
    const html =
      '<p title="{{notThis}}">Dear {{ employeeName }}, {{employeeName}} joins on {{joiningDate}}</p>{{#if hasBonus}}<p>{{bonus}}</p>{{/if}}{{else}}';
    expect(extractPlaceholderKeys(html)).toEqual(["employeeName", "joiningDate", "bonus"]);
  });

  it("supports triple-stash html placeholders and dotted keys", () => {
    expect(extractPlaceholderKeys("<div>{{{salaryTable}}} {{company.name}}</div>")).toEqual([
      "salaryTable",
      "company.name",
    ]);
  });

  it("handles empty input", () => {
    expect(extractPlaceholderKeys("")).toEqual([]);
    expect(extractPlaceholderKeys(null)).toEqual([]);
  });
});

describe("getEditorMode", () => {
  it("uses rich text for plain templates", () => {
    expect(getEditorMode("<p>Dear {{employeeName}}</p>")).toBe("rich");
  });

  it("keeps rich text when block helpers stay inside a paragraph", () => {
    expect(getEditorMode("<p>{{#if grade}}Grade {{grade}}{{/if}}</p>")).toBe("rich");
  });

  it("switches to source when block helpers sit between elements", () => {
    expect(getEditorMode("<table><tbody>{{#each rows}}<tr><td>{{name}}</td></tr>{{/each}}</tbody></table>")).toBe(
      "source"
    );
    expect(getEditorMode("<p>A</p> {{else}} <p>B</p>")).toBe("source");
  });

  it("keeps rich text for fallback, inline and block optional sections", () => {
    expect(getEditorMode("<p>{{#if a}}{{a}}{{else}}six (6){{/if}} months</p>")).toBe("rich");
    expect(getEditorMode("<p>X{{#if d}} in <strong>{{d}}</strong> dept{{/if}}.</p>")).toBe("rich");
    expect(getEditorMode("<p>A</p>\n{{#if x}}\n<p>B {{x}}</p>\n{{/if}}\n<p>C</p>")).toBe("rich");
    expect(getEditorMode("<div>{{#if s}}\n<h3>T</h3>\n<p>x</p>\n{{s}}\n{{/if}}</div>")).toBe("rich");
  });

  it("keeps rich text for sections inside a single table cell or list item", () => {
    expect(getEditorMode("<table><tbody><tr><td>{{#if t}}x {{t}}{{/if}}</td></tr></tbody></table>")).toBe("rich");
    expect(getEditorMode("<table><tbody><tr><td>{{#if t}}{{t}}{{else}}N/A{{/if}}</td></tr></tbody></table>")).toBe("rich");
    expect(getEditorMode("<table><tbody><tr><td>{{#if t}}<p>x</p>{{/if}}</td></tr></tbody></table>")).toBe("rich");
    expect(getEditorMode("<ul><li>{{#if a}}x{{/if}} y</li></ul>")).toBe("rich");
    expect(getEditorMode("<table>\n  <tbody>\n    <tr>\n      <td>{{x}}</td>\n    </tr>\n  </tbody>\n</table>")).toBe("rich");
    expect(getEditorMode("<ul>\n  <li>{{x}}</li>\n</ul>")).toBe("rich");
    expect(wrapForEditor("<table><tbody><tr><td>{{#if t}}x{{/if}}</td></tr></tbody></table>")).toBe(
      '<table><tbody><tr><td><span data-if="t">x</span></td></tr></tbody></table>'
    );
  });

  it("keeps rich text for then/else sections", () => {
    expect(getEditorMode("<p>A</p>\n{{#if x}}\n<p>B</p>\n{{else}}\n<p>C</p>\n{{/if}}")).toBe("rich");
    expect(getEditorMode("<p>{{#if a}}<strong>{{a}}</strong>{{else}}none{{/if}}</p>")).toBe("rich");
    expect(getEditorMode("<p>{{#if a}}{{b}}{{else}}none{{/if}}</p>")).toBe("rich");
    expect(getEditorMode("<p>{{#if a}}{{a}}{{else}}as {{b}}{{/if}}</p>")).toBe("rich");
    expect(getEditorMode("<p>{{#if a}}{{else}}none{{/if}}</p>")).toBe("rich");
    expect(getEditorMode("<p>A</p>{{#if x}}{{else}}\n<p>C</p>\n{{/if}}")).toBe("rich");
  });

  it.each([
    ["#each", "<ul>{{#each rows}}<li>{{name}}</li>{{/each}}</ul>"],
    ["inverse section", "<p>{{^a}}none{{/a}}</p>"],
    ["#unless", "<p>{{#unless a}}none{{/unless}}</p>"],
    ["else if", "<p>{{#if a}}x{{else if b}}y{{/if}}</p>"],
    ["two else branches", "<p>{{#if a}}x{{else}}y{{else}}z{{/if}}</p>"],
    ["stray else", "<p>A</p> {{else}} <p>B</p>"],
    ["inline else branch with a block tag", "<p>{{#if a}}x{{else}}y</p><p>z{{/if}}</p>"],
    ["block else not between block tags", "<p>A</p>\n{{#if x}}\n<p>B</p>text{{else}}\n<p>C</p>\n{{/if}}"],
    ["inline else branch closing an outer tag", "<p><em>{{#if a}}x{{else}}y</em>{{/if}}</p>"],
    ["nested #if", "<p>{{#if a}}x {{#if b}}y{{/if}}{{/if}}</p>"],
    ["nested #if inside a block", "<p>A</p>{{#if a}}<p>{{#if b}}y{{/if}}</p>{{/if}}<p>B</p>"],
    ["inline section spanning blocks", "<p>{{#if a}}x</p><p>y{{/if}}</p>"],
    ["inline section closing an outer tag", "<p><strong>{{#if a}}x</strong>{{/if}}</p>"],
    ["inline section leaving a tag open", "<p>{{#if a}}<strong>x{{/if}}</strong></p>"],
    ["a section between table rows", "<table><tbody><tr><td>A</td></tr>{{#if a}}<tr><td>x</td></tr>{{/if}}</tbody></table>"],
    ["a section between list items", "<ul>{{#if a}}<li>x</li>{{/if}}<li>y</li></ul>"],
    ["a block section inside a list item", "<ul><li>{{#if a}}<p>x</p>{{/if}}</li></ul>"],
    ["a section whose first tag is a table part", "<div>{{#if a}}<tr><td>x</td></tr>{{/if}}</div>"],
    ["inline text directly inside a list", "<ul>{{#if a}}x{{/if}}<li>y</li></ul>"],
    ["a triple-stash placeholder directly inside tbody", "<table><tbody>{{{salaryRows}}}</tbody></table>"],
    ["a placeholder directly inside a table", "<table>{{rows}}<tr><td>x</td></tr></table>"],
    ["text directly inside a table row", "<table><tbody><tr>Total<td>x</td></tr></tbody></table>"],
    ["text directly inside a list", "<ul>loose<li>y</li></ul>"],
    ["a placeholder directly inside an ordered list", "<ol>{{items}}</ol>"],
    ["a fallback standing between blocks", "<p>A</p>{{#if a}}{{a}}{{else}}N/A{{/if}}<p>B</p>"],
    ["inline text standing between blocks", "<p>A</p>\n{{#if a}}some text{{/if}}\n<p>B</p>"],
    ["whitespace control on #if", "<p>{{~#if a~}}x{{~/if~}}</p>"],
    ["whitespace control on a fallback", "<p>{{#if a~}}{{a}}{{else}}N/A{{/if}}</p>"],
    ["unclosed #if", "<p>{{#if a}}x</p>"],
    ["stray /if", "<p>x{{/if}}</p>"],
  ])("switches to source for %s", (_name, html) => {
    expect(getEditorMode(html)).toBe("source");
  });
});

describe("wrapForEditor", () => {
  it("turns a fallback detail into a chip carrying the fallback text", () => {
    expect(wrapForEditor("<p>{{#if probationMonths}}{{probationMonths}}{{else}}six (6){{/if}} months</p>")).toBe(
      '<p><span data-placeholder="probationMonths" data-fallback="six (6)">{{probationMonths}}</span> months</p>'
    );
  });

  it("escapes quotes in fallback text without double-escaping entities", () => {
    expect(wrapForEditor('<td>{{#if t}}{{t}}{{else}}Terms &amp; "conditions"{{/if}}</td>')).toBe(
      '<td><span data-placeholder="t" data-fallback="Terms &amp; &quot;conditions&quot;">{{t}}</span></td>'
    );
  });

  it("marks inline optional text, keeping chips and inline tags inside", () => {
    expect(wrapForEditor("<p>As <strong>{{d}}</strong>{{#if dept}} in the <strong>{{dept}}</strong> team{{/if}}.</p>")).toBe(
      '<p>As <strong><span data-placeholder="d">{{d}}</span></strong><span data-if="dept"> in the <strong><span data-placeholder="dept">{{dept}}</span></strong> team</span>.</p>'
    );
  });

  it("allows line breaks inside an inline optional section", () => {
    expect(wrapForEditor("<div>To<br>\n  {{#if addr}}{{addr}}<br>{{/if}}\n</div>")).toBe(
      '<div>To<br>\n  <span data-if="addr"><span data-placeholder="addr">{{addr}}</span><br></span>\n</div>'
    );
  });

  it("wraps block optional sections standing between block tags", () => {
    expect(wrapForEditor("<p>A</p>\n{{#if x}}\n<p>B {{x}}</p>\n{{/if}}\n<p>C</p>")).toBe(
      '<p>A</p>\n<div data-if-block="x"><p>B <span data-placeholder="x">{{x}}</span></p></div>\n<p>C</p>'
    );
  });

  it("keeps a fallback detail usable inside an optional section", () => {
    expect(wrapForEditor("<p>A</p>{{#if x}}<p>{{#if y}}{{y}}{{else}}none{{/if}}</p>{{/if}}")).toBe(
      '<p>A</p><div data-if-block="x"><p><span data-placeholder="y" data-fallback="none">{{y}}</span></p></div>'
    );
  });

  it("splits a block if/else into then and else blocks", () => {
    expect(wrapForEditor("<p>A</p>\n{{#if x}}\n<p>B {{x}}</p>\n{{else}}\n<p>C</p>\n{{/if}}\n<p>D</p>")).toBe(
      '<p>A</p>\n<div data-if-block="x"><p>B <span data-placeholder="x">{{x}}</span></p></div><div data-if-block="x" data-branch="else"><p>C</p></div>\n<p>D</p>'
    );
  });

  it("splits an inline if/else whose else text has a detail into then and else runs", () => {
    expect(wrapForEditor("<p>{{#if scope}}{{scope}}{{else}}As <strong>{{designation}}</strong>.{{/if}}</p>")).toBe(
      '<p><span data-if="scope"><span data-placeholder="scope">{{scope}}</span></span><span data-if="scope" data-branch="else">As <strong><span data-placeholder="designation">{{designation}}</span></strong>.</span></p>'
    );
  });

  it("treats a block section that directly follows another block section as a block", () => {
    expect(wrapForEditor("<p>A</p>\n{{#if x}}\n<p>B</p>\n{{/if}}\n{{#if y}}\n<p>C</p>\n{{/if}}")).toBe(
      '<p>A</p>\n<div data-if-block="x"><p>B</p></div>\n<div data-if-block="y"><p>C</p></div>'
    );
    expect(getEditorMode("<p>x{{#if a}}y{{/if}}{{#if b}}<p>z</p>{{/if}}</p>")).toBe("source");
  });

  it("represents a lone else branch without a then section", () => {
    expect(wrapForEditor("<p>{{#if a}}{{else}}none{{/if}}</p>")).toBe('<p><span data-if="a" data-branch="else">none</span></p>');
    expect(wrapForEditor("<p>A</p>{{#if x}}{{else}}\n<p>C</p>\n{{/if}}")).toBe(
      '<p>A</p><div data-if-block="x" data-branch="else"><p>C</p></div>'
    );
  });

  it("leaves source-only templates as plain chips", () => {
    const html = "<ul>{{#each rows}}<li>{{name}}</li>{{/each}}</ul>";
    expect(wrapForEditor(html)).toBe(wrapPlaceholders(html));
  });
});

describe("unwrapFromEditor", () => {
  it("restores fallback chips to the exact handlebars pattern", () => {
    const editorHtml =
      '<p><span data-placeholder="probationMonths" data-fallback="six (6)" class="wz-letter-chip">Probation · or “six (6)”</span> months</p>';
    expect(unwrapFromEditor(editorHtml)).toBe("<p>{{#if probationMonths}}{{probationMonths}}{{else}}six (6){{/if}} months</p>");
  });

  it("re-escapes fallback text as HTML", () => {
    const editorHtml = '<p><span data-placeholder="t" data-fallback="Terms &amp; &quot;more&quot; &lt;x&gt;">T</span></p>';
    expect(unwrapFromEditor(editorHtml)).toBe('<p>{{#if t}}{{t}}{{else}}Terms &amp; "more" &lt;x&gt;{{/if}}</p>');
  });

  it("restores inline optional marks and merges adjacent runs of the same detail", () => {
    const editorHtml =
      '<p>A<span data-if="dept" class="wz-cond-inline"> in </span><span data-if="dept"><span data-placeholder="dept">Dept</span></span> B<span data-if="x">y</span><span data-if="z">w</span></p>';
    expect(unwrapFromEditor(editorHtml)).toBe("<p>A{{#if dept}} in {{dept}}{{/if}} B{{#if x}}y{{/if}}{{#if z}}w{{/if}}</p>");
  });

  it("restores block optional sections on their own lines", () => {
    const editorHtml = '<p>A</p><div data-if-block="x" class="wz-cond-block"><p>B</p><div class="row"><p>C</p></div></div><p>D</p>';
    expect(unwrapFromEditor(editorHtml)).toBe('<p>A</p>{{#if x}}\n<p>B</p><div class="row"><p>C</p></div>\n{{/if}}<p>D</p>');
  });

  it("restores an adjacent then/else block pair as one if/else", () => {
    const editorHtml =
      '<p>A</p><div data-if-block="x" class="wz-cond-block"><p>B</p></div><div data-if-block="x" data-branch="else" class="wz-cond-block is-else"><p>C</p></div>';
    expect(unwrapFromEditor(editorHtml)).toBe("<p>A</p>{{#if x}}\n<p>B</p>\n{{else}}\n<p>C</p>\n{{/if}}");
  });

  it("restores lone or unpaired else blocks inside the supported grammar", () => {
    expect(unwrapFromEditor('<div data-if-block="x" data-branch="else"><p>C</p></div>')).toBe("{{#if x}}{{else}}\n<p>C</p>\n{{/if}}");
    expect(
      unwrapFromEditor('<div data-if-block="x"><p>B</p></div><div data-if-block="y" data-branch="else"><p>C</p></div>')
    ).toBe("{{#if x}}\n<p>B</p>\n{{/if}}{{#if y}}{{else}}\n<p>C</p>\n{{/if}}");
  });

  it("restores inline then/else runs and lone else runs", () => {
    expect(
      unwrapFromEditor('<p><span data-if="a">x</span><span data-if="a" data-branch="else">y </span><span data-if="a" data-branch="else"><strong>z</strong></span></p>')
    ).toBe("<p>{{#if a}}x{{else}}y <strong>z</strong>{{/if}}</p>");
    expect(unwrapFromEditor('<p>Hi <span data-if="a" data-branch="else">none</span></p>')).toBe("<p>Hi {{#if a}}{{else}}none{{/if}}</p>");
  });

  it("restores raw chips and drops an empty document", () => {
    expect(unwrapFromEditor('<div><span data-placeholder="salaryTable" data-raw="true">Salary</span></div>')).toBe(
      "<div>{{{salaryTable}}}</div>"
    );
    expect(unwrapFromEditor("<p></p>")).toBe("");
  });

  it("drops the empty paragraph the editor keeps after a trailing block", () => {
    expect(unwrapFromEditor('<p>A</p><div class="sig">B</div><p></p>')).toBe('<p>A</p><div class="sig">B</div>');
    expect(unwrapFromEditor("<p></p><p>A</p>")).toBe("<p></p><p>A</p>");
  });

  it.each([
    "<p>Dear {{employeeName}},</p><div>{{{salaryTable}}}</div>",
    "<p>{{#if a}}{{a}}{{else}}six (6){{/if}} months</p>",
    "<p>X{{#if d}} in <strong>{{d}}</strong> dept{{/if}}.</p>",
    "<p>A</p>\n{{#if x}}\n<p>B {{x}}</p>\n{{/if}}\n<p>C</p>",
    "<p>A</p>\n{{#if x}}\n<p>B</p>\n{{else}}\n<p>C</p>\n{{/if}}\n<p>D</p>",
    "<p>{{#if a}}<strong>{{a}}</strong>{{else}}as {{b}}{{/if}}</p>",
    "<p>{{#if a}}{{else}}none{{/if}}</p>",
    "<p>A</p>{{#if x}}{{else}}\n<p>C</p>\n{{/if}}",
    "<p>plain text only</p>",
  ])("round-trips %s", (html) => {
    expect(unwrapFromEditor(wrapForEditor(html))).toBe(html);
  });
});

describe("wrapPlaceholders / unwrapFromEditor", () => {
  it("round-trips escaped and raw placeholders", () => {
    const html = "<p>Dear {{employeeName}},</p><div>{{{salaryTable}}}</div>";
    const wrapped = wrapPlaceholders(html);
    expect(wrapped).toContain('<span data-placeholder="employeeName">{{employeeName}}</span>');
    expect(wrapped).toContain('<span data-placeholder="salaryTable" data-raw="true">{{{salaryTable}}}</span>');
    expect(unwrapFromEditor(wrapped)).toBe(html);
  });

  it("does not touch attributes or {{else}}", () => {
    const html = '<p data-x="{{employeeName}}">{{#if a}}x{{else}}y{{/if}}</p>';
    expect(wrapPlaceholders(html)).toBe(html);
  });

  it("unwraps chip spans whatever their inner content or extra attributes", () => {
    const editorOutput = '<p><span class="wz-chip" data-placeholder="designation" contenteditable="false">Designation</span></p>';
    expect(unwrapFromEditor(editorOutput)).toBe("<p>{{designation}}</p>");
  });
});

describe("placeholderToken", () => {
  it("builds escaped and raw tokens", () => {
    expect(placeholderToken("employeeName")).toBe("{{employeeName}}");
    expect(placeholderToken("salaryTable", true)).toBe("{{{salaryTable}}}");
  });
});

describe("detail names", () => {
  it("humanizes camelCase and snake_case keys", () => {
    expect(humanizeDetailKey("managerName")).toBe("Manager name");
    expect(humanizeDetailKey("dateOfJoining")).toBe("Date of joining");
    expect(humanizeDetailKey("employee_code")).toBe("Employee code");
    expect(humanizeDetailKey("ctc2026Amount")).toBe("Ctc 2026 amount");
    expect(humanizeDetailKey("annualCTC")).toBe("Annual CTC");
    expect(humanizeDetailKey("CTCAmount")).toBe("CTC amount");
    expect(humanizeDetailKey("employeePAN_number")).toBe("Employee PAN number");
    expect(humanizeDetailKey("A")).toBe("A");
    expect(humanizeDetailKey("")).toBe("");
    expect(humanizeDetailKey(undefined)).toBe("");
  });

  it("prefers the catalog label when the key is known", () => {
    expect(detailDisplayName("employeeName", { employeeName: "Employee name (full)" })).toBe("Employee name (full)");
    expect(detailDisplayName("managerName", { employeeName: "Employee name" })).toBe("Manager name");
    expect(detailDisplayName("managerName")).toBe("Manager name");
  });
});

describe("removeFieldFromHtml", () => {
  it("removes plain and raw chips but keeps similar keys", () => {
    expect(removeFieldFromHtml("<p>Reason: {{reason}} / {{{reason}}} / {{ reason }} / {{reasonCode}}</p>", "reason")).toBe(
      "<p>Reason:  /  /  / {{reasonCode}}</p>"
    );
  });

  it("drops sections shown only when the question is answered and keeps their otherwise text", () => {
    expect(removeFieldFromHtml("<p>A {{#if reason}}because {{reason}}{{/if}} B</p>", "reason")).toBe("<p>A  B</p>");
    expect(removeFieldFromHtml("<p>{{#if reason}}{{reason}}{{else}}none{{/if}}</p>", "reason")).toBe("<p>none</p>");
    expect(removeFieldFromHtml("<p>x</p>\n{{#if reason}}\n<p>{{#if dept}}y{{/if}}</p>\n{{/if}}\n<p>z</p>", "reason")).toBe(
      "<p>x</p>\n\n<p>z</p>"
    );
  });

  it("leaves other conditions intact while removing the chip inside them", () => {
    expect(removeFieldFromHtml("{{#if dept}}x {{reason}}{{/if}}", "reason")).toBe("{{#if dept}}x {{/if}}");
    expect(removeFieldFromHtml("{{#if dept}}a{{else}}{{reason}}{{/if}}", "reason")).toBe("{{#if dept}}a{{else}}{{/if}}");
    expect(removeFieldFromHtml("{{#each rows}}{{name}}{{/each}}{{reason}}", "reason")).toBe("{{#each rows}}{{name}}{{/each}}");
  });

  it("drops paragraphs the removal leaves empty but keeps ones that were already empty", () => {
    expect(removeFieldFromHtml("<p>{{reason}}</p><p>Hi</p><p></p>", "reason")).toBe("<p>Hi</p><p></p>");
    expect(removeFieldFromHtml('<p class="x"> {{#if reason}}{{reason}}{{/if}}&nbsp;</p>\n<h2>{{reason}}</h2><p>Hi {{reason}}</p>', "reason")).toBe(
      "\n<p>Hi </p>"
    );
    expect(removeFieldFromHtml("<ul><li>{{reason}}</li><li>Two</li></ul>", "reason")).toBe("<ul><li>Two</li></ul>");
  });

  it("returns the html unchanged when the question is not used", () => {
    const html = "<p>{{employeeName}}</p>";
    expect(removeFieldFromHtml(html, "reason")).toBe(html);
    expect(removeFieldFromHtml("", "reason")).toBe("");
  });

  it("knows when a question is used as a chip or a condition", () => {
    expect(usedFieldKeys("<p>{{reason}}</p>").has("reason")).toBe(true);
    expect(usedFieldKeys("<p>{{#if reason}}x{{/if}}</p>").has("reason")).toBe(true);
    expect(usedFieldKeys("<p>{{reasonCode}}</p>").has("reason")).toBe(false);
    expect(usedFieldKeys("").has("reason")).toBe(false);
  });

  it("counts {{#unless}} conditions like the server does", () => {
    expect([...usedFieldKeys("<p>{{#unless probation}}Confirmed{{/unless}}</p>")]).toEqual(["probation"]);
    expect(usedFieldKeys("{{#unless probation}}x{{/unless}}").has("probation")).toBe(true);
  });

  it("removes {{#unless}} wrappers but keeps the content shown when the question is empty", () => {
    expect(removeFieldFromHtml("<p>A{{#unless probation}} confirmed{{else}} on probation{{/unless}}.</p>", "probation")).toBe("<p>A confirmed.</p>");
    expect(removeFieldFromHtml("<p>{{#unless probation}}{{/unless}}</p><p>B</p>", "probation")).toBe("<p>B</p>");
  });

  it("lists every question key the letter uses as a chip or a condition", () => {
    expect([...usedFieldKeys("<p>{{a}} {{{b}}} {{#if c}}x{{else}}y{{/if}} {{#each rows}}{{/each}}</p>")].sort()).toEqual(["a", "b", "c"]);
    expect([...usedFieldKeys("")]).toEqual([]);
  });
});
