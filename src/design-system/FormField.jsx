import { useId } from "react";
import { cx } from "./utils";
import "./FormField.css";

export function useFieldIds(id) {
  const generated = useId();
  const fieldId = id || `wz-field-${generated.replace(/:/g, "")}`;
  return {
    fieldId,
    messageId: `${fieldId}-message`,
  };
}

export function getFieldAria({ error, helperText, required, messageId }) {
  return {
    "aria-invalid": error ? "true" : undefined,
    "aria-required": required ? "true" : undefined,
    "aria-describedby": error || helperText ? messageId : undefined,
  };
}

export default function FormField({
  label,
  fieldId,
  messageId,
  required,
  error,
  helperText,
  disabled,
  className,
  children,
}) {
  return (
    <div className={cx("wz-field", error && "wz-field--error", disabled && "wz-field--disabled", className)}>
      {label && (
        <label className="wz-field__label" htmlFor={fieldId}>
          {label}
          {required && (
            <span className="wz-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={messageId} className="wz-field__message wz-field__message--error" role="alert">
          {error}
        </p>
      ) : (
        helperText && (
          <p id={messageId} className="wz-field__message">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
