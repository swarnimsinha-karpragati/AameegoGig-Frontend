/**
 * Help-desk FAB geometry. Keep in sync with `--hdw-fab-*` in HelpDeskWidget.css.
 * Page content padding-bottom must be at least this so the last table rows
 * can scroll clear of the floating button.
 */
export const HELP_DESK_FAB = {
  heightPx: 56,
  bottomPx: 16,
  gapPx: 16,
};

export const helpDeskFabContentPaddingPx = ({
  heightPx = HELP_DESK_FAB.heightPx,
  bottomPx = HELP_DESK_FAB.bottomPx,
  gapPx = HELP_DESK_FAB.gapPx,
} = {}) => heightPx + bottomPx + gapPx;
