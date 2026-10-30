import fs from "fs";
import path from "path";
import { HELP_DESK_FAB, helpDeskFabContentPaddingPx } from "./helpDeskFab";

describe("helpDeskFabContentPaddingPx", () => {
  test("reserves FAB height, bottom offset, and a gap so the last row is not covered", () => {
    expect(helpDeskFabContentPaddingPx()).toBe(88);
    expect(
      helpDeskFabContentPaddingPx({
        heightPx: HELP_DESK_FAB.heightPx,
        bottomPx: HELP_DESK_FAB.bottomPx,
        gapPx: HELP_DESK_FAB.gapPx,
      })
    ).toBe(HELP_DESK_FAB.heightPx + HELP_DESK_FAB.bottomPx + HELP_DESK_FAB.gapPx);
  });
});

describe("help desk FAB styles", () => {
  test("CSS variables and page padding share the same clearance", () => {
    const widget = fs.readFileSync(
      path.join(__dirname, "../components/HelpDeskWidget.css"),
      "utf8"
    );
    const layout = fs.readFileSync(path.join(__dirname, "../pages/Dashboard.css"), "utf8");
    expect(widget).toMatch(new RegExp(`--hdw-fab-height:\\s*${HELP_DESK_FAB.heightPx}px`));
    expect(widget).toMatch(new RegExp(`--hdw-fab-bottom:.*${HELP_DESK_FAB.bottomPx}px`));
    expect(widget).toMatch(new RegExp(`--hdw-fab-gap:\\s*${HELP_DESK_FAB.gapPx}px`));
    expect(widget).toMatch(/--hdw-fab-clearance:\s*calc/);
    expect(layout).toMatch(/padding:[^;]*var\(--hdw-fab-clearance/);
    expect(widget).toMatch(/bottom:\s*var\(--hdw-fab-bottom\)/);
  });
});
