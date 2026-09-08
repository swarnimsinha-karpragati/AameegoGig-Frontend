import { useEffect, useId, useRef, useState } from "react";

export default function LandingSelect({
  id,
  name,
  label,
  value,
  options,
  placeholder = "Select an option",
  error,
  errorId,
  onChange,
  onBlur,
}) {
  const generatedId = useId();
  const triggerId = id || `${generatedId}-trigger`;
  const listboxId = `${triggerId}-listbox`;
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const selectedIndex = options.findIndex((option) => option === value);
  const hasValue = Boolean(value);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        onBlur?.();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };

    const onOtherOpen = (event) => {
      if (event.detail !== triggerId) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("landing-dd-open", onOtherOpen);
    document.dispatchEvent(
      new CustomEvent("landing-dd-open", { detail: triggerId })
    );

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("landing-dd-open", onOtherOpen);
    };
  }, [open, onBlur, triggerId]);

  useEffect(() => {
    if (!open) return;
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const optionNode = listRef.current?.children?.[highlight];
    optionNode?.scrollIntoView?.({ block: "nearest" });
  }, [open, highlight]);

  const choose = (option) => {
    onChange?.(option);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((current) => {
        const base = current < 0 ? selectedIndex : current;
        if (event.key === "ArrowDown") {
          return Math.min(options.length - 1, (base < 0 ? -1 : base) + 1);
        }
        return Math.max(0, (base < 0 ? options.length : base) - 1);
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight >= 0) choose(options[highlight]);
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlight(0);
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setHighlight(options.length - 1);
    }
  };

  return (
    <div
      className={`landing-dd${hasValue ? " has-value" : ""}${
        open ? " is-open" : ""
      }${error ? " is-invalid" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={triggerId}
        name={name}
        className="landing-dd-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="none"
        aria-activedescendant={
          open && highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onTriggerKeyDown}
        onBlur={() => {
          // Defer so option click can run first.
          window.setTimeout(() => {
            if (!rootRef.current?.contains(document.activeElement)) {
              if (open) setOpen(false);
              onBlur?.();
            }
          }, 0);
        }}
      >
        <span className={hasValue ? "landing-dd-value" : "landing-dd-placeholder"}>
          {hasValue ? value : placeholder}
        </span>
        <span className="landing-dd-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6.25L8 10.25L12 6.25"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          className="landing-dd-menu"
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const selected = option === value;
            const active = index === highlight;
            return (
              <li
                key={option}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={selected}
                className={`landing-dd-option${selected ? " is-selected" : ""}${
                  active ? " is-active" : ""
                }`}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option}</span>
                {selected ? (
                  <span className="landing-dd-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7.25L5.5 10.25L11.5 3.75"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
