import { forwardRef } from "react";
import { cx } from "./utils";
import "./Toggle.css";

const Toggle = forwardRef(function Toggle(
  { label, checked = false, onChange, disabled = false, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cx("wz-toggle", checked && "wz-toggle--on", className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="wz-toggle__track" aria-hidden="true">
        <span className="wz-toggle__thumb" />
      </span>
      {label && <span className="wz-toggle__label">{label}</span>}
    </button>
  );
});

export default Toggle;
