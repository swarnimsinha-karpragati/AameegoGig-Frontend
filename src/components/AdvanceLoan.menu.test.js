const fs = require("fs");
const path = require("path");

const jsx = fs.readFileSync(path.join(__dirname, "AdvanceLoan.jsx"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "AdvanceLoanRequest.css"), "utf8");

describe("Advance Loan row action menu", () => {
  test("renders actions through FloatingMenu so TableHScroll cannot clip them", () => {
    expect(jsx).toMatch(/import FloatingMenu from ["'].\/FloatingMenu["']/);
    expect(jsx).toMatch(/<FloatingMenu[\s\S]*className="advance-dropdown"/);
    expect(jsx).not.toMatch(
      /openMenuId === req\._id && items\.length > 0 && \(\s*<div className="advance-dropdown"/
    );
  });

  test("advance-dropdown is not absolutely positioned under the clipped scroller", () => {
    const block = css.match(/\.advance-dropdown\s*\{[^}]+\}/)?.[0] || "";
    expect(block).toBeTruthy();
    expect(block).not.toMatch(/position:\s*absolute/);
  });
});
