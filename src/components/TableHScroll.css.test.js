const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "TableHScroll.css"), "utf8");
const expenseCss = fs.readFileSync(
  path.join(__dirname, "../pages/Expense.css"),
  "utf8"
);

describe("wide tables on a phone", () => {
  test("child tables keep content width so headers like RECEIPT are not squashed", () => {
    expect(css).toMatch(
      /\.table-hscroll__scroller\s*>\s*table\s*\{[^}]*width:\s*max-content/
    );
    expect(css).toMatch(
      /\.table-hscroll__scroller\s*>\s*table\s*\{[^}]*min-width:\s*100%/
    );
    expect(css).toMatch(
      /\.table-hscroll__scroller\s*>\s*table th[\s\S]*white-space:\s*nowrap/
    );
  });

  test("the More columns cue sits on the scrollbar, not on top of RECEIPT", () => {
    expect(css).toMatch(/\.table-hscroll__hint\s*\{[^}]*bottom:/);
    expect(css).not.toMatch(/\.table-hscroll__hint\s*\{[^}]*top:\s*10px/);
  });

  test("expense tables use the same content-width rule", () => {
    expect(expenseCss).toMatch(/\.expense-table\s*\{[^}]*width:\s*max-content/);
    expect(expenseCss).toMatch(/\.expense-table td\s*\{[^}]*white-space:\s*nowrap/);
  });
});
