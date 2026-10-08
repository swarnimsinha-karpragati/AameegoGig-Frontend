import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import FloatingMenu from "../../FloatingMenu";
import { Input } from "../../../design-system";
import { listKeyTarget } from "../../../design-system/overlayHooks";
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

/**
 * Searchable list of details grouped by source; picking one calls `onPick(key)`. The search box is
 * a combobox: ArrowUp/ArrowDown (wrapping), Home and End move the highlight through the results
 * across groups while focus stays in the box, and Enter inserts the highlighted detail.
 */
export default function DetailPicker({ anchorEl, title, groups, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState(null);
  const popoverRef = useRef(null);
  const searchRef = useRef(null);
  const baseId = `wz-detail-picker-${useId().replace(/:/g, "")}`;
  useDismiss(Boolean(anchorEl), anchorEl, popoverRef, onClose);
  const q = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      groups
        .map((group) => ({ ...group, items: group.items.filter((item) => matches(item, q)) }))
        .filter((group) => group.items.length),
    [groups, q]
  );
  const options = useMemo(() => visible.flatMap((group) => group.items), [visible]);
  const found = options.findIndex((item) => item.key === activeKey);
  const activeIndex = found >= 0 ? found : options.length ? 0 : -1;
  const active = activeIndex >= 0 ? options[activeIndex] : null;
  const optionId = (item) => `${baseId}-option-${options.indexOf(item)}`;
  const activeId = active ? optionId(active) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const pick = (item) => {
    onPick(item.key);
    onClose();
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (active) pick(active);
      return;
    }
    const next = listKeyTarget(event.key, activeIndex, options.length);
    if (next === null) return;
    event.preventDefault();
    setActiveKey(options[next].key);
  };

  return (
    <FloatingMenu anchorEl={anchorEl} className="wz-detail-picker" onShown={() => searchRef.current?.focus()}>
      <div ref={popoverRef} role="dialog" aria-label={title} className="wz-detail-picker__body">
        <Input
          ref={searchRef}
          label={LETTERS_COPY.editor.searchDetails}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveKey(null);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={`${baseId}-list`}
          aria-activedescendant={activeId}
          leftIcon={<Search size={16} />}
        />
        <div className="wz-detail-picker__list">
          {visible.length === 0 && (
            <p className="wz-detail-picker__empty">{format(LETTERS_COPY.editor.noDetailsMatch, { query })}</p>
          )}
          <div id={`${baseId}-list`} role="listbox" aria-label={title}>
            {visible.map((group, groupIndex) => (
              <div
                key={group.group}
                role="group"
                aria-labelledby={`${baseId}-group-${groupIndex}`}
                className="wz-detail-picker__group"
              >
                <p id={`${baseId}-group-${groupIndex}`} className="wz-detail-picker__group-title">
                  {group.group}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    id={optionId(item)}
                    type="button"
                    role="option"
                    aria-selected={item === active}
                    tabIndex={-1}
                    className="wz-detail-picker__item"
                    onClick={() => pick(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </FloatingMenu>
  );
}
