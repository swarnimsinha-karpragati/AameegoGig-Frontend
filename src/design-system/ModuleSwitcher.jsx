import { useRef } from "react";
import { cx } from "./utils";
import "./ModuleSwitcher.css";

/** `idPrefix` gives tabs `${idPrefix}-tab-${id}` ids that control `${idPrefix}-panel-${id}` panels. */
export default function ModuleSwitcher({ tabs = [], activeId, onChange, ariaLabel, className, idPrefix }) {
  const tabRefs = useRef([]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === activeId)
  );

  const handleKeyDown = (event, index) => {
    const lastIndex = tabs.length - 1;
    const keyTargets = {
      ArrowRight: index === lastIndex ? 0 : index + 1,
      ArrowLeft: index === 0 ? lastIndex : index - 1,
      Home: 0,
      End: lastIndex,
    };
    if (!(event.key in keyTargets)) return;
    event.preventDefault();
    const nextIndex = keyTargets[event.key];
    tabRefs.current[nextIndex]?.focus();
    onChange?.(tabs[nextIndex].id);
  };

  return (
    <div className={cx("wz-switcher", className)} role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab, index) => {
        const selected = index === activeIndex;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${tab.id}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={cx("wz-switcher__tab", selected && "wz-switcher__tab--active")}
            onClick={() => {
              if (!selected) onChange?.(tab.id);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span>{tab.label}</span>
            {tab.count != null && <span className="wz-switcher__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
