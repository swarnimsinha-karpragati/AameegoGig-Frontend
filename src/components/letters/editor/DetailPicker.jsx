import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import FloatingMenu from "../../FloatingMenu";
import { Input } from "../../../design-system";
import { LETTERS_COPY, format } from "../../../utils/lettersCopy";

const matches = (item, query) =>
  !query || item.label.toLowerCase().includes(query) || item.key.toLowerCase().includes(query);

/**
 * Closes a popover on Escape or on a pointer press outside both the popover and its anchor.
 * `onClose({ restoreFocus })`: true for Escape; false for an outside press, which moves focus itself.
 */
export function useDismiss(open, anchorEl, popoverRef, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (popoverRef.current?.contains(event.target) || anchorEl?.contains(event.target)) return;
      onCloseRef.current({ restoreFocus: false });
    };
    const onKey = (event) => {
      if (event.key === "Escape") onCloseRef.current({ restoreFocus: true });
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorEl, popoverRef]);
}

/** Searchable list of details grouped by source; picking one calls `onPick(key)`. */
export default function DetailPicker({ anchorEl, title, groups, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const popoverRef = useRef(null);
  const searchRef = useRef(null);
  useDismiss(Boolean(anchorEl), anchorEl, popoverRef, onClose);
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      groups
        .map((group) => ({ ...group, items: group.items.filter((item) => matches(item, q)) }))
        .filter((group) => group.items.length),
    [groups, q]
  );

  return (
    <FloatingMenu anchorEl={anchorEl} className="wz-detail-picker" onShown={() => searchRef.current?.focus()}>
      <div ref={popoverRef} role="dialog" aria-label={title} className="wz-detail-picker__body">
        <Input
          ref={searchRef}
          label={LETTERS_COPY.editor.searchDetails}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          leftIcon={<Search size={16} />}
        />
        <div className="wz-detail-picker__list">
          {visible.length === 0 && (
            <p className="wz-detail-picker__empty">{format(LETTERS_COPY.editor.noDetailsMatch, { query })}</p>
          )}
          {visible.map((group) => (
            <div key={group.group} className="wz-detail-picker__group">
              <p className="wz-detail-picker__group-title">{group.group}</p>
              {group.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="wz-detail-picker__item"
                  onClick={() => {
                    onPick(item.key);
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </FloatingMenu>
  );
}
