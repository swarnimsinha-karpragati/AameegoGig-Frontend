const fs = require("fs");
const path = require("path");

const css = fs
  .readFileSync(path.join(__dirname, "Dashboard.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const htmlBody = css.match(/html\s*,\s*body\s*\{[^}]+\}/);
const pageContentBase = css.match(
  /\.dashboard-layout\s+\.page-content\s*\{[^}]*padding:\s*20px[^}]*\}/
);
const phonePageContent = css.match(
  /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.dashboard-layout\s+\.page-content\s*\{[^}]+\}/
);

describe("phone document scroll (Play: cannot scroll / ANR)", () => {
  test("html/body are not a viewport-tall overflow box (clip+visible computes to overflow-y auto)", () => {
    expect(htmlBody).not.toBeNull();
    expect(htmlBody[0]).toMatch(/overflow:\s*visible/);
    expect(htmlBody[0]).not.toMatch(/overflow-x:\s*clip/);
    expect(htmlBody[0]).not.toMatch(/overflow-x:\s*hidden/);
  });

  test("page-content sizes to its children instead of a flex-basis 0 viewport pane", () => {
    expect(pageContentBase).not.toBeNull();
    expect(pageContentBase[0]).toMatch(/flex:\s*1 0 auto/);
    expect(pageContentBase[0]).toMatch(/overflow:\s*visible/);
  });

  test("every phone module uses window scroll, not only attendance and regularization", () => {
    expect(phonePageContent).not.toBeNull();
    expect(phonePageContent[0]).toMatch(/flex:\s*none/);
    expect(phonePageContent[0]).toMatch(/overflow:\s*visible/);
    expect(phonePageContent[0]).toMatch(/height:\s*auto/);
  });
});
