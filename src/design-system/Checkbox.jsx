import { forwardRef } from "react";
import { Check } from "lucide-react";
import { useFieldIds } from "./FormField";
import { cx } from "./utils";
import "./Checkbox.css";

const Checkbox = forwardRef(function Checkbox(
  { label, checked = false, onChange, disabled = false, id, className, ...rest },
  ref
) {
  const { fieldId } = useFieldIds(id);
  return (
    <label
      htmlFor={fieldId}
      className={cx("wz-checkbox", disabled && "wz-checkbox--disabled", className)}
    >
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className="wz-checkbox__input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="wz-checkbox__box" aria-hidden="true">
        <Check strokeWidth={3} />
      </span>
      {label && <span className="wz-checkbox__label">{label}</span>}
    </label>
  );
});

export default Checkbox;
