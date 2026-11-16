const fs = require("fs");
const path = require("path");

const css = fs.readFileSync(path.join(__dirname, "Regularization.css"), "utf8");
const layout = fs.readFileSync(path.join(__dirname, "Dashboard.css"), "utf8");

describe("regularization request cards on a phone", () => {
  test("compact single-row nowrap is desktop-only so titles, dates and badges are not clipped", () => {
    expect(css).toMatch(
      /@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*\.regularization-panel--compact\s+\.regularization-request-card__top p\s*\{[^}]*white-space:\s*nowrap/
    );
    expect(css).toMatch(
      /\.regularization-panel--compact\s+\.regularization-request-card__body\s*\{[^}]*flex-direction:\s*column/
    );
  });

  test("status chips stay whole words and cards cannot grow past the page", () => {
    expect(css).toMatch(/\.regularization-status\s*\{[^}]*flex-shrink:\s*0/);
    expect(css).toMatch(/\.regularization-status\s*\{[^}]*white-space:\s*nowrap/);
    expect(css).toMatch(
      /\.regularization-request-card\s*\{[^}]*max-width:\s*100%/
    );
    expect(css).toMatch(
      /\.regularization-request-card__body\s*\{[^}]*min-width:\s*0/
    );
  });

  test("phone cards keep the icon beside the text instead of stacking it above", () => {
    const phone = css.match(/@media\s*\(max-width:\s*600px\)\s*\{[\s\S]*?\n\}/);
    expect(phone).not.toBeNull();
    expect(phone[0]).not.toMatch(
      /\.regularization-request-card\s*\{[^}]*grid-template-columns:\s*1fr/
    );
  });

  test("the help-desk FAB does not cover the last card, and the page scrolls with the window", () => {
    expect(css).toMatch(
      /\.regularization-page\s*\{[\s\S]*?padding:[^;]*var\(--hdw-fab-clearance/
    );
    expect(layout).toMatch(
      /\.page-content:has\(\.regularization-page\)\s*\{[^}]*overflow:\s*visible/
    );
  });
});
